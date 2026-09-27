import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function CustomerFormDialog({ open, onOpenChange, onPick }) {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", street: "", city: "", state: "", zip: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const cust = await base44.entities.Customer.create(form);
      // Best-effort sync to Google Contacts via Zapier webhook.
      try {
        await base44.functions.invoke('pushCustomerToZapier', { customer: form });
      } catch (e) { console.error('Zapier sync failed:', e.message); }
      onPick(cust);
      onOpenChange(false);
      setForm({ name: "", company: "", email: "", phone: "", street: "", city: "", state: "", zip: "" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={set("name")} placeholder="Customer name" />
          </div>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input value={form.company} onChange={set("company")} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={set("phone")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={set("email")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Street</Label>
            <Input value={form.street} onChange={set("street")} />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={form.city} onChange={set("city")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.state} onChange={set("state")} />
            </div>
            <div className="space-y-1.5">
              <Label>ZIP</Label>
              <Input value={form.zip} onChange={set("zip")} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!form.name || saving}>{saving ? "Saving…" : "Add customer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}