import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, FileSpreadsheet, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/invoice";

export default function ModifiersDialog({ open, onOpenChange, onPick, sheetId, sheetName }) {
  const [modifiers, setModifiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState({});
  const [manualName, setManualName] = useState("");
  const [manualCost, setManualCost] = useState("");

  useEffect(() => {
    if (!open || !sheetId) return;
    setLoading(true);
    setError("");
    setSelected({});
    setQuery("");
    setManualName("");
    setManualCost("");
    base44.functions.invoke("getSheetModifiers", { sheet_id: sheetId, sheet_name: sheetName })
      .then((res) => setModifiers(res.data?.modifiers || []))
      .catch((e) => { setError(e.message || "Failed to load modifiers."); setModifiers([]); })
      .finally(() => setLoading(false));
  }, [open, sheetId, sheetName]);

  const filtered = modifiers.filter((m) => !query || (m.name || "").toLowerCase().includes(query.toLowerCase()));
  const toggle = (i) => setSelected((s) => ({ ...s, [i]: !s[i] }));
  const count = Object.keys(selected).filter((k) => selected[k]).length;

  const addSelected = () => {
    const picked = Object.keys(selected).filter((k) => selected[k]).map((k) => modifiers[Number(k)]);
    if (!picked.length) return;
    onPick(picked.map((m) => ({ name: m.name, price_adjustment: Number(m.price_adjustment) || 0 })));
    onOpenChange(false);
  };

  const addManual = () => {
    const name = manualName.trim();
    if (!name) return;
    onPick([{ name, price_adjustment: Number(manualCost) || 0 }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add modifiers</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {sheetId && (
            <>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search modifiers…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              {loading && <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>}
              {error && <p className="text-sm text-red-600 py-2 text-center">{error}</p>}
              {!loading && !error && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">No modifiers found in sheet.</p>
              )}
              {filtered.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {filtered.map((m, i) => (
                    <label key={i} className="w-full text-left p-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={!!selected[i]} onCheckedChange={() => toggle(i)} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{formatMoney(m.price_adjustment)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <Button type="button" onClick={addSelected} disabled={!count} className="w-full">
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Add {count > 0 ? `${count} ` : ""}from sheet
              </Button>
            </>
          )}
          <div className="border-t pt-3 space-y-2">
            <div className="text-sm font-medium">Manual entry</div>
            <div className="flex gap-2">
              <Input placeholder="Modifier name" value={manualName} onChange={(e) => setManualName(e.target.value)} className="flex-1" />
              <Input placeholder="Cost" type="number" step="0.01" value={manualCost} onChange={(e) => setManualCost(e.target.value)} className="w-28" />
              <Button type="button" variant="secondary" onClick={addManual} disabled={!manualName.trim()}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}