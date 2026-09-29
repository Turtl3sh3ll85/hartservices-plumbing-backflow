import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Save, Send, Copy, Check, Link as LinkIcon, Contact, Plus, ClipboardList, FileText } from "lucide-react";
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
import InvoiceAttachments from "@/components/InvoiceAttachments";
import StatusBadge from "@/components/StatusBadge";
import OpenedIndicator from "@/components/OpenedIndicator";
import InvoicePaymentControl from "@/components/InvoicePaymentControl";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { calcTotals, formatMoney, nextNumber, installmentAmount } from "@/lib/invoice";

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="font-heading text-base font-semibold tracking-tight">{children}</h2>
    </div>);

}

export default function InvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const location = useLocation();
  const isEstimateRoute = location.pathname.startsWith("/estimates");
  const [docType, setDocType] = useState(isEstimateRoute ? "estimate" : "invoice");
  const isEstimate = docType === "estimate";
  const docLabel = isEstimate ? "estimate" : "invoice";
  const listRoute = isEstimate ? "/estimates" : "/invoices";

  const queryClient = useQueryClient();
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("name", 500) });
  const { data: settings = null, isLoading: loadingSettings } = useQuery({ queryKey: ["settings"], queryFn: async () => {const st = await base44.entities.Settings.list().catch(() => []);return st[0] || null;} });
  const [form, setForm] = useState({
    customer_id: "",
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
    reminders_enabled: true,
    cc_fee_enabled: false
  });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(id || null);
  const [copied, setCopied] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [googleOpen, setGoogleOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  const { data: doc, isLoading: loadingDoc } = useQuery({
    queryKey: [isEstimateRoute ? "estimate" : "invoice", id],
    queryFn: () => isEstimateRoute ? base44.entities.Estimate.get(id) : base44.entities.Invoice.get(id),
    enabled: isEdit
  });
  const { data: allDocs = [], isLoading: loadingAllDocs } = useQuery({
    queryKey: [isEstimateRoute ? "estimates-all" : "invoices-all"],
    queryFn: () => isEstimateRoute ? base44.entities.Estimate.list() : base44.entities.Invoice.list(),
    enabled: !isEdit
  });

  const populatedIdRef = useRef(null);
  useEffect(() => {
    if (populatedIdRef.current === id) return;
    if (isEdit) {
      if (loadingDoc || !doc) return;
      setForm((f) => ({ ...f, ...doc, line_items: doc.line_items || [], payment_schedule: doc.payment_schedule || [] }));
      setSavedId(id);
      setSelectedCustomerId(doc.customer_id || "");
      populatedIdRef.current = id;
    } else {
      if (loadingAllDocs || loadingSettings) return;
      setForm((f) => ({ ...f, number: nextNumber(isEstimateRoute ? "EST" : "INV", allDocs.map((i) => i.number)), tax_rate: settings?.default_tax_rate || 0 }));
      populatedIdRef.current = id;
    }
  }, [isEdit, loadingDoc, doc, loadingAllDocs, loadingSettings, allDocs, settings, id]);

  const { data: catalogData } = useQuery({
    queryKey: ["sheetLineItems"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getSheetLineItems", { sheet_id: "1x0jEtP3eJMFYi5dTDdBEtNrI8W5R7p9LqIGvCRKwKXw" });
      return res.data?.line_items || [];
    },
    staleTime: Infinity
  });
  const { data: modifiersData } = useQuery({
    queryKey: ["sheetModifiers"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getSheetModifiers", { sheet_id: "10XcNV3lHx0he2XoVV9TOS2OXEfZSqAi9rhp5KFvyt0E" });
      return res.data?.modifiers || [];
    },
    staleTime: Infinity
  });
  const catalog = catalogData || [];
  const modifiersCatalog = modifiersData || [];

  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));
  const totals = calcTotals(form.line_items, form.tax_rate, !!form.cc_fee_enabled);

  const pickGoogleContact = async (c) => {
    let cust = customers.find((cu) => cu.email && c.email && cu.email.toLowerCase() === c.email.toLowerCase());
    if (!cust) {
      cust = await base44.entities.Customer.create({ name: c.name || c.email, email: c.email || "", phone: c.phone || "", company: c.company || "" });
      queryClient.setQueryData(["customers"], (prev) => [...(prev || []), cust]);
    } else if (c.company && !cust.company) {
      cust = await base44.entities.Customer.update(cust.id, { company: c.company });
      queryClient.setQueryData(["customers"], (prev) => (prev || []).map((cu) => cu.id === cust.id ? cust : cu));
    }
    setSelectedCustomerId(cust.id);
  };

  const pickManualCustomer = (cust) => {
    queryClient.setQueryData(["customers"], (prev) => [...(prev || []), cust]);
    setSelectedCustomerId(cust.id);
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

  const toggleSchedulePaid = async (i) => {
    if (!savedId) return;
    const item = form.payment_schedule[i];
    const newPaid = !item.paid;
    const nextSchedule = form.payment_schedule.map((s, idx) => idx === i ? { ...s, paid: newPaid } : s);
    const amount_paid = nextSchedule.reduce((s, it) => s + (it.paid ? installmentAmount(it, totals.total) : 0), 0);
    const allPaid = nextSchedule.length > 0 && nextSchedule.every((it) => it.paid);
    const anyPaid = nextSchedule.some((it) => it.paid);
    const today = new Date().toISOString().slice(0, 10);
    const update = {
      payment_schedule: nextSchedule,
      amount_paid,
      payment_status: allPaid ? "paid" : anyPaid ? "partial" : "unpaid",
      payment_method: anyPaid ? "check" : "",
      paid_date: allPaid ? today : ""
    };
    if (!isEstimate) update.status = allPaid ? "paid" : "sent";
    setForm((f) => ({ ...f, ...update }));
    const listKey = isEstimate ? "estimates" : "invoices";
    queryClient.setQueryData([listKey], (old) => (old || []).map((x) => x.id === savedId ? { ...x, ...update } : x));
    if (!isEstimate) {
      queryClient.setQueryData(["invoices", "recent"], (old) => (old || []).map((x) => x.id === savedId ? { ...x, ...update } : x));
    }
    try {
      const entity = isEstimate ? base44.entities.Estimate : base44.entities.Invoice;
      await entity.update(savedId, update);
      toast({ description: newPaid ? "Marked paid by check." : "Unmarked payment." });
    } catch (e) {
      queryClient.invalidateQueries({ queryKey: [listKey] });
      if (!isEstimate) queryClient.invalidateQueries({ queryKey: ["invoices", "recent"] });
      toast({ variant: "destructive", description: "Could not update payment." });
    }
  };

  const save = async (send = false) => {
    if (!form.name) {toast({ description: `Name the ${docLabel}.` });return;}
    if (!selectedCustomerId) {toast({ description: "Select a customer." });return;}
    setSaving(true);
    const listKey = isEstimate ? "estimates" : "invoices";
    const tempId = savedId || `temp-${Date.now()}`;
    const optimistic = { ...form, customer_id: selectedCustomerId, ...totals, status: send ? "sent" : form.status, id: tempId };
    const prevList = queryClient.getQueryData([listKey]);
    queryClient.setQueryData([listKey], (old) => {
      const arr = old || [];
      const idx = arr.findIndex((x) => x.id === (savedId || tempId));
      if (idx >= 0) return arr.map((x) => x.id === savedId ? { ...x, ...optimistic } : x);
      return [optimistic, ...arr];
    });
    try {
      const basePayload = { ...form, customer_id: selectedCustomerId, customer_email: customerMap[selectedCustomerId]?.email || "", ...totals, status: send ? "sent" : form.status };
      const payload = isEstimate ?
      { customer_id: basePayload.customer_id, customer_email: basePayload.customer_email, number: basePayload.number, name: basePayload.name, line_items: basePayload.line_items, subtotal: basePayload.subtotal, tax_rate: basePayload.tax_rate, tax: basePayload.tax, cc_fee_enabled: basePayload.cc_fee_enabled, cc_fee: basePayload.cc_fee, total: basePayload.total, payment_schedule: basePayload.payment_schedule, status: basePayload.status, payment_status: basePayload.payment_status, payment_method: basePayload.payment_method, amount_paid: basePayload.amount_paid, paid_date: basePayload.paid_date, notes: basePayload.notes } :
      basePayload;
      const entity = isEstimate ? base44.entities.Estimate : base44.entities.Invoice;
      let resultId = savedId;
      let savedRecord;
      if (isEdit || savedId) {
        savedRecord = await entity.update(savedId, payload);
      } else {
        const created = await entity.create(payload);
        resultId = created.id;
        savedRecord = created;
        setSavedId(resultId);
      }
      queryClient.setQueryData([listKey], (old) => (old || []).map((x) => x.id === tempId ? { ...savedRecord, id: resultId } : x));
      if (pendingAttachments.length) {
        const flushed = [];
        for (const p of pendingAttachments) {
          try {
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: p.file });
            const res = await base44.functions.invoke("uploadInvoiceAttachment", {
              file_uri,
              file_name: p.file.name,
              mime_type: p.file.type || "application/octet-stream"
            });
            const d = res.data || {};
            await base44.entities.InvoiceAttachment.create({
              invoice_id: resultId,
              file_name: p.file.name,
              drive_file_id: d.drive_file_id,
              drive_link: d.drive_link,
              thumbnail_url: d.thumbnail_url || "",
              mime_type: p.file.type || "",
              type: p.type
            });
          } catch (e) {
            flushed.push(p.file_name);
          }
        }
        setPendingAttachments([]);
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
              variant: "destructive"
            });
          } else if (sent.length) {
            toast({ title: "Email sent", description: `Delivered to ${sent.join(", ")}` });
          }
        } catch (e) {
          toast({ title: "Email failed", description: e.message, variant: "destructive" });
        }
      }
      navigate(`/${isEstimate ? "estimates" : "invoices"}/${resultId}`);
    } catch (e) {
      queryClient.setQueryData([listKey], prevList);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
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
    <div className="space-y-6 max-w-2xl mx-auto sm:max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to={listRoute}><ArrowLeft className="w-4 h-4 mr-1" /> Back to {isEstimate ? "estimates" : "invoices"}</Link></Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{isEdit ? `Edit ${docLabel}` : `New ${docLabel}`}</h1>
        {savedId &&
        <div className="flex items-center gap-2 flex-wrap">
            {isEstimate ?
          <StatusBadge status={form.status} /> :

          <InvoicePaymentControl
            invoice={{ ...form, id: savedId, total: totals.total }}
            onUpdated={(update) => setForm((f) => ({ ...f, ...update }))} />

          }
            <OpenedIndicator opened={form.opened} lastOpenedDate={form.last_opened_date} />
          </div>
        }
      </div>

      {!isEdit &&
      <div className="inline-flex rounded-lg border bg-card p-0.5">
          {["invoice", "estimate"].map((t) =>
        <button
          key={t}
          type="button"
          onClick={() => switchType(t)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${docType === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          
              {t}
            </button>
        )}
        </div>
      }

      <Card className="p-5 space-y-4">
        <SectionTitle icon={Contact}>Document details</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            {selectedCustomerId ?
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-md border bg-muted/30">
                <div className="min-w-0">
                  {(() => {
                    const c = customerMap[selectedCustomerId];
                    const company = c?.company?.trim();
                    const name = c?.name?.trim();
                    const email = c?.email?.trim();
                    const phone = c?.phone?.trim();
                    return (
                      <>
                        {company ? (
                          <>
                            <div className="font-semibold text-sm truncate">{company}</div>
                            {name && <div className="text-sm text-foreground/90 truncate">{name}</div>}
                          </>
                        ) : (
                          name && <div className="font-semibold text-sm truncate">{name}</div>
                        )}
                        {email && <div className="text-xs text-muted-foreground truncate">{email}</div>}
                        {phone && <div className="text-xs text-muted-foreground truncate">{phone}</div>}
                      </>
                    );
                  })()}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCustomerId("")}>Change</Button>
              </div> :

            <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setManualOpen(true)}><Plus className="w-4 h-4 mr-1" /> New customer</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setGoogleOpen(true)}><Contact className="w-4 h-4 mr-1" /> Google Contacts</Button>
              </div>
            }
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

      </Card>

      <Card className="p-5 space-y-4">
        <SectionTitle icon={ClipboardList}>Line items</SectionTitle>
        <LineItemEditor lineItems={form.line_items} onChange={setLineItems} catalog={catalog} modifiersCatalog={modifiersCatalog} />
        <p className="text-sm text-muted-foreground italic hidden">{isEstimate ? "Estimates are valid for 30 days unless otherwise noted." : "Invoices are due within 7 days of issuance unless otherwise noted."}</p>
      </Card>

      <Card className="p-5 space-y-4">
        <SectionTitle icon={FileText}>Notes &amp; options</SectionTitle>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>

        {!isEstimate &&
        <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <div className="text-sm font-medium">Daily payment reminders</div>
              <p className="text-sm text-muted-foreground">Send the customer a daily reminder email until this invoice is paid.</p>
            </div>
            <Switch checked={form.reminders_enabled !== false} onCheckedChange={(v) => setForm({ ...form, reminders_enabled: v })} />
          </div>
        }

        <div className="flex items-center justify-between gap-4 py-1">
          <div>
            <div className="text-sm font-medium">Credit Card Fee 3.5%</div>
            <p className="text-sm text-muted-foreground">Add a 3.5% surcharge so the customer covers card processing fees.</p>
          </div>
          <Switch checked={!!form.cc_fee_enabled} onCheckedChange={(v) => setForm({ ...form, cc_fee_enabled: v })} />
        </div>

        <div className="border-t pt-4 space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatMoney(totals.subtotal)}</span></div>
          {totals.cc_fee > 0 &&
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Credit Card Fee (3.5%)</span><span className="tabular-nums">{formatMoney(totals.cc_fee)}</span></div>
          }
          <div className="flex justify-between text-lg font-heading font-semibold pt-1"><span>Total</span><span className="tabular-nums">{formatMoney(totals.total)}</span></div>
        </div>

        <PaymentScheduleEditor
          total={totals.total}
          schedule={form.payment_schedule}
          onChange={(s) => setForm({ ...form, payment_schedule: s })}
          canMarkPaid={!!savedId}
          onTogglePaid={toggleSchedulePaid} />
        
      </Card>

      <Card className="p-5">
        <InvoiceAttachments
          invoiceId={savedId}
          docLabel={docLabel}
          pending={pendingAttachments}
          onAddPending={(files) => {
            const items = Array.from(files).map((file) => ({
              id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              file,
              file_name: file.name,
              previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
              type: file.type.startsWith("image/") ? "photo" : "document"
            }));
            setPendingAttachments((prev) => [...prev, ...items]);
          }}
          onRemovePending={(pid) => setPendingAttachments((prev) => prev.filter((p) => p.id !== pid))} />
        
      </Card>

      {payLink &&
      <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-sm font-medium mb-2"><LinkIcon className="w-4 h-4" /> {isEstimate ? "Accept link" : "Payment link"}</div>
          <p className="text-xs text-muted-foreground mb-3">{isEstimate ? "Share this link with your client so they can review and accept the estimate." : "Share this link with your client so they can pay with PayPal."}</p>
          <div className="flex gap-2">
            <Input readOnly value={payLink} className="bg-background font-mono text-xs" />
            <Button variant="outline" onClick={copyLink}>{copied ? <><Check className="w-4 h-4 mr-1" /> Copied</> : <><Copy className="w-4 h-4 mr-1" /> Copy</>}</Button>
          </div>
        </Card>
      }

      <GoogleContactsDialog open={googleOpen} onOpenChange={setGoogleOpen} onPick={pickGoogleContact} />
      <CustomerFormDialog open={manualOpen} onOpenChange={setManualOpen} onPick={pickManualCustomer} />
      <SheetItemsDialog open={sheetOpen} onOpenChange={setSheetOpen} onPick={pickSheetItems} defaultSheetId={settings?.google_sheet_id} />

      <div className="flex flex-wrap gap-2 justify-end">
        <Button asChild variant="outline"><Link to={listRoute}>Cancel</Link></Button>
        <Button variant="outline" onClick={() => save(false)} disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save draft"}</Button>
        <Button onClick={() => save(true)} disabled={saving || !form.name}><Send className="w-4 h-4 mr-1" /> Save &amp; send</Button>
      </div>
    </div>);

}