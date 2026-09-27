import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { getPaypalBaseUrl, getPaypalAccessToken } from "../../shared/paypal.ts";
import { notifyPaymentReceived } from "../../shared/notifications.ts";

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
    let paidInFull = false;

    if (schedule.length > 0) {
      const updatedSchedule = schedule.map((s) => s.paypal_order_id === order_id ? { ...s, paid: true } : s);
      const paidItems = updatedSchedule.filter((s) => s.paid);
      const amountPaid = paidItems.reduce((sum, s) => sum + installmentAmount(s, invoice.total), 0);
      paidInFull = updatedSchedule.every((s) => s.paid);
      const payload = {
        payment_schedule: updatedSchedule,
        payment_status: paidInFull ? "paid" : "partial",
        status: paidInFull ? "paid" : invoice.status,
        amount_paid: Number(amountPaid.toFixed(2)),
      };
      if (paidInFull) payload.paid_date = today;
      else if (invoice.paid_date) payload.paid_date = invoice.paid_date;
      await base44.asServiceRole.entities.Invoice.update(invoice_id, payload);
    } else {
      paidInFull = true;
      await base44.asServiceRole.entities.Invoice.update(invoice_id, {
        payment_status: "paid",
        status: "paid",
        paid_date: today,
        amount_paid: capturedAmount,
      });
    }

    // Notify the business that a payment was received
    let job = null;
    let customer = null;
    if (invoice.job_id) {
      try { job = await base44.asServiceRole.entities.Job.get(invoice.job_id); } catch (e) {}
      if (job && job.customer_id) {
        try { customer = await base44.asServiceRole.entities.Customer.get(job.customer_id); } catch (e) {}
      }
    }
    try {
      await notifyPaymentReceived(base44, { invoice, customer, job, amount: capturedAmount, paidInFull });
    } catch (e) {}

    return Response.json({ success: true, amount: capturedAmount, paid_in_full: paidInFull });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}