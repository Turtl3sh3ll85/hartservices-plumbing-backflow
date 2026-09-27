import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Calendar, Pencil, Trash2, Check, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";

const TYPES = [
  { value: "annual_testing", label: "Annual testing" },
  { value: "service_maintenance", label: "Service maintenance" },
  { value: "inspection", label: "Inspection" },
  { value: "warranty", label: "Warranty" },
  { value: "other", label: "Other" },
];

const empty = { title: "", type: "service_maintenance", due_date: "", notes: "" };

export default function FollowUpsSection({ job, followups, reload }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (f) => { setEditing(f); setForm({ title: f.title, type: f.type, due_date: f.due_date || "", notes: f.notes || "" }); setOpen(true); };

  const save = async () => {
    if (!form.title || !form.due_date) return;
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.FollowUp.update(editing.id, { ...form });
      } else {
        await base44.entities.FollowUp.create({ ...form, job_id: job.id, status: "scheduled" });
      }
      setOpen(false);
      reload();
    } catch (e) {}
    setSaving(false);
  };

  const markComplete = async (f) => {
    await base44.entities.FollowUp.update(f.id, { status: "completed", completed_date: new Date().toISOString().slice(0, 10) });
    reload();
  };

  const remove = async (f) => {
    if (!confirm("Delete this follow-up?")) return;
    await base44.entities.FollowUp.delete(f.id);
    reload();
  };

  const isOverdue = (f) => f.status === "scheduled" && f.due_date && new Date(f.due_date) < new Date(new Date().toDateString());

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New follow-up</Button>
      </div>
      {followups.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No follow-ups" description="Schedule annual testing, service maintenance, or warranty check-ups for this job." />
      ) : (
        <div className="space-y-2">
          {followups.map((f) => (
            <Card key={f.id} className={`p-4 ${isOverdue(f) ? "border-destructive/20 bg-destructive/5" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{f.title}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">{(f.type || "").replace(/_/g, " ")}</span>
                    <StatusBadge status={f.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Due {new Date(f.due_date).toLocaleDateString()}
                    {isOverdue(f) && <span className="text-red-600 font-medium">· Overdue</span>}
                    {f.status === "completed" && f.completed_date && <span>· Completed {new Date(f.completed_date).toLocaleDateString()}</span>}
                  </div>
                  {f.notes && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{f.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {f.status === "scheduled" && (
                    <Button variant="outline" size="sm" onClick={() => markComplete(f)}><Check className="w-4 h-4 mr-1" /> Complete</Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-11 w-11 sm:h-8 sm:w-8 select-none" onClick={() => openEdit(f)} aria-label="Edit follow-up"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-11 w-11 sm:h-8 sm:w-8 select-none" onClick={() => remove(f)} aria-label="Delete follow-up"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit follow-up" : "New follow-up"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fu-title">Title</Label>
              <Input id="fu-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Annual backflow test" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fu-due">Due date</Label>
                <Input id="fu-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu-notes">Notes</Label>
              <Textarea id="fu-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.title || !form.due_date}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}