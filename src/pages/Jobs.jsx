import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Wrench, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MobileSelect } from "@/components/ui/mobile-select";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useToast } from "@/components/ui/use-toast";
import { fullAddress } from "@/lib/invoice";

const empty = { customer_id: "", title: "", job_street: "", job_city: "", job_state: "", job_zip: "", status: "scheduled", scheduled_date: "", description: "" };
const statuses = ["scheduled", "in_progress", "completed", "cancelled"];

export default function Jobs() {
  const [params] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { confirmState, confirm, onOpenChange } = useConfirmDialog();

  const customerMap = useMemo(() => (customers.length ? Object.fromEntries(customers.map((c) => [c.id, c])) : {}), [customers]);

  const load = async () => {
    setLoading(true);
    try {
      const [jb, cs] = await Promise.all([
        base44.entities.Job.list("-created_date", 200),
        base44.entities.Customer.list("name", 500),
      ]);
      setJobs(jb);
      setCustomers(cs);
    } catch (e) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => {
    setEditing(null);
    setForm({ ...empty, customer_id: params.get("customer") || "" });
    setOpen(true);
  };
  const startEdit = (j) => { setEditing(j); setForm({ ...empty, ...j }); setOpen(true); };

  const fillFromCustomer = (cid) => {
    const c = customerMap[cid];
    if (c) setForm((f) => ({ ...f, customer_id: cid, job_street: f.job_street || c.street || "", job_city: f.job_city || c.city || "", job_state: f.job_state || c.state || "", job_zip: f.job_zip || c.zip || "" }));
    else setForm((f) => ({ ...f, customer_id: cid }));
  };

  const save = async () => {
    if (!form.customer_id || !form.title) return;
    setSaving(true);
    const wasEditing = Boolean(editing);
    const previous = wasEditing ? jobs.find((j) => j.id === editing.id) : null;
    const tempId = wasEditing ? editing.id : `temp_${Date.now()}`;
    const optimistic = { ...form, id: tempId, created_date: previous?.created_date || new Date().toISOString(), updated_date: new Date().toISOString() };
    if (wasEditing) {
      setJobs((prev) => prev.map((j) => (j.id === tempId ? optimistic : j)));
    } else {
      setJobs((prev) => [optimistic, ...prev]);
    }
    setOpen(false);
    try {
      if (wasEditing) {
        const saved = await base44.entities.Job.update(editing.id, form);
        setJobs((prev) => prev.map((j) => (j.id === tempId ? { ...saved, id: editing.id } : j)));
      } else {
        const created = await base44.entities.Job.create(form);
        setJobs((prev) => prev.map((j) => (j.id === tempId ? created : j)));
      }
    } catch (e) {
      if (wasEditing) {
        setJobs((prev) => prev.map((j) => (j.id === tempId ? previous : j)));
      } else {
        setJobs((prev) => prev.filter((j) => j.id !== tempId));
      }
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setOpen(true);
    }
    setSaving(false);
  };

  const remove = (j) => {
    confirm({
      title: "Delete job",
      description: `Delete job "${j.title}"?`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => doRemove(j),
    });
  };

  const doRemove = async (j) => {
    const previous = jobs;
    setJobs((prev) => prev.filter((x) => x.id !== j.id));
    try {
      await base44.entities.Job.delete(j.id);
    } catch (e) {
      setJobs(previous);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const filtered = jobs.filter((j) => {
    const c = customerMap[j.customer_id];
    const q = query.toLowerCase();
    const matchesQuery = !q || [j.title, j.job_street, j.job_city, c?.name, fullAddress(j, "job_")].join(" ").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || j.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground text-sm mt-1">List and filter jobs by address, customer, or status.</p>
        </div>
        <Button onClick={startNew}><Plus className="w-4 h-4 mr-1" /> New job</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, address, customer…" className="pl-9" />
        </div>
        <MobileSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder="Status"
          triggerClassName="w-[160px]"
          ariaLabel="Filter by status"
          options={[{ value: "all", label: "All statuses" }, ...statuses.map((s) => ({ value: s, label: s.replace("_", " ") }))]}
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wrench} title="No jobs found" description="Create a job to attach estimates, contracts, photos, and invoices." action={<Button onClick={startNew}><Plus className="w-4 h-4 mr-1" /> New job</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((j) => {
            const c = customerMap[j.customer_id];
            return (
              <Card key={j.id} className="p-5 flex flex-col gap-3">
                <Link to={`/jobs/${j.id}`} className="flex items-start justify-between gap-2 group">
                  <div className="min-w-0">
                    <div className="font-heading font-semibold group-hover:text-primary transition-colors truncate">{j.title}</div>
                    {c && <div className="text-sm text-muted-foreground truncate">{c.name}</div>}
                  </div>
                  <StatusBadge status={j.status} />
                </Link>
                {fullAddress(j, "job_") && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4 mt-0.5 shrink-0" /><span>{fullAddress(j, "job_")}</span></div>
                )}
                {j.scheduled_date && <div className="text-sm text-muted-foreground">Scheduled: {new Date(j.scheduled_date).toLocaleDateString()}</div>}
                <div className="flex gap-1 mt-1">
                  <Button asChild variant="outline" size="sm" className="flex-1"><Link to={`/jobs/${j.id}`}>Open</Link></Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-9 sm:w-9 select-none" onClick={() => startEdit(j)} aria-label="Edit job"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-9 sm:w-9 select-none" onClick={() => remove(j)} aria-label="Delete job"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit job" : "New job"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Customer *</Label>
              <MobileSelect
                value={form.customer_id}
                onValueChange={fillFromCustomer}
                placeholder="Select customer"
                ariaLabel="Customer"
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Job title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Kitchen sink replacement" /></div>
            <div className="col-span-2 space-y-1.5"><Label>Job street address</Label><Input value={form.job_street} onChange={(e) => setForm({ ...form, job_street: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={form.job_city} onChange={(e) => setForm({ ...form, job_city: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>State</Label><Input value={form.job_state} onChange={(e) => setForm({ ...form, job_state: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>ZIP</Label><Input value={form.job_zip} onChange={(e) => setForm({ ...form, job_zip: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <MobileSelect
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
                placeholder="Status"
                ariaLabel="Job status"
                options={statuses.map((s) => ({ value: s, label: s.replace("_", " ") }))}
              />
            </div>
            <div className="space-y-1.5"><Label>Scheduled date</Label><Input type="date" value={form.scheduled_date || ""} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.customer_id || !form.title}>{saving ? "Saving…" : "Save job"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmState} onOpenChange={onOpenChange} />
    </div>
  );
}