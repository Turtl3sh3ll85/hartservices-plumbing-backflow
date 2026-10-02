import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Clock, PauseCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import LineItemsEditor from "@/components/LineItemsEditor";
import PaymentScheduleEditor from "@/components/PaymentScheduleEditor";
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
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Customer *</Label>
            <select value={inv.customer_id} onChange={(e) => set("customer_id", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="">Select customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
            </select>
          </div>
          <div><Label>Invoice name</Label><Input value={inv.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div><Label>Due date</Label><Input type="date" value={inv.due_date || ""} onChange={(e) => set("due_date", e.target.value)} /></div>
        </CardContent>
      </Card>

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
        <CardHeader><CardTitle className="text-base">Work status</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Status</Label>
            <select value={inv.work_status || "in_progress"} onChange={(e) => set("work_status", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="in_progress">In progress</option>
              <option value="next_payment_due">Next payment due</option>
            </select>
          </div>
          <div><Label>Current phase</Label><Input value={inv.phase || ""} onChange={(e) => set("phase", e.target.value)} placeholder="e.g. Rough-in" /></div>
          <div><Label>Phase note</Label><Input value={inv.phase_note || ""} onChange={(e) => set("phase_note", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent><Textarea value={inv.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={3} /></CardContent>
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