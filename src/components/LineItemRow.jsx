import { RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, lineTotal } from "@/lib/invoice";
import LineItemThumbnail from "@/components/LineItemThumbnail";

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

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-12 sm:col-span-1 flex sm:block">
          <LineItemThumbnail url={li.image_url || ""} onChange={(url) => onUpdate("image_url", url)} disabled={!editable} />
        </div>
        <div className="col-span-12 sm:col-span-3 space-y-1">
          {catalog.length > 0 && (
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value=""
              onChange={(e) => {
                const item = catalog[Number(e.target.value)];
                if (item) onMerge({
                  description: item.description,
                  unit_price: item.unit_price,
                  quantity: item.quantity || li.quantity || 1,
                  image_url: item.image_url || li.image_url || "",
                });
              }}
              disabled={!editable}
            >
              <option value="">Pick from catalog…</option>
              {Object.entries(
                catalog.reduce((acc, c, idx) => {
                  const cat = c.category || "Other";
                  (acc[cat] = acc[cat] || []).push({ c, idx });
                  return acc;
                }, {})
              ).map(([cat, entries]) => (
                <optgroup key={cat} label={cat}>
                  {entries.map(({ c, idx }) => (
                    <option key={idx} value={idx}>{c.description} — {formatMoney(c.unit_price)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          <Input
            placeholder="e.g. Replace kitchen sink faucet"
            value={li.description || ""}
            onChange={(e) => onUpdate("description", e.target.value)}
            disabled={!editable}
          />
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
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onMerge({ markup_mode: "preset", markup: 0 })} title="Back to presets">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          ) : (
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={String(li.markup || 0)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") onMerge({ markup_mode: "custom" });
                else onMerge({ markup: parseFloat(v) || 0, markup_mode: "preset" });
              }}
              disabled={!editable}
            >
              <option value="0">None</option>
              <option value="15">15%</option>
              <option value="25">25%</option>
              <option value="custom">Custom…</option>
            </select>
          )}
        </div>
        <div className="col-span-12 sm:col-span-3 flex items-center justify-end gap-1">
          <span className="text-sm font-medium tabular-nums">{formatMoney(lineTotal(li))}</span>
          {editable && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      {(modifiersCatalog.length > 0 || mods.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 sm:pl-1">
          {mods.map((m, mi) => (
            <span key={mi} className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2 py-1 text-xs">
              <span>{m.name}{m.price_adjustment ? ` (${m.price_adjustment >= 0 ? "+" : ""}${formatMoney(m.price_adjustment)})` : ""}</span>
              {editable && (
                <button type="button" onClick={() => onRemoveModifier(mi)} className="text-muted-foreground hover:text-foreground" title="Remove modifier">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          {modifiersCatalog.length > 0 && editable && (
            <select
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value=""
              onChange={(e) => onAddModifier(e.target.value)}
            >
              <option value="">+ Add modifier…</option>
              {modifiersCatalog.map((m, mi) => (
                <option key={mi} value={mi}>{m.name} ({m.price_adjustment >= 0 ? "+" : ""}{formatMoney(m.price_adjustment)})</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}