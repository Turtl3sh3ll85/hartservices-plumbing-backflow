import { useEffect, useMemo, useState } from "react";
import { Ban, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AccountGroup from "./AccountGroup";
import MergeAccountsDialog from "./MergeAccountsDialog";
import TransactionRow from "./TransactionRow";

const matches = (t, q) => {
  const hay = [t.payee, t.merchant, t.account_name, t.custom_category, t.category, String(t.amount ?? "")].join(" ").toLowerCase();
  return hay.includes(q);
};

export default function TransactionsByAccountView({
  txs,
  invoices,
  loading,
  onLink,
  onUnlink,
  onIgnore,
  onCategoryChange,
  onCategoryBlur,
  onPinReceipt,
}) {
  const { toast } = useToast();
  const [labels, setLabels] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [merging, setMerging] = useState(null);
  const [hideIgnored, setHideIgnored] = useState(false);
  const [hidePersonal, setHidePersonal] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    base44.entities.AccountLabel.list()
      .then(setLabels)
      .catch(() => {});
  }, []);

  const labelType = Object.fromEntries(
    labels.filter((l) => l.type).map((l) => [l.account_name, l.type])
  );
  const mergeInto = Object.fromEntries(
    labels.filter((l) => l.merge_into).map((l) => [l.account_name, l.merge_into])
  );

  const resolveName = (name) => {
    let cur = name;
    const seen = new Set();
    while (mergeInto[cur] && !seen.has(cur)) {
      seen.add(cur);
      cur = mergeInto[cur];
    }
    return cur;
  };

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = {};
    for (const t of txs) {
      if (hideIgnored && t.matched === "ignored") continue;
      const name = resolveName(t.account_name) || "Unknown";
      if (hidePersonal && labelType[name] === "personal") continue;
      if (q && !matches(t, q)) continue;
      (map[name] ||= []).push(t);
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, labels, hideIgnored, hidePersonal, query]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const setLabel = async (account, type) => {
    const existing = labels.find((l) => l.account_name === account);
    try {
      if (type === "unlabeled") {
        if (existing) {
          await base44.entities.AccountLabel.delete(existing.id);
          setLabels((p) => p.filter((l) => l.id !== existing.id));
        }
      } else if (existing) {
        const updated = await base44.entities.AccountLabel.update(existing.id, { type });
        setLabels((p) => p.map((l) => (l.id === existing.id ? updated : l)));
      } else {
        const created = await base44.entities.AccountLabel.create({ account_name: account, type });
        setLabels((p) => [...p, created]);
      }
    } catch (e) {
      toast({ title: "Failed to set label", variant: "destructive" });
    }
  };

  const mergedSourcesOf = (account) =>
    labels.filter((l) => resolveName(l.account_name) === account && l.account_name !== account).map((l) => l.account_name);

  const doMerge = async (target) => {
    const account = merging;
    if (!account) return;
    try {
      const existing = labels.find((l) => l.account_name === account);
      if (existing) {
        await base44.entities.AccountLabel.update(existing.id, { merge_into: target });
        setLabels((p) => p.map((l) => (l.id === existing.id ? { ...l, merge_into: target } : l)));
      } else {
        const created = await base44.entities.AccountLabel.create({ account_name: account, merge_into: target });
        setLabels((p) => [...p, created]);
      }
      toast({ title: `Merged “${account}” into “${target}”` });
    } catch (e) {
      toast({ title: "Merge failed", variant: "destructive" });
    }
    setMerging(null);
  };

  const unmerge = async (src) => {
    const existing = labels.find((l) => l.account_name === src);
    if (!existing) return;
    try {
      await base44.entities.AccountLabel.update(existing.id, { merge_into: "" });
      setLabels((p) => p.map((l) => (l.id === existing.id ? { ...l, merge_into: "" } : l)));
    } catch (e) {
      toast({ title: "Unmerge failed", variant: "destructive" });
    }
  };

  const invoiceFor = (id) => invoices.find((i) => i.id === id);

  const categorize = (list) => ({
    unmatched: list.filter((t) => t.matched !== "matched"),
    matched: list.filter((t) => t.matched === "matched"),
  });

  const renderSection = (title, list) => {
    if (!list.length) return null;
    return (
      <div className="pl-2 sm:pl-11">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 mt-1">{title}</div>
        <div className="divide-y rounded-lg border bg-card">
          {list.map((t) => (
            <TransactionRow
              key={t.id}
              t={t}
              invoice={invoiceFor(t.matched_invoice_id)}
              onLink={onLink}
              onUnlink={onUnlink}
              onIgnore={onIgnore}
              onCategoryChange={onCategoryChange}
              onCategoryBlur={onCategoryBlur}
              onPinReceipt={onPinReceipt}
              showAccount={false}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, amount, category, account, merchant"
            className="pl-9"
          />
        </div>
        <Button
          variant={hideIgnored ? "default" : "outline"}
          size="sm"
          onClick={() => setHideIgnored((v) => !v)}
          className="min-h-11 sm:min-h-9"
        >
          <Ban className="w-4 h-4" />
          {hideIgnored ? "Show Ignored" : "Hide Ignored"}
        </Button>
        <Button
          variant={hidePersonal ? "default" : "outline"}
          size="sm"
          onClick={() => setHidePersonal((v) => !v)}
          className="min-h-11 sm:min-h-9"
        >
          {hidePersonal ? "Show Personal" : "Hide Personal"}
        </Button>
      </div>
      {groups.length === 0 && (
        <div className="text-sm text-muted-foreground">No accounts.</div>
      )}
      {groups.map(([account, list]) => (
        <AccountGroup
          key={account}
          account={account}
          txs={list}
          collapsed={collapsed[account]}
          onToggleCollapse={() => setCollapsed((p) => ({ ...p, [account]: !p[account] }))}
          renderSection={renderSection}
          categorize={categorize}
          labelType={labelType[account]}
          onSetLabel={(type) => setLabel(account, type)}
          mergedSources={mergedSourcesOf(account)}
          onUnmerge={unmerge}
          onMerge={() => setMerging(account)}
        />
      ))}
      <MergeAccountsDialog
        open={!!merging}
        account={merging}
        accounts={groups.map(([a]) => a)}
        onClose={() => setMerging(null)}
        onMerge={doMerge}
      />
    </div>
  );
}