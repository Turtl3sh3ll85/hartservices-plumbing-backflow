import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { notifyInvoiceOpened } from "../../shared/notifications.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { invoice_id } = body;
    if (!invoice_id) return Response.json({ error: "invoice_id required" }, { status: 400 });

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });

    let job = null;
    let customer = null;
    if (invoice.job_id) {
      try { job = await base44.asServiceRole.entities.Job.get(invoice.job_id); } catch (e) {}
      if (job && job.customer_id) {
        try { customer = await base44.asServiceRole.entities.Customer.get(job.customer_id); } catch (e) {}
      }
    }
    let settings = null;
    try {
      const allSettings = await base44.asServiceRole.entities.Settings.list();
      settings = allSettings[0] || null;
    } catch (e) {}

    let attachments = [];
    try {
      attachments = await base44.asServiceRole.entities.InvoiceAttachment.filter({ invoice_id }, "-created_date", 100);
    } catch (e) {}

    // Notify the business the first time the customer opens this invoice
    if (!invoice.opened) {
      try {
        await base44.asServiceRole.entities.Invoice.update(invoice_id, { opened: true });
        await notifyInvoiceOpened(base44, { invoice, customer, job });
      } catch (e) {}
    }

    return Response.json({ invoice, job, customer, settings, attachments });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}