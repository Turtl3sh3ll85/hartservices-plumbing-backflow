import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/invoice";

export default function SheetItemsDialog({ open, onOpenChange, onPick, defaultSheetId }) {
  const [sheetId, setSheetId] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState({});

  useEffect(() => {
    if (!open) return;
    setSheetId(defaultSheetId || "");
    setSelected({});
    setItems([]);
    setError("");
    setQuery("");
    if (defaultSheetId) load(defaultSheetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultSheetId]);

  const load = async (idToUse) => {
    const sid = (idToUse ?? sheetId).trim();
    if (!sid) { setError("Enter a Google Sheet ID."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("getSheetLineItems", { sheet_id: sid });
      setItems(res.data?.line_items || []);
      setSelected({});
    } catch (e) {
      setError(e.message || "Failed to read the Google Sheet.");
      setItems([]);
    }
    setLoading(false);
  };

  const filtered = items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !query || item.description.toLowerCase().includes(query.toLowerCase()));

  const toggle = (idx) => setSelected((s) => ({ ...s, [idx]: !s[idx] }));
  const count = Object.keys(selected).filter((k) => selected[k]).length;

  const add = () => {
    const picked = Object.keys(selected).filter((k) => selected[k]).map((k) => items[Number(k)]);
    if (!picked.length) return;
    onPick(picked);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pull line items from Google Sheets</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={sheetId} onChange={(e) => setSheetId(e.target.value)} placeholder="Google Sheet ID" />
            <Button type="button" variant="secondary" onClick={() => load()} disabled={loading}>{loading ? "Loading…" : "Load"}</Button>
          </div>
          <p className="text-xs text-muted-foreground">The first sheet should have header columns named Description, Quantity, and Unit Price.</p>
          {items.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search items..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          )}
          {error && <p className="text-sm text-red-600 py-2 text-center">{error}</p>}
          {!error && !loading && items.length === 0 && sheetId && (
            <p className="text-sm text-muted-foreground py-6 text-center">No line items found.</p>
          )}
          {items.length > 0 && (
            <div className="max-h-72 overflow-y-auto space-y-1">
              {filtered.map(({ item, idx }) => (
                <label key={idx} className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={!!selected[idx]} onCheckedChange={() => toggle(idx)} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{item.description}</div>
                    <div className="text-xs text-muted-foreground">{item.quantity} × {formatMoney(item.unit_price)}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" onClick={add} disabled={!count}>
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Add {count > 0 ? `${count} ` : ""}item{count === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}