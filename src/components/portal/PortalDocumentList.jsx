import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, FileDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import CustomerGroupedList from "@/components/CustomerGroupedList";
import StatusBadge from "@/components/StatusBadge";
import PaymentMilestoneList from "@/components/PaymentMilestoneList";
import { formatMoney } from "@/lib/invoice";
import { amountPaidTotal } from "@/lib/format";
import { downloadInvoicePdf, downloadEstimatePdf } from "@/lib/invoicePdf";

/**
 * Shared portal document list — renders invoices or estimates exactly like
 * the customer portal tabs (MyDocuments). Used by both MyDocuments and the
 * admin CustomerPortalPreviewDialog so the two never drift.
 *
 * Props:
 *  - kind: "invoice" | "estimate"
 *  - items: array of invoice/estimate records
 *  - customers: array of customer records (for grouping + bill-to on PDF)
 *  - settings: business settings (for PDF rendering)
 *  - onPreview(doc): called when a row's name/number is clicked
 */
export default function PortalDocumentList({ kind, items, customers, settings, onPreview, onPayNow, onStatusChange }) {
  const [hidePaid, setHidePaid] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const customerFor = (doc) => customers.find((c) => c.id === doc.customer_id) || customers[0];

  const downloadPdf = async (doc) => {
    const key = `${kind}:${doc.id}`;
    setDownloading(key);
    try {
      const customer = customerFor(doc);
      if (kind === "invoice") await downloadInvoicePdf({ invoice: doc, customer, settings });
      else await downloadEstimatePdf({ estimate: doc, customer, settings });
    } catch (e) { /* ignore */ }
    setDownloading(null);
  };

  if (kind === "invoice") {
    const visible = hidePaid ? items.filter((i) => i.payment_status !== "paid") : items;
    return (
      <div>
        {items.length > 0 && (
          <div className="flex justify-end mb-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
              <Switch checked={hidePaid} onCheckedChange={setHidePaid} aria-label="Hide paid invoices" />
              <span>Hide paid</span>
            </label>
          </div>
        )}
        {visible.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No invoices yet." : "All invoices are hidden."}
          </Card>
        ) : (
          <CustomerGroupedList
            items={visible}
            customers={customers}
            renderItem={({ item: i }) => (
              <div key={i.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 min-h-11">
                  <button type="button" onClick={() => onPreview(i)} className="min-w-0 text-left min-h-11 -m-1 p-1">
                    <div className="font-medium truncate">
                      {i.name || "Invoice"} <span className="text-sm text-muted-foreground font-normal">{i.number}{i.due_date ? ` · Due ${new Date(i.due_date).toLocaleDateString()}` : ""}</span>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(i)} disabled={downloading === `invoice:${i.id}`} aria-label="Download invoice PDF">
                      {downloading === `invoice:${i.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    </Button>
                    <div className="text-right ml-1">
                      <div className="font-medium tabular-nums">{formatMoney(i.total)}</div>
                      {(() => { const paid = amountPaidTotal(i.payment_schedule, i.total); return paid > 0 ? <div className="text-xs text-muted-foreground tabular-nums">{formatMoney(paid)} paid</div> : null; })()}
                    </div>
                  </div>
                </div>
                <PaymentMilestoneList
                  schedule={i.payment_schedule}
                  total={i.total}
                  standingBy={i.standing_by}
                  customerReady={i.customer_ready_for_next_stage}
                  readOnly={!onStatusChange}
                  onStatusChange={onStatusChange ? (status, index) => onStatusChange(i, status, index) : undefined}
                  onPayNow={onPayNow ? (idx) => onPayNow(i, idx) : undefined}
                />
              </div>
            )}
          />
        )}
      </div>
    );
  }

  // estimates
  return (
    <div>
      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No estimates yet.</Card>
      ) : (
        <CustomerGroupedList
          items={items}
          customers={customers}
          renderItem={({ item: e }) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
              <button type="button" onClick={() => onPreview(e)} className="min-w-0 text-left min-h-11 -m-1 p-1">
                <div className="font-medium truncate">{e.name || "Estimate"}</div>
                <div className="text-sm text-muted-foreground truncate">{e.number}</div>
              </button>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium tabular-nums">{formatMoney(e.total)}</span>
                <StatusBadge status={e.status} />
                <Button size="sm" variant="outline" onClick={() => downloadPdf(e)} disabled={downloading === `estimate:${e.id}`} aria-label="Download estimate PDF">
                  {downloading === `estimate:${e.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                </Button>
                <Button asChild size="sm" variant="outline"><Link to={`/accept/${e.id}`}>{e.status === "converted" ? "View" : "Review"}</Link></Button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}