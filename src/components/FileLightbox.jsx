import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Inbox } from "lucide-react";

export default function FileLightbox({ file, onClose }) {
  if (!file) return null;
  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl p-2">
        <DialogTitle className="sr-only">{file.name}</DialogTitle>
        <div className="flex flex-col items-center gap-3">
          {file.thumbnailLink ? (
            <img
              src={file.thumbnailLink}
              alt={file.name}
              className="max-h-[70vh] w-auto rounded-lg object-contain"
            />
          ) : (
            <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center">
              {file.iconLink ? (
                <img src={file.iconLink} alt="" className="w-24 h-24" />
              ) : (
                <Inbox className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
          )}
          <div className="text-sm font-medium text-center px-2 break-words max-w-full">
            {file.name}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}