import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";

const MODE_LABEL = { single: "Single", a_la_carte: "À la carte", side_by_side: "Side-by-side" };

export default function Estimates() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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
            <Link key={e.id} to={`/estimates/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{e.name || e.number || "Untitled estimate"}</div>
                <div className="text-xs text-muted-foreground">{formatDate(e.created_date)} · {MODE_LABEL[e.selection_mode || "single"]}</div>
              </div>
              <StatusBadge status={e.status} />
              <span className="font-medium tabular-nums">{formatCurrency(e.total)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}