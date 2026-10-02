import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Send, UserPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import LineItemsEditor from "@/components/LineItemsEditor";
import CustomerFormDialog from "@/components/CustomerFormDialog";
import CustomerPicker from "@/components/CustomerPicker";
import PaymentScheduleEditor from "@/components/PaymentScheduleEditor";
import { computeTotals, formatCurrency, scheduleIsValid } from "@/lib/format";

const MODES = [
  { value: "single", label: "Single estimate", desc: "One set of line items." },
  { value: "side_by_side", label: "Side-by-side options", desc: "Customer picks one of several options." },
  { value: "a_la_carte", label: "À la carte", desc: "Customer selects which line items they want." },
];

export default function EstimateEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [est, setEst] = useState({
    customer_id: "",
    name: "",
    selection_mode: "single",
    line_items: [],
    options: [],
    tax_rate: 0,
    cc_fee_enabled: false,
    payment_schedule: [],
    notes: "",
    status: "draft",
  });

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Customer.list('-created_date', 200);
        setCustomers(list);
        if (!isNew) {
          const e = await base44.entities.Estimate.get(id);
          setEst(e);
        }
      } catch (e) {
        toast({ title: "Failed to load", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = (k, v) => setEst((s) => ({ ...s, [k]: v }));

  // Derived totals (never mutate state during render)
  const optionTotals = (est.options || []).map((o) => computeTotals(o.line_items, est.tax_rate, est.cc_fee_enabled));
  let totals;
  if (est.selection_mode === "side_by_side") {
    totals = optionTotals.reduce((acc, o) => ({
      subtotal: acc.subtotal + o.subtotal, tax: acc.tax + o.tax, cc_fee: acc.cc_fee + o.cc_fee, total: acc.total + o.total,
    }), { subtotal: 0, tax: 0, cc_fee: 0, total: 0 });
  } else {
    totals = computeTotals(est.line_items, est.tax_rate, est.cc_fee_enabled);
  }

  const save = async (send) => {
    if (!est.customer_id) { toast({ title: "Pick a customer first", variant: "destructive" }); return; }
    const customer = customers.find((c) => c.id === est.customer_id);
    const payload = {
      ...est,
      customer_email: customer?.email || "",
      ...totals,
      options: est.selection_mode === "side_by_side"
        ? (est.options || []).map((o, i) => ({ ...o, ...optionTotals[i] }))
        : est.options,
      status: send ? "sent" : est.status,
    };
    setSaving(true);
    try {
      if (isNew) {
        const created = await base44.entities.Estimate.create(payload);
        toast({ title: send ? "Estimate sent" : "Saved" });
        navigate(`/estimates/${created.id}`);
      } else {
        await base44.entities.Estimate.update(id, payload);
        toast({ title: send ? "Estimate sent" : "Saved" });
      }
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const scheduleValid = scheduleIsValid(est.payment_schedule, totals.total);

  // option helpers
  const addOption = () => set("options", [...(est.options || []), { label: `Option ${(est.options || []).length + 1}`, line_items: [], subtotal: 0, tax: 0, total: 0 }]);
  const updateOption = (i, patch) => {
    const next = [...(est.options || [])];
    next[i] = { ...next[i], ...patch };
    set("options", next);
  };
  const removeOption = (i) => set("options", (est.options || []).filter((_, idx) => idx !== i));

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-xl font-heading font-semibold tracking-tight flex-1">{isNew ? "New estimate" : (est.name || "Edit estimate")}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Customer *</Label>
            <div className="flex gap-2">
              <CustomerPicker customers={customers} value={est.customer_id} onChange={(cid) => set("customer_id", cid)} />
              <Button type="button" variant="outline" size="icon" onClick={() => setNewCustOpen(true)} aria-label="Add new customer" title="New customer"><UserPlus className="w-4 h-4" /></Button>
            </div>
          </div>
          <div>
            <Label>Job name</Label>
            <Input value={est.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <CustomerFormDialog open={newCustOpen} onOpenChange={setNewCustOpen} onPick={(c) => { setCustomers((s) => [...s, c]); set("customer_id", c.id); }} />

      <Card>
        <CardHeader><CardTitle className="text-base">Selection mode</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {MODES.map((m) => (
            <label key={m.value} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${est.selection_mode === m.value ? "border-primary bg-primary/5" : "hover:bg-accent/50"}`}>
              <input type="radio" name="mode" checked={est.selection_mode === m.value} onChange={() => set("selection_mode", m.value)} className="mt-1 w-4 h-4" />
              <div>
                <div className="font-medium text-sm">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.desc}</div>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {est.selection_mode === "side_by_side" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Options</CardTitle>
            <Button variant="outline" size="sm" onClick={addOption}><Plus className="w-4 h-4" /> Add option</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {(est.options || []).map((o, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <Input value={o.label} onChange={(e) => updateOption(i, { label: e.target.value })} placeholder="Option label" className="flex-1" />
                  <span className="font-medium tabular-nums">{formatCurrency(optionTotals[i]?.total)}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeOption(i)} aria-label="Remove option"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
                <LineItemsEditor items={o.line_items} onChange={(li) => updateOption(i, { line_items: li })} />
              </div>
            ))}
            {(est.options || []).length === 0 && <p className="text-sm text-muted-foreground">Add an option to get started.</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">{est.selection_mode === "a_la_carte" ? "Available items (customer picks)" : "Line items"}</CardTitle></CardHeader>
          <CardContent>
            <LineItemsEditor items={est.line_items} onChange={(li) => set("line_items", li)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Payment schedule</CardTitle></CardHeader>
        <CardContent>
          <PaymentScheduleEditor schedule={est.payment_schedule} onChange={(s) => set("payment_schedule", s)} total={totals.total} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent><Textarea value={est.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={3} /></CardContent>
      </Card>

      <div className="flex items-center justify-between sticky bottom-0 bg-background/80 backdrop-blur border-t pt-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={!!est.cc_fee_enabled} onChange={(e) => set("cc_fee_enabled", e.target.checked)} className="w-4 h-4" />
          Add 3% credit-card fee
        </label>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold text-lg">{formatCurrency(totals.total)}</span>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save(false)} disabled={saving}>{saving ? "Saving…" : "Save draft"}</Button>
            <Button onClick={() => save(true)} disabled={saving || !scheduleValid}><Send className="w-4 h-4" /> Save & send</Button>
          </div>
        </div>
      </div>
    </div>
  );
}