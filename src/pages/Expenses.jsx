import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Receipt, Loader2, Upload, Trash2, DollarSign, Tag, FileText, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { parseExpensesCsv } from "@/lib/parseExpensesCsv";
import ConfirmDialog from "@/components/ConfirmDialog";

const CATEGORIES = [
  "Materials", "Labor", "Subcontractor", "Equipment", "Fuel", "Vehicle",
  "Office Supplies", "Software", "Travel", "Meals", "Insurance", "Utilities", "Other",
];

const fmt = (n) => (n ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD" });

export default function Expenses() {
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date", 500),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-for-assign"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const invoiceMap = {};
  invoices.forEach((i) => { invoiceMap[i.id] = i; });

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseExpensesCsv(text);
      if (!rows.length) {
        toast({ title: "No rows found", description: "Couldn't parse any expenses from this file.", variant: "destructive" });
        return;
      }
      await base44.entities.Expense.bulkCreate(rows.map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        vendor: r.vendor || "",
        category: "",
        invoice_id: "",
        source: "wave_csv",
      })));
      toast({ description: `Imported ${rows.length} expenses.` });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const updateField = async (id, patch) => {
    setUpdating(id);
    try {
      await base44.entities.Expense.update(id, patch);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async () => {
    const exp = deleteTarget;
    if (!exp) return;
    setDeleting(exp.id);
    try {
      await base44.entities.Expense.delete(exp.id);
      toast({ description: "Expense deleted." });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const uncategorized = expenses.filter((e) => !e.category).length;
  const unassigned = expenses.filter((e) => !e.invoice_id).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7" /> Expenses
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Import expenses from a Wave CSV export, then categorize and assign to invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <a
            href="https://my.waveapps.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="In Wave: top-right business name → Business settings → Data Export → Accounting. You'll get an email with the CSV."
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4"
          >
            <ExternalLink className="w-4 h-4" /> Open Wave
          </a>
          <Button onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />} Import CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Receipt className="w-3.5 h-3.5" /> Total Expenses</div>
          <div className="text-xl font-semibold mt-1">{expenses.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Total Amount</div>
          <div className="text-xl font-semibold mt-1">{fmt(total)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Uncategorized</div>
          <div className="text-xl font-semibold mt-1">{uncategorized}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Unassigned</div>
          <div className="text-xl font-semibold mt-1">{unassigned}</div>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : expenses.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No expenses yet. Click "Import CSV" to upload a Wave transaction export.</Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <Card key={e.id} className="p-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm break-words leading-snug">{e.description || "(no description)"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 items-center">
                      {e.date && <span>{new Date(e.date).toLocaleDateString()}</span>}
                      {e.vendor && <span>· {e.vendor}</span>}
                      <span className="font-medium text-foreground">{fmt(e.amount)}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive min-h-11 sm:min-h-9"
                    onClick={() => setDeleteTarget(e)}
                    disabled={deleting === e.id}
                    aria-label="Delete expense"
                  >
                    {deleting === e.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                    <Select
                      value={e.category || "none"}
                      onValueChange={(v) => updateField(e.id, { category: v === "none" ? "" : v })}
                      disabled={updating === e.id}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Invoice</label>
                    <Select
                      value={e.invoice_id || "none"}
                      onValueChange={(v) => updateField(e.id, { invoice_id: v === "none" ? "" : v })}
                      disabled={updating === e.id}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="Assign to invoice" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {invoices.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name}{i.number ? ` #${i.number}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete expense?"
        description={`"${deleteTarget?.description || "This expense"}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}