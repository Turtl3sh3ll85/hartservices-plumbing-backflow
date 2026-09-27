import { Plus, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, lineTotal } from "@/lib/invoice";

export default function LineItemEditor({ lineItems = [], onChange, editable = true }) {
  const update = (i, field, value) => {
    const next = [...lineItems];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  };
  const merge = (i, patch) => {
    const next = [...lineItems];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...lineItems, { description: "", quantity: 1, unit_price: 0, markup: 0, markup_mode: "preset" }]);
  const remove = (i) => onChange(lineItems.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <div className="col-span-4">Description / task</div>
        <div className="col-span-1 text-right">Qty</div>
        <div className="col-span-2 text-right">Unit price</div>
        <div className="col-span-2 text-right">Markup</div>
        <div className="col-span-3 text-right">Amount</div>
      </div>
      {lineItems.map((li, i) => {
        const mode = li.markup_mode === "custom" ? "custom" : "preset";
        return (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <Input
              className="col-span-12 sm:col-span-4"
              placeholder="e.g. Replace kitchen sink faucet"
              value={li.description || ""}
              onChange={(e) => update(i, "description", e.target.value)}
              disabled={!editable}
            />
            <Input
              className="col-span-6 sm:col-span-1 text-right"
              type="number"
              min="0"
              step="0.01"
              placeholder="1"
              value={li.quantity ?? ""}
              onChange={(e) => update(i, "quantity", parseFloat(e.target.value) || 0)}
              disabled={!editable}
            />
            <Input
              className="col-span-6 sm:col-span-2 text-right"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={li.unit_price ?? ""}
              onChange={(e) => update(i, "unit_price", parseFloat(e.target.value) || 0)}
              disabled={!editable}
            />
            <div className="col-span-12 sm:col-span-2 flex items-center gap-1">
              {mode === "custom" ? (
                <>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="pr-7 text-right"
                      value={li.markup ?? 0}
                      onChange={(e) => update(i, "markup", parseFloat(e.target.value) || 0)}
                      disabled={!editable}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                  </div>
                  {editable && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => merge(i, { markup_mode: "preset", markup: 0 })} title="Back to presets">
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
                    if (v === "custom") merge(i, { markup_mode: "custom" });
                    else merge(i, { markup: parseFloat(v) || 0, markup_mode: "preset" });
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
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(i)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
      {editable && (
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="w-4 h-4 mr-1" /> Add line item
        </Button>
      )}
    </div>
  );
}