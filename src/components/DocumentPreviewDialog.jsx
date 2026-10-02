import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileDown, Pencil, Loader2, FileInput, Trash2, Link2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PhaseIndicator from "@/components/PhaseIndicator";
import { Image } from "@/components/ui/image";
import BillTo from "@/components/BillTo";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney, lineTotal, displayUnitPrice, fullAddress, groupLineItemsBySection, installmentAmount } from "@/lib/invoice";
import { downloadInvoicePdf, downloadEstimatePdf } from "@/lib/invoicePdf";
import PaymentScheduleDisplay from "@/components/PaymentScheduleDisplay";
import InvoiceProfitability from "@/components/InvoiceProfitability";
import InvoiceAttachments from "@/components/InvoiceAttachments";
import { useAuth } from "@/lib/AuthContext";

export default function DocumentPreviewDialog({ doc, kind, customer, settings, onClose, editLabel, onEdit, phases, onSavePhase, phaseSaving, onConvert, onDelete, attachments }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!doc) return null;
  const isInvoice = kind === "invoice";
  const canSeeProfit = isInvoice && (user?.role === "admin" || user?.role === "accountant");
  const title = isInvoice ? "Invoice" : "Estimate";
  const editPath = isInvoice ? `/invoices/${doc.id}` : `/estimates/${doc.id}`;

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      if (isInvoice) await downloadInvoicePdf({ invoice: doc, customer, settings });
      else await downloadEstimatePdf({ estimate: doc, customer, settings });
    } catch (e) { /* ignore */ }
    setDownloading(false);
  };

  const edit = () => {
    onClose?.();
    if (onEdit) onEdit();
    else navigate(editPath);
  };

  const handleConvert = async () => {
    if (converting) return;
    setConverting(true);
    try { await onConvert?.(); } catch {} finally { setConverting(false); }
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete this ${title.toLowerCase()}? This cannot be undone.`)) return;
    onDelete?.();
  };

  const copyLink = async () => {
    const tab = isInvoice ? "invoices" : "estimates";
    const params = new URLSearchParams();
    if (customer?.email) params.set("email", customer.email);
    params.set("tab", tab);
    try {
      await navigator.clipboard.writeText(window.location.origin + `/portal?${params.toString()}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">{title} preview</DialogTitle>

        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-background/95 backdrop-blur border-b px-4 py-3 pr-14">
          <div className="min-w-0">
            <div className="font-heading font-semibold truncate">{doc.name || `Untitled ${title.toLowerCase()}`}</div>
            <div className="text-xs text-muted-foreground truncate">{doc.number}</div>
          </div>
          <div className="flex items-center gap-2">
            {!isInvoice && onConvert && doc.status !== "converted" && (
              <Button size="sm" variant="outline" onClick={handleConvert} disabled={converting}>
                {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileInput className="w-4 h-4" />}
                <span className="hidden sm:inline">Convert to invoice</span>
              </Button>
            )}
            {!isInvoice && doc.status === "converted" && doc.converted_invoice_id && (
              <Button size="sm" variant="outline" onClick={() => { onClose?.(); navigate(`/invoices/${doc.converted_invoice_id}`); }}>
                <FileInput className="w-4 h-4" />
                <span className="hidden sm:inline">View invoice</span>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={copyLink}>
              {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={downloadPdf} disabled={downloading}>
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button size="sm" onClick={edit}>
              {!onEdit && <Pencil className="w-4 h-4" />}
              <span className="hidden sm:inline">{editLabel || "Edit"}</span>
            </Button>
            {onDelete && (
              <Button size="icon" variant="ghost" onClick={handleDelete} aria-label={`Delete ${title.toLowerCase()}`}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              {settings?.logo_url && (
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-card border shrink-0">
                  <Image src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="min-w-0">
                <div className="font-heading font-semibold text-lg truncate">{settings?.business_name || "HartServices"}</div>
                {fullAddress(settings) && <div className="text-xs text-muted-foreground">{fullAddress(settings)}</div>}
                <div className="text-xs text-muted-foreground">{[settings?.business_email, settings?.business_phone].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-heading text-xl font-semibold uppercase tracking-tight">{title}</div>
              <div className="text-sm text-muted-foreground">{doc.number}</div>
              {isInvoice && doc.due_date && <div className="text-xs text-muted-foreground">Due {new Date(doc.due_date).toLocaleDateString()}</div>}
              <div className="mt-1"><StatusBadge status={isInvoice ? doc.payment_status : doc.status} /></div>
            </div>
          </div>

          <div className="border-t pt-4 flex flex-wrap gap-6 justify-between">
            <BillTo customer={customer} />
            {doc.name && (
              <div className="min-w-[180px]">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Description</div>
                <div className="text-sm">{doc.name}</div>
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            {groupLineItemsBySection(doc.line_items).map(({ section, items }, gi) => (
              <div key={gi}>
                {section && <div className="bg-primary/10 text-primary font-medium text-sm px-3 py-2">{section}</div>}
                {items.map((li, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 px-3 py-2 border-t first:border-t-0">
                    <div className="min-w-0 flex items-start gap-3">
                      {li.image_url && (
                        <div className="w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
                          <Image src={li.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{li.description || "—"}</div>
                        <div className="text-xs text-muted-foreground">{li.quantity ?? 0}{li.unit ? ` ${li.unit}` : ""} × {formatMoney(displayUnitPrice(li))}</div>
                        {li.details && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{li.details}</div>}
                        {li.modifiers && li.modifiers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {li.modifiers.map((m, mi) => (
                              <span key={mi} className="inline-flex items-center rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs">
                                {m.name}{m.price_adjustment ? ` (${m.price_adjustment >= 0 ? "+" : ""}${formatMoney(m.price_adjustment)})` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-medium tabular-nums shrink-0">{formatMoney(lineTotal(li))}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatMoney(doc.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{formatMoney(doc.tax)}</span></div>
              {isInvoice && doc.cc_fee_enabled && <div className="flex justify-between"><span className="text-muted-foreground">Credit card fee</span><span className="tabular-nums">{formatMoney(doc.cc_fee)}</span></div>}
              <div className="flex justify-between font-semibold border-t pt-1.5"><span>Total</span><span className="tabular-nums">{formatMoney(doc.total)}</span></div>
            </div>
          </div>

          {isInvoice ? (
            <PaymentScheduleDisplay
              schedule={doc.payment_schedule}
              total={doc.total}
              standingBy={doc.standing_by}
            />
          ) : (doc.payment_schedule || []).length > 0 && (
            <div>
              <div className="font-medium text-sm mb-2">Payment Schedule</div>
              <div className="border rounded-lg divide-y">
                {doc.payment_schedule.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{p.label || `Payment ${i + 1}`}</span>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums">{formatMoney(installmentAmount(p, doc.total))}</span>
                      <StatusBadge status={p.paid ? "paid" : "unpaid"} label={p.paid ? "Paid" : "Due"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {doc.notes && (
            <div>
              <div className="font-medium text-sm mb-1">Notes</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{doc.notes}</div>
            </div>
          )}

          {isInvoice && Array.isArray(phases) && phases.length > 0 && onSavePhase && (
            <div className="border-t pt-4">
              <PhaseIndicator invoice={doc} phases={phases} onSave={onSavePhase} busy={phaseSaving} />
            </div>
          )}

          {canSeeProfit && (
            <div className="border-t pt-4">
              <InvoiceProfitability invoiceId={doc.id} invoiceTotal={doc.total} />
            </div>
          )}

          {isInvoice && (
            <div className="border-t pt-4">
              <InvoiceAttachments
                invoiceId={doc.id}
                readOnly={!(user?.role === "admin" || user?.role === "tech" || user?.role === "accountant")}
                preloaded={attachments}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}