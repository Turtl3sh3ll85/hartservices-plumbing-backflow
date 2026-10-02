import { formatMoney, lineTotal, fullAddress, groupLineItemsBySection } from "@/lib/invoice";
import { TERMS, ACKNOWLEDGMENT } from "@/lib/serviceTerms";

function installmentAmount(item, total) {
  return item.type === "percentage"
    ? ((Number(total) || 0) * (Number(item.value) || 0)) / 100
    : (Number(item.value) || 0);
}

async function loadImageDataUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function buildDocumentPdf({ doc, customer, settings, kind }) {
  const isInvoice = kind === "invoice";
  const title = isInvoice ? "INVOICE" : "ESTIMATE";
  const { default: jsPDF } = await import("jspdf");
  const docPdf = new jsPDF({ unit: "pt", format: "letter" });
  const W = docPdf.internal.pageSize.getWidth();
  const M = 48;
  let y = M;

  const biz = settings || {};
  const brand = biz.business_name || "FlowPro Plumbing";

  // Logo
  let logoW = 0;
  let logoH = 0;
  if (biz.logo_url) {
    const dataUrl = await loadImageDataUrl(biz.logo_url);
    if (dataUrl) {
      try {
        const props = docPdf.getImageProperties(dataUrl);
        logoH = 40;
        logoW = (props.width / props.height) * logoH;
        docPdf.addImage(dataUrl, "PNG", M, y, logoW, logoH);
      } catch { /* ignore */ }
    }
  }

  // Brand name (to the right of the logo)
  const textX = M + logoW + (logoW ? 12 : 0);
  const brandY = y + (logoH ? 20 : 0);
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(20);
  docPdf.text(brand, textX, brandY);
  y += logoH ? logoH + 6 : 16;

  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(9);
  const bizAddr = fullAddress(biz);
  if (bizAddr) { docPdf.text(bizAddr, textX, y); y += 12; }
  const phone = biz.business_phone ? `${biz.business_phone}  •  RMP42140` : "RMP42140";
  const bizContact = [biz.business_email, phone].filter(Boolean).join("  •  ");
  if (bizContact) { docPdf.text(bizContact, textX, y); y += 12; }
  docPdf.setFontSize(8);
  docPdf.text("Jon Hart is licensed by the Texas State Board of Plumbing Examiners", textX, y);
  y += 11;
  if (isInvoice) {
    docPdf.setFontSize(7);
    docPdf.setTextColor(120);
    docPdf.text("Invoices are due within 7 days of issuance unless otherwise noted.", textX, y);
    docPdf.setTextColor(0);
    y += 12;
  } else {
    y += 1;
  }

  // Document title (right aligned)
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(22);
  docPdf.text(title, W - M, M + 8, { align: "right" });
  docPdf.setFontSize(10);
  docPdf.setFont("helvetica", "normal");
  docPdf.text(doc.number || "", W - M, M + 24, { align: "right" });
  if (doc.due_date) {
    docPdf.text(`Due: ${new Date(doc.due_date).toLocaleDateString()}`, W - M, M + 38, { align: "right" });
  }

  y = Math.max(y, M + 48) + 8;
  docPdf.setDrawColor(220);
  docPdf.line(M, y, W - M, y);
  y += 18;

  // Bill to / Job site
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(9);
  docPdf.text("BILL TO", M, y);
  docPdf.text("DESCRIPTION", W / 2, y);
  y += 12;
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(10);

  const billLines = [];
  if (customer?.company) {
    billLines.push({ text: customer.company, bold: true });
    if (customer.name) billLines.push({ text: customer.name, bold: false });
  } else if (customer?.name) {
    billLines.push({ text: customer.name, bold: true });
  }
  if (customer?.email) billLines.push({ text: customer.email, bold: false });
  if (customer?.phone) billLines.push({ text: customer.phone, bold: false });
  if (customer && fullAddress(customer)) billLines.push({ text: fullAddress(customer), bold: false });
  billLines.forEach((l) => {
    docPdf.setFont("helvetica", l.bold ? "bold" : "normal");
    docPdf.setFontSize(l.bold ? 10 : 9);
    docPdf.text(l.text, M, y);
    y += 13;
  });

  let y2 = y - billLines.length * 13;
  const descLines = [doc?.name].filter(Boolean);
  descLines.forEach((l) => { docPdf.text(String(l).split("\n")[0], W / 2, y2); y2 += 13; });
  y = Math.max(y, y2) + 14;

  // Line items — mirror the on-screen electronic view (grouped sections, qty × price subtext)
  const totalX = W - M;
  for (const { section, items } of groupLineItemsBySection(doc.line_items)) {
    if (section) {
      docPdf.setFillColor(235, 240, 250);
      docPdf.rect(M, y - 10, W - M * 2, 16, "F");
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(10);
      docPdf.setTextColor(40, 60, 120);
      docPdf.text(section, M + 8, y);
      docPdf.setTextColor(0);
      y += 18;
    }
    for (const li of items) {
      const desc = String(li.description || "—").split("\n")[0];
      let textIndent = 0;
      if (li.image_url) {
        const dataUrl = await loadImageDataUrl(li.image_url);
        if (dataUrl) {
          try {
            const props = docPdf.getImageProperties(dataUrl);
            const th = 26;
            const tw = (props.width / props.height) * th;
            docPdf.addImage(dataUrl, "PNG", M, y - 18, tw, th);
            textIndent = tw + 8;
          } catch { /* ignore */ }
        }
      }
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(10);
      docPdf.text(desc, M + textIndent, y);
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(8);
      docPdf.setTextColor(120);
      const qtyStr = `${li.quantity ?? ""}${li.unit ? ` ${li.unit}` : ""} × ${formatMoney(li.unit_price)}${li.markup ? ` (+${li.markup}% markup)` : ""}`;
      docPdf.text(qtyStr, M + textIndent, y + 11);
      let extraLines = 0;
      if (li.details) {
        docPdf.setFontSize(7);
        const detailLines = docPdf.splitTextToSize(String(li.details), W - M * 2 - textIndent);
        detailLines.slice(0, 2).forEach((l, di) => { docPdf.text(l, M + textIndent, y + 19 + di * 9); });
        docPdf.setFontSize(8);
        extraLines = detailLines.slice(0, 2).length;
      }
      if (li.modifiers && li.modifiers.length > 0) {
        const modText = li.modifiers.map(m => `${m.name}${m.price_adjustment ? ` (${m.price_adjustment >= 0 ? "+" : ""}${formatMoney(m.price_adjustment)})` : ""}`).join("  ·  ");
        const modOffset = extraLines * 9;
        docPdf.setFontSize(7);
        docPdf.text(modText, M + textIndent, y + 19 + modOffset);
        docPdf.setFontSize(8);
        extraLines += 1;
      }
      docPdf.setTextColor(0);
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(10);
      docPdf.text(formatMoney(lineTotal(li)), totalX, y, { align: "right" });
      y += 24 + extraLines * 9;
    }
    if (section) y += 4;
  }

  y += 4;
  docPdf.line(M, y, W - M, y);
  y += 18;

  // Totals (right side)
  const labelX = W - M - 180;
  const valueX = W - M;
  const row = (label, val, bold = false) => {
    if (bold) docPdf.setFont("helvetica", "bold"); else docPdf.setFont("helvetica", "normal");
    docPdf.text(label, labelX, y);
    docPdf.text(val, valueX, y, { align: "right" });
    y += 16;
  };
  row("Subtotal", formatMoney(doc.subtotal));
  row("Tax", formatMoney(doc.tax));
  y += 2;
  docPdf.setFontSize(12);
  row("Total", formatMoney(doc.total), true);
  docPdf.setFontSize(10);

  // Payment schedule
  const schedule = doc.payment_schedule || [];
  if (schedule.length) {
    y += 12;
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(10);
    docPdf.text("Payment Schedule", M, y);
    y += 14;
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(9);
    schedule.forEach((p, i) => {
      const amt = installmentAmount(p, doc.total);
      const status = isInvoice && p.paid ? "PAID" : "Due";
      docPdf.text(`${p.label || `Payment ${i + 1}`}`, M, y);
      docPdf.text(formatMoney(amt), W - M - 120, y, { align: "right" });
      if (isInvoice) docPdf.text(status, W - M, y, { align: "right" });
      y += 14;
    });
  }

  if (doc.notes) {
    y += 14;
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(9);
    docPdf.text("Notes", M, y);
    y += 12;
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(10);
    docPdf.splitTextToSize(doc.notes, W - M * 2).forEach((l) => { docPdf.text(l, M, y); y += 13; });
  }

  // Service Terms & Conditions (own page(s))
  docPdf.addPage();
  y = M;
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(12);
  docPdf.text("Service Terms & Conditions", M, y);
  y += 16;
  const pageHeight = docPdf.internal.pageSize.getHeight();
  const termsBottom = pageHeight - 96;
  const ensurePage = () => { if (y > termsBottom - 12) { docPdf.addPage(); y = M; } };
  for (const t of TERMS) {
    ensurePage();
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(9);
    docPdf.text(t.title, M, y);
    y += 12;
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(8);
    docPdf.splitTextToSize(t.body, W - M * 2).forEach((l) => {
      ensurePage();
      docPdf.text(l, M, y);
      y += 10;
    });
    y += 6;
  }
  ensurePage();
  y += 4;
  docPdf.setFont("helvetica", "italic");
  docPdf.setFontSize(8);
  docPdf.splitTextToSize(ACKNOWLEDGMENT, W - M * 2).forEach((l) => {
    ensurePage();
    docPdf.text(l, M, y);
    y += 10;
  });

  // Status footer
  const pageH = docPdf.internal.pageSize.getHeight();
  docPdf.setDrawColor(220);
  docPdf.line(M, pageH - 96, W - M, pageH - 96);
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(14);
  if (isInvoice) {
    const isPaid = doc.payment_status === "paid";
    if (isPaid) { docPdf.setTextColor(5, 150, 105); } else { docPdf.setTextColor(220, 38, 38); }
    docPdf.text(isPaid ? "PAID IN FULL" : "UNPAID", M, pageH - 64);
  } else {
    docPdf.setTextColor(40, 60, 120);
    docPdf.text("ESTIMATE", M, pageH - 64);
  }
  docPdf.setTextColor(0);
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(9);
  docPdf.text(`${title} ${doc.number || ""}`, W - M, pageH - 64, { align: "right" });
  if (isInvoice && doc.payment_status === "paid" && doc.amount_paid != null) {
    docPdf.text(`Amount paid: ${formatMoney(doc.amount_paid)}`, W - M, pageH - 50, { align: "right" });
  }
  docPdf.setFontSize(8);
  docPdf.setTextColor(120);
  docPdf.text(`Generated ${new Date().toLocaleString()}`, M, pageH - 40);

  const filename = (doc.number || title.toLowerCase()).replace(/\s+/g, "-");
  docPdf.save(`${filename}.pdf`);
}

export async function downloadInvoicePdf({ invoice, customer, settings }) {
  return buildDocumentPdf({ doc: invoice, customer, settings, kind: "invoice" });
}

export async function downloadEstimatePdf({ estimate, customer, settings }) {
  return buildDocumentPdf({ doc: estimate, customer, settings, kind: "estimate" });
}