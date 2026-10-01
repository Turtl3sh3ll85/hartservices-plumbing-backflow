import { ChevronRight, GripVertical } from "lucide-react";

export default function CustomerGroupHeader({ company, name, count, collapsed, onToggle, dragHandleProps }) {
  const label = company ? `${company} · ${name || ""}`.trim() : (name || "Unknown customer");
  return (
    <div className="w-full flex items-center gap-1.5 px-4 py-2 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 select-none">
      <span
        {...(dragHandleProps || {})}
        className="touch-none cursor-grab text-muted-foreground/40 hover:text-muted-foreground/70 shrink-0"
        title="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-muted/60 transition-colors rounded px-1.5 py-0.5 -mx-1.5"
      >
        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${collapsed ? "" : "rotate-90"}`} />
        <span className="truncate">{label}</span>
        {typeof count === "number" ? (
          <span className="ml-1.5 font-normal normal-case text-muted-foreground/60">{count}</span>
        ) : null}
      </button>
    </div>
  );
}