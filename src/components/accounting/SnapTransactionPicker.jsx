import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Link2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";

// Lists Plaid transactions to pin a snapped receipt to. Searchable by payee
// or account. onPick(transaction) is called when the user selects one.
export default function SnapTransactionPicker({ open, onClose, onPick, busyId }) {
  const [query, setQuery] = useState("");
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.entities.Transaction.list("-date", 200)
      .then(setTxs)
      .catch(() => setTxs([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return txs;
    return txs.filter((t) =>
      [t.payee, t.memo, t.account_name].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [txs, query]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Attach to transaction
          </DialogTitle>
          <DialogDescription>Pin this receipt to a transaction.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search payee or account"
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
            <p className="text-sm text-muted-foreground py-6 text-center">No transactions found.</p>
          ) : (
            filtered.slice(0, 50).map((tx) => (
              <button
                key={tx.id}
                onClick={() => onPick(tx)}
                disabled={!!busyId}
                className="flex items-center justify-between gap-3 w-full text-left px-3 py-2.5 min-h-11 hover:bg-accent disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{tx.payee || "Unknown payee"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {tx.date ? formatDate(tx.date) : ""}{tx.account_name ? ` · ${tx.account_name}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(tx.amount)}</span>
                  {busyId === tx.id ? (
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