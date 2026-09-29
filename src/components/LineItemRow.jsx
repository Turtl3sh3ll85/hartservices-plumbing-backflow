import { RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect } from "@/components/ui/mobile-select";
import { formatMoney, lineTotal } from "@/lib/invoice";
import LineItemPhotos from "@/components/LineItemPhotos";
import LineItemDescriptionPicker from "@/components/LineItemDescriptionPicker";

export default function LineItemRow({
  li,
  editable = true,
  catalog = [],
  modifiersCatalog = [],
  onUpdate,
  onMerge,
  onRemove,
  onAddModifier,
  onRemoveModifier,
}) {
  const mode = li.markup_mode === "custom" ? "custom" : "preset";
  const mods = li.modifiers || [];
  const grouped = catalog.length > 0
    ? Object.entries(
        catalog.reduce((acc, c, idx) => {
          const cat = c.category || "Other";
          (acc[cat] = acc[cat] || []).push({ c, idx });
          return acc;
        }, {})
      )
    : [];

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-12 sm:col-span-4">
          {catalog.length > 0 ? (
            <LineItemDescriptionPicker
              li={li}
              catalog={catalog}
              grouped={grouped}
              onMerge={onMerge}
              onUpdate={onUpdate}
              editable={editable}
            />
          ) : (
            <Input
              placeholder="e.g. Replace kitchen sink faucet"
              value={li.description || ""}
              onChange={(e) => onUpdate("description", e.target.value)}
              disabled={!editable}
            />
          )}
        </div>
        <Input
          className="col-span-6 sm:col-span-1 text-right"
          type="number"
          min="0"
          step="1"
          placeholder="1"
          value={li.quantity ?? ""}
          onChange={(e) => onUpdate("quantity", Math.round(parseFloat(e.target.value) || 0))}
          disabled={!editable}
        />
        <Input
          className="col-span-6 sm:col-span-2 text-right"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={li.unit_price ?? ""}
          onChange={(e) => onUpdate("unit_price", parseFloat(e.target.value) || 0)}
          disabled={!editable}
        />
        <div className="col-span-12 sm:col-span-2 flex items-center gap-1">
          {mode === "custom" ? (
            <>
              <div className="relative flex-1">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  className="pr-7 text-right"
                  value={li.markup ?? 0}
                  onChange={(e) => onUpdate("markup", Math.round(parseFloat(e.target.value) || 0))}
                  disabled={!editable}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
              </div>
              {editable && (
                <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 shrink-0 select-none" onClick={() => onMerge({ markup_mode: "preset", markup: 0 })} aria-label="Back to preset markups" title="Back to presets">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          ) : (
            <MobileSelect
              value={String(li.markup || 0)}
              onValueChange={(v) => {
                if (v === "custom") onMerge({ markup_mode: "custom" });
                else onMerge({ markup: parseFloat(v) || 0, markup_mode: "preset" });
              }}
              placeholder="Markup"
              triggerClassName="h-9 w-full"
              ariaLabel="Markup"
              options={[
                { value: "0", label: "None" },
                { value: "15", label: "15%" },
                { value: "25", label: "25%" },
                { value: "custom", label: "Custom…" },
              ]}
            />
          )}
        </div>
        <div className="col-span-12 sm:col-span-3 flex items-center justify-end gap-1">
          <span className="text-sm font-medium tabular-nums">{formatMoney(lineTotal(li))}</span>
          {editable && (
            <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 shrink-0 select-none" onClick={onRemove} aria-label="Remove line item">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Textarea
          placeholder="Add a longer description / notes for this line item (optional)"
          value={li.details || ""}
          onChange={(e) => onUpdate("details", e.target.value)}
          disabled={!editable}
          rows={2}
          className="text-sm flex-1"
        />
        <div className="sm:pt-1">
          <LineItemPhotos photos={li.photos || []} onChange={(p) => onUpdate("photos", p)} disabled={!editable} />
        </div>
      </div>
      {(modifiersCatalog.length > 0 || mods.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 sm:pl-1">
          {mods.map((m, mi) => (
            <span key={mi} className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2 py-1 text-xs select-none">
              <span>{m.name}{m.price_adjustment ? ` (${m.price_adjustment >= 0 ? "+" : ""}${formatMoney(m.price_adjustment)})` : ""}</span>
              {editable && (
                <button type="button" onClick={() => onRemoveModifier(mi)} className="text-muted-foreground hover:text-foreground select-none min-h-[32px] min-w-[32px] inline-flex items-center justify-center" aria-label="Remove modifier" title="Remove modifier">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          {modifiersCatalog.length > 0 && editable && (
            <MobileSelect
              value=""
              onValueChange={(v) => onAddModifier(v)}
              placeholder="+ Add modifier…"
              triggerClassName="h-8 w-[180px] text-xs"
              ariaLabel="Add modifier"
              options={modifiersCatalog.map((m, mi) => ({ value: String(mi), label: `${m.name} (${m.price_adjustment >= 0 ? "+" : ""}${formatMoney(m.price_adjustment)})` }))}
            />
          )}
        </div>
      )}
    </div>
  );
}