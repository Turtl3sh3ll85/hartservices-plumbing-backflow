import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const CATEGORY_OPTIONS = [
  "Plumbing",
  "Backflow",
  "Service",
  "Materials",
  "Labor",
  "Equipment",
  "Subscriptions",
  "Fees",
  "Transfer",
  "Refund",
  "Income",
  "Other",
];

export default function TransactionCategoryPicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = value || "";

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border min-h-9",
          current
            ? "bg-primary/10 text-primary border-primary/20"
            : "bg-muted text-muted-foreground border-border hover:bg-accent"
        )}
      >
        <span className="max-w-[120px] truncate">{current || "Categorize"}</span>
        {current ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 right-0 w-44 rounded-md border bg-popover shadow-md py-1 max-h-60 overflow-y-auto">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className="flex items-center justify-between w-full px-3 py-2 text-left text-sm hover:bg-accent min-h-9"
            >
              {opt}
              {current === opt && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}