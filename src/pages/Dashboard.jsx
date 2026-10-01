import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowLeftRight, Clock, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import InvoiceListItem from "@/components/InvoiceListItem";
import CustomerGroupedList from "@/components/CustomerGroupedList";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, amountPaidTotal, paymentAmounts } from "@/lib/format";

const STAFF_ROLES = ["admin", "accountant", "tech"];

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ outstanding: 0, overdue: 0, unmatched: 0, readyNext: 0 });
  const [recent, setRecent] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [previewInv, setPreviewInv] = useState(null);
  const canMarkPaidByCheck = STAFF_ROLES.includes(user?.role);
  const canUnmarkPaid = ["admin", "accountant"].includes(user?.role);

  useEffect(() => {
    (async () => {
      try {
        const [invoices, txs, custs] = await Promise.all([
          base44.entities.Invoice.list('-created_date', 50),
          base44.entities.Transaction.list('-date', 200).catch(() => []),
          base44.entities.Customer.list('-created_date', 200),
        ]);
        const outstanding = invoices.reduce((s, inv) => s + Math.max(0, (inv.total || 0) - amountPaidTotal(inv.payment_schedule, inv.total)), 0);
        const today = new Date().toISOString().slice(0, 10);
        const overdue = invoices.filter((i) => i.due_date && i.due_date < today && i.payment_status !== 'paid').length;
        const unmatched = txs.filter((t) => t.matched === 'unmatched').length;
        const readyNext = invoices.filter((i) => i.customer_ready_for_next_stage).length;
        setStats({ outstanding, overdue, unmatched, readyNext });
        setRecent(invoices.slice(0, 6));
        setCustomers(custs);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setStatus = async (inv, status, index) => {
    try {
      const response = await base44.functions.invoke("setCustomerPortalInvoiceStatus", {
        invoice_id: inv.id, status, schedule_index: index,
      });
      if (response.data?.error || !response.data?.invoice) throw new Error(response.data?.error || "Could not save status");
      const saved = response.data.invoice;
      setRecent((items) => items.map((item) => item.id === saved.id ? saved : item));
      setPreviewInv((item) => item?.id === saved.id ? saved : item);
      setStats((current) => ({ ...current, readyNext: current.readyNext + Number(!!saved.customer_ready_for_next_stage) - Number(!!inv.customer_ready_for_next_stage) }));
    } catch (error) {
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
    }
  };

  const markPaidByCheck = async (inv, idx) => {
    const schedule = (inv.payment_schedule && inv.payment_schedule.length > 0)
      ? inv.payment_schedule
      : [{ label: "Payment due", type: "amount", value: Number(inv.total) || 0, paid: false }];
    const nextIdx = idx != null ? idx : schedule.findIndex((p) => !p.paid);
    if (nextIdx === -1 || schedule[nextIdx]?.paid) return;
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
    setRecent((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...patch } : i)));
    setPreviewInv((p) => (p?.id === inv.id ? { ...p, ...patch } : p));
    try {
      await base44.entities.Invoice.update(inv.id, patch);
      toast({ title: "Marked paid by check" });
    } catch (e) {
      setRecent((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...prev } : i)));
      setPreviewInv((p) => (p?.id === inv.id ? { ...p, ...prev } : p));
      toast({ title: "Could not mark paid", variant: "destructive" });
    }
  };

  const deleteInvoice = async (inv) => {
    if (!window.confirm(`Delete invoice "${inv.name || inv.number || "Invoice"}"? This cannot be undone.`)) return;
    const prev = recent;
    setRecent((items) => items.filter((i) => i.id !== inv.id));
    setPreviewInv((p) => (p?.id === inv.id ? null : p));
    try {
      await base44.entities.Invoice.delete(inv.id);
      toast({ title: "Invoice deleted" });
    } catch (e) {
      setRecent(prev);
      toast({ title: "Could not delete invoice", variant: "destructive" });
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
    setRecent((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...patch } : i)));
    setPreviewInv((p) => (p?.id === inv.id ? { ...p, ...patch } : p));
    try {
      await base44.entities.Invoice.update(inv.id, patch);
      toast({ title: "Removed paid status" });
    } catch (e) {
      setRecent((prevItems) => prevItems.map((i) => (i.id === inv.id ? { ...i, ...prev } : i)));
      setPreviewInv((p) => (p?.id === inv.id ? { ...p, ...prev } : p));
      toast({ title: "Could not update status", variant: "destructive" });
    }
  };

  const cards = [
    { label: 'Outstanding', value: formatCurrency(stats.outstanding), icon: FileText, tone: 'text-primary' },
    { label: 'Overdue invoices', value: stats.overdue, icon: AlertCircle, tone: 'text-destructive' },
    { label: 'Unmatched transactions', value: stats.unmatched, icon: ArrowLeftRight, tone: 'text-amber-600' },
    { label: 'Ready for next stage', value: stats.readyNext, icon: Clock, tone: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back{user?.full_name ? `, ${user.full_name}` : ''}.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <c.icon className={`w-4 h-4 ${c.tone}`} />
              </div>
              <div className="mt-2 text-xl font-semibold">{loading ? '…' : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-heading font-semibold">Recent invoices</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/invoices">View all</Link>
          </Button>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : recent.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No invoices yet.</CardContent></Card>
        ) : (
          <CustomerGroupedList
            items={recent}
            customers={customers}
            renderItem={({ item: inv }) => (
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
            )}
          />
        )}
      </div>

      <DocumentPreviewDialog
        doc={previewInv}
        kind="invoice"
        customer={customers.find((c) => c.id === previewInv?.customer_id)}
        settings={settings}
        onClose={() => setPreviewInv(null)}
      />
    </div>
  );
}