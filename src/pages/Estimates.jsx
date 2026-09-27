import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Search, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MobileSelect } from "@/components/ui/mobile-select";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { formatMoney } from "@/lib/invoice";

export default function Estimates() {
  const [estimates, setEstimates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [est, jb, cs] = await Promise.all([
        base44.entities.Estimate.list("-created_date", 200),
        base44.entities.Job.list("-created_date", 200),
        base44.entities.Customer.list("name", 500),
      ]);
      setEstimates(est);
      setJobs(jb);
      setCustomers(cs);
    } catch (e) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const filtered = estimates.filter((e) => {
    const j = jobMap[e.job_id];
    const c = j ? customerMap[j.customer_id] : null;
    const q = query.toLowerCase();
    const matchesQuery = !q || [e.name, e.number, j?.title, c?.name].join(" ").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Estimates</h1>
        <Button asChild><Link to="/estimates/new"><Plus className="w-4 h-4 mr-1" /> New estimate</Link></Button>
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
            { value: "draft", label: "Draft" },
            { value: "sent", label: "Sent" },
            { value: "approved", label: "Approved" },
            { value: "declined", label: "Declined" },
            { value: "converted", label: "Converted" },
          ]}
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No estimates found" description="Create an estimate for a job, then convert it to an invoice when approved." action={<Button asChild><Link to="/estimates/new"><Plus className="w-4 h-4 mr-1" /> New estimate</Link></Button>} />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y">
            {filtered.map((e) => {
              const j = jobMap[e.job_id];
              const c = j ? customerMap[j.customer_id] : null;
              return (
                <Link key={e.id} to={`/estimates/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11 hover:bg-accent transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.name || e.number || "Untitled estimate"}</div>
                    <div className="text-sm text-muted-foreground truncate">{e.number}{c ? ` · ${c.name}` : ""}{j ? ` · ${j.title}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium tabular-nums">{formatMoney(e.total)}</span>
                    <StatusBadge status={e.status} />
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