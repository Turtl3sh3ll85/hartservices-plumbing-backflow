import jsPDF from "jspdf";
import { formatMoney, lineTotal, fullAddress } from "@/lib/invoice";

function installmentAmount(item, total) {
  return item.type === "percentage"
    ? ((Number(total) || 0) * (Number(item.value) || 0)) / 100
    : (Number(item.value) || 0);
}

export function downloadInvoicePdf({ invoice, job, customer, settings }) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = M;

  const biz = settings || {};
  const brand = biz.business_name || "FlowPro Plumbing";

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(brand, M, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const bizAddr = fullAddress(biz);
  const bizContact = [biz.business_email, biz.business_phone].filter(Boolean).join("  •  ");
  if (bizAddr) { doc.text(bizAddr, M, y); y += 12; }
  if (bizContact) { doc.text(bizContact, M, y); y += 12; }

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
  doc.text("JOB SITE", W / 2, y);
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
  const jobLines = [
    job?.title,
    job && fullAddress(job, "job_"),
  ].filter(Boolean);
  jobLines.forEach((l) => { doc.text(l, W / 2, y2); y2 += 13; });
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
  (invoice.line_items || []).forEach((li) => {
    const desc = String(li.description || "—").split("\n");
    doc.text(desc[0], colX.desc, y);
    doc.text(String(li.quantity ?? ""), colX.qty, y, { align: "right" });
    doc.text(formatMoney(li.unit_price), colX.price, y, { align: "right" });
    doc.text(formatMoney(lineTotal(li)), colX.total, y, { align: "right" });
    y += 16;
  });

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