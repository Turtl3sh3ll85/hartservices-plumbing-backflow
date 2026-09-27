import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MobileSelect } from "@/components/ui/mobile-select";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { formatMoney } from "@/lib/invoice";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [inv, jb, cs] = await Promise.all([
        base44.entities.Invoice.list("-created_date", 200),
        base44.entities.Job.list("-created_date", 200),
        base44.entities.Customer.list("name", 500),
      ]);
      setInvoices(inv);
      setJobs(jb);
      setCustomers(cs);
    } catch (e) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const filtered = invoices.filter((i) => {
    const j = jobMap[i.job_id];
    const c = j ? customerMap[j.customer_id] : null;
    const q = query.toLowerCase();
    const matchesQuery = !q || [i.name, i.number, j?.title, c?.name].join(" ").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || i.payment_status === statusFilter || i.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const outstanding = invoices.filter((i) => i.payment_status !== "paid" && i.status !== "cancelled" && i.status !== "draft").reduce((s, i) => s + (Number(i.total) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">Outstanding: <span className="font-medium text-foreground">{formatMoney(outstanding)}</span></p>
        </div>
        <Button asChild><Link to="/invoices/new"><Plus className="w-4 h-4 mr-1" /> New invoice</Link></Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, number, job, customer…" className="pl-9" />
        </div>
        <MobileSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder="Status"
          triggerClassName="w-[160px]"
          ariaLabel="Filter by status"
          options={[
            { value: "all", label: "All" },
            { value: "unpaid", label: "Unpaid" },
            { value: "paid", label: "Paid" },
            { value: "draft", label: "Draft" },
            { value: "sent", label: "Sent" },
            { value: "overdue", label: "Overdue" },
          ]}
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices found" description="Create an invoice and name it after the tasks you performed." action={<Button asChild><Link to="/invoices/new"><Plus className="w-4 h-4 mr-1" /> New invoice</Link></Button>} />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y">
            {filtered.map((i) => {
              const j = jobMap[i.job_id];
              const c = j ? customerMap[j.customer_id] : null;
              return (
                <Link key={i.id} to={`/invoices/${i.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11 hover:bg-accent transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{j?.title || "No job"}</div>
                    <div className="text-sm text-muted-foreground truncate">{i.name || "Untitled invoice"} · {i.number}{c ? ` · ${c.name}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium tabular-nums">{formatMoney(i.total)}</span>
                    <StatusBadge status={i.payment_status} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}