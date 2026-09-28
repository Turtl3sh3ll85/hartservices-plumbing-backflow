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

export async function downloadInvoicePdf({ invoice, customer, settings }) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
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
        const props = doc.getImageProperties(dataUrl);
        logoH = 40;
        logoW = (props.width / props.height) * logoH;
        doc.addImage(dataUrl, "PNG", M, y, logoW, logoH);
      } catch { /* ignore */ }
    }
  }

  // Brand name (to the right of the logo)
  const textX = M + logoW + (logoW ? 12 : 0);
  const brandY = y + (logoH ? 20 : 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(brand, textX, brandY);
  y += logoH ? logoH + 6 : 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const bizAddr = fullAddress(biz);
  if (bizAddr) { doc.text(bizAddr, textX, y); y += 12; }
  const phone = biz.business_phone ? `${biz.business_phone}  •  RMP42140` : "RMP42140";
  const bizContact = [biz.business_email, phone].filter(Boolean).join("  •  ");
  if (bizContact) { doc.text(bizContact, textX, y); y += 12; }
  doc.setFontSize(8);
  doc.text("Jon Hart is licensed by the Texas State Board of Plumbing Examiners", textX, y);
  y += 12;

  // Invoice title (right aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("INVOICE", W - M, M + 8, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.number || "", W - M, M + 24, { align: "right" });
  if (invoice.due_date) {
    doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, W - M, M + 38, { align: "right" });
  }

  y = Math.max(y, M + 48) + 8;
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 18;

  // Bill to / Job site
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BILL TO", M, y);
  doc.text("DESCRIPTION", W / 2, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const billLines = [
    customer?.name,
    customer?.company,
    customer && fullAddress(customer),
  ].filter(Boolean);
  billLines.forEach((l) => { doc.text(l, M, y); y += 13; });

  let y2 = y - billLines.length * 13;
  const descLines = [invoice?.name].filter(Boolean);
  descLines.forEach((l) => { doc.text(String(l).split("\n")[0], W / 2, y2); y2 += 13; });
  y = Math.max(y, y2) + 14;

  // Line items table
  const colX = { desc: M, qty: W - M - 220, price: W - M - 130, total: W - M };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("DESCRIPTION", colX.desc, y);
  doc.text("QTY", colX.qty, y, { align: "right" });
  doc.text("PRICE", colX.price, y, { align: "right" });
  doc.text("AMOUNT", colX.total, y, { align: "right" });
  doc.setTextColor(0);
  y += 6;
  doc.line(M, y, W - M, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const { section, items } of groupLineItemsBySection(invoice.line_items)) {
    if (section) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(section, colX.desc, y);
      doc.setTextColor(0);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    for (const li of items) {
      const desc = String(li.description || "—").split("\n");
      let textIndent = 0;
      if (li.image_url) {
        const dataUrl = await loadImageDataUrl(li.image_url);
        if (dataUrl) {
          try {
            const props = doc.getImageProperties(dataUrl);
            const th = 24;
            const tw = (props.width / props.height) * th;
            doc.addImage(dataUrl, "PNG", colX.desc, y - 16, tw, th);
            textIndent = tw + 6;
          } catch { /* ignore */ }
        }
      }
      doc.text(desc[0], colX.desc + textIndent, y);
      doc.text(String(li.quantity ?? ""), colX.qty, y, { align: "right" });
      doc.text(formatMoney(li.unit_price), colX.price, y, { align: "right" });
      doc.text(formatMoney(lineTotal(li)), colX.total, y, { align: "right" });
      y += 16;
    }
  }

  y += 6;
  doc.line(M, y, W - M, y);
  y += 18;

  // Totals (right side)
  const labelX = W - M - 180;
  const valueX = W - M;
  const row = (label, val, bold = false) => {
    if (bold) doc.setFont("helvetica", "bold"); else doc.setFont("helvetica", "normal");
    doc.text(label, labelX, y);
    doc.text(val, valueX, y, { align: "right" });
    y += 16;
  };
  row("Subtotal", formatMoney(invoice.subtotal));
  row("Tax", formatMoney(invoice.tax));
  y += 2;
  doc.setFontSize(12);
  row("Total", formatMoney(invoice.total), true);
  doc.setFontSize(10);

  // Payment schedule
  const schedule = invoice.payment_schedule || [];
  if (schedule.length) {
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Payment Schedule", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    schedule.forEach((p, i) => {
      const amt = installmentAmount(p, invoice.total);
      const status = p.paid ? "PAID" : "Due";
      doc.text(`${p.label || `Payment ${i + 1}`}`, M, y);
      doc.text(formatMoney(amt), W - M - 120, y, { align: "right" });
      doc.text(status, W - M, y, { align: "right" });
      y += 14;
    });
  }

  if (invoice.notes) {
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Notes", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.splitTextToSize(invoice.notes, W - M * 2).forEach((l) => { doc.text(l, M, y); y += 13; });
  }

  // Service Terms & Conditions (own page(s))
  doc.addPage();
  y = M;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Service Terms & Conditions", M, y);
  y += 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  const termsBottom = pageHeight - 96;
  const ensurePage = () => { if (y > termsBottom - 12) { doc.addPage(); y = M; } };
  for (const t of TERMS) {
    ensurePage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(t.title, M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.splitTextToSize(t.body, W - M * 2).forEach((l) => {
      ensurePage();
      doc.text(l, M, y);
      y += 10;
    });
    y += 6;
  }
  ensurePage();
  y += 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.splitTextToSize(ACKNOWLEDGMENT, W - M * 2).forEach((l) => {
    ensurePage();
    doc.text(l, M, y);
    y += 10;
  });

  // Status footer
  const isPaid = invoice.payment_status === "paid";
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220);
  doc.line(M, pageH - 96, W - M, pageH - 96);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  if (isPaid) { doc.setTextColor(5, 150, 105); } else { doc.setTextColor(220, 38, 38); }
  doc.text(isPaid ? "PAID IN FULL" : "UNPAID", M, pageH - 64);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Invoice ${invoice.number || ""}`, W - M, pageH - 64, { align: "right" });
  if (isPaid && invoice.amount_paid != null) {
    doc.text(`Amount paid: ${formatMoney(invoice.amount_paid)}`, W - M, pageH - 50, { align: "right" });
  }
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, M, pageH - 40);

  doc.save(`${(invoice.number || "invoice").replace(/\s+/g, "-")}.pdf`);
}