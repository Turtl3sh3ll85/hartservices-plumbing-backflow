import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function usePortalMilestoneStatus(email) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return async (invoice, status, index) => {
    try {
      const response = await base44.functions.invoke("setCustomerPortalInvoiceStatus", {
        invoice_id: invoice.id, email, status, schedule_index: index,
      });
      if (response.data?.error || !response.data?.invoice) throw new Error(response.data?.error || "Could not save status");
      const saved = response.data.invoice;
      queryClient.setQueryData(["customerPortal", email], (portal) => portal ? {
        ...portal, invoices: (portal.invoices || []).map((item) => item.id === saved.id ? saved : item),
      } : portal);
      return saved;
    } catch (error) {
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
      return null;
    }
  };
}