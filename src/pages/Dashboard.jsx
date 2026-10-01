import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ClipboardList, ArrowLeftRight, Clock, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatDate, amountPaidTotal } from "@/lib/format";

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ outstanding: 0, overdue: 0, unmatched: 0, readyNext: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [invoices, txs] = await Promise.all([
          base44.entities.Invoice.list('-created_date', 50),
          base44.entities.Transaction.list('-date', 200).catch(() => []),
        ]);
        const outstanding = invoices.reduce((s, inv) => s + Math.max(0, (inv.total || 0) - amountPaidTotal(inv.payment_schedule)), 0);
        const today = new Date().toISOString().slice(0, 10);
        const overdue = invoices.filter((i) => i.due_date && i.due_date < today && i.payment_status !== 'paid').length;
        const unmatched = txs.filter((t) => t.matched === 'unmatched').length;
        const readyNext = invoices.filter((i) => i.customer_ready_for_next_stage).length;
        setStats({ outstanding, overdue, unmatched, readyNext });
        setRecent(invoices.slice(0, 6));
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: 'Outstanding', value: formatCurrency(stats.outstanding), icon: FileText, tone: 'text-primary' },
    { label: 'Overdue invoices', value: stats.overdue, icon: AlertCircle, tone: 'text-destructive' },
    { label: 'Unmatched transactions', value: stats.unmatched, icon: ArrowLeftRight, tone: 'text-amber-600' },
    { label: 'Ready for next stage', value: stats.readyNext, icon: Clock, tone: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back{user?.full_name ? `, ${user.full_name}` : ''}.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <c.icon className={`w-4 h-4 ${c.tone}`} />
              </div>
              <div className="mt-2 text-xl font-semibold">{loading ? '…' : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent invoices</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/invoices">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : recent.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No invoices yet.</div>
          ) : (
            <div className="divide-y">
              {recent.map((inv) => (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-accent/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{inv.name || inv.number || 'Invoice'}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(inv.due_date || inv.created_date)}</div>
                  </div>
                  <StatusBadge status={inv.payment_status} />
                  <span className="font-medium tabular-nums">{formatCurrency(inv.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}