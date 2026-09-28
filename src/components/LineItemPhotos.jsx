import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";

export default function LineItemPhotos({ photos = [], onChange, disabled }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const addFiles = async (files) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setUploading(true);
    const urls = [];
    for (const file of list) {
      try {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        urls.push(file_url);
      } catch (e) {
        /* skip individual failures */
      }
    }
    if (urls.length) onChange([...(photos || []), ...urls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = (i) => onChange((photos || []).filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(photos || []).map((url, i) => (
        <div key={i} className="relative group shrink-0">
          <div className="w-14 h-14 rounded-md overflow-hidden border bg-muted">
            <Image src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm"
              title="Remove photo"
              aria-label="Remove photo"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-14 h-14 rounded-md border border-dashed border-input flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
            title="Add photo"
            aria-label="Add photo"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
        </>
      )}
    </div>
  );
}