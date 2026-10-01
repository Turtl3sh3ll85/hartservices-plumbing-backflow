import { Check } from "lucide-react";
import { formatCurrency, paymentAmounts } from "@/lib/format";

const STATUS_LABEL = { standing: "Standing By", due: "Due", ready: "Customer ready" };
const STATUS_STYLE = {
  standing: "text-slate-300 border-slate-500/60 bg-slate-700/40",
  due: "text-[#d97706] border-[#d97706]/60 bg-[#fef3c7]",
  ready: "text-[#10b981] border-[#10b981]/60 bg-[#d1fae5]",
};

/**
 * Payment milestone list matching the dark reference card:
 * label (left) · amount (mid) · status (right).
 *
 * The next unpaid milestone's status is a dropdown. Paid milestones show a green check;
 * milestones after the next unpaid one show "Upcoming".
 *
 * Props:
 *  - schedule, total
 *  - standingBy: stored standing_by (undefined/null/true → Standing By; false → Due)
 *  - customerReady: stored customer_ready_for_next_stage (true → "Customer ready" wins)
 *  - onStatusChange(next: "standing" | "due" | "ready")
 *  - readOnly: non-interactive
 *  - statuses: which options to render (default ["standing","due","ready"])
 */
export default function PaymentMilestoneList({
  schedule = [],
  total = 0,
  standingBy,
  customerReady,
  onStatusChange,
  readOnly = false,
  statuses = ["standing", "due", "ready"],
}) {
  const list = (schedule && schedule.length > 0)
    ? schedule
    : [{ label: "Payment due", type: "amount", value: Number(total) || 0, paid: false }];
  const amounts = paymentAmounts(list, total);
  const nextIdx = list.findIndex((p) => !p.paid);
  const status = customerReady ? "ready" : (standingBy !== false ? "standing" : "due");

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
                <select
                  value={status}
                  onChange={(e) => { stop(e); onStatusChange?.(e.target.value); }}
                  disabled={readOnly || !onStatusChange}
                  className={`text-xs font-medium rounded-full px-2 py-0.5 shrink-0 border appearance-none cursor-pointer ${STATUS_STYLE[status]} disabled:opacity-100 disabled:cursor-default`}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
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