import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, paymentAmounts } from "@/lib/format";

export default function PaymentScheduleEditor({ schedule, onChange, total }) {
  const list = schedule || [];
  const amounts = paymentAmounts(list, total);
  const sum = amounts.reduce((a, b) => a + b, 0);
  const type = list.length ? (list[0].type || "amount") : "amount";

  const remaining = type === "percentage"
    ? Math.max(0, 100 - list.reduce((s, p) => s + (Number(p.value) || 0), 0))
    : Math.max(0, (Number(total) || 0) - sum);

  const update = (i, patch) => {
    const next = [...list];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const setType = (newType) => {
    if (newType === type) return;
    onChange(list.map((p) => ({ ...p, type: newType })));
  };

  const add = () => {
    onChange([...list, { label: "", type, value: Math.round(remaining), paid: false }]);
  };

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
            <div className="inline-flex rounded-md border overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setType("amount")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${type === "amount" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
              >
                $
              </button>
              <button
                type="button"
                onClick={() => setType("percentage")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${type === "percentage" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
              >
                %
              </button>
            </div>
            <Input
              type="number"
              step="1"
              min="0"
              value={p.value ?? 0}
              onChange={(e) => update(i, { value: parseInt(e.target.value, 10) || 0 })}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">= {formatCurrency(amounts[i])}</span>
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
          {list.length > 0 && remaining > 0.01 && (
            <span className="ml-1 text-muted-foreground">
              ({type === "percentage" ? `${remaining}%` : formatCurrency(remaining)} remaining)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}