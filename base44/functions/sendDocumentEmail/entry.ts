import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { sendGmail } from "../../shared/gmail.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { type, id } = body;
    if (!id || !type) return Response.json({ error: "type and id required" }, { status: 400 });

    const entity = type === "estimate" ? base44.asServiceRole.entities.Estimate : base44.asServiceRole.entities.Invoice;
    const doc = await entity.get(id);
    if (!doc) return Response.json({ error: "Document not found" }, { status: 404 });

    let customer = null;
    let settings = null;
    if (doc.customer_id) {
      try { customer = await base44.asServiceRole.entities.Customer.get(doc.customer_id); } catch (e) {}
    }
    try {
      const allSettings = await base44.asServiceRole.entities.Settings.list();
      settings = allSettings[0] || null;
    } catch (e) {}

    const origin = new URL(req.url).origin;
    const link = type === "estimate" ? `${origin}/accept/${id}` : `${origin}/pay/${id}`;
    const biz = settings || {};
    const brand = biz.business_name || "FlowPro Plumbing";
    const docLabel = type === "estimate" ? "estimate" : "invoice";
    const total = (Number(doc.total) || 0).toFixed(2);
    const customerName = customer?.name || "there";
    const subject = type === "estimate" ? `Your estimate from ${brand}` : `Your invoice from ${brand}`;
    const cta = type === "estimate" ? "Review &amp; accept estimate" : "Pay now";
    const portalTab = type === "estimate" ? "estimates" : "invoices";
    const portalParams = new URLSearchParams();
    if (customer?.email) portalParams.set("email", customer.email);
    portalParams.set("tab", portalTab);
    const portalLink = `${origin}/portal?${portalParams.toString()}`;

    const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
      <h2 style="color:#1d4ed8;margin-bottom:8px">${brand}</h2>
      <p>Hi ${customerName},</p>
      <p>Please review your ${docLabel} <strong>${doc.name || doc.number || ""}</strong>${doc.number ? ` (${doc.number})` : ""} for <strong>$${total}</strong>.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">${cta}</a></p>
      <p style="margin:8px 0"><a href="${portalLink}" style="background:#fff;color:#1d4ed8;border:1px solid #1d4ed8;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:600">View all my documents</a></p>
      <p style="color:#6b7280;font-size:13px;word-break:break-all">${type === "estimate" ? "Estimate" : "Invoice"} link: ${link}</p>
      <p style="color:#6b7280;font-size:13px;word-break:break-all">Portal link: ${portalLink}</p>
      ${doc.notes ? `<p style="color:#374151"><em>Note:</em> ${doc.notes}</p>` : ""}
      <p style="color:#6b7280;font-size:13px;margin-top:24px">${brand}${biz.business_phone ? ` &middot; ${biz.business_phone}` : ""}</p>
    </div>`;

    const recipients = [customer?.email, biz.business_email].filter((v) => v && v.trim());
    if (recipients.length === 0) return Response.json({ error: "No email address available" }, { status: 400 });

    const results = [];
    for (const to of recipients) {
      try {
        await sendGmail(base44, { to, subject, html, fromName: brand });
        results.push({ to, ok: true });
      } catch (e) {
        results.push({ to, ok: false, error: e.message });
      }
    }
    return Response.json({ sent: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}