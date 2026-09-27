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
    const { order_id, invoice_id } = body;
    if (!order_id || !invoice_id) return Response.json({ error: "order_id and invoice_id required" }, { status: 400 });

    const base = getPaypalBaseUrl();
    const token = await getPaypalAccessToken();

    const captureRes = await fetch(`${base}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const capture = await captureRes.json();
    if (!captureRes.ok) return Response.json({ error: capture.message || "PayPal capture failed" }, { status: 400 });

    let capturedAmount = 0;
    try { capturedAmount = Number(capture.purchase_units[0].payments.captures[0].amount.value) || 0; } catch (e) {}

    const today = new Date().toISOString().slice(0, 10);
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    const schedule = invoice.payment_schedule || [];

    if (schedule.length > 0) {
      const updatedSchedule = schedule.map((s) => s.paypal_order_id === order_id ? { ...s, paid: true } : s);
      const paidItems = updatedSchedule.filter((s) => s.paid);
      const amountPaid = paidItems.reduce((sum, s) => sum + installmentAmount(s, invoice.total), 0);
      const allPaid = updatedSchedule.every((s) => s.paid);
      const payload = {
        payment_schedule: updatedSchedule,
        payment_status: allPaid ? "paid" : "partial",
        status: allPaid ? "paid" : invoice.status,
        amount_paid: Number(amountPaid.toFixed(2)),
      };
      if (allPaid) payload.paid_date = today;
      else if (invoice.paid_date) payload.paid_date = invoice.paid_date;
      await base44.asServiceRole.entities.Invoice.update(invoice_id, payload);
      return Response.json({ success: true, amount: capturedAmount, paid_in_full: allPaid });
    }

    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      payment_status: "paid",
      status: "paid",
      paid_date: today,
      amount_paid: capturedAmount,
    });
    return Response.json({ success: true, amount: capturedAmount, paid_in_full: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}