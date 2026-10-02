import { useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import TransactionRow from "./TransactionRow";

const matches = (t, q) => {
  const hay = [t.payee, t.merchant, t.account_name, t.custom_category, t.category, String(t.amount ?? "")].join(" ").toLowerCase();
  return hay.includes(q);
};

export default function MatchTransactionsView({ txs, invoices, loading, onLink, onUnlink, onPinReceipt, onToggleUnmatchable }) {
  const [query, setQuery] = useState("");
  const [hideUnmatchable, setHideUnmatchable] = useState(false);
  const [newestOpen, setNewestOpen] = useState(true);
  const [matchedOpen, setMatchedOpen] = useState(false);

  const newest = useMemo(() => {
    let list = txs.filter(
      (t) => t.matched !== "not_a_job" && t.matched !== "ignored" && t.matched !== "matched"
    );
    if (hideUnmatchable) list = list.filter((t) => t.matched !== "unmatchable");
    const q = query.trim().toLowerCase();
    const filtered = q ? list.filter((t) => matches(t, q)) : list;
    return filtered.slice(0, 10);
  }, [txs, query, hideUnmatchable]);

  const matched = useMemo(() => {
    let list = txs.filter((t) => t.matched === "matched");
    const q = query.trim().toLowerCase();
    return q ? list.filter((t) => matches(t, q)) : list;
  }, [txs, query]);

  const invoiceFor = (id) => invoices.find((i) => i.id === id);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const renderRow = (t) => (
    <TransactionRow
      key={t.id}
      t={t}
      invoice={invoiceFor(t.matched_invoice_id)}
      onLink={onLink}
      onUnlink={onUnlink}
      onPinReceipt={onPinReceipt}
      onToggleUnmatchable={onToggleUnmatchable}
      showUnmatchableToggle
      editableCategory={false}
      showIgnore={false}
    />
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, amount, category, account, merchant"
            className="pl-9"
          />
        </div>
        <Button
          variant={hideUnmatchable ? "default" : "outline"}
          size="sm"
          onClick={() => setHideUnmatchable((v) => !v)}
          className="min-h-11 sm:min-h-9"
        >
          {hideUnmatchable ? "Show Unmatchable" : "Hide Unmatchable"}
        </Button>
      </div>

      <Collapsible open={newestOpen} onOpenChange={setNewestOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-left hover:bg-accent/50 transition-colors">
            <span className="font-medium text-sm">Newest transactions <span className="text-muted-foreground">({newest.length})</span></span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${newestOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2">
            {newest.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  {query ? "No transactions match your search." : "No transactions to match."}
                </CardContent>
              </Card>
            ) : (
              <div className="divide-y rounded-lg border bg-card">
                {newest.map(renderRow)}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={matchedOpen} onOpenChange={setMatchedOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-left hover:bg-accent/50 transition-colors">
            <span className="font-medium text-sm">Matched transactions <span className="text-muted-foreground">({matched.length})</span></span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${matchedOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2">
            {matched.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No matched transactions.
                </CardContent>
              </Card>
            ) : (
              <div className="divide-y rounded-lg border bg-card">
                {matched.map(renderRow)}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}