import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Droplet, CheckCircle2, Loader2, CreditCard, ShieldCheck, CheckCircle, FileDown, Paperclip, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { formatMoney, lineTotal, fullAddress, groupLineItemsBySection } from "@/lib/invoice";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import ServiceTerms from "@/components/ServiceTerms";

function installmentAmount(item, total) {
  return item.type === "percentage"
    ? ((Number(total) || 0) * (Number(item.value) || 0)) / 100
    : (Number(item.value) || 0);
}

export default function PayInvoice() {
  const { invoiceId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");
  const [captured, setCaptured] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("getInvoiceForPayment", { invoice_id: invoiceId });
      setData(res.data);
      setPaid(res.data.invoice.payment_status === "paid");
    } catch (e) { setError(e.message || "Invoice not found"); }
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const status = params.get("paypal");
    const token = params.get("token");
    if (status === "approved" && token && !captured) {
      setCaptured(true);
      setPaying("full");
      (async () => {
        try {
          const res = await base44.functions.invoke("capturePaypalPayment", { order_id: token, invoice_id: invoiceId });
          if (res.data?.success) {
            await load();
            if (!res.data?.paid_in_full) setPaid(false);
          } else { setError(res.data?.error || "Payment could not be confirmed"); }
        } catch (e) { setError(e.message); }
        setPaying(null);
      })();
    }
  }, []);

  const pay = async (scheduleIndex) => {
    if (!agreed) { setError("Please review and agree to the Service Terms & Conditions before paying."); return; }
    setPaying(scheduleIndex == null ? "full" : scheduleIndex);
    setError("");
    try {
      const payload = { invoice_id: invoiceId };
      if (scheduleIndex != null) payload.schedule_index = scheduleIndex;
      const res = await base44.functions.invoke("createPaypalOrder", payload);
      if (res.data?.approval_url) {
        window.location.href = res.data.approval_url;
      } else {
        setError(res.data?.error || "Could not start PayPal payment. Check that PayPal credentials are configured.");
        setPaying(null);
      }
    } catch (e) { setError(e.message); setPaying(null); }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePdf({ invoice, customer, settings: biz });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { invoice, customer, settings, attachments } = data || {};
  const biz = settings || {};
  const brand = biz.business_name || "FlowPro Plumbing";
  const schedule = invoice?.payment_schedule || [];
  const hasSchedule = schedule.length > 0;
  const nextUnpaid = hasSchedule ? schedule.findIndex((s) => !s.paid) : -1;

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
          <Button variant="outline" onClick={downloadPdf} disabled={downloading} className="mt-6">
            <FileDown className="w-4 h-4 mr-2" /> Download invoice PDF
          </Button>
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
        <Button variant="ghost" onClick={() => navigate("/")} className="-ml-2 mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex items-center gap-3 mb-6">
          {biz.logo_url ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-card border shrink-0">
              <Image src={biz.logo_url} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Droplet className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-heading font-semibold text-lg">{brand}</div>
            {biz.business_email && <div className="text-xs text-muted-foreground">{biz.business_email}</div>}
            <div className="text-xs text-muted-foreground">
              {biz.business_phone && <span>{biz.business_phone}  •  </span>}<span className="font-medium">RMP42140</span>
            </div>
            <div className="text-xs text-muted-foreground">Jon Hart is licensed by the Texas State Board of Plumbing Examiners</div>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</div>
                <div className="font-heading text-xl font-semibold mt-0.5">{invoice.name}</div>
                <div className="text-sm text-muted-foreground">{invoice.number}</div>
                <div className="text-xs text-muted-foreground mt-1">Invoices are due within 7 days of issuance unless otherwise noted.</div>
              </div>
              {invoice.due_date && (
                <div className="text-sm text-right">
                  <div className="text-muted-foreground">Due</div>
                  <div className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</div>
                </div>
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={downloadPdf} disabled={downloading}>
                <FileDown className="w-4 h-4 mr-1.5" /> Download PDF
              </Button>
            </div>
          </div>

          {customer && (
            <div className="p-6 border-b text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Bill to</div>
              <div className="font-medium">{customer.name}</div>
              {customer?.company && <div className="text-muted-foreground">{customer.company}</div>}
              {fullAddress(customer) && <div className="text-muted-foreground">{fullAddress(customer)}</div>}
            </div>
          )}

          <div className="p-6">
            <div className="space-y-3">
              {groupLineItemsBySection(invoice.line_items).map(({ section, items }, gi) => (
                <div key={gi} className={section ? "rounded-lg border overflow-hidden" : ""}>
                  {section && <div className="bg-primary/10 px-3 py-2 font-heading font-semibold text-primary">{section}</div>}
                  <div className={section ? "p-3 space-y-2" : "space-y-2"}>
                    {items.map((li, i) => (
                      <div key={i} className="flex justify-between text-sm py-1.5 gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {li.image_url && (
                            <div className="w-12 h-12 rounded-md overflow-hidden border bg-muted shrink-0">
                              <Image src={li.image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium">{li.description || "—"}</div>
                            <div className="text-xs text-muted-foreground">{li.quantity} × {formatMoney(li.unit_price)}</div>
                          </div>
                        </div>
                        <div className="tabular-nums shrink-0">{formatMoney(lineTotal(li))}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatMoney(invoice.subtotal)}</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><span className="tabular-nums">{formatMoney(invoice.tax)}</span></div>
              {invoice.cc_fee > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground"><span>Credit Card Fee (3.5%)</span><span className="tabular-nums">{formatMoney(invoice.cc_fee)}</span></div>
              )}
              <div className="flex justify-between text-lg font-heading font-semibold pt-1"><span>Total due</span><span className="tabular-nums">{formatMoney(invoice.total)}</span></div>
            </div>
          </div>

          {hasSchedule && (
            <div className="p-6 border-t">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Payment schedule</div>
              <div className="space-y-2.5">
                {schedule.map((p, i) => {
                  const amt = installmentAmount(p, invoice.total);
                  const isPaid = !!p.paid;
                  const isPayingThis = paying === i;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{p.label || `Payment ${i + 1}`}</div>
                        <div className="text-sm tabular-nums text-muted-foreground">{formatMoney(amt)}</div>
                      </div>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" /> Paid
                        </span>
                      ) : (
                        <Button size="sm" onClick={() => pay(i)} disabled={paying != null || !agreed} className="shrink-0">
                          {isPayingThis ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                          Pay
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <ServiceTerms agreed={agreed} onChange={setAgreed} />

          <div className="p-6 border-t bg-muted/30">
            {error && <div className="text-sm text-red-600 mb-3 text-center">{error}</div>}
            {!hasSchedule && (
              <Button onClick={() => pay(null)} disabled={paying != null || !agreed} className="w-full h-12 text-base">
                {paying != null ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing…</>
                ) : (
                  <><CreditCard className="w-5 h-5 mr-2" /> Pay {formatMoney(invoice.total)} with PayPal</>
                )}
              </Button>
            )}
            {hasSchedule && nextUnpaid >= 0 && (
              <Button onClick={() => pay(nextUnpaid)} disabled={paying != null || !agreed} className="w-full h-12 text-base">
                {paying === nextUnpaid ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing…</>
                ) : (
                  <><CreditCard className="w-5 h-5 mr-2" /> Pay {formatMoney(installmentAmount(schedule[nextUnpaid], invoice.total))} — {schedule[nextUnpaid].label || `Payment ${nextUnpaid + 1}`}</>
                )}
              </Button>
            )}
            {hasSchedule && nextUnpaid === -1 && (
              <div className="text-center text-sm text-emerald-700 font-medium">All payments complete</div>
            )}
            <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure payment powered by PayPal
            </div>
          </div>
        </div>

        {Array.isArray(attachments) && attachments.length > 0 && (
          <div className="bg-card rounded-2xl shadow-sm border p-6 mt-4">
            <div className="flex items-center gap-1.5 text-sm font-medium mb-3"><Paperclip className="w-4 h-4" /> Attachments</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {attachments.map((att) => (
                <a key={att.id} href={att.drive_link} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/40 transition-colors">
                  {att.type === "photo" && att.thumbnail_url ? (
                    <div className="w-12 h-12 rounded-md overflow-hidden border bg-muted shrink-0">
                      <Image src={att.thumbnail_url} alt={att.file_name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{att.file_name}</div>
                    <div className="text-xs text-primary inline-flex items-center gap-1">Open <ExternalLink className="w-3 h-3" /></div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {invoice.notes && <p className="text-center text-sm text-muted-foreground mt-4">{invoice.notes}</p>}
      </div>
    </div>
  );
}