import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";

export default function LineItemThumbnail({ url, onChange, disabled }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      onChange(file_url);
    } catch (e) {
      console.error("Thumbnail upload failed", e);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (url) {
    return (
      <div className="relative group shrink-0">
        <div className="w-12 h-12 rounded-md overflow-hidden border bg-muted">
          <Image src={url} alt="Thumbnail" className="w-full h-full object-cover" />
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove thumbnail"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      disabled={disabled || uploading}
      className="w-12 h-12 rounded-md border border-dashed border-input flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
      title="Add thumbnail"
    >
      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
    </button>
  );
}