import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, paymentAmounts } from "@/lib/format";

/**
 * Shared, consistent payment-schedule display used wherever an invoice appears.
 * Always renders — if the invoice has no explicit schedule, a single "Payment due"
 * equal to the total is synthesized so the look is identical for 0, 1, or many payments.
 *
 * Props:
 *  - schedule: payment_schedule array
 *  - total: invoice total
 *  - standingBy: when true, the next due payment shows a "Standing by" state
 *  - renderAction(payment, i, amount, isNext, isStanding): optional slot for a per-row action (e.g. Pay button)
 *  - compact: render inline amount chips instead of full rows (for list rows)
 *  - showSummary: show the Total/Paid/Balance footer (default true)
 */
export default function PaymentScheduleDisplay({ schedule = [], total = 0, standingBy = false, renderAction, compact = false, showSummary = true }) {
  const list = (schedule && schedule.length > 0)
    ? schedule
    : [{ label: "Payment due", type: "amount", value: Number(total) || 0, paid: false }];

  const amounts = paymentAmounts(list, total);
  const paid = list.reduce((sum, p, i) => sum + (p.paid ? amounts[i] : 0), 0);
  const balance = Math.max(0, (Number(total) || 0) - paid);
  const nextIdx = list.findIndex((p) => !p.paid);

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {list.map((p, i) => {
          const isStanding = i === nextIdx && standingBy && !p.paid;
          const cls = p.paid
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : isStanding
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              : "bg-muted text-muted-foreground";
          return (
            <span key={i} className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs tabular-nums ${cls}`}>
              {formatCurrency(amounts[i])}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">Payments</div>
      <div className="border rounded-lg divide-y">
        {list.map((p, i) => {
          const isNext = i === nextIdx;
          const isStanding = isNext && standingBy && !p.paid;
          return (
            <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate">{p.label || `Payment ${i + 1}`}</div>
                {isStanding && <div className="text-xs text-amber-600">Standing by</div>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="tabular-nums">{formatCurrency(amounts[i])}</span>
                {p.paid
                  ? <StatusBadge status="paid" label="Paid" />
                  : isStanding
                    ? <StatusBadge status="unpaid" label="Standing by" />
                    : <StatusBadge status="unpaid" label="Due" />}
                {renderAction?.(p, i, amounts[i], isNext, isStanding)}
              </div>
            </div>
          );
        })}
      </div>
      {showSummary && (
        <div className="flex items-center justify-between gap-3 text-sm border-t pt-2">
          <span className="text-muted-foreground">Total {formatCurrency(total)}</span>
          <span className="text-muted-foreground">Paid {formatCurrency(paid)}</span>
          <span className="font-medium">Balance {formatCurrency(balance)}</span>
        </div>
      )}
    </div>
  );
}