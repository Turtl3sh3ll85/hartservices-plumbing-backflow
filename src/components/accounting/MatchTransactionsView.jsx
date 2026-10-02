import { Card, CardContent } from "@/components/ui/card";
import TransactionRow from "./TransactionRow";

export default function MatchTransactionsView({ txs, invoices, loading, onLink, onUnlink }) {
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  // Eligible to match: exclude not_a_job and ignored. 10 newest.
  const eligible = txs
    .filter((t) => t.matched !== "not_a_job" && t.matched !== "ignored")
    .slice(0, 10);

  const invoiceFor = (id) => invoices.find((i) => i.id === id);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        The 10 newest transactions eligible to match to an invoice. Not-a-job transactions are hidden.
      </p>
      {eligible.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No transactions to match.
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
              editableCategory={false}
              showIgnore={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}