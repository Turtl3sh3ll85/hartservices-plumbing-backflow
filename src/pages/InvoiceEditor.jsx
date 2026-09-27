import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Save, Send, Copy, Check, Link as LinkIcon, Contact, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import LineItemEditor from "@/components/LineItemEditor";
import PaymentScheduleEditor from "@/components/PaymentScheduleEditor";
import GoogleContactsDialog from "@/components/GoogleContactsDialog";
import CustomerFormDialog from "@/components/CustomerFormDialog";
import SheetItemsDialog from "@/components/SheetItemsDialog";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { calcTotals, formatMoney, nextNumber } from "@/lib/invoice";

export default function InvoiceEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const location = useLocation();
  const isEstimateRoute = location.pathname.startsWith("/estimates");
  const [docType, setDocType] = useState(isEstimateRoute ? "estimate" : "invoice");
  const isEstimate = docType === "estimate";
  const docLabel = isEstimate ? "estimate" : "invoice";
  const listRoute = isEstimate ? "/estimates" : "/invoices";

  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    job_id: params.get("job") || "",
    number: "",
    name: "",
    line_items: [{ description: "", quantity: 1, unit_price: 0 }],
    tax_rate: 0,
    subtotal: 0,
    tax: 0,
    total: 0,
    status: "draft",
    payment_status: "unpaid",
    due_date: "",
    notes: "",
    payment_schedule: [],
  });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(id || null);
  const [copied, setCopied] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [googleOpen, setGoogleOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [modifiersCatalog, setModifiersCatalog] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const [jb, cs, st] = await Promise.all([
        base44.entities.Job.list("-created_date", 200),
        base44.entities.Customer.list("name", 500),
        base44.entities.Settings.list().catch(() => []),
      ]);
      setJobs(jb);
      setCustomers(cs);
      setSettings(st[0] || null);
      if (isEdit) {
        const inv = await (isEstimateRoute ? base44.entities.Estimate.get(id) : base44.entities.Invoice.get(id));
        setForm({ ...form, ...inv, line_items: inv.line_items || [], payment_schedule: inv.payment_schedule || [] });
        setSavedId(id);
        const j = jb.find((x) => x.id === inv.job_id);
        if (j) setSelectedCustomerId(j.customer_id || "");
      } else {
        const all = await (isEstimateRoute ? base44.entities.Estimate.list() : base44.entities.Invoice.list());
        setForm((f) => ({ ...f, number: nextNumber(isEstimateRoute ? "EST" : "INV", all.map((i) => i.number)), tax_rate: st[0]?.default_tax_rate || 0 }));
      }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("getSheetLineItems", { sheet_id: "1x0jEtP3eJMFYi5dTDdBEtNrI8W5R7p9LqIGvCRKwKXw" });
        setCatalog(res.data?.line_items || []);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("getSheetModifiers", { sheet_id: "10XcNV3lHx0he2XoVV9TOS2OXEfZSqAi9rhp5KFvyt0E" });
        setModifiersCatalog(res.data?.modifiers || []);
      } catch (e) {}
    })();
  }, []);

  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));
  const selectedJob = jobMap[form.job_id];
  const totals = calcTotals(form.line_items, form.tax_rate);

  const pickGoogleContact = async (c) => {
    let cust = customers.find((cu) => cu.email && c.email && cu.email.toLowerCase() === c.email.toLowerCase());
    if (!cust) {
      cust = await base44.entities.Customer.create({ name: c.name || c.email, email: c.email || "", phone: c.phone || "" });
      setCustomers((prev) => [...prev, cust]);
    }
    setSelectedCustomerId(cust.id);
    setForm((f) => ({ ...f, job_id: "" }));
  };

  const pickManualCustomer = (cust) => {
    setCustomers((prev) => [...prev, cust]);
    setSelectedCustomerId(cust.id);
    setForm((f) => ({ ...f, job_id: "" }));
  };

  const setLineItems = (li) => setForm({ ...form, line_items: li });

  const switchType = (t) => {
    setDocType(t);
    if (!isEdit) {
      (async () => {
        const all = await (t === "invoice" ? base44.entities.Invoice.list() : base44.entities.Estimate.list());
        setForm((f) => ({ ...f, number: nextNumber(t === "invoice" ? "INV" : "EST", all.map((x) => x.number)) }));
      })();
    }
  };

  const pickSheetItems = (items) => {
    const cleaned = form.line_items.filter((li) => (li.description || "").trim());
    setForm({ ...form, line_items: [...cleaned, ...items] });
  };

  const save = async (send = false) => {
    if (!form.name) { alert(`Name the ${docLabel}.`); return; }
    if (!selectedCustomerId && !form.job_id) { alert("Select a customer."); return; }
    setSaving(true);
    try {
      let jobId = form.job_id;
      if (!jobId) {
        const jb = await base44.entities.Job.create({ title: form.name, customer_id: selectedCustomerId, status: "scheduled" });
        jobId = jb.id;
        setJobs((prev) => [jb, ...prev]);
        setForm((f) => ({ ...f, job_id: jb.id }));
      }
      const basePayload = { ...form, job_id: jobId, ...totals, status: send ? "sent" : form.status };
      const payload = isEstimate
        ? { job_id: basePayload.job_id, number: basePayload.number, name: basePayload.name, line_items: basePayload.line_items, subtotal: basePayload.subtotal, tax_rate: basePayload.tax_rate, tax: basePayload.tax, total: basePayload.total, payment_schedule: basePayload.payment_schedule, status: basePayload.status, notes: basePayload.notes }
        : basePayload;
      const entity = isEstimate ? base44.entities.Estimate : base44.entities.Invoice;
      let resultId = savedId;
      if (isEdit || savedId) {
        await entity.update(savedId, payload);
      } else {
        const created = await entity.create(payload);
        resultId = created.id;
        setSavedId(resultId);
      }
      if (send) {
        try {
          const res = await base44.functions.invoke("sendDocumentEmail", { type: isEstimate ? "estimate" : "invoice", id: resultId });
          const sent = (res.data?.sent || []).filter((s) => s.ok).map((s) => s.to);
          const failed = (res.data?.sent || []).filter((s) => !s.ok);
          if (failed.length) {
            toast({
              title: "Email not delivered to some recipients",
              description: `${failed.map((f) => f.to).join(", ")} — ${failed[0].error || "delivery failed"}. Connect a verified custom domain to email customers who aren't app users.`,
              variant: "destructive",
            });
          } else if (sent.length) {
            toast({ title: "Email sent", description: `Delivered to ${sent.join(", ")}` });
          }
        } catch (e) {
          toast({ title: "Email failed", description: e.message, variant: "destructive" });
        }
      }
      navigate(`/${isEstimate ? "estimates" : "invoices"}/${resultId}`);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const payLink = savedId ? `${window.location.origin}/${isEstimate ? "accept" : "pay"}/${savedId}` : null;
  const copyLink = () => {
    if (!payLink) return;
    navigator.clipboard.writeText(payLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to={listRoute}><ArrowLeft className="w-4 h-4 mr-1" /> Back to {isEstimate ? "estimates" : "invoices"}</Link></Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{isEdit ? `Edit ${docLabel}` : `New ${docLabel}`}</h1>
        {savedId && <StatusBadge status={isEstimate ? form.status : form.payment_status} />}
      </div>

      {!isEdit && (
        <div className="inline-flex rounded-lg border bg-card p-0.5">
          {["invoice", "estimate"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchType(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${docType === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <Card className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            {selectedCustomerId ? (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-md border bg-muted/30">
                <span className="font-medium text-sm truncate">{customerMap[selectedCustomerId]?.name || "Selected customer"}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedCustomerId(""); setForm((f) => ({ ...f, job_id: "" })); }}>Change</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setManualOpen(true)}><Plus className="w-4 h-4 mr-1" /> New customer</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setGoogleOpen(true)}><Contact className="w-4 h-4 mr-1" /> Google Contacts</Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Invoice number</Label>
            <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Invoice name * <span className="text-muted-foreground font-normal">(describe the tasks performed)</span></Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Replace bathroom vanity &amp; repair leak under sink" />
        </div>

        {selectedJob && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <span className="font-medium text-foreground">{customerMap[selectedJob.customer_id]?.name || ""}</span>
            {selectedJob.job_street && <span> · {selectedJob.job_street}, {selectedJob.job_city}</span>}
          </div>
        )}

        <div className="space-y-2">
          <Label>Line items</Label>
          <LineItemEditor lineItems={form.line_items} onChange={setLineItems} catalog={catalog} modifiersCatalog={modifiersCatalog} />
        </div>

        {!isEstimate && <p className="text-sm text-muted-foreground italic">Invoices are due within 7 days of issuance unless otherwise noted.</p>}

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>

        <div className="border-t pt-4 space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatMoney(totals.subtotal)}</span></div>
          <div className="flex justify-between text-lg font-heading font-semibold pt-1"><span>Total</span><span className="tabular-nums">{formatMoney(totals.total)}</span></div>
        </div>

        <PaymentScheduleEditor total={totals.total} schedule={form.payment_schedule} onChange={(s) => setForm({ ...form, payment_schedule: s })} />
      </Card>

      {payLink && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-sm font-medium mb-2"><LinkIcon className="w-4 h-4" /> {isEstimate ? "Accept link" : "Payment link"}</div>
          <p className="text-xs text-muted-foreground mb-3">{isEstimate ? "Share this link with your client so they can review and accept the estimate." : "Share this link with your client so they can pay with PayPal."}</p>
          <div className="flex gap-2">
            <Input readOnly value={payLink} className="bg-background font-mono text-xs" />
            <Button variant="outline" onClick={copyLink}>{copied ? <><Check className="w-4 h-4 mr-1" /> Copied</> : <><Copy className="w-4 h-4 mr-1" /> Copy</>}</Button>
          </div>
        </Card>
      )}

      <GoogleContactsDialog open={googleOpen} onOpenChange={setGoogleOpen} onPick={pickGoogleContact} />
      <CustomerFormDialog open={manualOpen} onOpenChange={setManualOpen} onPick={pickManualCustomer} />
      <SheetItemsDialog open={sheetOpen} onOpenChange={setSheetOpen} onPick={pickSheetItems} defaultSheetId={settings?.google_sheet_id} />

      <div className="flex flex-wrap gap-2 justify-end">
        <Button asChild variant="outline"><Link to={listRoute}>Cancel</Link></Button>
        <Button variant="outline" onClick={() => save(false)} disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save draft"}</Button>
        <Button onClick={() => save(true)} disabled={saving || !form.name}><Send className="w-4 h-4 mr-1" /> Save &amp; send</Button>
      </div>
    </div>
  );
}