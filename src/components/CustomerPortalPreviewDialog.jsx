import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, ClipboardList, ExternalLink, Mail, Phone } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/StatusBadge";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";
import { formatMoney } from "@/lib/invoice";
import { useSettings } from "@/hooks/useSettings";

export default function CustomerPortalPreviewDialog({ customer, onClose }) {
  const [view, setView] = useState("invoices");
  const [preview, setPreview] = useState(null);
  const [previewKind, setPreviewKind] = useState("invoice");
  const { settings } = useSettings();
  const email = (customer?.email || "").trim().toLowerCase();

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

                <div className="divide-y rounded-lg border">
                  {view === "invoices" && (invoices.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No invoices.</div>
                  ) : invoices.map((i) => (
                    <button key={i.id} type="button" onClick={() => { setPreview(i); setPreviewKind("invoice"); }} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-accent/50 transition-colors min-h-11">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{i.name || "Invoice"}</div>
                        <div className="text-xs text-muted-foreground truncate">{i.number}{i.due_date ? ` · Due ${new Date(i.due_date).toLocaleDateString()}` : ""}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-medium tabular-nums">{formatMoney(i.total)}</span>
                        <StatusBadge status={i.payment_status} />
                      </div>
                    </button>
                  )))}

                  {view === "estimates" && (estimates.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No estimates.</div>
                  ) : estimates.map((e) => (
                    <button key={e.id} type="button" onClick={() => { setPreview(e); setPreviewKind("estimate"); }} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-accent/50 transition-colors min-h-11">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{e.name || "Estimate"}</div>
                        <div className="text-xs text-muted-foreground truncate">{e.number}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-medium tabular-nums">{formatMoney(e.total)}</span>
                        <StatusBadge status={e.status} />
                      </div>
                    </button>
                  )))}
                </div>

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
      />
    </>
  );
}