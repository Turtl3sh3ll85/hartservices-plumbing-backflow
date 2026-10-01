import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { notifyCustomerReady } from "../../shared/notifications.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};
    const invoiceId = (body.invoice_id || "").toString().trim();
    const email = (body.email || "").toString().trim().toLowerCase();
    const status = (body.status || "").toString().trim();
    if (!invoiceId || !["standing", "due", "ready"].includes(status)) {
      return Response.json({ error: "invoice_id and a valid status are required" }, { status: 400 });
    }
    if (body.schedule_index != null && (!Number.isInteger(body.schedule_index) || body.schedule_index < 0)) {
      return Response.json({ error: "Invalid payment index" }, { status: 400 });
    }

    const authenticated = await base44.auth.isAuthenticated();
    const user = authenticated ? await base44.auth.me() : null;
    const staff = ["admin", "tech", "accountant"].includes(user?.role);
    if (!staff && !email) return Response.json({ error: "email is required" }, { status: 400 });
    const entities = staff ? base44.entities : base44.asServiceRole.entities;
    const invoice = await entities.Invoice.get(invoiceId);
    if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });
    if (!staff && (invoice.customer_email || "").trim().toLowerCase() !== email) {
      return Response.json({ error: "Not authorized for this invoice" }, { status: 403 });
    }

    const schedule = invoice.payment_schedule?.length ? invoice.payment_schedule : [
      { label: "Payment due", type: "amount", value: Number(invoice.total) || 0, paid: invoice.payment_status === "paid" },
    ];
    const nextIndex = schedule.findIndex((payment) => !payment.paid);
    const index = body.schedule_index ?? nextIndex;
    if (!schedule[index] || schedule[index].paid) {
      return Response.json({ error: "Choose an unpaid payment" }, { status: 400 });
    }
    const normalized = schedule.map((payment, position) => ({
      ...payment,
      milestone_status: payment.milestone_status || (position === nextIndex
        ? (invoice.customer_ready_for_next_stage ? "ready" : invoice.standing_by !== false ? "standing" : "due")
        : "standing"),
    }));
    const previousStatus = normalized[index].milestone_status;
    const updatedSchedule = normalized.map((payment, position) => position === index ? { ...payment, milestone_status: status } : payment);
    const ready = updatedSchedule.some((payment) => !payment.paid && payment.milestone_status === "ready");
    const patch = {
      payment_schedule: updatedSchedule,
      standing_by: updatedSchedule[nextIndex].milestone_status !== "due",
      customer_ready_for_next_stage: ready,
      ready_for_next_stage_date: ready ? invoice.ready_for_next_stage_date || new Date().toISOString() : null,
    };
    const saved = await entities.Invoice.update(invoiceId, patch);
    if (!staff && status === "ready" && previousStatus !== "ready") {
      let customer = null;
      try { customer = await base44.asServiceRole.entities.Customer.get(invoice.customer_id); } catch (e) {}
      await notifyCustomerReady(base44, { invoice: { ...invoice, ...patch }, customer });
    }
    return Response.json({ ok: true, invoice: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}