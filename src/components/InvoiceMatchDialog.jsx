import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, Link2, Unlink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/invoice";

export default function InvoiceMatchDialog({ invoice, onClose }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["ynabTransactions"],
    queryFn: () => base44.entities.YnabTransaction.list("-date", 500),
  });

  const currentMatch = useMemo(
    () => transactions.find((t) => t.matched_invoice_id === invoice?.id && t.matched === "matched") || null,
    [transactions, invoice]
  );

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t) => t.matched !== "matched" && t.matched !== "ignored")
      .filter((t) => !q || (t.payee || "").toLowerCase().includes(q) || (t.memo || "").toLowerCase().includes(q) || (t.account_name || "").toLowerCase().includes(q))
      .slice(0, 50);
  }, [transactions, search]);

  const match = async (tx) => {
    setBusyId(tx.id);
    try {
      await base44.entities.YnabTransaction.update(tx.id, { matched: "matched", matched_invoice_id: invoice.id });
      await queryClient.invalidateQueries({ queryKey: ["ynabTransactions"] });
    } catch (e) {}
    setBusyId(null);
  };

  const unmatch = async () => {
    if (!currentMatch) return;
    setBusyId(currentMatch.id);
    try {
      await base44.entities.YnabTransaction.update(currentMatch.id, { matched: "unmatched", matched_invoice_id: null });
      await queryClient.invalidateQueries({ queryKey: ["ynabTransactions"] });
    } catch (e) {}
    setBusyId(null);
  };

  if (!invoice) return null;

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Match invoice to transaction</DialogTitle>
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 pr-14">
          <div className="font-heading font-semibold truncate">Match invoice to transaction</div>
          <div className="text-xs text-muted-foreground truncate">{invoice.name || invoice.number}</div>
        </div>
        <div className="p-4 space-y-4">
          {currentMatch ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">Currently matched</div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-emerald-500/5">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{currentMatch.payee || currentMatch.memo}</div>
                  <div className="text-xs text-muted-foreground truncate">{currentMatch.date ? new Date(currentMatch.date).toLocaleDateString() : ""} · {currentMatch.account_name}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium tabular-nums">{formatMoney(currentMatch.amount)}</span>
                  <Button size="sm" variant="ghost" onClick={unmatch} disabled={busyId === currentMatch.id} aria-label="Unmatch">
                    {busyId === currentMatch.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions…" className="pl-9" />
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No unmatched transactions.</p>
              ) : (
                <div className="space-y-1.5">
                  {candidates.map((tx) => (
                    <button key={tx.id} type="button" onClick={() => match(tx)} disabled={busyId === tx.id} className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors min-h-11">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{tx.payee || tx.memo || "Unknown payee"}</div>
                          <div className="text-xs text-muted-foreground truncate">{tx.date ? new Date(tx.date).toLocaleDateString() : ""} · {tx.account_name}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-medium tabular-nums">{formatMoney(tx.amount)}</span>
                          {busyId === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4 text-primary" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}