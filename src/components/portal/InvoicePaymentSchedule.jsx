import { CheckCircle } from "lucide-react";
import { formatMoney, installmentAmount } from "@/lib/invoice";

// Shows an invoice's payment schedule when it has multiple installments.
export default function InvoicePaymentSchedule({ invoice }) {
  const schedule = invoice?.payment_schedule || [];
  if (schedule.length <= 1) return null;
  const total = Number(invoice.total) || 0;

  return (
    <div className="mt-2 ml-6 mr-1 rounded-md border-l-2 border-primary/30 bg-muted/20 px-3 py-2 space-y-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Payment schedule</div>
      {schedule.map((p, i) => {
        const amt = installmentAmount(p, total);
        const paid = !!p.paid;
        return (
          <div key={i} className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate">
              <span className="font-medium">{p.label || `Payment ${i + 1}`}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="tabular-nums text-muted-foreground">{formatMoney(amt)}</span>
              {paid ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Paid
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
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