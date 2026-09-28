import { CheckCircle } from "lucide-react";
import { formatMoney, installmentAmount } from "@/lib/invoice";

// Shows an invoice's payment schedule when it has multiple installments.
export default function InvoicePaymentSchedule({ invoice }) {
  const schedule = invoice?.payment_schedule || [];
  if (schedule.length <= 1) return null;
  const total = Number(invoice.total) || 0;

  return (
    <div className="mt-1.5 ml-8 mr-2 rounded-md border-l-2 border-primary/30 bg-muted/20 px-2.5 py-1.5 space-y-0.5">
      {schedule.map((p, i) => {
        const amt = installmentAmount(p, total);
        const paid = !!p.paid;
        return (
          <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="min-w-0 truncate text-muted-foreground">
              <span className="font-medium text-foreground">{p.label || `Payment ${i + 1}`}</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="tabular-nums text-muted-foreground">{formatMoney(amt)}</span>
              {paid ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-px rounded-full">
                  <CheckCircle className="w-2.5 h-2.5" /> Paid
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-px rounded-full">
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