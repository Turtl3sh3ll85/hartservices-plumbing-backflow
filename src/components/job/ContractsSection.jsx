import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, FileText, Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MobileSelect } from "@/components/ui/mobile-select";
import FileUpload from "@/components/FileUpload";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/lib/invoice";

const statuses = ["draft", "sent", "signed", "declined"];
const blank = { title: "", file_uri: "", file_name: "", amount: 0, status: "draft", signed_date: "", notes: "" };

export default function ContractsSection({ job, contracts, reload }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const { toast } = useToast();

  const startNew = () => { setForm(blank); setOpen(true); };

  const onUploaded = async ({ file_uri, file_name }) => {
    setForm((f) => ({ ...f, file_uri, file_name, title: f.title || file_name.replace(/\.[^.]+$/, "") }));
  };

  const save = async () => {
    if (!form.title || !form.file_uri) { toast({ description: "Add a title and a contract file." }); return; }
    await base44.entities.Contract.create({ ...form, job_id: job.id });
    setOpen(false);
    reload();
  };

  const remove = async (c) => { if (confirm("Delete contract?")) { await base44.entities.Contract.delete(c.id); reload(); } };
  const setStatus = async (c, status) => { await base44.entities.Contract.update(c.id, { status, signed_date: status === "signed" ? new Date().toISOString().slice(0, 10) : c.signed_date }); reload(); };

  const viewFile = async (c) => {
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: c.file_uri });
      window.open(signed_url, "_blank");
    } catch (e) { toast({ title: "Error", description: "Could not open file: " + e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={startNew} size="sm"><Plus className="w-4 h-4 mr-1" /> Attach contract</Button></div>
      {contracts.length === 0 ? (
        <EmptyState icon={FileText} title="No contracts" description="Upload a contract document (PDF, DOC, or image) for this job." />
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-primary" /></div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.file_name}</div>
                    {c.amount > 0 && <div className="text-sm mt-0.5 tabular-nums">{formatMoney(c.amount)}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MobileSelect
                    value={c.status}
                    onValueChange={(v) => setStatus(c, v)}
                    placeholder="Status"
                    triggerClassName="h-8 w-[120px]"
                    ariaLabel="Contract status"
                    options={statuses.map((s) => ({ value: s, label: s }))}
                  />
                  <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 select-none" onClick={() => viewFile(c)} aria-label="Download contract"><Download className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 select-none" onClick={() => remove(c)} aria-label="Delete contract"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Attach contract</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Contract file</Label>{form.file_uri ? <div className="text-sm text-emerald-600 flex items-center gap-1.5">✓ {form.file_name}</div> : <FileUpload type="document" onUploaded={onUploaded} label="Upload contract" />}</div>
            <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Amount</Label><Input type="number" min="0" step="0.01" value={form.amount ?? 0} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
              <div className="space-y-1.5"><Label>Status</Label><MobileSelect value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} placeholder="Status" ariaLabel="Contract status" options={statuses.map((s) => ({ value: s, label: s }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save contract</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}