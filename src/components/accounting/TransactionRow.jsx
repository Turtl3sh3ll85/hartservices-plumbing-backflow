import { useRef, useState } from "react";
import { Link2, Unlink, Ban, Paperclip, Download, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import TransactionCategoryPicker from "@/components/TransactionCategoryPicker";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatDate } from "@/lib/format";

export default function TransactionRow({
  t,
  invoice,
  onLink,
  onUnlink,
  onIgnore,
  onCategoryChange,
  onCategoryBlur,
  onPinReceipt,
  onToggleUnmatchable,
  editableCategory = true,
  showIgnore = true,
  showAccount = true,
  showUnmatchableToggle = false,
}) {
  const fileRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleCategory = (val) => {
    onCategoryChange?.(t.id, val);
    onCategoryBlur?.(t.id, val);
  };

  const downloadReceipt = async () => {
    if (!t.receipt_file_uri) return;
    setDownloading(true);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: t.receipt_file_uri });
      window.open(signed_url, "_blank");
    } catch {
      setDownloading(false);
    }
  };

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (f) onPinReceipt?.(t, f);
    e.target.value = "";
  };

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{t.payee || "Unknown"}</span>
          {t.receipt_file_uri && (
            <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDate(t.date)}
          {showAccount && (
            <>
              {" · "}{t.account_name}
              {t.account_mask ? ` ···${t.account_mask}` : ""}
            </>
          )}
        </div>
        {editableCategory && (
          <div className="mt-1">
            <TransactionCategoryPicker
              value={t.custom_category || t.category || ""}
              onChange={handleCategory}
            />
          </div>
        )}
        {!editableCategory && (t.custom_category || t.category) ? (
          <div className="mt-1 text-xs text-muted-foreground truncate">
            {t.custom_category || t.category}
          </div>
        ) : null}
      </div>
      <div className="flex gap-1 shrink-0">
        {t.receipt_file_uri ? (
          <Button variant="ghost" size="icon" onClick={downloadReceipt} disabled={downloading} aria-label="Download receipt">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </Button>
        ) : (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
            <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} aria-label="Pin receipt">
              <Plus className="w-4 h-4" />
            </Button>
          </>
        )}
        {t.matched === "matched" && (
          <Button variant="ghost" size="icon" onClick={() => onUnlink?.(t)} aria-label="Unlink">
            <Unlink className="w-4 h-4" />
          </Button>
        )}
        {showUnmatchableToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleUnmatchable?.(t)}
            aria-label={t.matched === "unmatchable" ? "Mark matchable" : "Mark unmatchable"}
          >
            <Ban className={`w-4 h-4 ${t.matched === "unmatchable" ? "text-destructive" : "text-muted-foreground"}`} />
          </Button>
        )}
        {t.matched !== "matched" && t.matched !== "not_a_job" && t.matched !== "ignored" && t.matched !== "unmatchable" && (
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
      <div className="text-right shrink-0">
        <div className="font-medium tabular-nums">{formatCurrency(t.amount)}</div>
        {invoice ? (
          <div className="text-xs text-primary truncate max-w-[160px]">{invoice.name || invoice.number}</div>
        ) : (
          <StatusBadge status={t.matched} />
        )}
      </div>
    </div>
  );
}