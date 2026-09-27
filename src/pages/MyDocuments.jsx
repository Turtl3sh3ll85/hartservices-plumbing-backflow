import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { FileText, ClipboardList, Loader2, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney } from "@/lib/invoice";

export default function MyDocuments() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [inv, est, jb, cs] = await Promise.all([
          base44.entities.Invoice.list("-created_date", 200),
          base44.entities.Estimate.list("-created_date", 200),
          base44.entities.Job.list("-created_date", 200),
          base44.entities.Customer.list("name", 500),
        ]);
        setInvoices(inv);
        setEstimates(est);
        setJobs(jb);
        setCustomers(cs);
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const myCustomer = customers.find(
    (c) => c.email && user?.email && c.email.toLowerCase() === user.email.toLowerCase()
  );
  const myJobIds = new Set(jobs.filter((j) => j.customer_id === myCustomer?.id).map((j) => j.id));
  const myInvoices = invoices.filter((i) => myJobIds.has(i.job_id));
  const myEstimates = estimates.filter((e) => myJobIds.has(e.job_id));
  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!myCustomer) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">No customer record is linked to your account. Contact the business to be added.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">My documents</h1>
        <p className="text-muted-foreground text-sm mt-1">Your invoices and estimates. Pay invoices or review estimates below.</p>
      </div>

      <div>
        <h2 className="font-heading font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Invoices</h2>
        {myInvoices.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No invoices yet.</Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="divide-y">
              {myInvoices.map((i) => {
                const j = jobMap[i.job_id];
                return (
                  <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{j?.title || i.name || "Invoice"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {i.name || i.number}{i.due_date ? ` · Due ${new Date(i.due_date).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium tabular-nums">{formatMoney(i.total)}</span>
                      <StatusBadge status={i.payment_status} />
                      {i.payment_status === "paid" ? (
                        <Button asChild size="sm" variant="outline"><Link to={`/pay/${i.id}`}>View</Link></Button>
                      ) : (
                        <Button asChild size="sm"><Link to={`/pay/${i.id}`}><CreditCard className="w-4 h-4 mr-1" /> Pay</Link></Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <div>
        <h2 className="font-heading font-semibold mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Estimates</h2>
        {myEstimates.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No estimates yet.</Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="divide-y">
              {myEstimates.map((e) => {
                const j = jobMap[e.job_id];
                return (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{j?.title || e.name || "Estimate"}</div>
                      <div className="text-xs text-muted-foreground truncate">{e.name || e.number}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium tabular-nums">{formatMoney(e.total)}</span>
                      <StatusBadge status={e.status} />
                      <Button asChild size="sm" variant="outline"><Link to={`/accept/${e.id}`}>{e.status === "converted" ? "View" : "Review"}</Link></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}