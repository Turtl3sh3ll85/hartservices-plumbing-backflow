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
import { RefreshCw, MailSearch, Trash2, X, Plus } from "lucide-react";
import { MobileSelect } from "@/components/ui/mobile-select";
import ConfirmDialog from "@/components/ConfirmDialog";
import LogoUpload from "@/components/LogoUpload";
import { useAuth } from "@/lib/AuthContext";

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();

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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.functions.invoke("deleteAccount", {});
      await logout();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
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
          <div className="sm:col-span-2"><Label>Logo (light mode)</Label><LogoUpload value={settings.logo_url || ""} onChange={(v) => set("logo_url", v)} hint="Shown on light backgrounds. Paste a URL or upload an image." /></div>
          <div className="sm:col-span-2"><Label>Logo (dark mode)</Label><LogoUpload value={settings.dark_logo_url || ""} onChange={(v) => set("dark_logo_url", v)} hint="Shown on dark backgrounds." /></div>
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
        <CardHeader><CardTitle className="text-base">Transaction Rules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-categorize transfers</Label>
              <p className="text-xs text-muted-foreground">Uses Plaid's native category data to tag TRANSFER_IN / TRANSFER_OUT automatically — no spreadsheet rules needed.</p>
            </div>
            <Switch checked={settings.auto_categorize_transfers !== false} onCheckedChange={(v) => set("auto_categorize_transfers", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-ignore transfers</Label>
              <p className="text-xs text-muted-foreground">Marks transfers as ignored so they don't appear in income/expense reports.</p>
            </div>
            <Switch checked={settings.ignore_transfers !== false} onCheckedChange={(v) => set("ignore_transfers", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Detect internal transfers</Label>
              <p className="text-xs text-muted-foreground">Two-sided matching across connected accounts — pairs debits and credits on different accounts to flag internal moves (e.g. GetSequence.io) vs external.</p>
            </div>
            <Switch checked={settings.detect_internal_transfers !== false} onCheckedChange={(v) => set("detect_internal_transfers", v)} />
          </div>
          <div>
            <Label>Transfer category name</Label>
            <p className="text-xs text-muted-foreground mb-2">Used for transfers until internal/external detection runs.</p>
            <Input value={settings.transfer_category_name || "Transfer"} onChange={(e) => set("transfer_category_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Internal transfer category</Label>
              <p className="text-xs text-muted-foreground mb-2">Moves between your own connected accounts (e.g. RBFCU → Sequence).</p>
              <Input value={settings.internal_transfer_category_name || "Internal Transfer"} onChange={(e) => set("internal_transfer_category_name", e.target.value)} />
            </div>
            <div>
              <Label>External transfer category</Label>
              <p className="text-xs text-muted-foreground mb-2">Transfers with no matching counterpart — income or payments.</p>
              <Input value={settings.external_transfer_category_name || "External Transfer"} onChange={(e) => set("external_transfer_category_name", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Additional auto-ignore categories</Label>
            <p className="text-xs text-muted-foreground mb-2">Plaid personal finance categories to auto-ignore beyond transfers. These are ignored on every sync.</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(settings.auto_ignore_categories || []).map((cat, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
                  {cat}
                  <button type="button" onClick={() => set("auto_ignore_categories", (settings.auto_ignore_categories || []).filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                id="new-ignore-cat"
                placeholder="e.g. LOAN_PAYMENTS, BANK_FEES"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = e.target.value.trim().toUpperCase();
                    if (val && !(settings.auto_ignore_categories || []).includes(val)) {
                      set("auto_ignore_categories", [...(settings.auto_ignore_categories || []), val]);
                    }
                    e.target.value = "";
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => {
                const input = document.getElementById("new-ignore-cat");
                const val = (input?.value || "").trim().toUpperCase();
                if (val && !(settings.auto_ignore_categories || []).includes(val)) {
                  set("auto_ignore_categories", [...(settings.auto_ignore_categories || []), val]);
                }
                if (input) input.value = "";
              }}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["LOAN_PAYMENTS", "BANK_FEES", "REFUNDS_AND_REIMBURSEMENTS"].filter((c) => !(settings.auto_ignore_categories || []).includes(c)).map((c) => (
                <button key={c} type="button" onClick={() => set("auto_ignore_categories", [...(settings.auto_ignore_categories || []), c])} className="text-xs text-primary hover:underline">
                  + {c}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <Label>Theme</Label>
            <p className="text-xs text-muted-foreground">Choose the app color scheme. Dark is on by default.</p>
          </div>
          <MobileSelect
            value={theme || "dark"}
            onValueChange={(v) => setTheme(v)}
            placeholder="Theme"
            ariaLabel="Theme"
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
              { value: "system", label: "System" },
            ]}
            triggerClassName="w-40"
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader><CardTitle className="text-base text-destructive">Danger Zone</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <Label>Delete Account</Label>
            <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data. This cannot be undone.</p>
          </div>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={deleting}>
            <Trash2 className="w-4 h-4" /> Delete Account
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Account"
        description="Your account will be deleted permanently. This action cannot be undone."
        confirmLabel="Delete Account"
        destructive
        onConfirm={handleDeleteAccount}
      />

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
      </div>
    </div>
  );
}