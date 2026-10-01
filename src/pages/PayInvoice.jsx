import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
// no navigation needed on this page
import { CreditCard, CheckCircle2, Clock, PauseCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, paymentAmounts, amountPaidTotal } from "@/lib/format";

export default function PayInvoice() {
  const { invoiceId } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [ready, setReady] = useState(null);
  const [savingReady, setSavingReady] = useState(false);

  const load = async () => {
    try {
      const res = await base44.functions.invoke("getInvoiceForPayment", { invoice_id: invoiceId });
      setData(res.data);
      setReady(res.data?.invoice?.customer_ready_for_next_stage);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      await load();
      const token = params.get("token");
      if (params.get("paypal") === "approved" && token) {
        try {
          await base44.functions.invoke("capturePaypalPayment", { order_id: token, invoice_id: invoiceId });
          await load();
        } catch (e) { alert(e.message || "Payment capture failed"); }
      }
    })();
  }, [invoiceId]);

  const { invoice, customer, settings } = data || {};
  const schedule = invoice?.payment_schedule || [];
  const amounts = paymentAmounts(schedule, invoice?.total);
  const paid = amountPaidTotal(schedule);
  const balance = Math.max(0, (invoice?.total || 0) - paid);
  const nextIdx = schedule.findIndex((s) => !s.paid);

  const pay = async (idx) => {
    setPaying(idx);
    try {
      const res = await base44.functions.invoke("createPaypalOrder", { invoice_id: invoiceId, schedule_index: idx });
      if (res.data?.approval_url) window.location.href = res.data.approval_url;
    } catch (e) { alert(e.message || "Failed to start payment"); setPaying(null); }
  };

  const saveReady = async (value) => {
    setReady(value);
    setSavingReady(true);
    try {
      await base44.functions.invoke("setCustomerReadyForNextStage", { invoice_id: invoiceId, ready: value });
    } catch (e) {} finally { setSavingReady(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!invoice) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Invoice not found.</div>;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-semibold">{settings?.business_name || "Invoice"}</h1>
          <p className="text-sm text-muted-foreground">{invoice.name || invoice.number}</p>
        </div>

        {invoice.payment_status === "paid" && (
          <Card><CardContent className="p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <div className="font-medium">This invoice is paid in full. Thank you!</div>
          </CardContent></Card>
        )}

        {invoice.payment_status !== "paid" && (
          <>
            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="tabular-nums">{formatCurrency(invoice.total)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Paid</span><span className="tabular-nums">{formatCurrency(paid)}</span></div>
                <div className="flex justify-between font-medium border-t pt-1"><span>Balance due</span><span className="tabular-nums">{formatCurrency(balance)}</span></div>
              </CardContent>
            </Card>

            {schedule.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-sm font-medium">Payment schedule</h2>
                {schedule.map((p, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{p.label || `Payment ${i + 1}`}</div>
                        <div className="text-sm text-muted-foreground tabular-nums">{formatCurrency(amounts[i])}</div>
                        {p.paid && <span className="text-xs text-emerald-600">Paid</span>}
                        {!p.paid && i === nextIdx && invoice.standing_by && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600"><PauseCircle className="w-3 h-3" /> Standing by</span>
                        )}
                      </div>
                      {p.paid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : i === nextIdx && !invoice.standing_by ? (
                        <Button size="sm" onClick={() => pay(i)} disabled={paying === i}>
                          <CreditCard className="w-4 h-4" /> {paying === i ? "…" : "Pay now"}
                        </Button>
                      ) : !p.paid ? (
                        <span className="text-xs text-muted-foreground">Upcoming</span>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Button className="w-full" size="lg" onClick={() => pay(0)} disabled={paying === 0}>
                <CreditCard className="w-5 h-5" /> {paying === 0 ? "Loading…" : `Pay ${formatCurrency(balance)}`}
              </Button>
            )}

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4" /> Ready for next stage?
                </div>
                <p className="text-xs text-muted-foreground">Let {settings?.business_name || "us"} know when you're ready for the next phase of work to begin.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => saveReady(true)} disabled={savingReady}
                    className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${ready === true ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-border hover:bg-accent/50"}`}>
                    Yes, ready to begin
                  </button>
                  <button onClick={() => saveReady(false)} disabled={savingReady}
                    className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${ready === false ? "border-amber-500 bg-amber-50 text-amber-700" : "border-border hover:bg-accent/50"}`}>
                    Not yet
                  </button>
                </div>
                {ready === true && <p className="text-xs text-emerald-600 text-center">Thanks — we'll be in touch to schedule the next stage.</p>}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}