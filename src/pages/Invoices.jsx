import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MobileSelect } from "@/components/ui/mobile-select";
import StatusBadge from "@/components/StatusBadge";
import OpenedIndicator from "@/components/OpenedIndicator";
import InvoicePaymentControl from "@/components/InvoicePaymentControl";
import PaidAmountLabel from "@/components/PaidAmountLabel";
import InvoicePaymentSchedule from "@/components/portal/InvoicePaymentSchedule";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/lib/invoice";
import { groupInvoicesByCustomer } from "@/lib/groupByCustomer";
import CustomerGroupHeader from "@/components/CustomerGroupHeader";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";
import { useSettings } from "@/hooks/useSettings";

export default function Invoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 200) });
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("name", 500) });
  const loading = loadingInvoices || loadingCustomers;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { settings } = useSettings();
  const [preview, setPreview] = useState(null);

  const customerMap = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const prev = invoices;
    queryClient.setQueryData(["invoices"], (old) => (old || []).filter((x) => x.id !== pendingDelete.id));
    try {
      await base44.entities.Invoice.delete(pendingDelete.id);
      toast({ description: "Invoice deleted." });
      setPendingDelete(null);
    } catch (e) {
      queryClient.setQueryData(["invoices"], prev);
      toast({ variant: "destructive", description: "Could not delete invoice." });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = invoices.filter((i) => {
    const c = customerMap[i.customer_id];
    const q = query.toLowerCase();
    const matchesQuery = !q || [i.name, i.number, c?.name].join(" ").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || i.payment_status === statusFilter || i.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const grouped = useMemo(() => groupInvoicesByCustomer(filtered, customerMap), [filtered, customerMap]);

  const outstanding = invoices.filter((i) => i.payment_status !== "paid" && i.status !== "cancelled" && i.status !== "draft").reduce((s, i) => s + ((Number(i.total) || 0) - (Number(i.amount_paid) || 0)), 0);

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
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, number, customer…" className="pl-9" />
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
            { value: "partial", label: "Partial" },
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
            {grouped.map((group) => (
              <div key={group.key}>
                <CustomerGroupHeader name={group.name} count={group.items.length} />
                {group.items.map((i) => {
                  const c = customerMap[i.customer_id];
                  return (
                    <div key={i.id} className="p-4 hover:bg-accent transition-colors">
                      <div className="flex items-center justify-between gap-3 min-h-11">
                        <button type="button" onClick={() => setPreview(i)} className="flex flex-1 items-center justify-between gap-3 min-w-0 min-h-11 -m-4 p-4 text-left">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{i.name || "Untitled invoice"}</div>
                            <div className="text-sm text-muted-foreground truncate">{i.number}{c ? ` · ${c.name}` : ""}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-sm font-medium tabular-nums">{formatMoney(i.total)}</span>
                            <PaidAmountLabel invoice={i} />
                            <OpenedIndicator opened={i.opened} lastOpenedDate={i.last_opened_date} />
                          </div>
                        </button>
                        <InvoicePaymentControl invoice={i} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => setPendingDelete(i)}
                          aria-label={`Delete ${i.name || i.number || "invoice"}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <InvoicePaymentSchedule invoice={i} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete invoice?"
        description={`"${pendingDelete?.name || pendingDelete?.number || "This invoice"}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <DocumentPreviewDialog
        doc={preview}
        kind="invoice"
        customer={preview ? customerMap[preview.customer_id] : null}
        settings={settings}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}