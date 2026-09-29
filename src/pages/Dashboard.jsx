import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, DollarSign, TrendingUp, ArrowRight, Users, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import OpenedIndicator from "@/components/OpenedIndicator";
import InvoicePaymentControl from "@/components/InvoicePaymentControl";
import PaidAmountLabel from "@/components/PaidAmountLabel";
import InvoicePaymentSchedule from "@/components/portal/InvoicePaymentSchedule";
import { formatMoney } from "@/lib/invoice";
import { groupInvoicesByCustomer } from "@/lib/groupByCustomer";
import CustomerGroupHeader from "@/components/CustomerGroupHeader";

export default function Dashboard() {
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({ queryKey: ["invoices", "recent"], queryFn: () => base44.entities.Invoice.list("-created_date", 50) });
  const { data: estimates = [], isLoading: loadingEstimates } = useQuery({ queryKey: ["estimates", "recent"], queryFn: () => base44.entities.Estimate.list("-created_date", 20) });
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({ queryKey: ["customers", "count"], queryFn: () => base44.entities.Customer.list("name", 500) });
  const loading = loadingInvoices || loadingEstimates || loadingCustomers;

  const outstandingInvoices = invoices
    .filter((i) => i.payment_status !== "paid" && i.status !== "cancelled" && i.status !== "draft");

  const outstanding = outstandingInvoices
    .reduce((s, i) => s + ((Number(i.total) || 0) - (Number(i.amount_paid) || 0)), 0);

  const now = new Date();
  const paidThisMonth = invoices
    .filter((i) => i.payment_status === "paid" && i.paid_date && new Date(i.paid_date).getMonth() === now.getMonth() && new Date(i.paid_date).getFullYear() === now.getFullYear())
    .reduce((s, i) => s + (Number(i.amount_paid) || Number(i.total) || 0), 0);

  const customerMap = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const groupedOutstanding = useMemo(
    () => groupInvoicesByCustomer(outstandingInvoices.slice(0, 6), customerMap),
    [outstandingInvoices, customerMap]
  );

  const stats = [
    { label: "Outstanding", value: formatMoney(outstanding), icon: DollarSign, tint: "text-amber-600" },
    { label: "Paid this month", value: formatMoney(paidThisMonth), icon: TrendingUp, tint: "text-emerald-600" },
    { label: "Customers", value: customers.length, icon: Users, tint: "text-blue-600" },
    { label: "Total invoices", value: invoices.length, icon: FileText, tint: "text-foreground" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Track estimates and invoices for your plumbing business.</p>
        </div>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <h2 className="font-heading font-semibold">Outstanding invoices</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/invoices">View all <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : outstandingInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No outstanding invoices.</p>
          ) : (
            <div className="space-y-3">
              {groupedOutstanding.map((group) => (
                <div key={group.key} className="space-y-1">
                  <CustomerGroupHeader name={group.name} count={group.items.length} />
                  {group.items.map((i) => (
                    <div key={i.id} className="p-2.5 rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center justify-between gap-3 min-h-11">
                        <Link to={`/invoices/${i.id}`} className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{i.name || i.number}</div>
                          <div className="text-xs text-muted-foreground">{i.number}</div>
                        </Link>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium tabular-nums">{formatMoney(i.total)}</span>
                            <InvoicePaymentControl invoice={i} />
                          </div>
                          <PaidAmountLabel invoice={i} />
                          <OpenedIndicator opened={i.opened} lastOpenedDate={i.last_opened_date} />
                        </div>
                      </div>
                      <InvoicePaymentSchedule invoice={i} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold">Recent estimates</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/estimates">View all <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : estimates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No estimates yet.</p>
          ) : (
            <div className="space-y-2">
              {estimates.slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-2.5 min-h-11 rounded-lg hover:bg-accent transition-colors">
                  <Link to={`/estimates/${e.id}`} className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{e.name || e.number || "Untitled estimate"}</div>
                    <div className="text-xs text-muted-foreground">{e.number}</div>
                  </Link>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium tabular-nums">{formatMoney(e.total)}</span>
                      <StatusBadge status={e.status} />
                    </div>
                    <OpenedIndicator opened={e.opened} lastOpenedDate={e.last_opened_date} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}