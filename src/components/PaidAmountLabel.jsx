import { formatMoney } from "@/lib/invoice";

export default function PaidAmountLabel({ invoice }) {
  if (!invoice || invoice.payment_status !== "partial") return null;
  const paid = Number(invoice.amount_paid) || 0;
  const total = Number(invoice.total) || 0;
  return (
    <div className="text-xs text-muted-foreground tabular-nums">
      {formatMoney(paid)} paid out of {formatMoney(total)}
    </div>
  );
}