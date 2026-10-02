import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import CustomerPortalPreviewDialog from "@/components/CustomerPortalPreviewDialog";

const empty = { name: "", company: "", email: "", phone: "", street: "", city: "", state: "", zip: "", notes: "" };

export default function Customers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [previewCustomer, setPreviewCustomer] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, invoices, estimates] = await Promise.all([
        base44.entities.Customer.list('-created_date', 200),
        base44.entities.Invoice.list('-created_date', 200),
        base44.entities.Estimate.list('-created_date', 200),
      ]);
      const withDocs = new Set([
        ...invoices.map((i) => i.customer_id),
        ...estimates.map((e) => e.customer_id),
      ].filter(Boolean));
      setCustomers(list.filter((c) => withDocs.has(c.id)));
    } catch (e) {
      toast({ title: "Failed to load customers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter((c) => {
    const q = query.toLowerCase();
    return !q || (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q);
  });

  const openNew = () => { setForm(empty); setEditing("new"); };
  const openEdit = (c) => { setForm({ ...c }); setEditing(c.id); };

  const save = async () => {
    try {
      if (editing === "new") {
        await base44.entities.Customer.create(form);
      } else {
        await base44.entities.Customer.update(editing, form);
      }
      setEditing(null);
      load();
      toast({ title: "Customer saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const updateReminderFreq = async (c, freq) => {
    try {
      await base44.entities.Customer.update(c.id, { invoice_reminder_frequency: freq });
      setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, invoice_reminder_frequency: freq } : x));
    } catch (e) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    try {
      await base44.entities.Customer.delete(c.id);
      load();
      toast({ title: "Customer deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-semibold tracking-tight">Customers</h1>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4" /> New customer</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, company" className="pl-9" />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No customers found.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPreviewCustomer(c)}>
              <CardContent className="p-4">
                <div className="min-w-0">
                  {c.company && <div className="font-medium truncate">{c.company}</div>}
                  <div className="text-sm text-muted-foreground truncate">{c.name}</div>
                  {c.email && <div className="text-sm text-muted-foreground truncate">{c.email}</div>}
                  {c.phone && <div className="text-sm text-muted-foreground">{c.phone}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing === "new" ? "New customer" : "Edit customer"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Street</Label><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div><Label>ZIP</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerPortalPreviewDialog customer={previewCustomer} onClose={() => setPreviewCustomer(null)} />
    </div>
  );
}