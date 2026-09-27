import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { getPaypalBaseUrl, getPaypalAccessToken } from "../../shared/paypal.ts";

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
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const capture = await captureRes.json();
    if (!captureRes.ok) return Response.json({ error: capture.message || "PayPal capture failed" }, { status: 400 });

    let capturedAmount = 0;
    try {
      const cap = capture.purchase_units[0].payments.captures[0];
      capturedAmount = Number(cap.amount.value) || 0;
    } catch (e) {}

    const today = new Date().toISOString().slice(0, 10);
    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      payment_status: "paid",
      status: "paid",
      paid_date: today,
      amount_paid: capturedAmount,
    });

    return Response.json({ success: true, amount: capturedAmount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}