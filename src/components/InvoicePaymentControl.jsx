import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Undo2 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/ui/use-toast";

const INVOICE_QUERY_KEYS = [["invoices"], ["invoices", "recent"]];

export default function InvoicePaymentControl({ invoice }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const applyOptimistic = (update) => {
    INVOICE_QUERY_KEYS.forEach((key) =>
      queryClient.setQueryData(key, (old) => (old || []).map((x) => (x.id === invoice.id ? { ...x, ...update } : x)))
    );
  };

  const markPaidByCheck = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const update = { payment_status: "paid", status: "paid", amount_paid: invoice.total, paid_date: today, payment_method: "check" };
    applyOptimistic(update);
    try {
      await base44.entities.Invoice.update(invoice.id, update);
      toast({ description: "Marked paid by check." });
    } catch (e) {
      INVOICE_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      toast({ variant: "destructive", description: "Could not mark invoice paid." });
    }
  };

  const revertToUnpaid = async () => {
    const update = { payment_status: "unpaid", status: "sent", amount_paid: 0, paid_date: "", payment_method: "" };
    if (Array.isArray(invoice.payment_schedule) && invoice.payment_schedule.length > 0) {
      update.payment_schedule = invoice.payment_schedule.map((s) => ({ ...s, paid: false }));
    }
    applyOptimistic(update);
    try {
      await base44.entities.Invoice.update(invoice.id, update);
      toast({ description: "Reverted to unpaid." });
    } catch (e) {
      INVOICE_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      toast({ variant: "destructive", description: "Could not revert invoice." });
    }
  };

  if (invoice.payment_status === "paid") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center rounded-full hover:opacity-80 transition-opacity cursor-pointer min-h-11 sm:min-h-0"
            title="Click to revert to unpaid"
            aria-label={`Revert ${invoice.name || invoice.number || "invoice"} to unpaid`}
          >
            <StatusBadge status="paid" label={invoice.payment_method === "check" ? "Paid by check" : "Paid"} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={revertToUnpaid}>
            <Undo2 className="w-4 h-4 mr-2" /> Revert to unpaid
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (invoice.payment_status === "partial") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center rounded-full hover:opacity-80 transition-opacity cursor-pointer min-h-11 sm:min-h-0"
            title="Click to update payment status"
            aria-label={`Update payment status for ${invoice.name || invoice.number || "invoice"}`}
          >
            <StatusBadge status="partial" label="Partially Paid" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={markPaidByCheck}>
            <CheckCircle className="w-4 h-4 mr-2" /> Mark fully paid (check)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={revertToUnpaid}>
            <Undo2 className="w-4 h-4 mr-2" /> Revert to unpaid
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-full hover:opacity-80 transition-opacity cursor-pointer min-h-11 sm:min-h-0"
          title="Click to mark paid"
          aria-label={`Mark ${invoice.name || invoice.number || "invoice"} as paid`}
        >
          <StatusBadge status={invoice.payment_status} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={markPaidByCheck}>
          <CheckCircle className="w-4 h-4 mr-2" /> Mark paid (check)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}