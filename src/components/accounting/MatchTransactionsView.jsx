import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import TransactionRow from "./TransactionRow";

const matches = (t, q) => {
  const hay = [t.payee, t.merchant, t.account_name, t.custom_category, t.category, String(t.amount ?? "")].join(" ").toLowerCase();
  return hay.includes(q);
};

export default function MatchTransactionsView({ txs, invoices, loading, onLink, onUnlink, onPinReceipt }) {
  const [query, setQuery] = useState("");

  const eligible = useMemo(() => {
    // Matchable: not not_a_job, not ignored, and not already matched.
    const matchable = txs.filter(
      (t) => t.matched !== "not_a_job" && t.matched !== "ignored" && t.matched !== "matched"
    );
    const q = query.trim().toLowerCase();
    const filtered = q ? matchable.filter((t) => matches(t, q)) : matchable;
    return filtered.slice(0, 50);
  }, [txs, query]);

  const invoiceFor = (id) => invoices.find((i) => i.id === id);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, amount, category, account, merchant"
          className="pl-9"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Transactions eligible to match to an invoice. Not-a-job and already-matched transactions are hidden.
      </p>
      {eligible.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {query ? "No transactions match your search." : "No transactions to match."}
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {eligible.map((t) => (
            <TransactionRow
              key={t.id}
              t={t}
              invoice={invoiceFor(t.matched_invoice_id)}
              onLink={onLink}
              onUnlink={onUnlink}
              onPinReceipt={onPinReceipt}
              editableCategory={false}
              showIgnore={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}