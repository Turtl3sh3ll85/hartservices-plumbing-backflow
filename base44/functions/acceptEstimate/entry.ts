import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

function computeTotals(lineItems, taxRate, ccFeeEnabled) {
  const subtotal = (lineItems || []).reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0);
  const tax = subtotal * (Number(taxRate) || 0) / 100;
  const ccFee = ccFeeEnabled ? Math.round(subtotal * 0.03 * 100) / 100 : 0;
  return { subtotal, tax, cc_fee: ccFee, total: subtotal + tax + ccFee };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};
    const { estimate_id, selected_option_label, selected_line_items, customer_ready } = body;
    if (!estimate_id) return Response.json({ error: 'estimate_id required' }, { status: 400 });

    const estimate = await base44.asServiceRole.entities.Estimate.get(estimate_id);
    if (!estimate) return Response.json({ error: 'Estimate not found' }, { status: 404 });
    if (estimate.status === 'converted' && estimate.converted_invoice_id) {
      return Response.json({ invoice_id: estimate.converted_invoice_id, already_converted: true });
    }

    let chosenItems = estimate.line_items || [];
    if (estimate.selection_mode === 'side_by_side' && selected_option_label) {
      const opt = (estimate.options || []).find((o) => o.label === selected_option_label);
      if (opt) chosenItems = opt.line_items || [];
    } else if (estimate.selection_mode === 'a_la_carte' && Array.isArray(selected_line_items) && selected_line_items.length) {
      chosenItems = selected_line_items;
    }

    const totals = computeTotals(chosenItems, estimate.tax_rate, estimate.cc_fee_enabled);

    const invoices = await base44.asServiceRole.entities.Invoice.list();
    const nums = (invoices || [])
      .map((i) => (i.number || '').match(/(\d+)/))
      .filter(Boolean)
      .map((m) => parseInt(m[1], 10));
    const max = nums.length ? Math.max(...nums) : 0;
    const number = `INV-${new Date().getFullYear()}-${String(max + 1).padStart(4, '0')}`;

    const invoice = await base44.asServiceRole.entities.Invoice.create({
      customer_id: estimate.customer_id,
      customer_email: estimate.customer_email,
      number,
      name: estimate.name || estimate.number || 'Converted estimate',
      line_items: chosenItems,
      subtotal: totals.subtotal,
      tax_rate: estimate.tax_rate || 0,
      tax: totals.tax,
      cc_fee_enabled: !!estimate.cc_fee_enabled,
      cc_fee: totals.cc_fee,
      total: totals.total,
      payment_schedule: estimate.payment_schedule || [],
      status: 'sent',
      payment_status: 'unpaid',
      notes: estimate.notes || '',
    });

    await base44.asServiceRole.entities.Estimate.update(estimate_id, {
      status: 'converted',
      converted_invoice_id: invoice.id,
      selected_option_label: selected_option_label || null,
      selected_line_items: selected_line_items || null,
      customer_ready: customer_ready === true,
      customer_ready_date: customer_ready ? new Date().toISOString() : null,
    });

    return Response.json({ invoice_id: invoice.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}