import { Trash2 } from "lucide-react";
import OpenedIndicator from "@/components/OpenedIndicator";
import PaymentMilestoneList from "@/components/PaymentMilestoneList";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, amountPaidTotal } from "@/lib/format";

export default function InvoiceListItem({
  inv,
  onPreview,
  onStatusChange,
  onMarkPaidByCheck,
  onUnmarkPaid,
  canMarkPaidByCheck = false,
  canUnmarkPaid = false,
  onDelete,
}) {
  const paid = amountPaidTotal(inv.payment_schedule, inv.total);
  const balance = Math.max(0, (inv.total || 0) - paid);
  const multiple = (inv.payment_schedule?.length || 0) > 1;
  return (
    <div className="relative px-4 py-3 hover:bg-accent/50 transition-colors">
      <button
        type="button"
        onClick={() => onPreview(inv)}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={`Preview invoice: ${inv.name || inv.number || "Invoice"}`}
      />
      <div className="pointer-events-none flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{inv.name || inv.number || "Invoice"}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{formatDate(inv.due_date || inv.created_date)}</span>
            {inv.customer_ready_for_next_stage && <span className="text-emerald-600">· Ready for next stage</span>}
          </div>
        </div>
        {onDelete && (
          <Button variant="ghost" size="icon" className="pointer-events-auto shrink-0 relative z-10" onClick={() => onDelete(inv)} aria-label="Delete invoice">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
        <OpenedIndicator opened={inv.opened} lastOpenedDate={inv.last_opened_date} />
        <div className="text-right">
          <div className="font-medium tabular-nums">{formatCurrency(multiple ? (inv.total || 0) : balance)}</div>
          {multiple && <div className="text-xs text-muted-foreground">{formatCurrency(paid)} paid</div>}
        </div>
      </div>
      <div className="relative z-10 mt-1.5 pointer-events-none">
        <PaymentMilestoneList
          schedule={inv.payment_schedule}
          total={inv.total}
          standingBy={inv.standing_by}
          customerReady={inv.customer_ready_for_next_stage}
          onStatusChange={(s) => onStatusChange(inv, s)}
          canMarkPaidByCheck={canMarkPaidByCheck}
          onMarkPaidByCheck={() => onMarkPaidByCheck(inv)}
          canUnmarkPaid={canUnmarkPaid}
          onUnmarkPaid={(idx) => onUnmarkPaid(inv, idx)}
        />
      </div>
    </div>
  );
}