import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { estimate_id } = body;
    if (!estimate_id) return Response.json({ error: "estimate_id required" }, { status: 400 });

    const estimate = await base44.asServiceRole.entities.Estimate.get(estimate_id);
    if (!estimate) return Response.json({ error: "Estimate not found" }, { status: 404 });

    if (estimate.status === "converted" && estimate.converted_invoice_id) {
      return Response.json({ invoice_id: estimate.converted_invoice_id, already_converted: true });
    }

    const invoices = await base44.asServiceRole.entities.Invoice.list();
    const nums = (invoices || [])
      .map((i) => (i.number || "").match(/(\d+)/))
      .filter(Boolean)
      .map((m) => parseInt(m[1], 10));
    const max = nums.length ? Math.max(...nums) : 0;
    const number = `INV-${new Date().getFullYear()}-${String(max + 1).padStart(4, "0")}`;

    const invoice = await base44.asServiceRole.entities.Invoice.create({
      job_id: estimate.job_id,
      number,
      name: estimate.name || estimate.number || "Converted estimate",
      line_items: estimate.line_items || [],
      subtotal: estimate.subtotal || 0,
      tax_rate: estimate.tax_rate || 0,
      tax: estimate.tax || 0,
      total: estimate.total || 0,
      payment_schedule: estimate.payment_schedule || [],
      status: "sent",
      payment_status: "unpaid",
      notes: estimate.notes || "",
    });

    await base44.asServiceRole.entities.Estimate.update(estimate_id, {
      status: "converted",
      converted_invoice_id: invoice.id,
    });

    return Response.json({ invoice_id: invoice.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}