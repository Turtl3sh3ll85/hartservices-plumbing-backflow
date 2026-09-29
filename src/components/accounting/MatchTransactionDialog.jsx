import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, Link2, Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/invoice";

export default function MatchTransactionDialog({ open, file, onClose, onDone }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [pinningId, setPinningId] = useState(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["ynabTransactions"],
    queryFn: async () => base44.entities.YnabTransaction.list("-date", 500),
    enabled: open,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) =>
      [t.payee, t.memo, t.account_name].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [transactions, query]);

  const pin = async (tx) => {
    const receipts = Array.isArray(tx.receipts) ? tx.receipts : [];
    if (receipts.some((r) => r.drive_file_id === file.id)) {
      onDone?.(tx);
      onClose();
      return;
    }
    const next = [...receipts, {
      drive_file_id: file.id,
      name: file.name,
      link: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      thumbnail_url: "",
    }];
    setPinningId(tx.id);
    try {
      await base44.entities.YnabTransaction.update(tx.id, { receipts: next });
      await queryClient.invalidateQueries({ queryKey: ["ynabTransactions"] });
      onDone?.(tx);
      onClose();
    } catch (e) {}
    setPinningId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" /> Match receipt to transaction
          </DialogTitle>
          <DialogDescription>
            Pin <span className="font-medium text-foreground">{file?.name}</span> to a transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search payee, memo, or account"
            className="pl-9"
          />
        </div>

        <div className="max-h-80 overflow-y-auto -mx-1 px-1 divide-y rounded-md border">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No transactions found.</p>
          ) : (
            filtered.map((tx) => {
              const already = Array.isArray(tx.receipts) && tx.receipts.some((r) => r.drive_file_id === file?.id);
              return (
                <button
                  key={tx.id}
                  onClick={() => pin(tx)}
                  disabled={pinningId === tx.id}
                  className="flex items-center justify-between gap-3 w-full text-left px-3 py-2.5 min-h-11 hover:bg-accent disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{tx.payee || tx.memo || "Unknown payee"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {tx.date ? new Date(tx.date).toLocaleDateString() : ""}{tx.account_name ? ` · ${tx.account_name}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium tabular-nums">{formatMoney(tx.amount)}</span>
                    {already ? (
                      <span className="text-xs text-emerald-600 inline-flex items-center gap-1"><Link2 className="w-3 h-3" />Pinned</span>
                    ) : pinningId === tx.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="text-xs text-primary">Pin</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}