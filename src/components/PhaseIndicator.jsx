import { useEffect, useState } from "react";
import { GitBranch, Loader2, ChevronDown } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect } from "@/components/ui/mobile-select";

export default function PhaseIndicator({ invoice, phases = [], onSave, busy = false, editable = true }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setPhase(invoice?.phase || "");
    setNote(invoice?.phase_note || "");
  }, [invoice?.id, invoice?.phase, invoice?.phase_note]);

  const hasPhase = !!invoice?.phase;

  const trigger = (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium min-h-7 ${hasPhase ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
      <GitBranch className="w-3 h-3 shrink-0" />
      <span className="max-w-[180px] truncate">{hasPhase ? invoice.phase : "Set phase"}</span>
      {editable && !!onSave && <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />}
    </span>
  );

  if (!editable || !onSave) {
    return <span className="inline-flex">{trigger}</span>;
  }

  const save = () => {
    if (!phase) return;
    onSave(phase, note);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex" aria-label="Change phase">
          {trigger}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <div className="text-sm font-medium flex items-center gap-2"><GitBranch className="w-4 h-4" /> Set phase</div>
          <MobileSelect
            value={phase}
            onValueChange={(v) => setPhase(v)}
            placeholder="Select a phase…"
            ariaLabel="Select phase"
            options={phases.map((p) => ({ value: p, label: p }))}
            triggerClassName="min-h-10"
          />
          <Textarea
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          <Button size="sm" onClick={save} disabled={!phase || busy} className="w-full">
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Save phase
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}