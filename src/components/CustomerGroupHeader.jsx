import { ChevronRight } from "lucide-react";

export default function CustomerGroupHeader({ company, name, count, collapsed, onToggle }) {
  const label = company ? `${company} · ${name || ""}`.trim() : (name || "Unknown customer");
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-2 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 select-none hover:bg-muted/60 transition-colors"
    >
      <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${collapsed ? "" : "rotate-90"}`} />
      <span className="truncate">{label}</span>
      {typeof count === "number" ? (
        <span className="ml-1.5 font-normal normal-case text-muted-foreground/60">{count}</span>
      ) : null}
    </button>
  );
}