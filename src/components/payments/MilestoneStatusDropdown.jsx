import { useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export default function MilestoneStatusDropdown({ status, statuses, labels, icons, styles, onChange, readOnly, label }) {
  const [saving, setSaving] = useState(false);
  const StatusIcon = icons[status];
  const changeStatus = async (value) => {
    if (saving || value === status) return;
    setSaving(true);
    try { await onChange(value); } finally { setSaving(false); }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}
          disabled={readOnly || !onChange || saving} aria-label={`${label || "Payment"} status: ${labels[status]}`}
          className={`pointer-events-auto inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 h-7 shrink-0 border transition-colors ${styles[status]} disabled:opacity-100 disabled:cursor-default`}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <StatusIcon className="w-3 h-3" />}
          {labels[status]}<ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40" onClick={(event) => event.stopPropagation()}>
        {statuses.map((value) => {
          const ItemIcon = icons[value];
          return (
            <DropdownMenuItem key={value} onSelect={() => changeStatus(value)} className={`gap-2 ${value === status ? "font-semibold" : ""}`}>
              <ItemIcon className="w-4 h-4" />{labels[value]}
              {value === status && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}