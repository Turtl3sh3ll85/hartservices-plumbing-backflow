import { useState } from "react";
import { Upload, Loader2, ImageIcon, FileIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function FileUpload({ type = "photo", onUploaded, label }) {
  const [uploading, setUploading] = useState(false);
  const defaultLabel = type === "photo" ? "Add photos" : "Attach contract";
  const text = label || defaultLabel;
  const { toast } = useToast();

  const handleFiles = async (files) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        await onUploaded({ file_uri, file_name: file.name, type });
      }
    } catch (e) {
      console.error("Upload failed", e);
      toast({ title: "Upload failed", description: e?.message || "unknown error", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <label
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium cursor-pointer border transition-colors ${
        uploading
          ? "opacity-60 pointer-events-none border-border"
          : "border-border bg-card hover:bg-accent text-foreground"
      }`}
    >
      <input
        type="file"
        multiple
        accept={type === "photo" ? "image/*" : ".pdf,.doc,.docx,.jpg,.jpeg,.png"}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
        disabled={uploading}
      />
      {uploading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : type === "photo" ? (
        <ImageIcon className="w-4 h-4" />
      ) : (
        <FileIcon className="w-4 h-4" />
      )}
      {uploading ? "Uploading…" : text}
    </label>
  );
}