import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import PaymentScheduleDisplay from "@/components/PaymentScheduleDisplay";
import { formatCurrency, formatDate, amountPaidTotal } from "@/lib/format";

export default function Invoices() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Invoice.list('-created_date', 200);
        setItems(list);
      } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  const filtered = items.filter((i) => {
    const q = query.toLowerCase();
    const matches = !q || (i.name || '').toLowerCase().includes(q) || (i.number || '').toLowerCase().includes(q);
    if (!matches) return false;
    if (filter === "open") return i.payment_status !== "paid";
    if (filter === "ready") return i.customer_ready_for_next_stage;
    if (filter === "standing") return i.standing_by;
    return true;
  });

  const tabs = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "standing", label: "Standing by" },
    { key: "ready", label: "Ready for next stage" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-semibold tracking-tight">Invoices</h1>
        <Button asChild size="sm"><Link to="/invoices/new"><Plus className="w-4 h-4" /> New invoice</Link></Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices" className="pl-9" />
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${filter === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No invoices found.</CardContent></Card>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {filtered.map((inv) => {
            const paid = amountPaidTotal(inv.payment_schedule, inv.total);
            const balance = Math.max(0, (inv.total || 0) - paid);
            return (
              <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{inv.name || inv.number || "Invoice"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{formatDate(inv.due_date || inv.created_date)}</span>
                    {inv.standing_by && <span className="text-amber-600">· Standing by</span>}
                    {inv.customer_ready_for_next_stage && <span className="text-emerald-600">· Ready for next stage</span>}
                  </div>
                  <div className="mt-1.5">
                    <PaymentScheduleDisplay compact schedule={inv.payment_schedule} total={inv.total} standingBy={inv.standing_by} />
                  </div>
                </div>
                <StatusBadge status={inv.payment_status} />
                <div className="text-right">
                  <div className="font-medium tabular-nums">{formatCurrency(balance)}</div>
                  <div className="text-xs text-muted-foreground">of {formatCurrency(inv.total)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}