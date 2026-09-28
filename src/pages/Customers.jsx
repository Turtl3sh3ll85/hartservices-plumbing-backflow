import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, MapPin, Phone, Mail, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useToast } from "@/components/ui/use-toast";
import { fullAddress } from "@/lib/invoice";

const empty = { name: "", company: "", email: "", phone: "", street: "", city: "", state: "", zip: "", notes: "" };

export default function Customers() {
  const queryClient = useQueryClient();
  const { data: customers = [], isLoading: loading } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("name", 500) });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { confirmState, confirm, onOpenChange } = useConfirmDialog();

  const startNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (c) => { setEditing(c); setForm({ ...empty, ...c }); setOpen(true); };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    const wasEditing = Boolean(editing);
    const previous = wasEditing ? customers.find((c) => c.id === editing.id) : null;
    const tempId = wasEditing ? editing.id : `temp_${Date.now()}`;
    const optimistic = { ...form, id: tempId, created_date: previous?.created_date || new Date().toISOString(), updated_date: new Date().toISOString() };
    if (wasEditing) {
      queryClient.setQueryData(["customers"], (prev) => (prev || []).map((c) => (c.id === tempId ? optimistic : c)));
    } else {
      queryClient.setQueryData(["customers"], (prev) => [optimistic, ...(prev || [])]);
    }
    setOpen(false);
    try {
      if (wasEditing) {
        const saved = await base44.entities.Customer.update(editing.id, form);
        queryClient.setQueryData(["customers"], (prev) => (prev || []).map((c) => (c.id === tempId ? { ...saved, id: editing.id } : c)));
      } else {
        const created = await base44.entities.Customer.create(form);
        queryClient.setQueryData(["customers"], (prev) => (prev || []).map((c) => (c.id === tempId ? created : c)));
      }
    } catch (e) {
      if (wasEditing) {
        queryClient.setQueryData(["customers"], (prev) => (prev || []).map((c) => (c.id === tempId ? previous : c)));
      } else {
        queryClient.setQueryData(["customers"], (prev) => (prev || []).filter((c) => c.id !== tempId));
      }
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setOpen(true);
    }
    setSaving(false);
  };

  const remove = (c) => {
    confirm({
      title: "Delete customer",
      description: `Delete customer "${c.name}"?`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => doRemove(c),
    });
  };

  const doRemove = async (c) => {
    const previous = customers;
    queryClient.setQueryData(["customers"], (prev) => (prev || []).filter((x) => x.id !== c.id));
    try {
      await base44.entities.Customer.delete(c.id);
    } catch (e) {
      queryClient.setQueryData(["customers"], previous);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const filtered = customers.filter((c) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return [c.name, c.company, c.email, c.phone, fullAddress(c)].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your clients and their service addresses.</p>
        </div>
        <Button onClick={startNew}><Plus className="w-4 h-4 mr-1" /> New customer</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, address, phone…" className="pl-9" />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="Add your first customer to start creating jobs and invoices." action={<Button onClick={startNew}><Plus className="w-4 h-4 mr-1" /> New customer</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-heading font-semibold truncate">{c.name}</div>
                  {c.company && <div className="text-sm text-muted-foreground">{c.company}</div>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 select-none" onClick={() => startEdit(c)} aria-label="Edit customer"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 select-none" onClick={() => remove(c)} aria-label="Delete customer"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {fullAddress(c) && <div className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0" /><span>{fullAddress(c)}</span></div>}
                {c.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /><span>{c.phone}</span></div>}
                {c.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 shrink-0" /><span className="truncate">{c.email}</span></div>}
              </div>
              <Button asChild variant="outline" size="sm" className="mt-1 w-full"><Link to={`/jobs?customer=${c.id}`}>View jobs</Link></Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <Label>Company</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Street address</Label><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>ZIP</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name}>{saving ? "Saving…" : "Save customer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmState} onOpenChange={onOpenChange} />
    </div>
  );
}