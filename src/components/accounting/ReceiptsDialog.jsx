import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Folder, FileText, Check, ExternalLink } from "lucide-react";

export default function ReceiptsDialog({ open, onClose, onPick, title }) {
  const queryClient = useQueryClient();
  const isPickMode = !!onPick;

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await base44.entities.Settings.list())[0],
    enabled: open,
  });
  const folderId = settings?.receipts_folder_id;

  const { data: files = [], isLoading: loadingFiles } = useQuery({
    queryKey: ["driveReceipts", folderId],
    queryFn: async () => {
      const res = await base44.functions.invoke("listDriveReceipts", { folder_id: folderId });
      return res.data?.files || [];
    },
    enabled: open && !!folderId,
  });

  const { data: folders = [], isLoading: loadingFolders } = useQuery({
    queryKey: ["driveFolders"],
    queryFn: async () => {
      const res = await base44.functions.invoke("listDriveReceipts", {});
      return res.data?.folders || [];
    },
    enabled: open && !folderId,
  });

  const saveFolder = async (id) => {
    if (!settings) return;
    await base44.entities.Settings.update(settings.id, { receipts_folder_id: id });
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title || "Receipts"}</DialogTitle>
          <DialogDescription>
            {folderId
              ? isPickMode
                ? "Pick a receipt to pin to this transaction."
                : "Files from your Google Drive receipts folder."
              : "Pick a Google Drive folder to use as your receipts folder."}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto -mx-6 px-6 flex-1">
          {!folderId ? (
            loadingFolders ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : folders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">No folders found in your Drive.</p>
            ) : (
              <div className="space-y-1">
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => saveFolder(f.id)}
                    className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-md hover:bg-accent min-h-11"
                  >
                    <Folder className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </button>
                ))}
              </div>
            )
          ) : loadingFiles ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No files in this folder.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {files.map((f) => (
                <div key={f.id} className="rounded-lg border bg-card overflow-hidden flex flex-col">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="p-2 flex-1 flex flex-col gap-1.5">
                    <span className="text-xs font-medium truncate" title={f.name}>{f.name}</span>
                    <div className="flex items-center gap-1">
                      {isPickMode && (
                        <Button size="sm" className="h-7 text-xs flex-1" onClick={() => onPick(f)}>
                          <Check className="w-3 h-3 mr-1" /> Pin
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" asChild>
                        <a href={f.webViewLink} target="_blank" rel="noreferrer" aria-label="Open in Drive">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {folderId && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => saveFolder("")}>Change folder</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}