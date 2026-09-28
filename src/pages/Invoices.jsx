import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, FileText, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MobileSelect } from "@/components/ui/mobile-select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import StatusBadge from "@/components/StatusBadge";
import OpenedIndicator from "@/components/OpenedIndicator";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/lib/invoice";

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

  const outstanding = invoices.filter((i) => i.payment_status !== "paid" && i.status !== "cancelled" && i.status !== "draft").reduce((s, i) => s + (Number(i.total) || 0), 0);

  const markPaidByCheck = async (invoice) => {
    const today = new Date().toISOString().slice(0, 10);
    const prev = invoices;
    queryClient.setQueryData(["invoices"], (old) => (old || []).map((x) => x.id === invoice.id ? { ...x, payment_status: "paid", status: "paid", amount_paid: x.total, paid_date: today } : x));
    try {
      await base44.entities.Invoice.update(invoice.id, {
        payment_status: "paid",
        status: "paid",
        amount_paid: invoice.total,
        paid_date: today,
      });
      toast({ description: "Marked paid by check." });
    } catch (e) {
      queryClient.setQueryData(["invoices"], prev);
      toast({ variant: "destructive", description: "Could not mark invoice paid." });
    }
  };

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
              const c = customerMap[i.customer_id];
              return (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11 hover:bg-accent transition-colors">
                  <Link to={`/invoices/${i.id}`} className="flex flex-wrap items-center justify-between gap-3 flex-1 min-w-0 min-h-11 -m-4 p-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.name || "Untitled invoice"}</div>
                      <div className="text-sm text-muted-foreground truncate">{i.number}{c ? ` · ${c.name}` : ""}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium tabular-nums">{formatMoney(i.total)}</span>
                        {i.payment_status === "paid" ? (
                        <StatusBadge status="paid" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center rounded-full hover:opacity-80 transition-opacity cursor-pointer min-h-11 sm:min-h-0"
                              title="Click to mark paid"
                              aria-label={`Mark ${i.name || i.number || "invoice"} as paid`}
                            >
                              <StatusBadge status={i.payment_status} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => markPaidByCheck(i)}>
                              <CheckCircle className="w-4 h-4 mr-2" /> Mark paid (check)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      </div>
                      <OpenedIndicator opened={i.opened} lastOpenedDate={i.last_opened_date} />
                    </div>
                  </Link>
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
              );
            })}
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
    </div>
  );
}