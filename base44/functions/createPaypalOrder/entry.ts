import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { getPaypalBaseUrl, getPaypalAccessToken } from "../../shared/paypal.ts";

function installmentAmount(item, total) {
  return item.type === "percentage"
    ? ((Number(total) || 0) * (Number(item.value) || 0)) / 100
    : (Number(item.value) || 0);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { invoice_id, schedule_index } = body;
    if (!invoice_id) return Response.json({ error: "invoice_id required" }, { status: 400 });

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.payment_status === "paid") return Response.json({ error: "Invoice already paid" }, { status: 400 });

    const schedule = invoice.payment_schedule || [];
    let idx = -1;
    let amount;
    if (schedule.length > 0) {
      if (schedule_index != null && schedule[schedule_index] != null) {
        idx = schedule_index;
      } else {
        idx = schedule.findIndex((s) => !s.paid);
        if (idx === -1) return Response.json({ error: "All payments already made" }, { status: 400 });
      }
      amount = installmentAmount(schedule[idx], invoice.total);
    } else {
      amount = Number(invoice.total) || 0;
    }
    amount = Number(amount).toFixed(2);
    if (Number(amount) <= 0) return Response.json({ error: "Payment amount must be greater than zero" }, { status: 400 });

    const base = getPaypalBaseUrl();
    const token = await getPaypalAccessToken();

    const origin = new URL(req.url).origin;
    const returnUrl = `${origin}/pay/${invoice_id}?paypal=approved`;
    const cancelUrl = `${origin}/pay/${invoice_id}?paypal=cancelled`;

    const label = idx >= 0
      ? (schedule[idx].label || `Payment ${idx + 1}`)
      : (invoice.name || `Invoice ${invoice.number || invoice_id}`);

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: "USD", value: amount },
          description: label,
          custom_id: invoice_id,
          invoice_id: invoice.number || invoice_id,
        }],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: "FlowPro Plumbing",
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
        },
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) return Response.json({ error: order.message || "Failed to create PayPal order" }, { status: 400 });

    const updatePayload = { paypal_order_id: order.id, status: "sent" };
    if (idx >= 0) {
      updatePayload.payment_schedule = schedule.map((s, i) => i === idx ? { ...s, paypal_order_id: order.id } : s);
    }
    await base44.asServiceRole.entities.Invoice.update(invoice_id, updatePayload);

    const approvalLink = (order.links || []).find((l) => l.rel === "approve");
    return Response.json({ order_id: order.id, approval_url: approvalLink ? approvalLink.url : null, schedule_index: idx, amount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}