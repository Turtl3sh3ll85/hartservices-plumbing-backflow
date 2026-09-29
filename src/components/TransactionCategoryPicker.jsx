import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TransactionCategoryPicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef(null);
  const current = value || "";

  const { data: sheetCategories = [] } = useQuery({
    queryKey: ["sheetCategories"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getSheetCategories", {});
      return res.data?.categories || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) { setManual(false); setInput(""); }
  }, [open]);

  const commitManual = () => {
    const v = input.trim();
    if (v) { onChange(v); setOpen(false); }
  };

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
        <div className="absolute z-20 mt-1 right-0 w-48 rounded-md border bg-popover shadow-md py-1 max-h-72 overflow-y-auto">
          {sheetCategories.map((opt) => (
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
          {sheetCategories.length > 0 && <div className="border-t my-1" />}
          {!manual ? (
            <button
              type="button"
              onClick={() => setManual(true)}
              className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent min-h-9"
            >
              + Enter manually...
            </button>
          ) : (
            <div className="px-2 py-1.5 flex gap-1.5">
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitManual(); }}
                placeholder="Category name"
                className="flex-1 min-w-0 rounded-md border bg-background px-2 py-1 text-sm min-h-9"
              />
              <button
                type="button"
                onClick={commitManual}
                className="rounded-md bg-primary text-primary-foreground px-2 text-xs min-h-9"
              >
                Set
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}