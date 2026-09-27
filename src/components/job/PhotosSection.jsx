import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, ImageIcon, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import FileUpload from "@/components/FileUpload";
import EmptyState from "@/components/EmptyState";

export default function PhotosSection({ job, photos, reload }) {
  const [caption, setCaption] = useState("");

  const onUploaded = async ({ file_uri, file_name }) => {
    await base44.entities.Attachment.create({ job_id: job.id, type: "photo", file_uri, file_name, caption });
    setCaption("");
    reload();
  };

  const remove = async (p) => { if (confirm("Delete photo?")) { await base44.entities.Attachment.delete(p.id); reload(); } };

  const viewFile = async (p) => {
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: p.file_uri });
      window.open(signed_url, "_blank");
    } catch (e) { alert("Could not open file: " + e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-end">
        <div className="space-y-1.5">
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" className="w-56" />
        </div>
        <FileUpload type="photo" onUploaded={onUploaded} label="Add photos" />
      </div>
      {photos.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No photos" description="Upload job site photos to document the work." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((p) => (
            <Card key={p.id} className="overflow-hidden group">
              <div className="aspect-square bg-muted flex items-center justify-center relative">
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button variant="secondary" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 select-none" onClick={() => viewFile(p)} aria-label="View photo"><Eye className="w-4 h-4" /></Button>
                  <Button variant="secondary" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 select-none" onClick={() => remove(p)} aria-label="Delete photo"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              {p.caption && <div className="p-2 text-xs text-muted-foreground truncate">{p.caption}</div>}
              <div className="px-2 pb-2 text-[11px] text-muted-foreground truncate">{p.file_name}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}