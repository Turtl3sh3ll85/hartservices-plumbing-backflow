import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, RefreshCw, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import TransactionRow from "./TransactionRow";

const matches = (t, q) => {
  const hay = [t.payee, t.merchant, t.account_name, t.custom_category, t.category, String(t.amount ?? "")].join(" ").toLowerCase();
  return hay.includes(q);
};

export default function CategoriesView({
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
  const [collapsed, setCollapsed] = useState({});
  const [hideIgnored, setHideIgnored] = useState(false);
  const [hideNotAJob, setHideNotAJob] = useState(false);
  const [pinnableMap, setPinnableMap] = useState({});
  const [catLoading, setCatLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const res = await base44.functions.invoke("getSheetCategories", {});
      const map = {};
      for (const it of res.data?.items || []) map[it.name.toLowerCase()] = it.pinnable;
      setPinnableMap(map);
    } catch (e) {
      toast({ title: "Failed to load categories", description: e.message, variant: "destructive" });
    } finally {
      setCatLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const invoiceFor = (id) => invoices.find((i) => i.id === id);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = {};
    for (const t of txs) {
      if (hideIgnored && t.matched === "ignored") continue;
      if (hideNotAJob && t.matched === "not_a_job") continue;
      if (q && !matches(t, q)) continue;
      const cat = t.custom_category || t.category || "Uncategorized";
      (map[cat] ||= []).push(t);
    }
    return Object.entries(map).sort((a, b) => {
      if (a[0] === "Uncategorized") return 1;
      if (b[0] === "Uncategorized") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [txs, hideIgnored, hideNotAJob, query]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

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
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCategories}
            disabled={catLoading}
            className="min-h-11 sm:min-h-9"
          >
            <RefreshCw className={cn("w-4 h-4", catLoading && "animate-spin")} />
            Refresh
          </Button>
        <Button
          variant={hideNotAJob ? "default" : "outline"}
          size="sm"
          onClick={() => setHideNotAJob((v) => !v)}
          className="min-h-11 sm:min-h-9"
        >
          {hideNotAJob ? "Show Not a Job" : "Hide Not a Job"}
        </Button>
        <Button
          variant={hideIgnored ? "default" : "outline"}
          size="sm"
          onClick={() => setHideIgnored((v) => !v)}
          className="min-h-11 sm:min-h-9"
        >
          {hideIgnored ? "Show Ignored" : "Hide Ignored"}
        </Button>
        </div>
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
              {(() => {
                const key = category.toLowerCase();
                const known = key in pinnableMap;
                const matchable = pinnableMap[key];
                return (
                  <span
                    className={cn(
                      "ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
                      !known
                        ? "bg-muted text-muted-foreground"
                        : matchable
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {!known ? "Unknown" : matchable ? "Matchable" : "Not a job"}
                  </span>
                );
              })()}
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
                    onPinReceipt={onPinReceipt}
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