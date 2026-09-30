import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};
    const invoiceId = (body.invoice_id || "").toString().trim();
    const email = (body.email || "").trim().toLowerCase();
    const phase = (body.phase || "").toString().trim();
    const note = (body.note || "").toString().trim();

    if (!invoiceId || !email || !phase) {
      return Response.json({ error: "invoice_id, email, and phase are required" }, { status: 400 });
    }

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });
    if ((invoice.customer_email || "").trim().toLowerCase() !== email) {
      return Response.json({ error: "Not authorized for this invoice" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const history = Array.isArray(invoice.phase_history) ? invoice.phase_history : [];
    history.push({ phase, note, date: now, by: email });

    const updated = await base44.asServiceRole.entities.Invoice.update(invoiceId, {
      phase,
      phase_note: note,
      phase_changed_date: now,
      phase_history: history,
    });

    return Response.json({ invoice: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}