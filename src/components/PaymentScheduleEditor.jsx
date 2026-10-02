import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, paymentAmounts } from "@/lib/format";

export default function PaymentScheduleEditor({ schedule, onChange, total }) {
  const list = schedule || [];
  const amounts = paymentAmounts(list, total);
  const sum = amounts.reduce((a, b) => a + b, 0);

  const update = (i, patch) => {
    const next = [...list];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...list, { label: "", type: list.length ? (list[0].type || "amount") : "amount", value: 0, paid: false }]);
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {list.map((p, i) => (
        <div key={i} className="rounded-lg border p-3 bg-card space-y-2">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Label (e.g. Deposit)"
              value={p.label || ""}
              onChange={(e) => update(i, { label: e.target.value })}
              className="flex-1"
            />
            <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove payment">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={p.type || "percentage"}
              onChange={(e) => update(i, { type: e.target.value })}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="percentage">Percentage</option>
              <option value="amount">Fixed amount</option>
            </select>
            <Input
              type="number"
              step={p.type === "percentage" ? "1" : "0.01"}
              min="0"
              value={p.value ?? 0}
              onChange={(e) => update(i, { value: parseFloat(e.target.value) || 0 })}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">= {formatCurrency(amounts[i])}</span>
            <label className="ml-auto flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={!!p.paid}
                onChange={(e) => update(i, { paid: e.target.checked })}
                className="w-4 h-4"
              />
              Paid
            </label>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between text-sm">
        <Button variant="outline" size="sm" onClick={add} className="border-dashed">
          <Plus className="w-4 h-4" /> Add payment
        </Button>
        <span className={Math.abs(sum - (total || 0)) < 0.01 ? "text-emerald-600" : "text-amber-600"}>
          Scheduled: {formatCurrency(sum)} / {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}