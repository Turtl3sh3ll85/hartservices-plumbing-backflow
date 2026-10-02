import { useState } from "react";
import { Plus, Trash2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import SheetItemsDropdown from "@/components/SheetItemsDropdown";
import ModifiersDialog from "@/components/ModifiersDialog";

const ITEMS_SHEET_ID = "13lEp40pEclIWP2haTyDsCBsEJ75HWim4CNLWElmLhSg";
const ITEMS_SHEET_NAME = "Items";
const MODIFIERS_SHEET_NAME = "Modifiers";

const lineTotal = (li) =>
  (Number(li.quantity) || 0) * (Number(li.unit_price) || 0) +
  (li.modifiers || []).reduce((s, m) => s + (Number(m.price_adjustment) || 0), 0);

export default function LineItemsEditor({ items, onChange }) {
  const list = items || [];
  const [modOpenFor, setModOpenFor] = useState(null);

  const update = (i, patch) => {
    const next = [...list];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...list, { description: "", details: "", quantity: 1, unit_price: 0, modifiers: [] }]);
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));

  const addSheetItems = (picked) => {
    const mapped = picked.map((p) => ({
      description: p.description || "",
      details: p.details || "",
      quantity: Number(p.quantity) || 1,
      unit_price: Number(p.unit_price) || 0,
      image_url: p.image_url || "",
      modifiers: [],
    }));
    onChange([...list, ...mapped]);
  };

  const addModifiers = (i, mods) => {
    update(i, { modifiers: [...(list[i].modifiers || []), ...mods] });
  };
  const removeModifier = (i, mi) => {
    update(i, { modifiers: (list[i].modifiers || []).filter((_, idx) => idx !== mi) });
  };

  return (
    <div className="space-y-2">
      {list.map((li, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2 bg-card">
          <div className="flex gap-2 items-start">
            <Input
              placeholder="Description"
              value={li.description || ""}
              onChange={(e) => update(i, { description: e.target.value })}
              className="flex-1"
            />
            <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove line item">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
          <Textarea
            placeholder="Details (optional)"
            value={li.details || ""}
            onChange={(e) => update(i, { details: e.target.value })}
            rows={2}
          />
          <div className="flex gap-2 items-center">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground mb-1">Qty</span>
              <Input
                type="number"
                step="1"
                min="0"
                value={li.quantity ?? 1}
                onChange={(e) => update(i, { quantity: parseFloat(e.target.value) || 0 })}
                className="w-24"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground mb-1">Unit Price</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={li.unit_price ?? 0}
                onChange={(e) => update(i, { unit_price: parseFloat(e.target.value) || 0 })}
                className="w-32"
              />
            </div>
            <div className="ml-auto text-right">
              <span className="text-xs text-muted-foreground block mb-1">Line Total</span>
              <span className="font-medium">{formatCurrency(lineTotal(li))}</span>
            </div>
          </div>

          {li.modifiers && li.modifiers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {li.modifiers.map((m, mi) => (
                <span key={mi} className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary text-xs px-2 py-1">
                  {m.name}
                  <span className="text-primary/70">+{formatCurrency(Number(m.price_adjustment) || 0)}</span>
                  <button type="button" onClick={() => removeModifier(i, mi)} className="ml-0.5 hover:text-destructive" aria-label={`Remove ${m.name}`}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setModOpenFor(i)} className="text-muted-foreground">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Add modifier
          </Button>
        </div>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={add} className="flex-1 border-dashed">
          <Plus className="w-4 h-4" /> Add line item
        </Button>
        <SheetItemsDropdown onPick={addSheetItems} />
      </div>

      <ModifiersDialog
        open={modOpenFor !== null}
        onOpenChange={(o) => !o && setModOpenFor(null)}
        onPick={(mods) => modOpenFor !== null && addModifiers(modOpenFor, mods)}
        sheetId={ITEMS_SHEET_ID}
        sheetName={MODIFIERS_SHEET_NAME}
      />
    </div>
  );
}