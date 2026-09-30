import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { applyInvoicePhase } from "../../shared/invoicePhase.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "tech" && user.role !== "accountant") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({})) || {};
    const invoiceId = (body.invoice_id || "").toString().trim();
    const phase = (body.phase || "").toString().trim();
    const note = (body.note || "").toString().trim();

    if (!invoiceId || !phase) {
      return Response.json({ error: "invoice_id and phase are required" }, { status: 400 });
    }

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });

    const updated = await applyInvoicePhase(base44, invoice, phase, note, user.email || user.id);
    return Response.json({ invoice: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}