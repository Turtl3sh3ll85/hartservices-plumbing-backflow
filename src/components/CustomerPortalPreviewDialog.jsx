import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileText, ClipboardList, ExternalLink, Mail, Phone } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";
import PortalDocumentList from "@/components/portal/PortalDocumentList";
import ScheduledMaintenanceTeaser from "@/components/portal/ScheduledMaintenanceTeaser";
import { useSettings } from "@/hooks/useSettings";

export default function CustomerPortalPreviewDialog({ customer, onClose }) {
  const [view, setView] = useState("invoices");
  const [preview, setPreview] = useState(null);
  const [previewKind, setPreviewKind] = useState("invoice");
  const { settings } = useSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const email = (customer?.email || "").trim().toLowerCase();

  const setStatus = async (inv, status, index) => {
    try {
      const response = await base44.functions.invoke("setCustomerPortalInvoiceStatus", {
        invoice_id: inv.id, status, schedule_index: index,
      });
      if (response.data?.error || !response.data?.invoice) throw new Error(response.data?.error || "Could not save status");
      await queryClient.invalidateQueries({ queryKey: ["customerPortal", email] });
      setPreview((current) => current?.id === inv.id ? response.data.invoice : current);
    } catch (error) {
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
    }
  };

  const { data: portal = {}, isLoading } = useQuery({
    queryKey: ["customerPortal", email],
    queryFn: async () => {
      const res = await base44.functions.invoke("getCustomerPortalByEmail", { email });
      if (!res.data) throw new Error(res.error || "Failed to load");
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!email,
  });

  const invoices = portal.invoices || [];
  const estimates = portal.estimates || [];
  const customers = portal.customers || [];
  const allAttachments = portal.attachments || [];
  const previewAttachments = preview ? allAttachments.filter((a) => a.invoice_id === preview.id) : [];
  const customerFor = (doc) => customers.find((c) => c.id === doc.customer_id) || customer;

  if (!customer) return null;

  return (
    <>
      <Dialog open={!!customer} onOpenChange={(o) => !o && onClose?.()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{customer.company || customer.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {customer.name && customer.company && customer.name !== customer.company && <span>{customer.name}</span>}
              {customer.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{customer.email}</span>}
              {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>}
            </div>

            {!email ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No email on file — the customer portal is email-based.</div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : invoices.length === 0 && estimates.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No documents yet for this customer.</div>
            ) : (
              <>
                <Tabs value={view} onValueChange={setView}>
                  <TabsList className="w-full">
                    <TabsTrigger value="invoices" className="flex-1"><FileText className="w-4 h-4 mr-1.5" /> Invoices ({invoices.length})</TabsTrigger>
                    <TabsTrigger value="estimates" className="flex-1"><ClipboardList className="w-4 h-4 mr-1.5" /> Estimates ({estimates.length})</TabsTrigger>
                  </TabsList>
                </Tabs>

                <PortalDocumentList
                  kind={view === "invoices" ? "invoice" : "estimate"}
                  items={view === "invoices" ? invoices : estimates}
                  customers={customers}
                  settings={settings}
                  onPreview={(doc) => {
                    setPreview(doc);
                    setPreviewKind(view === "invoices" ? "invoice" : "estimate");
                  }}
                  onStatusChange={view === "invoices" ? setStatus : undefined}
                  onPayNow={view === "invoices" ? (inv, idx) => window.open(`/pay/${inv.id}?milestone=${idx}`, "_blank") : undefined}
                />

                <ScheduledMaintenanceTeaser />

                <div className="flex justify-end pt-1">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/portal?email=${encodeURIComponent(email)}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1.5" /> Open live portal
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DocumentPreviewDialog
        doc={preview}
        kind={previewKind}
        customer={preview ? customerFor(preview) : null}
        settings={settings}
        onClose={() => setPreview(null)}
        editLabel={previewKind === "invoice" ? (preview?.payment_status === "paid" ? "View" : "View & Pay") : (preview?.status === "converted" ? "View" : "Review and Accept")}
        onEdit={() => window.open(previewKind === "invoice" ? `/pay/${preview?.id}` : `/accept/${preview?.id}`, "_blank")}
        attachments={previewKind === "invoice" ? previewAttachments : null}
      />
    </>
  );
}