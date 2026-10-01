import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { notifyCustomerReady } from "../../shared/notifications.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};
    const invoiceId = (body.invoice_id || "").toString().trim();
    const email = (body.email || "").trim().toLowerCase();
    const status = (body.status || "").toString().trim();

    if (!invoiceId || !email || !status) {
      return Response.json({ error: "invoice_id, email, and status are required" }, { status: 400 });
    }
    if (!["standing", "due", "ready"].includes(status)) {
      return Response.json({ error: "invalid status" }, { status: 400 });
    }

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });
    if ((invoice.customer_email || "").trim().toLowerCase() !== email) {
      return Response.json({ error: "Not authorized for this invoice" }, { status: 403 });
    }

    const patch = {
      customer_ready_for_next_stage: status === "ready",
      standing_by: status !== "due",
      ready_for_next_stage_date: status === "ready" ? new Date().toISOString() : null,
    };
    await base44.asServiceRole.entities.Invoice.update(invoiceId, patch);

    if (status === "ready") {
      let customer = null;
      try { customer = await base44.asServiceRole.entities.Customer.get(invoice.customer_id); } catch (e) {}
      await notifyCustomerReady(base44, { invoice: { ...invoice, ...patch }, customer });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}