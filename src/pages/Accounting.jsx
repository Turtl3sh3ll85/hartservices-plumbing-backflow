import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Loader2, Link2, Unlink, Paperclip, X, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney } from "@/lib/invoice";
import { computeSuggestions } from "@/lib/ynabMatching";
import ManualMatchDialog from "@/components/ManualMatchDialog";
import TransactionCategoryPicker from "@/components/TransactionCategoryPicker";
import AccountGroup from "@/components/accounting/AccountGroup";
import ReceiptsDialog from "@/components/accounting/ReceiptsDialog";
import MergeAccountsDialog from "@/components/accounting/MergeAccountsDialog";

const COLLAPSED_KEY = "acct_collapsed";
const GROUP_COLLAPSED_KEY = "acct_group_collapsed";

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}

export default function Accounting() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [matchTx, setMatchTx] = useState(null);
  const [pinTx, setPinTx] = useState(null);
  const [collapsed, setCollapsed] = useState(() => readJSON(COLLAPSED_KEY, {}));
  const [groupCollapsed, setGroupCollapsed] = useState(() => readJSON(GROUP_COLLAPSED_KEY, {}));
  const [mergeGroup, setMergeGroup] = useState(null);

  useEffect(() => { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed)); }, [collapsed]);
  useEffect(() => { localStorage.setItem(GROUP_COLLAPSED_KEY, JSON.stringify(groupCollapsed)); }, [groupCollapsed]);

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

  const { data: labelRecords = [] } = useQuery({
    queryKey: ["accountLabels"],
    queryFn: async () => base44.entities.AccountLabel.list(),
  });
  const settingsByAccount = useMemo(() => Object.fromEntries(labelRecords.map((l) => [l.account_name, l])), [labelRecords]);
  const labelMap = useMemo(() => Object.fromEntries(labelRecords.filter((l) => l.type).map((l) => [l.account_name, l.type])), [labelRecords]);
  const mergeMap = useMemo(() => Object.fromEntries(labelRecords.filter((l) => l.merge_into).map((l) => [l.account_name, l.merge_into])), [labelRecords]);
  const resolveName = useMemo(() => (name) => {
    let cur = name;
    const seen = new Set();
    while (mergeMap[cur] && !seen.has(cur)) { seen.add(cur); cur = mergeMap[cur]; }
    return cur;
  }, [mergeMap]);

  const paidInvoices = useMemo(() => invoices.filter((i) => i.payment_status === "paid" || i.payment_status === "partial"), [invoices]);
  const suggestions = useMemo(() => computeSuggestions(transactions, paidInvoices), [transactions, paidInvoices]);
  const invoiceMap = useMemo(() => Object.fromEntries(invoices.map((i) => [i.id, i])), [invoices]);

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

  const pinReceipt = async (tx, file) => {
    const receipts = Array.isArray(tx.receipts) ? tx.receipts : [];
    if (receipts.some((r) => r.drive_file_id === file.id)) return;
    const next = [...receipts, {
      drive_file_id: file.id,
      name: file.name,
      link: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      thumbnail_url: "",
    }];
    setUpdatingId(tx.id);
    try {
      await base44.entities.YnabTransaction.update(tx.id, { receipts: next });
      await queryClient.invalidateQueries({ queryKey: ["ynabTransactions"] });
    } catch (e) {}
    setUpdatingId(null);
    setPinTx(null);
  };

  const unpinReceipt = async (tx, fileId) => {
    const receipts = Array.isArray(tx.receipts) ? tx.receipts : [];
    const next = receipts.filter((r) => r.drive_file_id !== fileId);
    setUpdatingId(tx.id);
    try {
      await base44.entities.YnabTransaction.update(tx.id, { receipts: next });
      await queryClient.invalidateQueries({ queryKey: ["ynabTransactions"] });
    } catch (e) {}
    setUpdatingId(null);
  };

  const setAccountLabel = async (accountName, type) => {
    const existing = settingsByAccount[accountName];
    try {
      if (type === "unlabeled") {
        if (existing) {
          if (existing.merge_into) {
            await base44.entities.AccountLabel.update(existing.id, { type: null });
          } else {
            await base44.entities.AccountLabel.delete(existing.id);
          }
        }
      } else if (existing) {
        await base44.entities.AccountLabel.update(existing.id, { type });
      } else {
        await base44.entities.AccountLabel.create({ account_name: accountName, type });
      }
      await queryClient.invalidateQueries({ queryKey: ["accountLabels"] });
    } catch (e) {}
  };

  const setMerge = async (rawAccountNames, target) => {
    for (const name of rawAccountNames) {
      const existing = settingsByAccount[name];
      try {
        if (existing) {
          await base44.entities.AccountLabel.update(existing.id, { merge_into: target });
        } else {
          await base44.entities.AccountLabel.create({ account_name: name, merge_into: target });
        }
      } catch (e) {}
    }
    await queryClient.invalidateQueries({ queryKey: ["accountLabels"] });
  };

  const unmergeAccount = async (name) => {
    const existing = settingsByAccount[name];
    try {
      if (existing) {
        await base44.entities.AccountLabel.update(existing.id, { merge_into: null });
        await queryClient.invalidateQueries({ queryKey: ["accountLabels"] });
      }
    } catch (e) {}
  };

  const tagged = useMemo(() => transactions.map((tx) => ({
    ...tx,
    _suggested_invoice_id: tx.matched === "unmatched" ? (suggestions[tx.ynab_id] || null) : null,
  })), [transactions, suggestions]);

  const accountGroups = useMemo(() => {
    const map = new Map();
    for (const tx of tagged) {
      const name = resolveName(tx.account_name || "Unknown Account");
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(tx);
    }
    return Array.from(map.entries());
  }, [tagged, resolveName]);

  const rawAccounts = useMemo(() => [...new Set(transactions.map((t) => t.account_name || "Unknown Account"))], [transactions]);
  const groupRawAccounts = (groupName) => rawAccounts.filter((a) => resolveName(a) === groupName);
  const mergedSourcesOf = (groupName) => rawAccounts.filter((a) => resolveName(a) === groupName && mergeMap[a]);

  const GROUPS = ["business", "routing", "personal", "unlabeled"];

  const grouped = useMemo(() => {
    const buckets = { business: [], routing: [], personal: [], unlabeled: [] };
    for (const entry of accountGroups) {
      const name = entry[0];
      const type = labelMap[name] || "unlabeled";
      buckets[type].push(entry);
    }
    return buckets;
  }, [accountGroups, labelMap]);

  const sortedEntries = (entries) => [...entries].sort((a, b) => a[0].localeCompare(b[0]));

  const categorize = (list) => {
    const matched = [];
    const unmatched = [];
    for (const tx of list) {
      if (tx.matched === "matched") matched.push(tx);
      else if (tx.matched === "ignored") continue;
      else unmatched.push(tx);
    }
    return { matched, unmatched };
  };

  const renderRow = (tx) => {
    const inv = tx._suggested_invoice_id ? invoiceMap[tx._suggested_invoice_id] : (tx.matched_invoice_id ? invoiceMap[tx.matched_invoice_id] : null);
    const busy = updatingId === tx.id;
    const receipts = Array.isArray(tx.receipts) ? tx.receipts : [];
    return (
      <div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
        <div className="min-w-0 flex-1 min-w-[180px]">
          <div className="font-medium truncate">{tx.payee || tx.memo || "Unknown payee"}</div>
          <div className="text-sm text-muted-foreground truncate">
            {tx.date ? new Date(tx.date).toLocaleDateString() : ""}{tx.memo ? ` · ${tx.memo}` : ""}
          </div>
          <div className="mt-1">
            <TransactionCategoryPicker
              value={tx.custom_category || ""}
              disabled={busy}
              onChange={async (val) => {
                await base44.entities.YnabTransaction.update(tx.id, { custom_category: val });
                await queryClient.invalidateQueries({ queryKey: ["ynabTransactions"] });
              }}
            />
          </div>
          {receipts.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {receipts.map((r) => (
                <a
                  key={r.drive_file_id}
                  href={r.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 min-h-7"
                >
                  <Paperclip className="w-3 h-3 shrink-0" />
                  <span className="max-w-[120px] truncate">{r.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); unpinReceipt(tx, r.drive_file_id); }}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Unpin receipt"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium tabular-nums">{formatMoney(tx.amount)}</span>
          {inv && (
            <span className="text-xs text-muted-foreground truncate max-w-[140px] hidden sm:inline">
              <Link2 className="w-3 h-3 inline mr-1" />{inv.name || inv.number || "Invoice"}
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={() => setPinTx(tx)} disabled={busy} aria-label="Attach receipt">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </Button>
          {tx.matched === "matched" ? (
            <>
              <StatusBadge status="matched" label="matched" />
              <Button size="sm" variant="ghost" onClick={() => updateMatch(tx, "unmatched", null)} disabled={busy} aria-label="Unmatch">
                <Unlink className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setMatchTx(tx)} className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10">
              <Link2 className="w-4 h-4 mr-1" /> Unmatched
            </Button>
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
          <p className="text-muted-foreground text-sm mt-1">Transactions matched to invoice payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Sync now
          </Button>
        </div>
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
        <div className="space-y-8">
          {GROUPS.map((group) => {
            const entries = sortedEntries(grouped[group]);
            if (entries.length === 0) return null;
            const isCollapsed = !!groupCollapsed[group];
            return (
              <div key={group} className="space-y-3">
                <button
                  type="button"
                  onClick={() => setGroupCollapsed((c) => ({ ...c, [group]: !c[group] }))}
                  className="flex items-center gap-2 px-1 min-h-11 w-full text-left"
                  aria-expanded={!isCollapsed}
                >
                  <ChevronDown className={cn("w-5 h-5 transition-transform shrink-0", isCollapsed && "-rotate-90")} />
                  <h2 className="font-heading text-xl font-semibold">
                    {group === "business" ? "Business" : group === "routing" ? "Routing" : group === "personal" ? "Personal" : "Unlabeled"}
                  </h2>
                  <span className="text-sm text-muted-foreground font-normal">· {entries.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-6">
                    {entries.map(([account, txs]) => (
                      <AccountGroup
                        key={account}
                        account={account}
                        txs={txs}
                        collapsed={collapsed[account] !== false}
                        onToggleCollapse={() => setCollapsed((c) => ({ ...c, [account]: !(c[account] !== false) }))}
                        labelType={labelMap[account] || "unlabeled"}
                        onSetLabel={(type) => setAccountLabel(account, type)}
                        mergedSources={mergedSourcesOf(account)}
                        onUnmerge={(src) => unmergeAccount(src)}
                        onMerge={() => setMergeGroup({ name: account, raws: groupRawAccounts(account) })}
                        renderSection={renderSection}
                        categorize={categorize}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

      <ReceiptsDialog
        open={!!pinTx}
        onClose={() => setPinTx(null)}
        onPick={(file) => pinTx && pinReceipt(pinTx, file)}
        title="Pin receipt to transaction"
      />

      <MergeAccountsDialog
        open={!!mergeGroup}
        account={mergeGroup?.name}
        accounts={accountGroups.map(([n]) => n)}
        onClose={() => setMergeGroup(null)}
        onMerge={(target) => { if (mergeGroup) setMerge(mergeGroup.raws, target); setMergeGroup(null); }}
      />
    </div>
  );
}