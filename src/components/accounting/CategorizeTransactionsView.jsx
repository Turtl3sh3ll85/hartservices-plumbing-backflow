import { useEffect, useState } from "react";
import { Search, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import TransactionRow from "./TransactionRow";

const matches = (t, q) => {
  const hay = [t.payee, t.merchant, t.account_name, t.custom_category, t.category, String(t.amount ?? "")].join(" ").toLowerCase();
  return hay.includes(q);
};

export default function CategorizeTransactionsView({
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
  const [query, setQuery] = useState("");
  const [hideIgnored, setHideIgnored] = useState(true);
  const [hidePersonal, setHidePersonal] = useState(true);
  const [personalAccounts, setPersonalAccounts] = useState(() => new Set());

  useEffect(() => {
    base44.entities.AccountLabel.list()
      .then((labels) => {
        setPersonalAccounts(new Set(labels.filter((l) => l.type === "personal").map((l) => l.account_name)));
      })
      .catch(() => {});
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const invoiceFor = (id) => invoices.find((i) => i.id === id);

  const q = query.trim().toLowerCase();
  const list = txs
    .filter((t) => {
      if (q && !matches(t, q)) return false;
      if (hideIgnored && t.matched === "ignored") return false;
      if (hidePersonal && personalAccounts.has(t.account_name)) return false;
      return true;
    })
    .slice(0, 50);

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

      {list.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {q ? "No transactions match your search." : "No transactions."}
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
              onPinReceipt={onPinReceipt}
            />
          ))}
        </div>
      )}
    </div>
  );
}