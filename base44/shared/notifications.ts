import { sendGmail } from "./gmail.ts";

export async function getBusinessContext(base44) {
  let settings = null;
  try {
    const allSettings = await base44.asServiceRole.entities.Settings.list();
    settings = allSettings[0] || null;
  } catch (e) {}
  const brand = settings?.business_name || "FlowPro Plumbing";
  const to = settings?.business_email || "";
  return { settings, brand, to };
}

export async function notifyInvoiceOpened(base44, { invoice, customer }) {
  try {
    const { brand, to } = await getBusinessContext(base44);
    if (!to) return { sent: false, reason: "no business email" };
    const customerName = customer?.name || "A customer";
    const total = (Number(invoice.total) || 0).toFixed(2);
    const subject = `${customerName} opened invoice ${invoice.number || ""}`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
      <h2 style="color:#1d4ed8;margin-bottom:8px">${brand}</h2>
      <p><strong>${customerName}</strong> just opened invoice <strong>${invoice.name || invoice.number || ""}</strong>${invoice.number ? ` (${invoice.number})` : ""}.</p>
      <p>Amount: <strong>$${total}</strong>${invoice.payment_status === "partial" ? " (partially paid)" : ""}</p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">This is an automated notification from ${brand}.</p>
    </div>`;
    await sendGmail(base44, { to, subject, html, fromName: brand });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e.message };
  }
}

export async function notifyPaymentReceived(base44, { invoice, customer, amount, paidInFull }) {
  try {
    const { brand, to } = await getBusinessContext(base44);
    if (!to) return { sent: false, reason: "no business email" };
    const customerName = customer?.name || "A customer";
    const amountStr = (Number(amount) || 0).toFixed(2);
    const totalStr = (Number(invoice.total) || 0).toFixed(2);
    const subject = `Payment received: $${amountStr} from ${customerName}`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
      <h2 style="color:#1d4ed8;margin-bottom:8px">${brand}</h2>
      <p>A payment of <strong>$${amountStr}</strong> was just received from <strong>${customerName}</strong> for invoice <strong>${invoice.name || invoice.number || ""}</strong>${invoice.number ? ` (${invoice.number})` : ""}.</p>
      <p>Invoice total: $${totalStr} — ${paidInFull ? "paid in full" : "partially paid"}</p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">This is an automated notification from ${brand}.</p>
    </div>`;
    await sendGmail(base44, { to, subject, html, fromName: brand });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e.message };
  }
}