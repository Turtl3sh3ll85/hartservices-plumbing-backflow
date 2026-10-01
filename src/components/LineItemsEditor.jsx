import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";

export default function LineItemsEditor({ items, onChange }) {
  const list = items || [];
  const update = (i, patch) => {
    const next = [...list];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...list, { description: "", details: "", quantity: 1, unit_price: 0 }]);
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));

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
              <span className="font-medium">{formatCurrency((li.quantity || 0) * (li.unit_price || 0))}</span>
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full border-dashed">
        <Plus className="w-4 h-4" /> Add line item
      </Button>
    </div>
  );
}