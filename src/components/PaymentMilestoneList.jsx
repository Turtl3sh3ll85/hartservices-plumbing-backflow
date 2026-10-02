import { Check, Hourglass, AlarmClock, UserCheck, CreditCard } from "lucide-react";
import MarkPaidButton from "@/components/payments/MarkPaidButton";
import MilestoneStatusDropdown from "@/components/payments/MilestoneStatusDropdown";
import { formatCurrency, paymentAmounts } from "@/lib/format";

const STATUS_LABEL = { standing: "Standing By", due: "Due", ready: "Customer ready" };
const STATUS_STYLE = {
  standing: "text-slate-300 border-slate-500/60 bg-slate-700/40 hover:bg-slate-700/70",
  due: "text-[#d97706] border-[#d97706]/60 bg-[#fef3c7] hover:bg-[#fde68a]",
  ready: "text-[#10b981] border-[#10b981]/60 bg-[#d1fae5] hover:bg-[#bbf7d0]",
};
const STATUS_ICON = { standing: Hourglass, due: AlarmClock, ready: UserCheck };

/**
 * Payment milestone list matching the dark reference card:
 * label (left) · amount (mid) · status (right).
 *
 * Every unpaid milestone has its own independent status dropdown.
 * Paid milestones retain the green check and existing remove-paid action.
 */
export default function PaymentMilestoneList({
  schedule = [],
  total = 0,
  standingBy,
  customerReady,
  onStatusChange,
  onMarkPaidByCheck,
  canMarkPaidByCheck = false,
  onUnmarkPaid,
  canUnmarkPaid = false,
  readOnly = false,
  statuses = ["standing", "due", "ready"],
  onPayNow,
}) {
  const list = (schedule && schedule.length > 0)
    ? schedule
    : [{ label: "Payment due", type: "amount", value: Number(total) || 0, paid: false }];
  const amounts = paymentAmounts(list, total);
  const nextIdx = list.findIndex((p) => !p.paid);

  // Keep status control clicks local; invoice navigation is a separate sibling link.
  const stop = (e) => e.stopPropagation();

  return (
    <div className="relative rounded-lg bg-[#1f1f1f] pl-3.5 pr-0 py-0.5">
      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#3b5a80]" />
      <div className="divide-y divide-white/5">
        {list.map((p, i) => {
          const status = p.milestone_status || (i === nextIdx
            ? (customerReady ? "ready" : standingBy !== false ? "standing" : "due")
            : "standing");
          return (
            <div key={i} className="flex items-center gap-x-2 py-1.5">
              <span className="min-w-0 text-sm font-medium text-white truncate">{p.label || `Payment ${i + 1}`}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {p.paid ? (
                  canUnmarkPaid && onUnmarkPaid ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onUnmarkPaid(i); }}
                      onPointerDown={stop}
                      title="Click to remove paid status"
                      className="pointer-events-auto inline-flex items-center gap-1 text-xs font-medium text-[#10b981] border border-[#10b981]/60 bg-[#d1fae5] hover:bg-[#bbf7d0] rounded-full px-2 py-0.5 shrink-0 transition-colors cursor-pointer"
                    >
                      <Check className="w-3 h-3" /> Paid
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#10b981] border border-[#10b981]/60 bg-[#d1fae5] rounded-full px-2 py-0.5 shrink-0">
                      <Check className="w-3 h-3" /> Paid
                    </span>
                  )
                ) : (
                  <>
                    <MilestoneStatusDropdown
                      status={status} statuses={statuses} labels={STATUS_LABEL} icons={STATUS_ICON} styles={STATUS_STYLE}
                      label={p.label || `Payment ${i + 1}`} readOnly={readOnly}
                      onChange={onStatusChange ? (value) => onStatusChange(value, i) : undefined}
                    />
                    {onPayNow && status === "due" ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onPayNow(i); }}
                        onPointerDown={stop}
                        className="pointer-events-auto inline-flex items-center gap-1 text-xs font-medium text-[#d97706] border border-[#d97706]/60 bg-[#fef3c7] hover:bg-[#fde68a] rounded-full px-2 py-0.5 h-7 shrink-0 transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-3 h-3" /> Pay Now
                      </button>
                    ) : canMarkPaidByCheck && onMarkPaidByCheck ? (
                      <MarkPaidButton onClick={() => onMarkPaidByCheck(i)} className={STATUS_STYLE.ready} label={p.label || `Payment ${i + 1}`} />
                    ) : null}
                  </>
                )}
              </div>
              <span className="ml-auto text-sm tabular-nums text-[#9ca3af] text-right">{formatCurrency(amounts[i])}</span>
            </div>
                );
        })}
      </div>
    </div>
  );
}