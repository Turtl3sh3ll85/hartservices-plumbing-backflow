import { Link2, Unlink, Ban, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";

export default function TransactionRow({
  t,
  invoice,
  onLink,
  onUnlink,
  onIgnore,
  onCategoryChange,
  onCategoryBlur,
  editableCategory = true,
  showIgnore = true,
}) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{t.payee || "Unknown"}</span>
          {(t.receipt_email_id || t.receipt_file_uri) && (
            <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDate(t.date)} · {t.account_name}
          {t.account_mask ? ` ···${t.account_mask}` : ""}
        </div>
        {editableCategory ? (
          <input
            value={t.custom_category || t.category || ""}
            onChange={(e) => onCategoryChange?.(t.id, e.target.value)}
            onBlur={(e) => onCategoryBlur?.(t.id, e.target.value)}
            placeholder="Category"
            className="mt-1 text-xs text-muted-foreground bg-transparent border-none p-0 w-full focus:outline-none focus:ring-0"
          />
        ) : (t.custom_category || t.category) ? (
          <div className="mt-1 text-xs text-muted-foreground truncate">
            {t.custom_category || t.category}
          </div>
        ) : null}
      </div>
      <div className="text-right shrink-0">
        <div className="font-medium tabular-nums">{formatCurrency(t.amount)}</div>
        {invoice ? (
          <div className="text-xs text-primary truncate max-w-[160px]">{invoice.name || invoice.number}</div>
        ) : (
          <StatusBadge status={t.matched} />
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        {t.matched === "matched" && (
          <Button variant="ghost" size="icon" onClick={() => onUnlink?.(t)} aria-label="Unlink">
            <Unlink className="w-4 h-4" />
          </Button>
        )}
        {t.matched !== "matched" && t.matched !== "not_a_job" && t.matched !== "ignored" && (
          <Button variant="ghost" size="icon" onClick={() => onLink?.(t)} aria-label="Link invoice">
            <Link2 className="w-4 h-4" />
          </Button>
        )}
        {showIgnore && (
          <Button variant="ghost" size="icon" onClick={() => onIgnore?.(t)} aria-label="Toggle ignore">
            <Ban className={`w-4 h-4 ${t.matched === "ignored" ? "text-muted-foreground" : "text-destructive"}`} />
          </Button>
        )}
      </div>
    </div>
  );
}