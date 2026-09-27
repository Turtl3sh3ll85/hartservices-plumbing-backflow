import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Paperclip, Upload, Trash2, FileText, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Image } from "@/components/ui/image";

export default function InvoiceAttachments({ invoiceId, disabled = false, docLabel = "document" }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const load = async () => {
    try {
      const list = await base44.entities.InvoiceAttachment.filter({ invoice_id: invoiceId }, "-created_date", 100);
      setAttachments(list);
    } catch (e) {}
  };

  useEffect(() => { if (invoiceId) load(); }, [invoiceId]);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        const res = await base44.functions.invoke("uploadInvoiceAttachment", {
          file_uri,
          file_name: file.name,
          mime_type: file.type || "application/octet-stream",
        });
        const d = res.data || {};
        await base44.entities.InvoiceAttachment.create({
          invoice_id: invoiceId,
          file_name: file.name,
          drive_file_id: d.drive_file_id,
          drive_link: d.drive_link,
          thumbnail_url: d.thumbnail_url || "",
          mime_type: file.type || "",
          type: (file.type || "").startsWith("image/") ? "photo" : "document",
        });
      } catch (e) {
        /* skip individual failures */
      }
    }
    setUploading(false);
    load();
  };

  const remove = async (att) => {
    try {
      await base44.entities.InvoiceAttachment.delete(att.id);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    } catch (e) {}
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5"><Paperclip className="w-4 h-4" /> Attachments</Label>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading || disabled}>
          {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
          {uploading ? "Uploading…" : "Add files"}
        </Button>
      </div>

      <div
        onDragOver={(e) => { if (disabled) return; e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!disabled) handleFiles(e.dataTransfer.files); }}
        onClick={() => { if (!disabled) inputRef.current?.click(); }}
        className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${disabled ? "border-border cursor-not-allowed opacity-60" : dragOver ? "border-primary bg-primary/5 cursor-pointer" : "border-border hover:border-primary/40 cursor-pointer"}`}
      >
        <p className="text-xs text-muted-foreground">
          {disabled ? `Save the ${docLabel} first to add attachments` : "Drag & drop PDFs or images here, or click to browse"}
        </p>
      </div>

      {attachments.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
              {att.type === "photo" && att.thumbnail_url ? (
                <div className="w-12 h-12 rounded-md overflow-hidden border bg-muted shrink-0">
                  <Image src={att.thumbnail_url} alt={att.file_name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{att.file_name}</div>
                <a href={att.drive_link} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                  Open in Drive <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => remove(att)}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}