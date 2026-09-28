import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Inbox, Loader2, RefreshCw, CheckCircle2, Paperclip, Unlink, Trash2, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import AttachInvoiceDialog from "@/components/AttachInvoiceDialog";
import FileLightbox from "@/components/FileLightbox";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function DriveFileMonitor() {
  const [attachFile, setAttachFile] = useState(null);
  const [lightboxFile, setLightboxFile] = useState(null);
  const [unattaching, setUnattaching] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [togglingTruck, setTogglingTruck] = useState(null);
  const { toast } = useToast();

  const handleUnattach = async (f) => {
    setUnattaching(f.id);
    try {
      const res = await base44.functions.invoke("unattachDriveFile", { drive_file_id: f.id });
      if (res.error) throw new Error(res.error);
      toast({ description: "File unattached from invoice." });
      await refetch();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUnattaching(null);
    }
  };

  const handleDelete = async () => {
    const f = deleteTarget;
    if (!f) return;
    setDeleting(f.id);
    try {
      const res = await base44.functions.invoke("deleteDriveFile", { drive_file_id: f.id });
      if (res.error) throw new Error(res.error);
      toast({ description: "File deleted from Drive." });
      await refetch();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  const handleToggleTruckstock = async (f) => {
    setTogglingTruck(f.id);
    try {
      const res = await base44.functions.invoke("setDriveFileTruckstock", { drive_file_id: f.id, truckstock: !f.truckstock });
      if (res.error) throw new Error(res.error);
      toast({ description: f.truckstock ? "Removed truck stock mark." : "Marked as truck stock." });
      await refetch();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setTogglingTruck(null);
    }
  };

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
        <div className="space-y-2">
          {files.map((f) => (
            <Card key={f.id} className="p-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLightboxFile(f)}
                  className="shrink-0 rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition"
                  aria-label={`Enlarge ${f.name}`}
                >
                  {f.thumbnailLink ? (
                    <img src={f.thumbnailLink} alt={f.name} className="w-12 h-12 object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-muted flex items-center justify-center">
                      {f.iconLink ? <img src={f.iconLink} alt="" className="w-6 h-6" /> : <Inbox className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm break-words leading-snug">{f.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(f.modifiedTime).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className={`min-h-11 sm:min-h-8 ${f.truckstock ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400" : ""}`}
                    onClick={() => handleToggleTruckstock(f)}
                    disabled={togglingTruck === f.id}
                    aria-label={f.truckstock ? "Remove truck stock mark" : "Mark as truck stock"}
                    title={f.truckstock ? "Marked as truck stock" : "Mark as truck stock"}
                  >
                    {togglingTruck === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                    <span className="hidden sm:inline ml-1">{f.truckstock ? "Truck stock" : "Mark truck stock"}</span>
                  </Button>
                  {f.attached ? (
                    <>
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" /> Attached
                      </span>
                      <Button size="sm" variant="outline" className="min-h-11 sm:min-h-8" onClick={() => setAttachFile(f)}>
                        <Paperclip className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Attach to another</span>
                      </Button>
                      <Button size="sm" variant="outline" className="min-h-11 sm:min-h-8" onClick={() => handleUnattach(f)} disabled={unattaching === f.id} aria-label="Unattach from invoice">
                        {unattaching === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                        <span className="hidden sm:inline ml-1">Unattach</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="min-h-11 sm:min-h-8" onClick={() => setAttachFile(f)}>
                        <Paperclip className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Attach</span>
                      </Button>
                      <Button size="sm" variant="outline" className="min-h-11 sm:min-h-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(f)} disabled={deleting === f.id} aria-label="Delete file">
                        {deleting === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        <span className="hidden sm:inline ml-1">Delete</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {attachFile && <AttachInvoiceDialog file={attachFile} onClose={() => setAttachFile(null)} />}
      <FileLightbox file={lightboxFile} onClose={() => setLightboxFile(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete file from Drive?"
        description={`"${deleteTarget?.name}" will be permanently deleted from the monitored Google Drive folder.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}