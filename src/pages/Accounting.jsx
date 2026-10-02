import { useEffect, useState } from "react";
import { RefreshCw, MailSearch, Menu, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/format";
import MatchTransactionsView from "@/components/accounting/MatchTransactionsView";
import CategorizeTransactionsView from "@/components/accounting/CategorizeTransactionsView";
import TransactionsByAccountView from "@/components/accounting/TransactionsByAccountView";
import CategoriesView from "@/components/accounting/CategoriesView";

export default function Accounting() {
  const { toast } = useToast();
  const [txs, setTxs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [linking, setLinking] = useState(null);
  const [invoiceQuery, setInvoiceQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [t, i] = await Promise.all([
        base44.entities.Transaction.list("-date", 200),
        base44.entities.Invoice.list("-created_date", 200),
      ]);
      setTxs(t);
      setInvoices(i);
    } catch (e) {
      toast({ title: "Failed to load", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const runSync = async () => {
    setBusy("sync");
    try {
      const res = await base44.functions.invoke("syncPlaidTransactions", {});
      toast({ title: `Synced ${res.data?.added ?? 0} new, ${res.data?.updated ?? 0} updated` });
      load();
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };
  const runFullResync = async () => {
    setBusy("resync");
    try {
      const res = await base44.functions.invoke("syncPlaidTransactions", { reset_cursor: true });
      toast({ title: `Full re-sync: ${res.data?.added ?? 0} new, ${res.data?.updated ?? 0} updated` });
      load();
    } catch (e) {
      toast({ title: "Re-sync failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };
  const runReceipts = async () => {
    setBusy("receipts");
    try {
      const res = await base44.functions.invoke("findReceiptsInEmail", {});
      toast({ title: `Scanned ${res.data?.scanned ?? 0} emails, matched ${res.data?.matched ?? 0}` });
      load();
    } catch (e) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };
  const runForceRefresh = async () => {
    setBusy("refresh");
    try {
      const res = await base44.functions.invoke("refreshRecategorization", {});
      toast({ title: `Recategorized ${res.data?.plaid ?? 0} Plaid · ${res.data?.ynab ?? 0} YNAB` });
      load();
    } catch (e) {
      toast({ title: "Refresh failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  // Auto-refresh recategorization every 30 minutes while the page is open.
  useEffect(() => {
    const id = setInterval(() => {
      runForceRefresh();
    }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const updateTx = async (id, patch) => {
    try {
      await base44.entities.Transaction.update(id, patch);
    } catch (e) {
      toast({ title: "Update failed", variant: "destructive" });
    }
    setTxs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const linkInvoice = async (tx, invoiceId) => {
    await updateTx(tx.id, { matched_invoice_id: invoiceId, matched: "matched" });
    setLinking(null);
    toast({ title: "Transaction linked to invoice" });
  };
  const unlink = (tx) => updateTx(tx.id, { matched_invoice_id: "", matched: "unmatched" });
  const ignore = (tx) =>
    updateTx(tx.id, { matched: tx.matched === "ignored" ? "unmatched" : "ignored" });

  const onCategoryChange = (id, value) =>
    setTxs((p) => p.map((x) => (x.id === id ? { ...x, custom_category: value } : x)));
  const onCategoryBlur = (id, value) => updateTx(id, { custom_category: value });
  const onRequestLink = (tx) => {
    setLinking(tx);
    setInvoiceQuery("");
  };

  const invoiceOptions = invoices.filter((i) => {
    const q = invoiceQuery.toLowerCase();
    return !q || (i.name || "").toLowerCase().includes(q) || (i.number || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-heading font-semibold tracking-tight">Transactions</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!!busy} className="min-h-11 sm:min-h-9">
              <Menu className="w-4 h-4" /> Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
              Transaction tools
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={runSync} disabled={!!busy}>
              <RefreshCw className={`w-4 h-4 ${busy === "sync" ? "animate-spin" : ""}`} />
              <div className="flex flex-col">
                <span>Sync Plaid</span>
                <span className="text-xs text-muted-foreground">Pull new transactions since last sync</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={runFullResync} disabled={!!busy}>
              <RefreshCw className={`w-4 h-4 ${busy === "resync" ? "animate-spin" : ""}`} />
              <div className="flex flex-col">
                <span>Re-sync all</span>
                <span className="text-xs text-muted-foreground">Re-download every Plaid transaction from scratch</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={runForceRefresh} disabled={!!busy}>
              <RefreshCw className={`w-4 h-4 ${busy === "refresh" ? "animate-spin" : ""}`} />
              <div className="flex flex-col">
                <span>Auto Recategorize</span>
                <span className="text-xs text-muted-foreground">Re-apply sheet category rules to all transactions</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={runReceipts} disabled={busy === "receipts"}>
              <MailSearch className={`w-4 h-4 ${busy === "receipts" ? "animate-spin" : ""}`} />
              <div className="flex flex-col">
                <span>Find receipts</span>
                <span className="text-xs text-muted-foreground">Scan Gmail and auto-match receipts to transactions</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="match">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide">
          <TabsTrigger value="match">Match to Invoices</TabsTrigger>
          <TabsTrigger value="categorize">Categorize</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="match" className="mt-4">
          <MatchTransactionsView
            txs={txs}
            invoices={invoices}
            loading={loading}
            onLink={onRequestLink}
            onUnlink={unlink}
          />
        </TabsContent>
        <TabsContent value="categorize" className="mt-4">
          <CategorizeTransactionsView
            txs={txs}
            invoices={invoices}
            loading={loading}
            onLink={onRequestLink}
            onUnlink={unlink}
            onIgnore={ignore}
            onCategoryChange={onCategoryChange}
            onCategoryBlur={onCategoryBlur}
          />
        </TabsContent>
        <TabsContent value="accounts" className="mt-4">
          <TransactionsByAccountView
            txs={txs}
            invoices={invoices}
            loading={loading}
            onLink={onRequestLink}
            onUnlink={unlink}
            onIgnore={ignore}
            onCategoryChange={onCategoryChange}
            onCategoryBlur={onCategoryBlur}
          />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <CategoriesView
            txs={txs}
            invoices={invoices}
            loading={loading}
            onLink={onRequestLink}
            onUnlink={unlink}
            onIgnore={ignore}
            onCategoryChange={onCategoryChange}
            onCategoryBlur={onCategoryBlur}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!linking} onOpenChange={(o) => !o && setLinking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link to invoice</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              placeholder="Search invoices"
              className="pl-9 mb-2"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto divide-y rounded-lg border">
            {invoiceOptions.slice(0, 30).map((i) => (
              <button
                key={i.id}
                onClick={() => linkInvoice(linking, i.id)}
                className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors"
              >
                <div className="font-medium text-sm truncate">{i.name || i.number}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(i.total)}</div>
              </button>
            ))}
            {invoiceOptions.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">No invoices.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}