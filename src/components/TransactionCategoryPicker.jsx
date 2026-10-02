import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TransactionCategoryPicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const inputRef = useRef(null);
  const current = value || "";

  const { data: sheetCategories = [] } = useQuery({
    queryKey: ["sheetCategories", "col-a"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getSheetCategories", {});
      return res.data?.categories || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return sheetCategories;
    return sheetCategories.filter((c) => c.toLowerCase().includes(q));
  }, [sheetCategories, input]);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const popW = 208;
    let left = r.right - popW;
    if (left < 8) left = 8;
    setCoords({ top: r.bottom + 4, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popRef.current && popRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) setInput("");
    else setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const commitInput = () => {
    const v = input.trim();
    if (v) { onChange(v); setOpen(false); }
  };

  return (
    <>
      <button
        ref={btnRef}
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
      {open && createPortal(
        <div
          ref={popRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: 208 }}
          className="z-[100] rounded-md border bg-popover shadow-lg py-1 max-h-80 overflow-hidden flex flex-col"
        >
          <div className="px-2 py-1.5 border-b">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitInput(); }
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Type to search or add new…"
              className="w-full rounded-md border bg-background px-2 py-1 text-sm min-h-9"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className="flex items-center justify-between w-full px-3 py-2 text-left text-sm hover:bg-accent min-h-9"
              >
                <span className="truncate">{opt}</span>
                {current === opt && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && input.trim() && (
              <button
                type="button"
                onClick={commitInput}
                className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-accent min-h-9"
              >
                + Add “{input.trim()}”
              </button>
            )}
            {filtered.length === 0 && !input.trim() && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No categories.</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}