import { Checkbox } from "@/components/ui/checkbox";
import { ScrollText } from "lucide-react";
import { TERMS, ACKNOWLEDGMENT } from "@/lib/serviceTerms";

export default function ServiceTerms({ agreed, onChange, disabled = false }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border p-6 mt-4">
      <div className="flex items-center gap-1.5 text-sm font-medium mb-3">
        <ScrollText className="w-4 h-4" /> Service Terms &amp; Conditions
      </div>
      <div className="max-h-72 overflow-y-auto pr-2 space-y-3 text-sm text-muted-foreground border rounded-lg p-4 bg-muted/20">
        {TERMS.map((t) => (
          <div key={t.title}>
            <div className="font-medium text-foreground">{t.title}</div>
            <div className="mt-1 whitespace-pre-line leading-relaxed">{t.body}</div>
          </div>
        ))}
      </div>
      <p className="text-sm mt-4 leading-relaxed">{ACKNOWLEDGMENT}</p>
      <label className="flex items-start gap-2.5 mt-3 cursor-pointer select-none">
        <Checkbox checked={!!agreed} onCheckedChange={(v) => onChange(!!v)} disabled={disabled} className="mt-0.5" />
        <span className="text-sm font-medium">I Agree to These Conditions</span>
      </label>
    </div>
  );
}