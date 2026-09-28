import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { FileText, ClipboardList, Loader2, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney } from "@/lib/invoice";

export default function MyDocuments() {
  const { user } = useAuth();
  const { data: invoices = [], isLoading: li } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 200) });
  const { data: estimates = [], isLoading: le } = useQuery({ queryKey: ["estimates"], queryFn: () => base44.entities.Estimate.list("-created_date", 200) });
  const { data: jobs = [], isLoading: lj } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list("-created_date", 200) });
  const { data: customers = [], isLoading: lc } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("name", 500) });
  const loading = li || le || lj || lc;

  const myCustomer = customers.find(
    (c) => c.email && user?.email && c.email.toLowerCase() === user.email.toLowerCase()
  );
  const myJobIds = new Set(jobs.filter((j) => j.customer_id === myCustomer?.id).map((j) => j.id));
  const myInvoices = invoices.filter((i) => myJobIds.has(i.job_id));
  const myEstimates = estimates.filter((e) => myJobIds.has(e.job_id));
  const jobMap = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);

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
                  <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{j?.title || i.name || "Invoice"}</div>
                      <div className="text-sm text-muted-foreground truncate">
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
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{j?.title || e.name || "Estimate"}</div>
                      <div className="text-sm text-muted-foreground truncate">{e.name || e.number}</div>
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