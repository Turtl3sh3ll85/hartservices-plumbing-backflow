import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { isOpenInvoice, money } from "../../shared/invoiceReminders.ts";
import { sendGmail } from "../../shared/gmail.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const settingsList = await base44.asServiceRole.entities.Settings.list();
    const settings = settingsList[0] || {};
    if (!settings.weekly_summary_enabled) {
      return Response.json({ skipped: "weekly summary disabled" });
    }
    const brand = settings.business_name || "FlowPro Plumbing";
    const origin = new URL(req.url).origin;
    const [invoices, customers] = await Promise.all([
      base44.asServiceRole.entities.Invoice.list("-created_date", 500),
      base44.asServiceRole.entities.Customer.list("name", 500),
    ]);
    const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));
    const open = invoices.filter(isOpenInvoice);

    const byCustomer = new Map();
    for (const inv of open) {
      const cid = inv.customer_id;
      if (!cid) continue;
      if (!byCustomer.has(cid)) byCustomer.set(cid, []);
      byCustomer.get(cid).push(inv);
    }

    const sent = [];
    for (const [cid, invs] of byCustomer) {
      const customer = customerMap[cid];
      if (!customer?.email) { sent.push({ customer: cid, skipped: "no email" }); continue; }
      const rows = invs.map((inv) => {
        const link = `${origin}/pay/${inv.id}`;
        return `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">${inv.name || inv.number || ""}</td>
          <td style="padding:8px 0 8px 12px;border-bottom:1px solid #eee;text-align:right">${money(inv.total)}</td>
          <td style="padding:8px 0 8px 12px;border-bottom:1px solid #eee;text-align:right"><a href="${link}" style="color:#1d4ed8">Pay</a></td>
        </tr>`;
      }).join("");
      const totalDue = invs.reduce((s, inv) => s + (Number(inv.total) || 0), 0);
      const subject = `Your open invoices from ${brand}`;
      const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
        <h2 style="color:#1d4ed8;margin-bottom:8px">${brand}</h2>
        <p>Hi ${customer.name || "there"},</p>
        <p>You have <strong>${invs.length}</strong> open invoice${invs.length === 1 ? "" : "s"} totaling <strong>${money(totalDue)}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <thead><tr style="color:#6b7280;text-align:left">
            <th style="padding:8px 0;border-bottom:1px solid #ddd">Invoice</th>
            <th style="padding:8px 0 8px 12px;border-bottom:1px solid #ddd;text-align:right">Amount</th>
            <th style="padding:8px 0 8px 12px;border-bottom:1px solid #ddd;text-align:right"></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">${brand}${settings.business_phone ? ` &middot; ${settings.business_phone}` : ""}</p>
      </div>`;
      try {
        await sendGmail(base44, { to: customer.email, subject, html, fromName: brand });
        sent.push({ customer: cid, to: customer.email, count: invs.length, ok: true });
      } catch (e) {
        sent.push({ customer: cid, to: customer.email, ok: false, error: e.message });
      }
    }
    return Response.json({ sent, customers: byCustomer.size });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}