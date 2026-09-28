import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, Upload, Loader2, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function BackflowReportsAdmin({ customerId }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ title: "", test_date: "", notes: "" });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["backflowReports", customerId],
    queryFn: () => base44.entities.BackflowTestReport.filter({ customer_id: customerId }),
    enabled: !!customerId,
  });

  const reset = () => {
    setForm({ title: "", test_date: "", notes: "" });
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!form.title.trim()) { toast({ description: "Add a report title." }); return; }
    if (!file) { toast({ description: "Choose a file to upload." }); return; }
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await base44.entities.BackflowTestReport.create({
        customer_id: customerId,
        title: form.title.trim(),
        test_date: form.test_date || undefined,
        file_uri,
        file_name: file.name,
        notes: form.notes || undefined,
      });
      toast({ title: "Report uploaded", description: "The backflow test report was saved." });
      reset();
      qc.invalidateQueries({ queryKey: ["backflowReports", customerId] });
    } catch (e) {
      toast({ variant: "destructive", title: "Upload failed", description: e.message });
    }
    setUploading(false);
  };

  const download = async (r) => {
    if (!r.file_uri) return;
    setDownloading(r.id);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: r.file_uri });
      window.open(signed_url, "_blank");
    } catch (e) { /* ignore */ }
    setDownloading(null);
  };

  return (
    <div>
      <h2 className="font-heading font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Backflow test reports</h2>

      <Card className="p-4 space-y-3 mb-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Report title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Annual backflow test" />
          </div>
          <div className="space-y-1.5">
            <Label>Test date</Label>
            <Input type="date" value={form.test_date} onChange={(e) => setForm({ ...form, test_date: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
        </div>
        <div className="space-y-1.5">
          <Label>Report file</Label>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent" />
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={submit} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
            {uploading ? "Uploading…" : "Upload report"}
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : reports.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No backflow test reports on file yet.</Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y">
            {reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.title || r.file_name || "Report"}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {r.test_date ? new Date(r.test_date).toLocaleDateString() : ""}{r.file_name ? ` · ${r.file_name}` : ""}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(r)} disabled={!r.file_uri || downloading === r.id}>
                  {downloading === r.id ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                  Download
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}