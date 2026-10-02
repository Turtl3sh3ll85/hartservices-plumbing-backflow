import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import AccountGroup from "./AccountGroup";
import MergeAccountsDialog from "./MergeAccountsDialog";
import TransactionRow from "./TransactionRow";

export default function TransactionsByAccountView({
  txs,
  invoices,
  loading,
  onLink,
  onUnlink,
  onIgnore,
  onCategoryChange,
  onCategoryBlur,
}) {
  const { toast } = useToast();
  const [labels, setLabels] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [merging, setMerging] = useState(null);

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
    const map = {};
    for (const t of txs) {
      const name = resolveName(t.account_name) || "Unknown";
      (map[name] ||= []).push(t);
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, labels]);

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
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
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