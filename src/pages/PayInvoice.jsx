import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Droplet, CheckCircle2, Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, lineTotal, fullAddress } from "@/lib/invoice";

export default function PayInvoice() {
  const { invoiceId } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");
  const [captured, setCaptured] = useState(false);

  const load = async () => {
    try {
      const res = await base44.functions.invoke("getInvoiceForPayment", { invoice_id: invoiceId });
      setData(res.data);
      if (res.data.invoice.payment_status === "paid") setPaid(true);
    } catch (e) { setError(e.message || "Invoice not found"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const status = params.get("paypal");
    const token = params.get("token");
    if (status === "approved" && token && !captured) {
      setCaptured(true);
      setPaying(true);
      (async () => {
        try {
          const res = await base44.functions.invoke("capturePaypalPayment", { order_id: token, invoice_id: invoiceId });
          if (res.data?.success) { setPaid(true); }
          else { setError(res.data?.error || "Payment could not be confirmed"); }
        } catch (e) { setError(e.message); }
        setPaying(false);
      })();
    }
  }, []);

  const pay = async () => {
    setPaying(true);
    setError("");
    try {
      const res = await base44.functions.invoke("createPaypalOrder", { invoice_id: invoiceId });
      if (res.data?.approval_url) {
        window.location.href = res.data.approval_url;
      } else {
        setError(res.data?.error || "Could not start PayPal payment. Check that PayPal credentials are configured.");
        setPaying(false);
      }
    } catch (e) { setError(e.message); setPaying(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { invoice, job, customer, settings } = data || {};
  const biz = settings || {};
  const brand = biz.business_name || "FlowPro Plumbing";

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h1 className="font-heading text-2xl font-semibold">Payment complete</h1>
          <p className="text-muted-foreground mt-2">
            Thank you! Your payment of <span className="font-medium text-foreground">{formatMoney(invoice?.total)}</span> for <span className="font-medium text-foreground">{invoice?.name}</span> has been received.
          </p>
          <p className="text-sm text-muted-foreground mt-4">{brand}</p>
        </div>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center"><p className="text-lg font-medium">{error}</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Droplet className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-heading font-semibold text-lg">{brand}</div>
            {biz.business_email && <div className="text-xs text-muted-foreground">{biz.business_email}</div>}
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</div>
                <div className="font-heading text-xl font-semibold mt-0.5">{invoice.name}</div>
                <div className="text-sm text-muted-foreground">{invoice.number}</div>
              </div>
              {invoice.due_date && (
                <div className="text-sm text-right">
                  <div className="text-muted-foreground">Due</div>
                  <div className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>

          {(customer || job) && (
            <div className="p-6 border-b grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Bill to</div>
                {customer && <div className="font-medium">{customer.name}</div>}
                {customer?.company && <div className="text-muted-foreground">{customer.company}</div>}
                {customer && fullAddress(customer) && <div className="text-muted-foreground">{fullAddress(customer)}</div>}
              </div>
              <div className="sm:text-right">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Job site</div>
                {job?.title && <div className="font-medium">{job.title}</div>}
                {job && fullAddress(job, "job_") && <div className="text-muted-foreground">{fullAddress(job, "job_")}</div>}
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="space-y-2">
              {(invoice.line_items || []).map((li, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5">
                  <div className="min-w-0 pr-3">
                    <div className="font-medium">{li.description || "—"}</div>
                    <div className="text-xs text-muted-foreground">{li.quantity} × {formatMoney(li.unit_price)}</div>
                  </div>
                  <div className="tabular-nums shrink-0">{formatMoney(lineTotal(li))}</div>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatMoney(invoice.subtotal)}</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><span className="tabular-nums">{formatMoney(invoice.tax)}</span></div>
              <div className="flex justify-between text-lg font-heading font-semibold pt-1"><span>Total due</span><span className="tabular-nums">{formatMoney(invoice.total)}</span></div>
            </div>
          </div>

          <div className="p-6 border-t bg-muted/30">
            {error && <div className="text-sm text-red-600 mb-3 text-center">{error}</div>}
            <Button onClick={pay} disabled={paying} className="w-full h-12 text-base">
              {paying ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing…</>
              ) : (
                <><CreditCard className="w-5 h-5 mr-2" /> Pay {formatMoney(invoice.total)} with PayPal</>
              )}
            </Button>
            <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure payment powered by PayPal
            </div>
          </div>
        </div>

        {invoice.notes && <p className="text-center text-sm text-muted-foreground mt-4">{invoice.notes}</p>}
      </div>
    </div>
  );
}