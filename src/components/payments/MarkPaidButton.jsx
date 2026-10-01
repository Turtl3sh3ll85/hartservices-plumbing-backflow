import { useState } from "react";
import { Banknote, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function MarkPaidButton({ onClick, className, label }) {
  const [saving, setSaving] = useState(false);
  const markPaid = async (event) => {
    event.stopPropagation();
    if (saving) return;
    setSaving(true);
    try { await onClick(); } finally { setSaving(false); }
  };
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={markPaid} onPointerDown={(event) => event.stopPropagation()}
            disabled={saving} aria-label={`Mark ${label || "payment"} paid by check`} title="Mark paid by check"
            className={`pointer-events-auto inline-flex items-center justify-center rounded-full border min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 sm:h-7 sm:w-7 shrink-0 transition-colors disabled:opacity-60 ${className}`}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>Mark paid by check</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}