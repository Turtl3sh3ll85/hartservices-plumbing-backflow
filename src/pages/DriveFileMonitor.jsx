import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Inbox, Loader2, RefreshCw, CheckCircle2, Paperclip } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AttachInvoiceDialog from "@/components/AttachInvoiceDialog";
import FileLightbox from "@/components/FileLightbox";

export default function DriveFileMonitor() {
  const [attachFile, setAttachFile] = useState(null);
  const [lightboxFile, setLightboxFile] = useState(null);

  const { data: { files = [] } = {}, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["driveFolderFiles"],
    queryFn: async () => {
      const res = await base44.functions.invoke("listDriveFolderFiles", {});
      if (!res.data) throw new Error(res.error || "Failed to load files");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Inbox className="w-7 h-7" /> Drive Inbox
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Files dropped in the monitored Google Drive folder.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <Card className="p-6 text-center text-sm text-destructive">Error: {error.message}</Card>
      ) : files.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No files in the monitored folder.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((f) => (
            <Card key={f.id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setLightboxFile(f)}
                  className="shrink-0 rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition"
                  aria-label={`Enlarge ${f.name}`}
                >
                  {f.thumbnailLink ? (
                    <img src={f.thumbnailLink} alt={f.name} className="w-14 h-14 object-cover" />
                  ) : (
                    <div className="w-14 h-14 bg-muted flex items-center justify-center">
                      {f.iconLink ? <img src={f.iconLink} alt="" className="w-7 h-7" /> : <Inbox className="w-6 h-6 text-muted-foreground" />}
                    </div>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate text-sm">{f.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(f.modifiedTime).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {f.attached ? (
                <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Attached to invoice
                </div>
              ) : (
                <Button size="sm" className="w-full" onClick={() => setAttachFile(f)}>
                  <Paperclip className="w-4 h-4 mr-1" /> Attach to invoice
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {attachFile && <AttachInvoiceDialog file={attachFile} onClose={() => setAttachFile(null)} />}
      <FileLightbox file={lightboxFile} onClose={() => setLightboxFile(null)} />
    </div>
  );
}