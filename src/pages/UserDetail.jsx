import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, ClipboardList, Loader2, ArrowLeft, Contact } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney } from "@/lib/invoice";
import BackflowReportsAdmin from "@/components/admin/BackflowReportsAdmin";
import BillTo from "@/components/BillTo";
import GoogleContactsDialog from "@/components/GoogleContactsDialog";
import { useToast } from "@/components/ui/use-toast";

export default function UserDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [contactsOpen, setContactsOpen] = useState(false);

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

  const linkGoogleContact = async (c) => {
    if (!email) return;
    let cust = customers.find((cu) => cu.email && cu.email.toLowerCase() === email.toLowerCase());
    const updates = { company: c.company || "", phone: c.phone || (cust?.phone || "") };
    if (cust) {
      cust = await base44.entities.Customer.update(cust.id, updates);
    } else {
      cust = await base44.entities.Customer.create({ name: c.name || user.full_name || email, email, ...updates });
    }
    queryClient.setQueryData(["userCustomer", email], [cust]);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    toast({ description: "Linked to Google Contact." });
  };

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

      <div className="flex items-start justify-between gap-3 flex-wrap">
        {customer ? (
          <div className="bg-card rounded-2xl shadow-sm border p-6 text-sm flex-1 min-w-0">
            <BillTo customer={customer} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No customer record linked to this user yet.</p>
        )}
        <Button variant="outline" size="sm" onClick={() => setContactsOpen(true)} className="shrink-0">
          <Contact className="w-4 h-4" /> Link Google Contact
        </Button>
      </div>

      <GoogleContactsDialog open={contactsOpen} onOpenChange={setContactsOpen} onPick={linkGoogleContact} />

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