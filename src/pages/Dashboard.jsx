import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Wrench, FileText, DollarSign, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney } from "@/lib/invoice";

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [inv, jb] = await Promise.all([
          base44.entities.Invoice.list("-created_date", 50),
          base44.entities.Job.list("-created_date", 20),
        ]);
        setInvoices(inv);
        setJobs(jb);
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const outstanding = invoices
    .filter((i) => i.payment_status !== "paid" && i.status !== "cancelled" && i.status !== "draft")
    .reduce((s, i) => s + (Number(i.total) || 0), 0);

  const now = new Date();
  const paidThisMonth = invoices
    .filter((i) => i.payment_status === "paid" && i.paid_date && new Date(i.paid_date).getMonth() === now.getMonth() && new Date(i.paid_date).getFullYear() === now.getFullYear())
    .reduce((s, i) => s + (Number(i.amount_paid) || Number(i.total) || 0), 0);

  const activeJobs = jobs.filter((j) => j.status === "scheduled" || j.status === "in_progress").length;

  const stats = [
    { label: "Outstanding", value: formatMoney(outstanding), icon: DollarSign, tint: "text-amber-600" },
    { label: "Paid this month", value: formatMoney(paidThisMonth), icon: TrendingUp, tint: "text-emerald-600" },
    { label: "Active jobs", value: activeJobs, icon: Wrench, tint: "text-blue-600" },
    { label: "Total invoices", value: invoices.length, icon: FileText, tint: "text-foreground" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Track jobs, estimates, and invoices for your plumbing business.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/jobs"><Plus className="w-4 h-4 mr-1" /> New job</Link></Button>
          <Button asChild><Link to="/invoices/new"><Plus className="w-4 h-4 mr-1" /> New invoice</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.tint}`} />
            </div>
            <div className="text-2xl font-heading font-semibold mt-2 tabular-nums">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold">Recent invoices</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/invoices">View all <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.slice(0, 6).map((i) => (
                <Link key={i.id} to={`/invoices/${i.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{i.name || i.number}</div>
                    <div className="text-xs text-muted-foreground">{i.number}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium tabular-nums">{formatMoney(i.total)}</span>
                    <StatusBadge status={i.payment_status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold">Active jobs</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/jobs">View all <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No jobs yet.</p>
          ) : (
            <div className="space-y-2">
              {jobs.slice(0, 6).map((j) => (
                <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{j.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{[j.job_street, j.job_city].filter(Boolean).join(", ")}</div>
                  </div>
                  <StatusBadge status={j.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}