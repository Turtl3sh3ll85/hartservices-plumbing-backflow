import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import OpenedIndicator from "@/components/OpenedIndicator";
import PaymentMilestoneList from "@/components/PaymentMilestoneList";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";

const MODE_LABEL = { single: "Single", a_la_carte: "À la carte", side_by_side: "Side-by-side" };

export default function Estimates() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const toggleStanding = async (est, value) => {
    setItems((prev) => prev.map((i) => (i.id === est.id ? { ...i, standing_by: value } : i)));
    try {
      await base44.entities.Estimate.update(est.id, { standing_by: value });
    } catch (e) {
      setItems((prev) => prev.map((i) => (i.id === est.id ? { ...i, standing_by: !value } : i)));
      toast({ title: "Could not update status", variant: "destructive" });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Estimate.list('-created_date', 200);
        setItems(list);
      } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  const filtered = items.filter((e) => {
    const q = query.toLowerCase();
    return !q || (e.name || '').toLowerCase().includes(q) || (e.number || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-semibold tracking-tight">Estimates</h1>
        <Button asChild size="sm"><Link to="/estimates/new"><Plus className="w-4 h-4" /> New estimate</Link></Button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search estimates" className="pl-9" />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No estimates yet.</CardContent></Card>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {filtered.map((e) => (
            <Link key={e.id} to={`/estimates/${e.id}`} className="block px-4 py-3 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{e.name || e.number || "Untitled estimate"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{formatDate(e.created_date)}</span>
                    <span>· {MODE_LABEL[e.selection_mode || "single"]}</span>
                  </div>
                </div>
                <OpenedIndicator opened={e.opened} lastOpenedDate={e.last_opened_date} />
                <StatusBadge status={e.status} />
                <span className="font-medium tabular-nums">{formatCurrency(e.total)}</span>
              </div>
              <div className="mt-2">
                <PaymentMilestoneList
                  schedule={e.payment_schedule}
                  total={e.total}
                  standingBy={e.standing_by}
                  onToggle={(v) => toggleStanding(e, v)}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}