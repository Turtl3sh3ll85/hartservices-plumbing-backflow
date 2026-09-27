import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { isOpenInvoice, money } from "../../shared/invoiceReminders.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const [invoices, jobs, customers, settingsList] = await Promise.all([
      base44.asServiceRole.entities.Invoice.list("-created_date", 500),
      base44.asServiceRole.entities.Job.list("-created_date", 500),
      base44.asServiceRole.entities.Customer.list("name", 500),
      base44.asServiceRole.entities.Settings.list(),
    ]);
    const settings = settingsList[0] || {};
    const brand = settings.business_name || "FlowPro Plumbing";
    const origin = new URL(req.url).origin;
    const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));
    const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

    const open = invoices.filter((inv) => isOpenInvoice(inv) && inv.reminders_enabled !== false);
    const sent = [];
    for (const inv of open) {
      const job = jobMap[inv.job_id];
      const customer = job ? customerMap[job.customer_id] : null;
      if (!customer?.email) { sent.push({ id: inv.id, skipped: "no customer email" }); continue; }
      const link = `${origin}/pay/${inv.id}`;
      const subject = `Reminder: invoice from ${brand}`;
      const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
        <h2 style="color:#1d4ed8;margin-bottom:8px">${brand}</h2>
        <p>Hi ${customer.name || "there"},</p>
        <p>This is a friendly reminder that your invoice <strong>${inv.name || inv.number || ""}</strong>${inv.number ? ` (${inv.number})` : ""} for <strong>${money(inv.total)}</strong> is still open.</p>
        ${inv.due_date ? `<p style="color:#6b7280;font-size:13px">Due date: ${inv.due_date}</p>` : ""}
        <p style="margin:24px 0"><a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Pay now</a></p>
        <p style="color:#6b7280;font-size:13px;word-break:break-all">Link: ${link}</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">${brand}${settings.business_phone ? ` &middot; ${settings.business_phone}` : ""}</p>
      </div>`;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: customer.email, subject, html, from_name: brand });
        sent.push({ id: inv.id, to: customer.email, ok: true });
      } catch (e) {
        sent.push({ id: inv.id, to: customer.email, ok: false, error: e.message });
      }
    }
    return Response.json({ sent, count: open.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}