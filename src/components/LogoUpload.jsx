import { useState } from "react";
import { Upload, Loader2, ImageIcon, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Image } from "@/components/ui/image";

export default function LogoUpload({ value, onChange, label, hint }) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      onChange(file_url);
    } catch (e) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg border bg-card overflow-hidden flex items-center justify-center shrink-0">
          {value ? (
            <Image src={value} alt="Logo preview" className="w-full h-full object-contain" />
          ) : (
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <label
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium cursor-pointer border transition-colors ${
            uploading ? "opacity-60 pointer-events-none border-border" : "border-border bg-card hover:bg-accent text-foreground"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
            disabled={uploading}
          />
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading…" : "Upload"}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive border border-border bg-card hover:bg-accent transition-colors"
            aria-label="Remove logo"
          >
            <X className="w-4 h-4" /> Remove
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}