import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LineItemEditor from "@/components/LineItemEditor";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { calcTotals, formatMoney, nextNumber } from "@/lib/invoice";

const blank = { number: "", line_items: [{ description: "", quantity: 1, unit_price: 0 }], tax_rate: 0, notes: "", status: "draft" };
const statuses = ["draft", "sent", "approved", "declined", "converted"];

export default function EstimatesSection({ job, estimates, reload }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const { confirmState, confirm, onOpenChange } = useConfirmDialog();

  const startNew = async () => {
    const all = await base44.entities.Estimate.list();
    setEditing(null);
    setForm({ ...blank, number: nextNumber("EST", all.map((e) => e.number)) });
    setOpen(true);
  };
  const startEdit = (e) => { setEditing(e); setForm({ ...blank, ...e, line_items: e.line_items || [] }); setOpen(true); };

  const save = async () => {
    const totals = calcTotals(form.line_items, form.tax_rate);
    const payload = { ...form, ...totals, job_id: job.id };
    if (editing) await base44.entities.Estimate.update(editing.id, payload);
    else await base44.entities.Estimate.create(payload);
    setOpen(false);
    reload();
  };

  const remove = (e) => {
    confirm({
      title: "Delete estimate",
      description: "Delete estimate?",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => doRemove(e),
    });
  };

  const doRemove = async (e) => {
    await base44.entities.Estimate.delete(e.id);
    reload();
  };
  const setStatus = async (e, status) => { await base44.entities.Estimate.update(e.id, { status }); reload(); };
  const totals = calcTotals(form.line_items, form.tax_rate);

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={startNew} size="sm"><Plus className="w-4 h-4 mr-1" /> New estimate</Button></div>
      {estimates.length === 0 ? (
        <EmptyState icon={FileText} title="No estimates" description="Create an estimate with line items for this job." />
      ) : (
        <div className="space-y-2">
          {estimates.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{e.number}</div>
                  <div className="text-sm text-muted-foreground tabular-nums">{formatMoney(e.total)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={e.status} onValueChange={(v) => setStatus(e, v)}>
                    <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 select-none" onClick={() => startEdit(e)} aria-label="Edit estimate"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 select-none" onClick={() => remove(e)} aria-label="Delete estimate"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit estimate" : "New estimate"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Estimate number</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Line items</Label><LineItemEditor lineItems={form.line_items} onChange={(li) => setForm({ ...form, line_items: li })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tax rate %</Label><Input type="number" min="0" step="0.01" value={form.tax_rate ?? 0} onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })} /></div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatMoney(totals.subtotal)}</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><span className="tabular-nums">{formatMoney(totals.tax)}</span></div>
              <div className="flex justify-between font-heading font-semibold"><span>Total</span><span className="tabular-nums">{formatMoney(totals.total)}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save estimate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmState} onOpenChange={onOpenChange} />
    </div>
  );
}