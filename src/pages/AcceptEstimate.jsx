import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Droplet, CheckCircle2, Loader2, ShieldCheck, FileText, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { formatMoney, lineTotal, fullAddress } from "@/lib/invoice";

export default function AcceptEstimate() {
  const { estimateId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await base44.functions.invoke("getEstimateForAcceptance", { estimate_id: estimateId });
      setData(res.data);
    } catch (e) { setError(e.message || "Estimate not found"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const accept = async () => {
    setAccepting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("acceptEstimate", { estimate_id: estimateId });
      if (res.data?.invoice_id) {
        window.location.href = `/pay/${res.data.invoice_id}`;
      } else {
        setError(res.data?.error || "Could not accept estimate.");
        setAccepting(false);
      }
    } catch (e) { setError(e.message); setAccepting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { estimate, job, customer, settings } = data || {};
  const biz = settings || {};
  const brand = biz.business_name || "FlowPro Plumbing";

  if (error && !estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center"><p className="text-lg font-medium">{error}</p></div>
      </div>
    );
  }

  const alreadyConverted = estimate?.status === "converted";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-6">
          {biz.logo_url ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-card border shrink-0">
              <Image src={biz.logo_url} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Droplet className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <div className="font-heading font-semibold text-lg">{brand}</div>
            {biz.business_email && <div className="text-xs text-muted-foreground">{biz.business_email}</div>}
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Estimate</div>
                <div className="font-heading text-xl font-semibold mt-0.5">{estimate.name}</div>
                <div className="text-sm text-muted-foreground">{estimate.number}</div>
              </div>
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
              {(estimate.line_items || []).map((li, i) => (
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
              <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatMoney(estimate.subtotal)}</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><span className="tabular-nums">{formatMoney(estimate.tax)}</span></div>
              <div className="flex justify-between text-lg font-heading font-semibold pt-1"><span>Total</span><span className="tabular-nums">{formatMoney(estimate.total)}</span></div>
            </div>

            {(estimate.payment_schedule || []).length > 0 && (
              <div className="border-t mt-4 pt-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Payment schedule</div>
                <div className="space-y-1.5">
                  {(estimate.payment_schedule || []).map((p, i) => {
                    const amt = p.type === "percentage" ? ((Number(estimate.total) || 0) * (Number(p.value) || 0)) / 100 : Number(p.value) || 0;
                    return (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{p.label || `Payment ${i + 1}`}</span>
                        <span className="tabular-nums">{formatMoney(amt)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-muted/30">
            {error && <div className="text-sm text-red-600 mb-3 text-center">{error}</div>}
            {alreadyConverted ? (
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium"><CheckCircle2 className="w-5 h-5" /> This estimate has been accepted and converted to an invoice.</div>
                {estimate.converted_invoice_id && (
                  <Button onClick={() => { window.location.href = `/pay/${estimate.converted_invoice_id}`; }} className="w-full h-12 text-base">
                    <CreditCard className="w-5 h-5 mr-2" /> View invoice &amp; pay
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={accept} disabled={accepting} className="w-full h-12 text-base">
                {accepting ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Converting…</>) : (<><FileText className="w-5 h-5 mr-2" /> Accept estimate</>)}
              </Button>
            )}
            <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" /> Accepting converts this estimate into a payable invoice
            </div>
          </div>
        </div>

        {estimate.notes && <p className="text-center text-sm text-muted-foreground mt-4">{estimate.notes}</p>}
      </div>
    </div>
  );
}