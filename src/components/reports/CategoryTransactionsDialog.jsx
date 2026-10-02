import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/invoice";
import { formatDate } from "@/lib/format";

export default function CategoryTransactionsDialog({ category, transactions, onClose }) {
  const open = !!category;
  const list = open ? transactions.filter((t) => {
    const cat = (t.custom_category || "").trim() || (t.category || "").trim() || "Uncategorized";
    return cat === category;
  }) : [];
  const sum = list.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogTitle className="flex items-center justify-between gap-3 pr-8">
          <span className="truncate">{category}</span>
          <span className="text-sm font-normal text-muted-foreground tabular-nums shrink-0">
            {list.length} {list.length === 1 ? "transaction" : "transactions"} · {formatMoney(sum)}
          </span>
        </DialogTitle>

        {list.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No transactions in this category.</div>
        ) : (
          <div className="border rounded-lg divide-y mt-2">
            {list.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-3 px-3 py-2.5 min-h-11">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.payee || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(t.date)}{t.account_name ? ` · ${t.account_name}` : ""}{t.memo ? ` · ${t.memo}` : ""}
                  </div>
                </div>
                <div className="text-sm font-medium tabular-nums shrink-0">{formatMoney(Math.abs(Number(t.amount) || 0))}</div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}