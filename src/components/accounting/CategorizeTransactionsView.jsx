import { useState } from "react";
import { Search, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TransactionRow from "./TransactionRow";

export default function CategorizeTransactionsView({
  txs,
  invoices,
  loading,
  onLink,
  onUnlink,
  onIgnore,
  onCategoryChange,
  onCategoryBlur,
}) {
  const [query, setQuery] = useState("");
  const [hideIgnored, setHideIgnored] = useState(false);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const invoiceFor = (id) => invoices.find((i) => i.id === id);

  const list = txs
    .filter((t) => {
      const q = query.toLowerCase();
      if (q && !`${t.payee} ${t.category} ${t.custom_category}`.toLowerCase().includes(q)) return false;
      if (hideIgnored && t.matched === "ignored") return false;
      return true;
    })
    .slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search payee or category"
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
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No transactions.
          </CardContent>
        </Card>
      ) : (
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
}