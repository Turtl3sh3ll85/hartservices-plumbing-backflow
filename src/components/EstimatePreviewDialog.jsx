import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileDown, Pencil, Loader2, FileInput, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import BillTo from "@/components/BillTo";
import StatusBadge from "@/components/StatusBadge";
import OpenedIndicator from "@/components/OpenedIndicator";
import { formatMoney, lineTotal, fullAddress, groupLineItemsBySection, installmentAmount } from "@/lib/invoice";
import { downloadEstimatePdf } from "@/lib/invoicePdf";

const MODE_LABEL = { single: "Single", a_la_carte: "À la carte", side_by_side: "Side-by-side" };

export default function EstimatePreviewDialog({ doc, customer, settings, onClose, onConvert, onDelete }) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [converting, setConverting] = useState(false);
  if (!doc) return null;

  const editPath = `/estimates/${doc.id}`;

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadEstimatePdf({ estimate: doc, customer, settings });
    } catch (e) { /* ignore */ }
    setDownloading(false);
  };

  const edit = () => {
    onClose?.();
    navigate(editPath);
  };

  const handleConvert = async () => {
    if (converting) return;
    setConverting(true);
    try { await onConvert?.(); } catch {} finally { setConverting(false); }
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete this estimate? This cannot be undone.`)) return;
    onDelete?.();
  };

  const renderLineItems = (lineItems) => (
    <div className="border rounded-lg overflow-hidden">
      {groupLineItemsBySection(lineItems).map(({ section, items }, gi) => (
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
                  <div className="text-xs text-muted-foreground">{li.quantity ?? 0} × {formatMoney(li.unit_price)}</div>
                  {li.details && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{li.details}</div>}
                </div>
              </div>
              <div className="text-sm font-medium tabular-nums shrink-0">{formatMoney(lineTotal(li))}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderTotals = (data) => (
    <div className="flex justify-end">
      <div className="w-full max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatMoney(data.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{formatMoney(data.tax)}</span></div>
        {data.cc_fee_enabled && <div className="flex justify-between"><span className="text-muted-foreground">Credit card fee</span><span className="tabular-nums">{formatMoney(data.cc_fee)}</span></div>}
        <div className="flex justify-between font-semibold border-t pt-1.5"><span>Total</span><span className="tabular-nums">{formatMoney(data.total)}</span></div>
      </div>
    </div>
  );

  const renderPaymentSchedule = (schedule, total) => {
    if (!schedule || schedule.length === 0) return null;
    return (
      <div>
        <div className="font-medium text-sm mb-2">Payment Schedule</div>
        <div className="border rounded-lg divide-y">
          {schedule.map((p, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{p.label || `Payment ${i + 1}`}</span>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{formatMoney(installmentAmount(p, total))}</span>
                <StatusBadge status={p.paid ? "paid" : "unpaid"} label={p.paid ? "Paid" : "Due"} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Side-by-side or a la carte: show options
  const hasOptions = (doc.options || []).length > 0;

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Estimate preview</DialogTitle>

        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-background/95 backdrop-blur border-b px-4 py-3 pr-14">
          <div className="min-w-0">
            <div className="font-heading font-semibold truncate">{doc.name || "Untitled estimate"}</div>
            <div className="text-xs text-muted-foreground truncate">{doc.number}</div>
          </div>
          <div className="flex items-center gap-2">
            {onConvert && doc.status !== "converted" && (
              <Button size="sm" variant="outline" onClick={handleConvert} disabled={converting}>
                {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileInput className="w-4 h-4" />}
                <span className="hidden sm:inline">Convert to invoice</span>
              </Button>
            )}
            {doc.status === "converted" && doc.converted_invoice_id && (
              <Button size="sm" variant="outline" onClick={() => { onClose?.(); navigate(`/invoices/${doc.converted_invoice_id}`); }}>
                <FileInput className="w-4 h-4" />
                <span className="hidden sm:inline">View invoice</span>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={downloadPdf} disabled={downloading}>
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button size="sm" onClick={edit}>
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            {onDelete && (
              <Button size="icon" variant="ghost" onClick={handleDelete} aria-label="Delete estimate">
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
              <div className="font-heading text-xl font-semibold uppercase tracking-tight">Estimate</div>
              <div className="text-sm text-muted-foreground">{doc.number}</div>
              <div className="flex items-center gap-2 justify-end mt-1">
                <StatusBadge status={doc.status} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 flex flex-wrap gap-6 justify-between">
            <BillTo customer={customer} />
            <div className="flex flex-col items-end gap-2 min-w-[180px]">
              {doc.name && (
                <div className="min-w-[180px]">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Description</div>
                  <div className="text-sm">{doc.name}</div>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{MODE_LABEL[doc.selection_mode || "single"]}</span>
                <OpenedIndicator opened={doc.opened} lastOpenedDate={doc.last_opened_date} />
              </div>
            </div>
          </div>

          {/* Single mode: show line_items directly */}
          {!hasOptions && doc.line_items && doc.line_items.length > 0 && (
            <>
              {renderLineItems(doc.line_items)}
              {renderTotals(doc)}
              {renderPaymentSchedule(doc.payment_schedule, doc.total)}
            </>
          )}

          {/* Side-by-side / a la carte: show each option */}
          {hasOptions && doc.options.map((opt, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b pb-2">
                <div className="font-heading font-semibold">{opt.label || `Option ${i + 1}`}</div>
                {doc.selected_option_label === opt.label && (
                  <StatusBadge status="approved" label="Selected" />
                )}
              </div>
              {opt.description && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{opt.description}</div>}
              {opt.line_items && opt.line_items.length > 0 && renderLineItems(opt.line_items)}
              {renderTotals(opt)}
              {renderPaymentSchedule(opt.payment_schedule, opt.total)}
              {opt.notes && (
                <div>
                  <div className="font-medium text-sm mb-1">Option Notes</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{opt.notes}</div>
                </div>
              )}
            </div>
          ))}

          {doc.notes && (
            <div>
              <div className="font-medium text-sm mb-1">Notes</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{doc.notes}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}