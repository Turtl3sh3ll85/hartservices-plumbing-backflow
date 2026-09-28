import { CheckCircle } from "lucide-react";
import { formatMoney, installmentAmount } from "@/lib/invoice";

// Shows an invoice's payment schedule when it has multiple installments.
export default function InvoicePaymentSchedule({ invoice }) {
  const schedule = invoice?.payment_schedule || [];
  if (schedule.length <= 1) return null;
  const total = Number(invoice.total) || 0;

  return (
    <div className="mt-2 w-full rounded-lg border bg-muted/30 p-3 space-y-1.5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Payment schedule</div>
      {schedule.map((p, i) => {
        const amt = installmentAmount(p, total);
        const paid = !!p.paid;
        return (
          <div key={i} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-medium">{p.label || `Payment ${i + 1}`}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="tabular-nums text-muted-foreground">{formatMoney(amt)}</span>
              {paid ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" /> Paid
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Due
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}