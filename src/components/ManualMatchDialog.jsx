import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/invoice";
import { Loader2 } from "lucide-react";

export default function ManualMatchDialog({ transaction, invoices, onMatch, onIgnore, onClose, busy }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? invoices.filter((i) =>
          (i.number || "").toLowerCase().includes(q) ||
          (i.name || "").toLowerCase().includes(q)
        )
      : invoices;
    return base.slice(0, 50);
  }, [query, invoices]);

  return (
    <Dialog open={!!transaction} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Match transaction</DialogTitle>
        </DialogHeader>
        {transaction && (
          <div className="text-sm text-muted-foreground mb-3">
            <span className="font-medium text-foreground">{transaction.payee || transaction.memo || "Unknown payee"}</span>
            {" · "}{formatMoney(transaction.amount)}
            {transaction.date ? ` · ${new Date(transaction.date).toLocaleDateString()}` : ""}
          </div>
        )}
        <Input
          placeholder="Type invoice number or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="max-h-80 overflow-y-auto divide-y rounded-md border">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No invoices found.</div>
          ) : (
            filtered.map((inv) => (
              <button
                key={inv.id}
                onClick={() => onMatch(inv.id)}
                disabled={busy}
                className="flex items-center justify-between w-full p-3 text-left hover:bg-accent disabled:opacity-50 min-h-11"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{inv.name || inv.number}</div>
                  <div className="text-xs text-muted-foreground capitalize">{inv.number} · {inv.payment_status}</div>
                </div>
                <span className="text-sm tabular-nums shrink-0">{formatMoney(inv.total)}</span>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={onIgnore}
            disabled={busy}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:opacity-50 min-h-11"
          >
            Transaction not for a job
          </button>
          {busy && (
            <span className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}