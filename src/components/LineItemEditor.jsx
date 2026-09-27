import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, lineTotal } from "@/lib/invoice";

export default function LineItemEditor({ lineItems = [], onChange, editable = true }) {
  const update = (i, field, value) => {
    const next = [...lineItems];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  };
  const add = () => onChange([...lineItems, { description: "", quantity: 1, unit_price: 0 }]);
  const remove = (i) => onChange(lineItems.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <div className="col-span-6">Description / task</div>
        <div className="col-span-2 text-right">Qty</div>
        <div className="col-span-2 text-right">Unit price</div>
        <div className="col-span-2 text-right">Amount</div>
      </div>
      {lineItems.map((li, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <Input
            className="col-span-12 sm:col-span-6"
            placeholder="e.g. Replace kitchen sink faucet"
            value={li.description || ""}
            onChange={(e) => update(i, "description", e.target.value)}
            disabled={!editable}
          />
          <Input
            className="col-span-4 sm:col-span-2 text-right"
            type="number"
            min="0"
            step="0.01"
            placeholder="1"
            value={li.quantity ?? ""}
            onChange={(e) => update(i, "quantity", parseFloat(e.target.value) || 0)}
            disabled={!editable}
          />
          <Input
            className="col-span-5 sm:col-span-2 text-right"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={li.unit_price ?? ""}
            onChange={(e) => update(i, "unit_price", parseFloat(e.target.value) || 0)}
            disabled={!editable}
          />
          <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1">
            <span className="text-sm font-medium tabular-nums">{formatMoney(lineTotal(li))}</span>
            {editable && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(i)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      ))}
      {editable && (
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="w-4 h-4 mr-1" /> Add line item
        </Button>
      )}
    </div>
  );
}