import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import OpenedIndicator from "@/components/OpenedIndicator";
import PaymentMilestoneList from "@/components/PaymentMilestoneList";
import CustomerGroupHeader from "@/components/CustomerGroupHeader";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate, amountPaidTotal } from "@/lib/format";

export default function Invoices() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const setStatus = async (inv, status) => {
    const prev = {
      standing_by: inv.standing_by,
      customer_ready_for_next_stage: inv.customer_ready_for_next_stage,
      ready_for_next_stage_date: inv.ready_for_next_stage_date,
    };
    const patch = {
      customer_ready_for_next_stage: status === "ready",
      standing_by: status !== "due",
      ready_for_next_stage_date: status === "ready" ? new Date().toISOString() : null,
    };
    setItems((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...patch } : i)));
    try {
      await base44.entities.Invoice.update(inv.id, patch);
    } catch (e) {
      setItems((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...prev } : i)));
      toast({ title: "Could not update status", variant: "destructive" });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [list, custs] = await Promise.all([
          base44.entities.Invoice.list('-created_date', 200),
          base44.entities.Customer.list('-created_date', 200),
        ]);
        setItems(list);
        setCustomers(custs);
      } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  const customerName = (id) => {
    const c = customers.find((c) => c.id === id);
    return c?.name || c?.company || "Unknown customer";
  };

  const filtered = items.filter((i) => {
    const q = query.toLowerCase();
    return !q || (i.name || '').toLowerCase().includes(q) || (i.number || '').toLowerCase().includes(q);
  });

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
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No invoices found.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(
            filtered.reduce((acc, inv) => {
              const key = inv.customer_id || "unknown";
              (acc[key] ||= []).push(inv);
              return acc;
            }, {})
          ).map(([cid, group]) => (
            <div key={cid} className="rounded-lg border bg-card overflow-hidden">
              <CustomerGroupHeader name={customerName(cid)} count={group.length} />
              <div className="divide-y">
                {group.map((inv) => {
                  const paid = amountPaidTotal(inv.payment_schedule, inv.total);
                  const balance = Math.max(0, (inv.total || 0) - paid);
                  const multiple = (inv.payment_schedule?.length || 0) > 1;
                  return (
                    <Link key={inv.id} to={`/invoices/${inv.id}`} className="block px-4 py-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{inv.name || inv.number || "Invoice"}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{formatDate(inv.due_date || inv.created_date)}</span>
                            {inv.customer_ready_for_next_stage && <span className="text-emerald-600">· Ready for next stage</span>}
                          </div>
                        </div>
                        <OpenedIndicator opened={inv.opened} lastOpenedDate={inv.last_opened_date} />
                        <div className="text-right">
                          <div className="font-medium tabular-nums">{formatCurrency(multiple ? (inv.total || 0) : balance)}</div>
                          {multiple && <div className="text-xs text-muted-foreground">{formatCurrency(paid)} paid</div>}
                        </div>
                      </div>
                      <div className="mt-2">
                        <PaymentMilestoneList
                          schedule={inv.payment_schedule}
                          total={inv.total}
                          standingBy={inv.standing_by}
                          customerReady={inv.customer_ready_for_next_stage}
                          onStatusChange={(s) => setStatus(inv, s)}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}