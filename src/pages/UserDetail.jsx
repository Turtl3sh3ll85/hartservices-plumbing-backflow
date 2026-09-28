import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, ClipboardList, Loader2, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney } from "@/lib/invoice";
import BackflowReportsAdmin from "@/components/admin/BackflowReportsAdmin";

export default function UserDetail() {
  const { id } = useParams();

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });
  const user = users.find((u) => u.id === id);
  const email = user?.email;

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["userInvoices", email],
    queryFn: () => base44.entities.Invoice.filter({ customer_email: email }),
    enabled: !!email,
  });

  const { data: estimates = [], isLoading: loadingEstimates } = useQuery({
    queryKey: ["userEstimates", email],
    queryFn: () => base44.entities.Estimate.filter({ customer_email: email }),
    enabled: !!email,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["userCustomer", email],
    queryFn: () => base44.entities.Customer.filter({ email }),
    enabled: !!email,
  });
  const customer = customers[0];

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 space-y-2">
        <p className="text-sm text-muted-foreground">User not found.</p>
        <Button asChild variant="outline" size="sm"><Link to="/users">Back to Users</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/users"><ArrowLeft className="w-4 h-4 mr-1" /> Users</Link>
        </Button>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">{user.full_name || user.email}</h1>
        <p className="text-muted-foreground text-sm mt-1">{user.email} · <span className="capitalize">{user.role}</span></p>
      </div>

      <div>
        <h2 className="font-heading font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Invoices</h2>
        {loadingInvoices ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : invoices.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No invoices.</Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="divide-y">
              {invoices.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{i.name || i.number || "Invoice"}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {i.number}{i.due_date ? ` · Due ${new Date(i.due_date).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium tabular-nums">{formatMoney(i.total)}</span>
                    <StatusBadge status={i.payment_status} />
                    <Button asChild size="sm" variant="outline"><Link to={`/invoices/${i.id}`}>Open</Link></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div>
        <h2 className="font-heading font-semibold mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Estimates</h2>
        {loadingEstimates ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : estimates.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No estimates.</Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="divide-y">
              {estimates.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.name || e.number || "Estimate"}</div>
                    <div className="text-sm text-muted-foreground truncate">{e.number}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium tabular-nums">{formatMoney(e.total)}</span>
                    <StatusBadge status={e.status} />
                    <Button asChild size="sm" variant="outline"><Link to={`/estimates/${e.id}`}>Open</Link></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {customer && <BackflowReportsAdmin customerId={customer.id} />}
    </div>
  );
}