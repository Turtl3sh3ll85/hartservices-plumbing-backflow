import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { FileText, ClipboardList, Loader2, CreditCard, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney } from "@/lib/invoice";
import ReminderToggles from "@/components/portal/ReminderToggles";
import ServiceRequestForm from "@/components/portal/ServiceRequestForm";
import BackflowReports from "@/components/portal/BackflowReports";

export default function MyDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hidePaid, setHidePaid] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const { data: portal = {}, isLoading, error: portalError } = useQuery({
    queryKey: ["myPortalDocuments"],
    queryFn: async () => {
      const res = await base44.functions.invoke('getMyPortalDocuments', {});
      return res.data;
    }
  });
  const invoices = portal.invoices || [];
  const estimates = portal.estimates || [];
  const customers = portal.customers || [];
  const loading = isLoading;

  const myCustomer = useMemo(() => {
    if (customers.length === 0) return null;
    return customers.slice().sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))[0];
  }, [customers]);

  // Auto-link: if no customer record matches the signed-in user's email, create one
  // so the portal always has a linked customer record.
  useEffect(() => {
    if (loading || linking || linkFailed || myCustomer || !user?.email) return;
    setLinking(true);
    base44.entities.Customer.create({
      name: user.full_name || user.email,
      email: user.email,
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["myPortalDocuments"] }))
      .catch(() => setLinkFailed(true))
      .finally(() => setLinking(false));
  }, [loading, linking, linkFailed, myCustomer, user, queryClient]);

  const myInvoices = invoices;
  const myEstimates = estimates;
  const visibleInvoices = hidePaid ? myInvoices.filter((i) => i.payment_status !== "paid") : myInvoices;

  if (loading || linking) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!myCustomer) {
    return (
      <div className="text-center py-20 space-y-2">
        {portalError ? (
          <p className="text-destructive text-sm">Error loading documents: {portalError.message || String(portalError)}</p>
        ) : (
          <p className="text-muted-foreground">No customer record is linked to your account. Contact the business to be added.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">My documents</h1>
        <p className="text-muted-foreground text-sm mt-1">Your invoices, estimates, service requests, and reminders.</p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="font-heading font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Invoices</h2>
          {myInvoices.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
              <Switch checked={hidePaid} onCheckedChange={setHidePaid} aria-label="Hide paid invoices" />
              <span className="inline-flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Hide paid</span>
            </label>
          )}
        </div>
        {visibleInvoices.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {myInvoices.length === 0 ? "No invoices yet." : "All invoices are hidden."}
            <div className="mt-2 text-xs">[debug] user={user?.email || "none"} invoices={invoices.length} customers={customers.length} error={portalError?.message || "none"}</div>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="divide-y">
              {visibleInvoices.map((i) => {
                return (
                  <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.name || "Invoice"}</div>
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
                return (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.name || "Estimate"}</div>
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

      <ServiceRequestForm customerId={myCustomer.id} />
      <ReminderToggles customer={myCustomer} />
      <BackflowReports customerId={myCustomer.id} />
    </div>
  );
}