import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "next-themes";
import { RefreshCw, MailSearch } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);
  const { theme, setTheme } = useTheme();

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Settings.list();
      if (list[0]) setSettings(list[0]);
      else setSettings({});
    } catch (e) {
      toast({ title: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      if (settings.id) await base44.entities.Settings.update(settings.id, settings);
      else {
        const created = await base44.entities.Settings.create(settings);
        setSettings(created);
      }
      toast({ title: "Settings saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runSync = async () => {
    setBusy("sync");
    try {
      const res = await base44.functions.invoke("syncPlaidTransactions", {});
      toast({ title: `Synced ${res.data?.added ?? 0} new, ${res.data?.updated ?? 0} updated` });
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const runReceipts = async () => {
    setBusy("receipts");
    try {
      const res = await base44.functions.invoke("findReceiptsInEmail", {});
      toast({ title: `Scanned ${res.data?.scanned ?? 0} emails, matched ${res.data?.matched ?? 0} receipts` });
    } catch (e) {
      toast({ title: "Receipt scan failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-heading font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Business profile</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div><Label>Business name</Label><Input value={settings.business_name || ""} onChange={(e) => set("business_name", e.target.value)} /></div>
          <div><Label>Business email</Label><Input type="email" value={settings.business_email || ""} onChange={(e) => set("business_email", e.target.value)} /></div>
          <div><Label>Business phone</Label><Input value={settings.business_phone || ""} onChange={(e) => set("business_phone", e.target.value)} /></div>
          <div><Label>Logo URL</Label><Input value={settings.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Street</Label><Input value={settings.business_street || ""} onChange={(e) => set("business_street", e.target.value)} /></div>
          <div><Label>City</Label><Input value={settings.business_city || ""} onChange={(e) => set("business_city", e.target.value)} /></div>
          <div><Label>State</Label><Input value={settings.business_state || ""} onChange={(e) => set("business_state", e.target.value)} /></div>
          <div><Label>ZIP</Label><Input value={settings.business_zip || ""} onChange={(e) => set("business_zip", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Billing defaults</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div><Label>Default tax rate (%)</Label><Input type="number" step="0.01" value={settings.default_tax_rate ?? 0} onChange={(e) => set("default_tax_rate", parseFloat(e.target.value) || 0)} /></div>
          <div><Label>Payment terms</Label><Input value={settings.payment_terms || ""} onChange={(e) => set("payment_terms", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Integrations</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Item catalog Google Sheet ID</Label><Input value={settings.google_sheet_id || ""} onChange={(e) => set("google_sheet_id", e.target.value)} /></div>
            <div><Label>Receipts Drive folder ID</Label><Input value={settings.receipts_folder_id || ""} onChange={(e) => set("receipts_folder_id", e.target.value)} /></div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={runSync} disabled={busy === "sync"}>
              <RefreshCw className={`w-4 h-4 ${busy === "sync" ? "animate-spin" : ""}`} /> Sync Plaid now
            </Button>
            <Button variant="outline" size="sm" onClick={runReceipts} disabled={busy === "receipts"}>
              <MailSearch className={`w-4 h-4 ${busy === "receipts" ? "animate-spin" : ""}`} /> Find receipts in email
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Plaid transactions sync hourly. Receipts are auto-matched from the connected Gmail inbox.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <Label>Weekly open-invoices summary</Label>
            <p className="text-xs text-muted-foreground">Email a summary of open invoices every week.</p>
          </div>
          <Switch checked={!!settings.weekly_summary_enabled} onCheckedChange={(v) => set("weekly_summary_enabled", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <Label>Theme</Label>
            <p className="text-xs text-muted-foreground">Choose the app color scheme. Dark is on by default.</p>
          </div>
          <select
            value={theme || "dark"}
            onChange={(e) => setTheme(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
      </div>
    </div>
  );
}