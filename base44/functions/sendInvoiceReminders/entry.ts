import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { isOpenInvoice, money } from "../../shared/invoiceReminders.ts";
import { sendGmail } from "../../shared/gmail.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const day = new Date().getDay(); // 0=Sun, 2=Tue, 4=Thu

    const [invoices, customers, settingsList] = await Promise.all([
      base44.asServiceRole.entities.Invoice.list("-created_date", 500),
      base44.asServiceRole.entities.Customer.list("name", 500),
      base44.asServiceRole.entities.Settings.list(),
    ]);
    const settings = settingsList[0] || {};
    const brand = settings.business_name || "FlowPro Plumbing";
    const origin = new URL(req.url).origin;
    const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

    // Group open invoices by customer
    const open = invoices.filter(isOpenInvoice);
    const byCustomer = new Map();
    for (const inv of open) {
      const cid = inv.customer_id;
      if (!cid) continue;
      if (!byCustomer.has(cid)) byCustomer.set(cid, []);
      byCustomer.get(cid).push(inv);
    }

    const shouldSend = (freq, dayOfWeek) => {
      if (freq === "off") return false;
      if (dayOfWeek === 4) return freq === "weekly" || freq === "biweekly";
      if (dayOfWeek === 2) return freq === "biweekly";
      return false;
    };

    const sent = [];
    for (const [cid, invs] of byCustomer) {
      const customer = customerMap[cid];
      if (!customer?.email) { sent.push({ customer: cid, skipped: "no email" }); continue; }

      const freq = customer.invoice_reminder_frequency || "biweekly";
      if (!shouldSend(freq, day)) { sent.push({ customer: cid, skipped: `freq=${freq} day=${day}` }); continue; }

      const portalLink = `${origin}/portal?email=${encodeURIComponent(customer.email)}&tab=invoices`;
      const totalDue = invs.reduce((s, inv) => s + (Number(inv.total) || 0), 0);
      const rows = invs.map((inv) => `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">${inv.name || inv.number || ""}</td>
          <td style="padding:8px 0 8px 12px;border-bottom:1px solid #eee;text-align:right">${money(inv.total)}</td>
        </tr>`).join("");

      const subject = `Reminder: open invoices from ${brand}`;
      const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
        <h2 style="color:#1d4ed8;margin-bottom:8px">${brand}</h2>
        <p>Hi ${customer.name || "there"},</p>
        <p>You have <strong>${invs.length}</strong> open invoice${invs.length === 1 ? "" : "s"} totaling <strong>${money(totalDue)}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <thead><tr style="color:#6b7280;text-align:left">
            <th style="padding:8px 0;border-bottom:1px solid #ddd">Invoice</th>
            <th style="padding:8px 0 8px 12px;border-bottom:1px solid #ddd;text-align:right">Amount</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:24px 0"><a href="${portalLink}" style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View & pay invoices</a></p>
        <p style="color:#6b7280;font-size:13px;word-break:break-all">Link: ${portalLink}</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">${brand}${settings.business_phone ? ` &middot; ${settings.business_phone}` : ""}</p>
      </div>`;

      try {
        await sendGmail(base44, { to: customer.email, subject, html, fromName: brand });
        sent.push({ customer: cid, to: customer.email, count: invs.length, ok: true });
      } catch (e) {
        sent.push({ customer: cid, to: customer.email, ok: false, error: e.message });
      }
    }
    return Response.json({ sent, day, customers: byCustomer.size });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}