import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
// no navigation needed on this page
import { CreditCard, CheckCircle2, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PaymentScheduleDisplay from "@/components/PaymentScheduleDisplay";

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
              <CardContent className="p-4">
                <PaymentScheduleDisplay
                  schedule={schedule}
                  total={invoice.total}
                  standingBy={invoice.standing_by}
                  renderAction={(p, i) => {
                    if (p.paid) return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
                    return (
                      <Button size="sm" onClick={() => pay(i)} disabled={paying === i}>
                        <CreditCard className="w-4 h-4" /> {paying === i ? "…" : "Pay now"}
                      </Button>
                    );
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4" /> Next stage status
                </div>
                <p className="text-xs text-muted-foreground">Let {settings?.business_name || "us"} know when you're ready for the next phase of work to begin.</p>
                <select
                  value={ready ? "ready" : "not_ready"}
                  onChange={(e) => saveReady(e.target.value === "ready")}
                  disabled={savingReady}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="not_ready">Not ready</option>
                  <option value="ready">Customer ready</option>
                </select>
                {ready === true && <p className="text-xs text-emerald-600 text-center">Thanks — we'll be in touch to schedule the next stage.</p>}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}