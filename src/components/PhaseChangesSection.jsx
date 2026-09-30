import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, GitBranch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/invoice";
import { useSettings } from "@/hooks/useSettings";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";

export default function PhaseChangesSection() {
  const { settings } = useSettings();
  const [preview, setPreview] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", "phaseChanges"],
    queryFn: () => base44.entities.Invoice.list("-phase_changed_date", 100),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "forPhases"],
    queryFn: () => base44.entities.Customer.list("name", 500),
  });

  const customerMap = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  const recent = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return invoices
      .filter((i) => i.phase_changed_date && i.phase && new Date(i.phase_changed_date) >= cutoff)
      .sort((a, b) => new Date(b.phase_changed_date) - new Date(a.phase_changed_date));
  }, [invoices]);

  const previewCustomer = preview ? customerMap[preview.customer_id] : null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold flex items-center gap-2"><GitBranch className="w-4 h-4" /> Recent phase changes</h2>
        <span className="text-xs text-muted-foreground">{recent.length} in last 30 days</span>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : recent.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No phase changes in the last 30 days.</p>
      ) : (
        <div className="space-y-2">
          {recent.map((i) => (
            <button key={i.id} type="button" onClick={() => setPreview(i)} className="w-full text-left p-2.5 rounded-lg hover:bg-accent transition-colors min-h-11">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{i.name || i.number}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {i.number} · {new Date(i.phase_changed_date).toLocaleDateString()}
                  </div>
                  {i.phase_note && <div className="text-xs text-muted-foreground truncate italic">“{i.phase_note}”</div>}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-medium text-primary truncate max-w-[150px]">{i.phase}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatMoney(i.total)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <DocumentPreviewDialog
        doc={preview}
        kind="invoice"
        customer={previewCustomer}
        settings={settings}
        onClose={() => setPreview(null)}
      />
    </Card>
  );
}