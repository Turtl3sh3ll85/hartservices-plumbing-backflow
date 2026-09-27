import { Link } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { formatMoney } from "@/lib/invoice";

export default function InvoicesSection({ job, invoices, reload }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button asChild size="sm"><Link to={`/invoices/new?job=${job.id}`}><Plus className="w-4 h-4 mr-1" /> New invoice</Link></Button>
      </div>
      {invoices.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices" description="Create an invoice named after the tasks performed on this job." />
      ) : (
        <div className="space-y-2">
          {invoices.map((i) => (
            <Link key={i.id} to={`/invoices/${i.id}`}>
              <Card className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-accent transition-colors">
                <div className="min-w-0">
                  <div className="font-medium truncate">{i.name || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground">{i.number}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium tabular-nums">{formatMoney(i.total)}</span>
                  <StatusBadge status={i.payment_status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}