import { useMemo, useState } from "react";
import { ChevronDown, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import TransactionRow from "./TransactionRow";

export default function CategoriesView({
  txs,
  invoices,
  loading,
  onLink,
  onUnlink,
  onIgnore,
  onCategoryChange,
  onCategoryBlur,
}) {
  const [collapsed, setCollapsed] = useState({});
  const [hideIgnored, setHideIgnored] = useState(false);

  const invoiceFor = (id) => invoices.find((i) => i.id === id);

  const groups = useMemo(() => {
    const map = {};
    for (const t of txs) {
      if (hideIgnored && t.matched === "ignored") continue;
      const cat = t.custom_category || t.category || "Uncategorized";
      (map[cat] ||= []).push(t);
    }
    return Object.entries(map).sort((a, b) => {
      if (a[0] === "Uncategorized") return 1;
      if (b[0] === "Uncategorized") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [txs, hideIgnored]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant={hideIgnored ? "default" : "outline"}
          size="sm"
          onClick={() => setHideIgnored((v) => !v)}
          className="min-h-11 sm:min-h-9"
        >
          {hideIgnored ? "Show Ignored" : "Hide Ignored"}
        </Button>
      </div>
      {groups.length === 0 && (
        <div className="text-sm text-muted-foreground">No categories.</div>
      )}
      {groups.map(([category, list]) => {
        const isCollapsed = collapsed[category];
        return (
          <div key={category} className="space-y-2">
            <button
              onClick={() => setCollapsed((p) => ({ ...p, [category]: !p[category] }))}
              className="flex items-center gap-2 w-full text-left px-1 min-h-11"
              aria-expanded={!isCollapsed}
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform shrink-0", isCollapsed && "-rotate-90")} />
              <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
              <h2 className="font-heading text-lg font-semibold truncate">{category}</h2>
              <span className="text-sm text-muted-foreground shrink-0">· {list.length}</span>
            </button>
            {!isCollapsed && (
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
            )}
          </div>
        );
      })}
    </div>
  );
}