import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { sendGmail } from "../../shared/gmail.ts";

const REGISTER_URL = "https://hartservices.base44.app/register";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { customer_id } = body;
    if (!customer_id) return Response.json({ error: "customer_id required" }, { status: 400 });

    const customer = await base44.asServiceRole.entities.Customer.get(customer_id).catch(() => null);
    const email = customer?.email;
    if (!email) return Response.json({ sent: false, reason: "no customer email" });

    // Skip if the customer already has an app account
    let existing = [];
    try {
      existing = await base44.asServiceRole.entities.User.filter({ email });
    } catch (e) {}
    if (existing && existing.length > 0) {
      return Response.json({ sent: false, reason: "already has account" });
    }

    let settings = null;
    try {
      const allSettings = await base44.asServiceRole.entities.Settings.list();
      settings = allSettings[0] || null;
    } catch (e) {}
    const brand = settings?.business_name || "HartServices Plumbing & Backflow";
    const customerName = customer?.name || "there";
    const subject = `Create your account with ${brand}`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
      <h2 style="color:#1d4ed8;margin-bottom:8px">${brand}</h2>
      <p>Hi ${customerName},</p>
      <p>We just created an invoice for you. To view and pay your invoices online, track your service history, and manage reminders, create a free account.</p>
      <p style="margin:24px 0"><a href="${REGISTER_URL}" style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Create my account</a></p>
      <p style="color:#6b7280;font-size:13px;word-break:break-all">Link: ${REGISTER_URL}</p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">${brand}${settings?.business_phone ? ` &middot; ${settings.business_phone}` : ""}</p>
    </div>`;

    try {
      await sendGmail(base44, { to: email, subject, html, fromName: brand });
      return Response.json({ sent: true, to: email });
    } catch (e) {
      return Response.json({ sent: false, error: e.message });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}