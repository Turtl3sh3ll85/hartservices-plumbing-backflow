import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, ClipboardList, Loader2, CreditCard, ArrowLeft, Mail, FileDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Image } from "@/components/ui/image";
import { useSettings } from "@/hooks/useSettings";
import StatusBadge from "@/components/StatusBadge";
import PaidAmountLabel from "@/components/PaidAmountLabel";
import { formatMoney } from "@/lib/invoice";
import { downloadInvoicePdf, downloadEstimatePdf } from "@/lib/invoicePdf";
import InvoicePaymentSchedule from "@/components/portal/InvoicePaymentSchedule";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";

const LOGO_URL = "https://base44.app/api/apps/6ab936d39a6c956d5b685842/files/mp/public/6ab936d39a6c956d5b685842/7ae293c6a_Logo.jpg";

export default function MyDocuments() {
  const [searchParams] = useSearchParams();
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [hidePaid, setHidePaid] = useState(false);
  const [view, setView] = useState("invoices");
  const [preview, setPreview] = useState(null);
  const [previewKind, setPreviewKind] = useState("invoice");

  const { data: portal = {}, isLoading, error: portalError } = useQuery({
    queryKey: ["customerPortal", email],
    queryFn: async () => {
      const res = await base44.functions.invoke("getCustomerPortalByEmail", { email });
      if (!res.data) throw new Error(res.error || "Failed to load documents");
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!email,
  });

  const invoices = portal.invoices || [];
  const estimates = portal.estimates || [];
  const customers = portal.customers || [];
  const visibleInvoices = hidePaid ? invoices.filter((i) => i.payment_status !== "paid") : invoices;
  const [downloading, setDownloading] = useState(null);

  const customerFor = (doc) => customers.find((c) => c.id === doc.customer_id) || customers[0];
  const downloadPdf = async (doc, kind) => {
    const key = `${kind}:${doc.id}`;
    setDownloading(key);
    try {
      const customer = customerFor(doc);
      if (kind === "invoice") await downloadInvoicePdf({ invoice: doc, customer, settings });
      else await downloadEstimatePdf({ estimate: doc, customer, settings });
    } catch (e) { /* ignore */ }
    setDownloading(null);
  };

  if (!email) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 text-center">
        <p className="text-muted-foreground mb-4">No email provided.</p>
        <Button asChild variant="outline"><Link to="/"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to home</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => navigate("/")} className="flex items-center gap-1.5 -ml-1 px-1 min-h-11 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to home">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-card border shrink-0">
              <Image src={settings?.logo_url || LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-heading font-semibold text-sm truncate">{settings?.business_name || "HartServices"}</span>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <Mail className="w-3.5 h-3.5" /> {email}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your invoices and estimates.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : portalError ? (
          <Card className="p-6 text-center text-sm text-destructive">
            {portalError.message || String(portalError)}
            <div className="mt-4">
              <Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft className="w-4 h-4 mr-1.5" /> Try a different email</Link></Button>
            </div>
          </Card>
        ) : customers.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground space-y-2">
            <p>We couldn't find any records for <span className="font-medium text-foreground">{email}</span>.</p>
            <p>If this isn't the email we have on file, please contact our office.</p>
            <div className="mt-4">
              <Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to home</Link></Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="inline-flex rounded-lg border bg-card p-0.5 w-full sm:w-auto">
              <button type="button" onClick={() => setView("invoices")} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === "invoices" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <FileText className="w-4 h-4 inline mr-1.5" /> Invoices{invoices.length > 0 ? ` (${invoices.length})` : ""}
              </button>
              <button type="button" onClick={() => setView("estimates")} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === "estimates" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <ClipboardList className="w-4 h-4 inline mr-1.5" /> Estimates{estimates.length > 0 ? ` (${estimates.length})` : ""}
              </button>
            </div>

            {view === "invoices" && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h2 className="font-heading font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Invoices</h2>
                {invoices.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
                    <Switch checked={hidePaid} onCheckedChange={setHidePaid} aria-label="Hide paid invoices" />
                    <span className="inline-flex items-center gap-1">Hide paid</span>
                  </label>
                )}
              </div>
              {visibleInvoices.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  {invoices.length === 0 ? "No invoices yet." : "All invoices are hidden."}
                </Card>
              ) : (
                <Card className="overflow-hidden p-0">
                  <div className="divide-y">
                    {visibleInvoices.map((i) => (
                      <div key={i.id} className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 min-h-11">
                          <button type="button" onClick={() => { setPreview(i); setPreviewKind("invoice"); }} className="min-w-0 text-left min-h-11 -m-1 p-1">
                            <div className="font-medium truncate">{i.name || "Invoice"}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {i.number}{i.due_date ? ` · Due ${new Date(i.due_date).toLocaleDateString()}` : ""}
                            </div>
                            <PaidAmountLabel invoice={i} />
                          </button>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-medium tabular-nums">{formatMoney(i.total)}</span>
                            <StatusBadge status={i.payment_status} />
                            <Button size="sm" variant="outline" onClick={() => downloadPdf(i, "invoice")} disabled={downloading === `invoice:${i.id}`} aria-label="Download invoice PDF">
                              {downloading === `invoice:${i.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                            </Button>
                            {i.payment_status === "paid" ? (
                              <Button asChild size="sm" variant="outline"><Link to={`/pay/${i.id}`}>View</Link></Button>
                            ) : (
                              <Button asChild size="sm"><Link to={`/pay/${i.id}`}><CreditCard className="w-4 h-4 mr-1" /> View & Pay</Link></Button>
                            )}
                          </div>
                        </div>
                        <InvoicePaymentSchedule invoice={i} />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
            )}

            {view === "estimates" && (
            <div>
              <h2 className="font-heading font-semibold mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Estimates</h2>
              {estimates.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">No estimates yet.</Card>
              ) : (
                <Card className="overflow-hidden p-0">
                  <div className="divide-y">
                    {estimates.map((e) => (
                      <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
                        <button type="button" onClick={() => { setPreview(e); setPreviewKind("estimate"); }} className="min-w-0 text-left min-h-11 -m-1 p-1">
                          <div className="font-medium truncate">{e.name || "Estimate"}</div>
                          <div className="text-sm text-muted-foreground truncate">{e.number}</div>
                        </button>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-medium tabular-nums">{formatMoney(e.total)}</span>
                          <StatusBadge status={e.status} />
                          <Button size="sm" variant="outline" onClick={() => downloadPdf(e, "estimate")} disabled={downloading === `estimate:${e.id}`} aria-label="Download estimate PDF">
                            {downloading === `estimate:${e.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                          </Button>
                          <Button asChild size="sm" variant="outline"><Link to={`/accept/${e.id}`}>{e.status === "converted" ? "View" : "Review"}</Link></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
            )}
          </>
        )}
        <DocumentPreviewDialog
          doc={preview}
          kind={previewKind}
          customer={preview ? customerFor(preview) : null}
          settings={settings}
          onClose={() => setPreview(null)}
          editLabel={previewKind === "invoice" ? (preview?.payment_status === "paid" ? "View" : "View & Pay") : (preview?.status === "converted" ? "View" : "Review")}
          onEdit={() => navigate(previewKind === "invoice" ? `/pay/${preview?.id}` : `/accept/${preview?.id}`)}
        />
      </main>
    </div>
  );
}