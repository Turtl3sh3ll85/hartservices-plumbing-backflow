import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Save, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

const empty = { business_name: "", business_email: "", business_phone: "", business_street: "", business_city: "", business_state: "", business_zip: "", logo_url: "", default_tax_rate: 0, payment_terms: "Due on receipt" };

export default function Settings() {
  const [form, setForm] = useState(empty);
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Settings.list();
        if (list[0]) { setExisting(list[0]); setForm({ ...empty, ...list[0] }); }
      } catch (e) {}
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (existing) await base44.entities.Settings.update(existing.id, form);
      else { const created = await base44.entities.Settings.create(form); setExisting(created); }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Your business details appear on every invoice your clients see.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Building2 className="w-4 h-4" /> Business profile</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Business name</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="FlowPro Plumbing" /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={form.business_phone} onChange={(e) => setForm({ ...form, business_phone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input value={form.business_email} onChange={(e) => setForm({ ...form, business_email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Logo URL (optional)</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></div>
          <div className="sm:col-span-2 space-y-1.5"><Label>Street address</Label><Input value={form.business_street} onChange={(e) => setForm({ ...form, business_street: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>City</Label><Input value={form.business_city} onChange={(e) => setForm({ ...form, business_city: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>State</Label><Input value={form.business_state} onChange={(e) => setForm({ ...form, business_state: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>ZIP</Label><Input value={form.business_zip} onChange={(e) => setForm({ ...form, business_zip: e.target.value })} /></div>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="text-sm font-medium">Invoice defaults</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Default tax rate %</Label><Input type="number" min="0" step="0.01" value={form.default_tax_rate ?? 0} onChange={(e) => setForm({ ...form, default_tax_rate: parseFloat(e.target.value) || 0 })} /></div>
          <div className="space-y-1.5"><Label>Payment terms</Label><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></div>
        </div>
      </Card>

      <Card className="p-6 space-y-2">
        <div className="text-sm font-medium">PayPal</div>
        <p className="text-sm text-muted-foreground">Payments are processed through your PayPal Business account. Credentials are configured securely in the app's environment variables (sandbox for testing, live for real payments).</p>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : saved ? "Saved!" : "Save settings"}</Button>
      </div>
    </div>
  );
}