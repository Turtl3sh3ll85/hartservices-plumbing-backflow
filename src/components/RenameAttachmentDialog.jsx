import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const QUICK_NAMES = ["Backflow Test", "Test Report"];

export default function RenameAttachmentDialog({ open, attachment, onOpenChange, onRenamed }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && attachment) {
      setName(attachment.file_name || "");
    }
  }, [open, attachment]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !attachment) return;
    setSaving(true);
    try {
      await onRenamed(attachment, trimmed);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Rename attachment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Quick names</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_NAMES.map((q) => (
                <Button
                  key={q}
                  type="button"
                  variant={name === q ? "default" : "outline"}
                  size="sm"
                  onClick={() => setName(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="att-name">Custom name</Label>
            <Input
              id="att-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
              placeholder="Type a name"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}