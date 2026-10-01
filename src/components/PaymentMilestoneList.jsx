import { Check, Hourglass, AlarmClock, UserCheck, ChevronDown, Banknote } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
 * The next unpaid milestone's status is an icon dropdown. Paid milestones show a
 * green check; milestones after the next unpaid one show "Upcoming".
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
}) {
  const list = (schedule && schedule.length > 0)
    ? schedule
    : [{ label: "Payment due", type: "amount", value: Number(total) || 0, paid: false }];
  const amounts = paymentAmounts(list, total);
  const nextIdx = list.findIndex((p) => !p.paid);
  const status = customerReady ? "ready" : (standingBy !== false ? "standing" : "due");
  const StatusIcon = STATUS_ICON[status];

  // Keep status control clicks local; invoice navigation is a separate sibling link.
  const stop = (e) => e.stopPropagation();

  return (
    <div className="relative rounded-lg bg-[#1f1f1f] pl-3.5 pr-2 py-0.5">
      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#3b5a80]" />
      <div className="divide-y divide-white/5">
        {list.map((p, i) => {
          const isNext = i === nextIdx;
          return (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <span className="flex-1 min-w-0 text-sm font-medium text-white truncate">{p.label || `Payment ${i + 1}`}</span>
              <span style={{ width: "6rem", flexShrink: 0, textAlign: "right" }} className="text-sm tabular-nums text-[#9ca3af]">{formatCurrency(amounts[i])}</span>
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
              ) : isNext ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={stop}
                      onPointerDown={stop}
                      disabled={readOnly || !onStatusChange}
                      className={`pointer-events-auto inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 shrink-0 border transition-colors ${STATUS_STYLE[status]} disabled:opacity-100 disabled:cursor-default`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {STATUS_LABEL[status]}
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[10rem]">
                    {statuses.map((s) => {
                      const ItemIcon = STATUS_ICON[s];
                      return (
                        <DropdownMenuItem
                          key={s}
                          onSelect={() => onStatusChange?.(s)}
                          className={`gap-2 ${s === status ? "font-semibold" : ""}`}
                        >
                          <ItemIcon className="w-4 h-4" />
                          {STATUS_LABEL[s]}
                          {s === status && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                        </DropdownMenuItem>
                      );
                    })}
                    {canMarkPaidByCheck && onMarkPaidByCheck && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onMarkPaidByCheck()} className="gap-2">
                          <Banknote className="w-4 h-4" />
                          Mark paid by check
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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