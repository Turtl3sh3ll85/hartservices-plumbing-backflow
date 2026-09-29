import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Loader2, CheckCircle2, Link2, Unlink, EyeOff, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney } from "@/lib/invoice";
import { computeSuggestions } from "@/lib/ynabMatching";
import ManualMatchDialog from "@/components/ManualMatchDialog";

export default function Accounting() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [matchTx, setMatchTx] = useState(null);

  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ["ynabTransactions"],
    queryFn: async () => {
      const res = await base44.entities.YnabTransaction.list("-date", 500);
      return res;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoicesForMatching"],
    queryFn: async () => {
      const res = await base44.entities.Invoice.list("-updated_date", 500);
      return res;
    },
  });

  const paidInvoices = useMemo(() => invoices.filter((i) => i.payment_status === "paid" || i.payment_status === "partial"), [invoices]);
  const suggestions = useMemo(() => computeSuggestions(transactions, paidInvoices), [transactions, paidInvoices]);
  const invoiceMap = useMemo(() => Object.fromEntries(invoices.map((i) => [i.id, i])), [invoices]);

  // Invoices within the last 90 days for manual matching
  const recentInvoices = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    return invoices.filter((i) => i.created_date && new Date(i.created_date) >= cutoff);
  }, [invoices]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncYnabTransactions", {});
      if (res.data?.error) throw new Error(res.data.error);
      await queryClient.invalidateQueries({ queryKey: ["ynabTransactions"] });
    } catch (e) {
      // surfaced by query refetch state
    }
    setSyncing(false);
  };

  const updateMatch = async (tx, matched, matched_invoice_id = null) => {
    setUpdatingId(tx.id);
    try {
      await base44.entities.YnabTransaction.update(tx.id, { matched, matched_invoice_id });
      await queryClient.invalidateQueries({ queryKey: ["ynabTransactions"] });
    } catch (e) {}
    setUpdatingId(null);
  };

  // Tag suggested invoice ids onto transactions
  const tagged = useMemo(() => transactions.map((tx) => ({
    ...tx,
    _suggested_invoice_id: tx.matched === "unmatched" ? (suggestions[tx.ynab_id] || null) : null,
  })), [transactions, suggestions]);

  // Group by account
  const accountGroups = useMemo(() => {
    const map = new Map();
    for (const tx of tagged) {
      const name = tx.account_name || "Unknown Account";
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(tx);
    }
    return Array.from(map.entries());
  }, [tagged]);

  const categorize = (list) => {
    const matched = [];
    const suggested = [];
    const unmatched = [];
    for (const tx of list) {
      if (tx.matched === "matched") matched.push(tx);
      else if (tx.matched === "ignored") continue;
      else if (tx._suggested_invoice_id) suggested.push(tx);
      else unmatched.push(tx);
    }
    return { matched, suggested, unmatched };
  };

  const renderRow = (tx) => {
    const inv = tx._suggested_invoice_id ? invoiceMap[tx._suggested_invoice_id] : (tx.matched_invoice_id ? invoiceMap[tx.matched_invoice_id] : null);
    const busy = updatingId === tx.id;
    return (
      <div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
        <div className="min-w-0">
          <div className="font-medium truncate">{tx.payee || tx.memo || "Unknown payee"}</div>
          <div className="text-sm text-muted-foreground truncate">
            {tx.date ? new Date(tx.date).toLocaleDateString() : ""}{tx.category ? ` · ${tx.category}` : ""}{tx.memo ? ` · ${tx.memo}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-medium tabular-nums">{formatMoney(tx.amount)}</span>
          {inv && (
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
              <Link2 className="w-3 h-3 inline mr-1" />{inv.name || inv.number || "Invoice"}
            </span>
          )}
          {tx.matched === "matched" ? (
            <>
              <StatusBadge status="matched" label="matched" />
              <Button size="sm" variant="ghost" onClick={() => updateMatch(tx, "unmatched", null)} disabled={busy} aria-label="Unmatch">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
              </Button>
            </>
          ) : tx._suggested_invoice_id ? (
            <>
              <StatusBadge status="suggested" label="suggested" />
              <Button size="sm" variant="outline" onClick={() => updateMatch(tx, "matched", tx._suggested_invoice_id)} disabled={busy}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={() => updateMatch(tx, "ignored")} disabled={busy} aria-label="Ignore">
                <EyeOff className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <StatusBadge status="unmatched" label="unmatched" />
              <Button size="sm" variant="outline" onClick={() => setMatchTx(tx)}>
                <Link2 className="w-4 h-4 mr-1" /> Match
              </Button>
              <Button size="sm" variant="ghost" onClick={() => updateMatch(tx, "ignored")} disabled={busy} aria-label="Ignore">
                <EyeOff className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (title, list) => (
    <Card className="overflow-hidden p-0">
      <div className="px-4 py-2.5 border-b bg-muted/40 font-medium text-sm flex items-center justify-between">
        <span>{title} ({list.length})</span>
      </div>
      {list.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">None.</div>
      ) : (
        <div className="divide-y">{list.map(renderRow)}</div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground text-sm mt-1">YNAB transactions matched to invoice payments.</p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
          Sync now
        </Button>
      </div>

      {loadingTx ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No transactions yet. Click <strong>Sync now</strong> to pull from YNAB.
        </Card>
      ) : (
        accountGroups.map(([accountName, txs]) => {
          const cats = categorize(txs);
          return (
            <div key={accountName} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-heading text-lg font-semibold">{accountName}</h2>
                <span className="text-sm text-muted-foreground">· {txs.length} transactions</span>
              </div>
              {renderSection("Suggested matches", cats.suggested)}
              {renderSection("Unmatched", cats.unmatched)}
            </div>
          );
        })
      )}

      {transactions.length > 0 && renderSection("Matched", tagged.filter((tx) => tx.matched === "matched"))}

      <ManualMatchDialog
        transaction={matchTx}
        invoices={recentInvoices}
        onMatch={async (invoiceId) => {
          await updateMatch(matchTx, "matched", invoiceId);
          setMatchTx(null);
        }}
        onClose={() => setMatchTx(null)}
        busy={updatingId === matchTx?.id}
      />
    </div>
  );
}