import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";

// Lists invoices to pin a snapped receipt to. Searchable by name or number.
// onPick(invoice) is called when the user selects one.
export default function SnapInvoicePicker({ open, onClose, onPick, busyId }) {
  const [query, setQuery] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.entities.Invoice.list("-created_date", 200)
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((i) =>
      [i.name, i.number].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [invoices, query]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Pin to invoice
          </DialogTitle>
          <DialogDescription>
            Pin this receipt to an invoice. When the matching transaction posts, it will be linked to the same invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice name or number"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto -mx-1 px-1 divide-y rounded-md border">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No invoices found.</p>
          ) : (
            filtered.slice(0, 50).map((inv) => (
              <button
                key={inv.id}
                onClick={() => onPick(inv)}
                disabled={!!busyId}
                className="flex items-center justify-between gap-3 w-full text-left px-3 py-2.5 min-h-11 hover:bg-accent disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{inv.name || inv.number || "Untitled invoice"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {inv.number ? `${inv.number} · ` : ""}{inv.due_date ? formatDate(inv.due_date) : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(inv.total)}</span>
                  {busyId === inv.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-xs text-primary">Pin</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}