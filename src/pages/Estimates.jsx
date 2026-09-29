import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, ClipboardList, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MobileSelect } from "@/components/ui/mobile-select";
import StatusBadge from "@/components/StatusBadge";
import OpenedIndicator from "@/components/OpenedIndicator";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/lib/invoice";
import { groupInvoicesByCustomer } from "@/lib/groupByCustomer";
import CustomerGroupHeader from "@/components/CustomerGroupHeader";

export default function Estimates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: estimates = [], isLoading: loadingEstimates } = useQuery({ queryKey: ["estimates"], queryFn: () => base44.entities.Estimate.list("-created_date", 200) });
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("name", 500) });
  const loading = loadingEstimates || loadingCustomers;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const customerMap = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const prev = estimates;
    queryClient.setQueryData(["estimates"], (old) => (old || []).filter((x) => x.id !== pendingDelete.id));
    try {
      await base44.entities.Estimate.delete(pendingDelete.id);
      toast({ description: "Estimate deleted." });
      setPendingDelete(null);
    } catch (e) {
      queryClient.setQueryData(["estimates"], prev);
      toast({ variant: "destructive", description: "Could not delete estimate." });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = estimates.filter((e) => {
    const c = customerMap[e.customer_id];
    const q = query.toLowerCase();
    const matchesQuery = !q || [e.name, e.number, c?.name].join(" ").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const grouped = useMemo(() => groupInvoicesByCustomer(filtered, customerMap), [filtered, customerMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Estimates</h1>
        <Button asChild><Link to="/estimates/new"><Plus className="w-4 h-4 mr-1" /> New estimate</Link></Button>
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
        <EmptyState icon={ClipboardList} title="No estimates found" description="Create an estimate for a customer, then convert it to an invoice when approved." action={<Button asChild><Link to="/estimates/new"><Plus className="w-4 h-4 mr-1" /> New estimate</Link></Button>} />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y">
            {grouped.map((group) => (
              <div key={group.key}>
                <CustomerGroupHeader name={group.name} count={group.items.length} />
                {group.items.map((e) => {
                  const c = customerMap[e.customer_id];
                  return (
                    <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11 hover:bg-accent transition-colors">
                      <Link to={`/estimates/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 flex-1 min-w-0 min-h-11 -m-4 p-4">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{e.name || e.number || "Untitled estimate"}</div>
                          <div className="text-sm text-muted-foreground truncate">{e.number}{c ? ` · ${c.name}` : ""}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium tabular-nums">{formatMoney(e.total)}</span>
                            <StatusBadge status={e.status} />
                          </div>
                          <OpenedIndicator opened={e.opened} lastOpenedDate={e.last_opened_date} />
                        </div>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setPendingDelete(e)}
                        aria-label={`Delete ${e.name || e.number || "estimate"}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
        title="Delete estimate?"
        description={`"${pendingDelete?.name || pendingDelete?.number || "This estimate"}" will be permanently deleted. This cannot be undone.`}
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