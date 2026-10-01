import { useEffect, useState } from "react";
import { RefreshCw, MailSearch, Link2, Unlink, Ban, Paperclip, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatDate, paymentAmounts } from "@/lib/format";

export default function Accounting() {
  const { toast } = useToast();
  const [txs, setTxs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState("unmatched");
  const [query, setQuery] = useState("");
  const [linking, setLinking] = useState(null); // transaction being linked
  const [invoiceQuery, setInvoiceQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [t, i] = await Promise.all([
        base44.entities.Transaction.list('-date', 200),
        base44.entities.Invoice.list('-created_date', 200),
      ]);
      setTxs(t);
      setInvoices(i);
    } catch (e) {
      toast({ title: "Failed to load", variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const runSync = async () => {
    setBusy("sync");
    try {
      const res = await base44.functions.invoke("syncPlaidTransactions", {});
      toast({ title: `Synced ${res.data?.added ?? 0} new, ${res.data?.updated ?? 0} updated` });
      load();
    } catch (e) { toast({ title: "Sync failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const runReceipts = async () => {
    setBusy("receipts");
    try {
      const res = await base44.functions.invoke("findReceiptsInEmail", {});
      toast({ title: `Scanned ${res.data?.scanned ?? 0} emails, matched ${res.data?.matched ?? 0}` });
      load();
    } catch (e) { toast({ title: "Scan failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  const updateTx = async (id, patch) => {
    try { await base44.entities.Transaction.update(id, patch); } catch (e) { toast({ title: "Update failed", variant: "destructive" }); }
    setTxs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const linkInvoice = async (tx, invoiceId) => {
    await updateTx(tx.id, { matched_invoice_id: invoiceId, matched: "matched" });
    setLinking(null);
    toast({ title: "Transaction linked to invoice" });
  };
  const unlink = (tx) => updateTx(tx.id, { matched_invoice_id: "", matched: "unmatched" });
  const ignore = (tx) => updateTx(tx.id, { matched: tx.matched === "ignored" ? "unmatched" : "ignored" });

  const filtered = txs.filter((t) => {
    if (filter === "unmatched" && t.matched !== "unmatched") return false;
    if (filter === "matched" && t.matched !== "matched") return false;
    if (filter === "ignored" && t.matched !== "ignored") return false;
    const q = query.toLowerCase();
    if (q && !(`${t.payee} ${t.category} ${t.custom_category}`.toLowerCase().includes(q))) return false;
    return true;
  });

  const invoiceFor = (id) => invoices.find((i) => i.id === id);
  const invoiceOptions = invoices.filter((i) => {
    const q = invoiceQuery.toLowerCase();
    return !q || (i.name || '').toLowerCase().includes(q) || (i.number || '').toLowerCase().includes(q);
  });

  const tabs = [
    { key: "unmatched", label: "Unmatched" },
    { key: "matched", label: "Matched" },
    { key: "ignored", label: "Ignored" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-heading font-semibold tracking-tight">Transactions</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runSync} disabled={busy === "sync"}>
            <RefreshCw className={`w-4 h-4 ${busy === "sync" ? "animate-spin" : ""}`} /> Sync Plaid
          </Button>
          <Button variant="outline" size="sm" onClick={runReceipts} disabled={busy === "receipts"}>
            <MailSearch className={`w-4 h-4 ${busy === "receipts" ? "animate-spin" : ""}`} /> Find receipts
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search payee or category" className="pl-9" />
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No transactions.</CardContent></Card>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {filtered.map((t) => {
            const inv = invoiceFor(t.matched_invoice_id);
            return (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{t.payee || "Unknown"}</span>
                    {t.receipt_email_id && <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(t.date)} · {t.account_name}{t.account_mask ? ` ···${t.account_mask}` : ""}
                  </div>
                  <input
                    value={t.custom_category || t.category || ""}
                    onChange={(e) => setTxs((p) => p.map((x) => (x.id === t.id ? { ...x, custom_category: e.target.value } : x)))}
                    onBlur={(e) => updateTx(t.id, { custom_category: e.target.value })}
                    placeholder="Category"
                    className="mt-1 text-xs text-muted-foreground bg-transparent border-none p-0 w-full focus:outline-none focus:ring-0"
                  />
                </div>
                <div className="text-right shrink-0">
                  <div className="font-medium tabular-nums">{formatCurrency(t.amount)}</div>
                  {inv ? (
                    <div className="text-xs text-primary truncate max-w-[160px]">{inv.name || inv.number}</div>
                  ) : (
                    <StatusBadge status={t.matched} />
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {t.matched === "matched" ? (
                    <Button variant="ghost" size="icon" onClick={() => unlink(t)} aria-label="Unlink"><Unlink className="w-4 h-4" /></Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => { setLinking(t); setInvoiceQuery(""); }} aria-label="Link invoice"><Link2 className="w-4 h-4" /></Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => ignore(t)} aria-label="Toggle ignore">
                    <Ban className={`w-4 h-4 ${t.matched === "ignored" ? "text-muted-foreground" : "text-destructive"}`} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!linking} onOpenChange={(o) => !o && setLinking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link to invoice</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={invoiceQuery} onChange={(e) => setInvoiceQuery(e.target.value)} placeholder="Search invoices" className="pl-9 mb-2" autoFocus />
          </div>
          <div className="max-h-72 overflow-y-auto divide-y rounded-lg border">
            {invoiceOptions.slice(0, 30).map((i) => (
              <button key={i.id} onClick={() => linkInvoice(linking, i.id)}
                className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors">
                <div className="font-medium text-sm truncate">{i.name || i.number}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(i.total)}</div>
              </button>
            ))}
            {invoiceOptions.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No invoices.</div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}