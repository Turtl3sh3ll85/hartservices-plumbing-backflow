import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import CustomerGroupHeader from "@/components/CustomerGroupHeader";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";
import InvoiceListItem from "@/components/InvoiceListItem";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/components/ui/use-toast";
import { amountPaidTotal, paymentAmounts } from "@/lib/format";

const STAFF_ROLES = ["admin", "accountant", "tech"];

export default function Invoices() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [previewInv, setPreviewInv] = useState(null);
  const canMarkPaidByCheck = STAFF_ROLES.includes(user?.role);
  const canUnmarkPaid = ["admin", "accountant"].includes(user?.role);

  const setStatus = async (inv, status) => {
    const prev = {
      standing_by: inv.standing_by,
      customer_ready_for_next_stage: inv.customer_ready_for_next_stage,
      ready_for_next_stage_date: inv.ready_for_next_stage_date,
    };
    const patch = {
      customer_ready_for_next_stage: status === "ready",
      standing_by: status !== "due",
      ready_for_next_stage_date: status === "ready" ? new Date().toISOString() : null,
    };
    setItems((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...patch } : i)));
    try {
      await base44.entities.Invoice.update(inv.id, patch);
    } catch (e) {
      setItems((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...prev } : i)));
      toast({ title: "Could not update status", variant: "destructive" });
    }
  };

  const markPaidByCheck = async (inv) => {
    const schedule = (inv.payment_schedule && inv.payment_schedule.length > 0)
      ? inv.payment_schedule
      : [{ label: "Payment due", type: "amount", value: Number(inv.total) || 0, paid: false }];
    const nextIdx = schedule.findIndex((p) => !p.paid);
    if (nextIdx === -1) return;
    const prev = { payment_schedule: inv.payment_schedule, payment_status: inv.payment_status, amount_paid: inv.amount_paid, paid_date: inv.paid_date, payment_method: inv.payment_method, status: inv.status };
    const updatedSchedule = schedule.map((p, i) => (i === nextIdx ? { ...p, paid: true } : p));
    const amounts = paymentAmounts(updatedSchedule, inv.total);
    const amountPaid = updatedSchedule.reduce((sum, p, i) => sum + (p.paid ? amounts[i] : 0), 0);
    const allPaid = updatedSchedule.every((p) => p.paid);
    const patch = {
      payment_schedule: updatedSchedule,
      amount_paid: amountPaid,
      payment_status: allPaid ? "paid" : "partial",
      payment_method: "check",
      paid_date: allPaid ? new Date().toISOString().slice(0, 10) : inv.paid_date,
      status: allPaid ? "paid" : inv.status,
    };
    setItems((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...patch } : i)));
    try {
      await base44.entities.Invoice.update(inv.id, patch);
      toast({ title: "Marked paid by check" });
    } catch (e) {
      setItems((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...prev } : i)));
      toast({ title: "Could not mark paid", variant: "destructive" });
    }
  };

  const unmarkPaid = async (inv, index) => {
    const schedule = (inv.payment_schedule && inv.payment_schedule.length > 0)
      ? inv.payment_schedule
      : [{ label: "Payment due", type: "amount", value: Number(inv.total) || 0, paid: false }];
    const prev = { payment_schedule: inv.payment_schedule, payment_status: inv.payment_status, amount_paid: inv.amount_paid, paid_date: inv.paid_date, payment_method: inv.payment_method, status: inv.status };
    const updatedSchedule = schedule.map((p, i) => (i === index ? { ...p, paid: false } : p));
    const amounts = paymentAmounts(updatedSchedule, inv.total);
    const amountPaid = updatedSchedule.reduce((sum, p, i) => sum + (p.paid ? amounts[i] : 0), 0);
    const anyPaid = updatedSchedule.some((p) => p.paid);
    const patch = {
      payment_schedule: updatedSchedule,
      amount_paid: amountPaid,
      payment_status: anyPaid ? "partial" : "unpaid",
      paid_date: anyPaid ? inv.paid_date : null,
      status: inv.status === "paid" ? "sent" : inv.status,
    };
    setItems((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...patch } : i)));
    try {
      await base44.entities.Invoice.update(inv.id, patch);
      toast({ title: "Removed paid status" });
    } catch (e) {
      setItems((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...prev } : i)));
      toast({ title: "Could not update status", variant: "destructive" });
    }
  };

  const deleteInvoice = async (inv) => {
    if (!window.confirm(`Delete invoice "${inv.name || inv.number || "Untitled"}"? This cannot be undone.`)) return;
    setItems((prev) => prev.filter((i) => i.id !== inv.id));
    setPreviewInv(null);
    try {
      await base44.entities.Invoice.delete(inv.id);
      toast({ title: "Invoice deleted" });
    } catch (e) {
      toast({ title: "Delete failed", variant: "destructive" });
      const list = await base44.entities.Invoice.list('-created_date', 200);
      setItems(list);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [list, custs] = await Promise.all([
          base44.entities.Invoice.list('-created_date', 200),
          base44.entities.Customer.list('-created_date', 200),
        ]);
        setItems(list);
        setCustomers(custs);
      } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  const customerName = (id) => {
    const c = customers.find((c) => c.id === id);
    return c?.name || c?.company || "Unknown customer";
  };

  const filtered = items.filter((i) => {
    const q = query.toLowerCase();
    return !q || (i.name || '').toLowerCase().includes(q) || (i.number || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-semibold tracking-tight">Invoices</h1>
        <Button asChild size="sm"><Link to="/invoices/new"><Plus className="w-4 h-4" /> New invoice</Link></Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices" className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No invoices found.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(
            filtered.reduce((acc, inv) => {
              const key = inv.customer_id || "unknown";
              (acc[key] ||= []).push(inv);
              return acc;
            }, {})
          ).map(([cid, group]) => (
            <div key={cid} className="rounded-lg border bg-card overflow-hidden">
              <CustomerGroupHeader name={customerName(cid)} count={group.length} />
              <div className="divide-y">
                {group.map((inv) => (
                  <InvoiceListItem
                    key={inv.id}
                    inv={inv}
                    onPreview={setPreviewInv}
                    onStatusChange={setStatus}
                    onMarkPaidByCheck={markPaidByCheck}
                    onUnmarkPaid={unmarkPaid}
                    canMarkPaidByCheck={canMarkPaidByCheck}
                    canUnmarkPaid={canUnmarkPaid}
                    onDelete={deleteInvoice}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <DocumentPreviewDialog
        doc={previewInv}
        kind="invoice"
        customer={customers.find((c) => c.id === previewInv?.customer_id)}
        settings={settings}
        onClose={() => setPreviewInv(null)}
        onDelete={previewInv ? () => deleteInvoice(previewInv) : undefined}
      />
    </div>
  );
}