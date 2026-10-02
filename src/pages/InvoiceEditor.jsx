import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Clock, PauseCircle, Contact, UserPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import LineItemsEditor from "@/components/LineItemsEditor";
import GoogleContactsDialog from "@/components/GoogleContactsDialog";
import CustomerFormDialog from "@/components/CustomerFormDialog";
import CustomerPicker from "@/components/CustomerPicker";
import PaymentScheduleEditor from "@/components/PaymentScheduleEditor";
import InvoiceAttachments from "@/components/InvoiceAttachments";
import InvoiceProfitability from "@/components/InvoiceProfitability";
import { useAuth } from "@/lib/AuthContext";
import { computeTotals, formatCurrency, amountPaidTotal, nextDuePayment } from "@/lib/format";

export default function InvoiceEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const canSeeProfit = user?.role === "admin" || user?.role === "accountant";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [inv, setInv] = useState({
    customer_id: "", name: "", line_items: [], tax_rate: 0, cc_fee_enabled: false,
    payment_schedule: [], status: "draft", due_date: "", notes: "",
    phase: "", phase_note: "", work_status: "in_progress", standing_by: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Customer.list('-created_date', 200);
        setCustomers(list);
        if (!isNew) {
          const e = await base44.entities.Invoice.get(id);
          setInv(e);
        }
      } catch (e) {
        toast({ title: "Failed to load", variant: "destructive" });
      } finally { setLoading(false); }
    })();
  }, [id]);

  const set = (k, v) => setInv((s) => ({ ...s, [k]: v }));
  const totals = computeTotals(inv.line_items, inv.tax_rate, inv.cc_fee_enabled);
  const paid = amountPaidTotal(inv.payment_schedule, totals.total);
  const balance = Math.max(0, totals.total - paid);
  const next = nextDuePayment(inv.payment_schedule, totals.total);

  const save = async (send) => {
    if (!inv.customer_id) { toast({ title: "Pick a customer first", variant: "destructive" }); return; }
    const customer = customers.find((c) => c.id === inv.customer_id);
    const payload = { ...inv, customer_email: customer?.email || "", ...totals, status: send ? "sent" : inv.status };
    setSaving(true);
    try {
      if (isNew) {
        const created = await base44.entities.Invoice.create(payload);
        for (const p of pendingFiles) {
          try {
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: p.file });
            const res = await base44.functions.invoke("uploadInvoiceAttachment", { file_uri, file_name: p.file_name, mime_type: p.file?.type || "application/octet-stream" });
            const d = res.data || {};
            await base44.entities.InvoiceAttachment.create({
              invoice_id: created.id, file_name: p.file_name,
              drive_file_id: d.drive_file_id, drive_link: d.drive_link,
              thumbnail_url: d.thumbnail_url || "", mime_type: p.file?.type || "",
              type: (p.file?.type || "").startsWith("image/") ? "photo" : "document",
            });
          } catch (e) { /* skip */ }
        }
        setPendingFiles([]);
        toast({ title: send ? "Invoice sent" : "Saved" });
        navigate(`/invoices/${created.id}`);
      } else {
        await base44.entities.Invoice.update(id, payload);
        toast({ title: send ? "Invoice sent" : "Saved" });
      }
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-xl font-heading font-semibold tracking-tight flex-1">{isNew ? "New invoice" : (inv.name || "Edit invoice")}</h1>
        {inv.customer_ready_for_next_stage && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <Clock className="w-4 h-4" /> Customer ready for next stage
          </span>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Customer *</Label>
            <div className="flex gap-2">
              <CustomerPicker customers={customers} value={inv.customer_id} onChange={(cid) => set("customer_id", cid)} />
              <Button type="button" variant="outline" size="icon" onClick={() => setContactsOpen(true)} aria-label="Choose from Google Contacts" title="Google Contacts"><Contact className="w-4 h-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={() => setNewCustOpen(true)} aria-label="Add new customer" title="New customer"><UserPlus className="w-4 h-4" /></Button>
            </div>
          </div>
          <div>
            <Label>Job name</Label>
            <Input value={inv.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <GoogleContactsDialog open={contactsOpen} onOpenChange={setContactsOpen} onPick={async (c) => {
        let match = customers.find((cu) => cu.email && c.email && cu.email.toLowerCase() === c.email.toLowerCase());
        if (!match && c.email) {
          try { match = await base44.entities.Customer.create({ name: c.name || c.email, company: c.company || "", email: c.email, phone: c.phone || "" }); setCustomers((s) => [...s, match]); }
          catch (e) { /* ignore duplicate */ }
        }
        if (match) set("customer_id", match.id);
      }} />
      <CustomerFormDialog open={newCustOpen} onOpenChange={setNewCustOpen} onPick={(c) => { setCustomers((s) => [...s, c]); set("customer_id", c.id); }} />

      <Card>
        <CardHeader><CardTitle className="text-base">Line items</CardTitle></CardHeader>
        <CardContent><LineItemsEditor items={inv.line_items} onChange={(li) => set("line_items", li)} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment schedule</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <PaymentScheduleEditor schedule={inv.payment_schedule} onChange={(s) => set("payment_schedule", s)} total={totals.total} />
          {next && (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3">
              <div className="text-sm">
                <div className="font-medium">Next payment due: {formatCurrency(next.amount)}</div>
                <div className="text-xs text-muted-foreground">{next.payment.label || `Payment ${next.index + 1}`}</div>
              </div>
              <Button
                variant={inv.standing_by ? "default" : "outline"}
                size="sm"
                onClick={() => set("standing_by", !inv.standing_by)}
              >
                <PauseCircle className="w-4 h-4" />
                {inv.standing_by ? "Standing by" : "Mark as Standing by"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent><Textarea value={inv.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={3} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Attachments</CardTitle></CardHeader>
        <CardContent>
          <InvoiceAttachments
            invoiceId={id}
            pending={pendingFiles}
            onAddPending={(files) => setPendingFiles((s) => [...s, ...Array.from(files).map((f) => ({
              id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              file_name: f.name,
              type: f.type.startsWith("image/") ? "photo" : "document",
              previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
              file: f,
            }))])}
            onRemovePending={(pid) => setPendingFiles((s) => s.filter((p) => p.id !== pid))}
          />
        </CardContent>
      </Card>

      {!isNew && canSeeProfit && (
        <InvoiceProfitability invoiceId={id} invoiceTotal={totals.total} />
      )}

      <div className="flex items-center justify-between sticky bottom-0 bg-background/80 backdrop-blur border-t pt-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Balance: </span>
          <span className="font-semibold text-lg">{formatCurrency(balance)}</span>
          <span className="text-muted-foreground"> / {formatCurrency(totals.total)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save(false)} disabled={saving}>{saving ? "Saving…" : "Save draft"}</Button>
          <Button onClick={() => save(true)} disabled={saving}><Send className="w-4 h-4" /> Save & send</Button>
        </div>
      </div>
    </div>
  );
}