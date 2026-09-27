import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/invoice";

const installmentAmount = (item, total) =>
  item.type === "percentage" ? ((Number(total) || 0) * (Number(item.value) || 0)) / 100 : Number(item.value) || 0;

export default function PaymentScheduleEditor({ total = 0, schedule = [], onChange }) {
  const update = (i, patch) => {
    const next = [...schedule];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...schedule, { label: "", type: "percentage", value: 0 }]);
  const remove = (i) => onChange(schedule.filter((_, idx) => idx !== i));

  const scheduled = schedule.reduce((s, it) => s + installmentAmount(it, total), 0);
  const remaining = (Number(total) || 0) - scheduled;

  return (
    <div className="border-t pt-4 space-y-2">
      <div className="flex items-center justify-between">
        <Label>Payment schedule</Label>
        <span className="text-xs text-muted-foreground">Split the total into labeled payments</span>
      </div>
      {schedule.length === 0 && (
        <p className="text-sm text-muted-foreground">No split — the full total is due as one payment.</p>
      )}
      {schedule.map((p, i) => {
        const amt = installmentAmount(p, total);
        return (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <Input
              className="col-span-12 sm:col-span-4"
              placeholder="e.g. Deposit"
              value={p.label || ""}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <select
              className="col-span-6 sm:col-span-2 flex h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={p.type}
              onChange={(e) => update(i, { type: e.target.value })}
            >
              <option value="percentage">Percentage</option>
              <option value="amount">Dollar</option>
            </select>
            <div className="col-span-6 sm:col-span-3 relative">
              <Input
                type="number"
                min="0"
                step={p.type === "percentage" ? 1 : 0.01}
                className="pr-7 text-right"
                value={p.value ?? ""}
                onChange={(e) => update(i, { value: p.type === "percentage" ? Math.round(parseFloat(e.target.value) || 0) : parseFloat(e.target.value) || 0 })}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{p.type === "percentage" ? "%" : "$"}</span>
            </div>
            <div className="col-span-10 sm:col-span-2 text-right text-sm tabular-nums">{formatMoney(amt)}</div>
            <div className="col-span-2 sm:col-span-1 flex justify-end">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(i)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        );
      })}
      {schedule.length > 0 && (
        <div className="flex justify-between text-sm pt-1">
          <span className="text-muted-foreground">Remaining of total</span>
          <span className={`tabular-nums font-medium ${Math.abs(remaining) < 0.01 ? "text-emerald-600" : remaining < 0 ? "text-red-600" : "text-foreground"}`}>{formatMoney(remaining)}</span>
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="w-4 h-4 mr-1" /> Add payment
      </Button>
    </div>
  );
}