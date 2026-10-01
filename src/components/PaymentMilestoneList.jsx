import { Check } from "lucide-react";
import { formatCurrency, paymentAmounts } from "@/lib/format";

/**
 * Payment milestone list matching the dark reference card:
 * label (left) · amount (mid) · status badge (right).
 *
 * The next unpaid milestone's badge is a toggle between
 * "Standing By" (default) and "Due". Paid milestones show a green check.
 *
 * Props:
 *  - schedule, total
 *  - standingBy: stored standing_by value (undefined/null/true → Standing By; false → Due)
 *  - onToggle(nextValue: boolean): persist standing_by — false when switching
 *    Standing By → Due, true when switching Due → Standing By
 *  - readOnly: when true the toggle is non-interactive
 */
export default function PaymentMilestoneList({ schedule = [], total = 0, standingBy, onToggle, readOnly = false }) {
  const list = (schedule && schedule.length > 0)
    ? schedule
    : [{ label: "Payment due", type: "amount", value: Number(total) || 0, paid: false }];
  const amounts = paymentAmounts(list, total);
  const nextIdx = list.findIndex((p) => !p.paid);
  const isStanding = standingBy !== false; // default Standing By

  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div className="relative rounded-lg bg-[#1f1f1f] pl-3.5 pr-3 py-1">
      <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#3b5a80]" />
      <div className="divide-y divide-white/5">
        {list.map((p, i) => {
          const isNext = i === nextIdx;
          return (
            <div key={i} className="flex items-center gap-3 py-2">
              <span className="flex-1 min-w-0 text-sm font-medium text-white truncate">{p.label || `Payment ${i + 1}`}</span>
              <span className="text-sm tabular-nums text-[#9ca3af] shrink-0">{formatCurrency(amounts[i])}</span>
              {p.paid ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#10b981] border border-[#10b981]/60 bg-[#d1fae5] rounded-full px-2 py-0.5 shrink-0">
                  <Check className="w-3 h-3" /> Paid
                </span>
              ) : isNext ? (
                isStanding ? (
                  <button
                    type="button"
                    onClick={(e) => { stop(e); onToggle?.(false); }}
                    disabled={readOnly || !onToggle}
                    className="text-xs font-medium text-slate-300 border border-slate-500/60 bg-slate-700/40 rounded-full px-2 py-0.5 shrink-0 hover:bg-slate-700/70 disabled:opacity-100 disabled:cursor-default"
                  >
                    Standing By
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { stop(e); onToggle?.(true); }}
                    disabled={readOnly || !onToggle}
                    className="text-xs font-medium text-[#d97706] border border-[#d97706]/60 bg-[#fef3c7] rounded-full px-2 py-0.5 shrink-0 hover:bg-[#fde68a] disabled:opacity-100 disabled:cursor-default"
                  >
                    Due
                  </button>
                )
              ) : (
                <span className="text-xs text-[#9ca3af] shrink-0">Upcoming</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}