import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/invoice";

const ITEMS_SHEET_ID = "13lEp40pEclIWP2haTyDsCBsEJ75HWim4CNLWElmLhSg";
const ITEMS_SHEET_NAME = "Items";

export default function SheetItemsDropdown({ onPick, defaultSheetId = ITEMS_SHEET_ID, sheetName = ITEMS_SHEET_NAME }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("getSheetLineItems", { sheet_id: defaultSheetId, sheet_name: sheetName });
      setItems(res.data?.line_items || []);
      setLoaded(true);
    } catch (e) {
      setError(e.message || "Failed to read the Google Sheet.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && !loaded && !loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const cat = it.category || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(it);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" }))
      .map(([cat, list]) => [cat, list.slice().sort((a, b) => (a.description || "").localeCompare(b.description || "", undefined, { sensitivity: "base" }))]);
  }, [items]);

  const pick = (item) => {
    onPick([item]);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <FileSpreadsheet className="w-4 h-4" /> Pull from sheet
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {loading ? "Loading…" : error ? "Error" : `Items by category`}
        </DropdownMenuLabel>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && <div className="px-3 py-3 text-sm text-red-600">{error}</div>}
        {!loading && !error && grouped.length === 0 && (
          <div className="px-3 py-6 text-sm text-muted-foreground text-center">No items found.</div>
        )}
        {grouped.map(([cat, list]) => (
          <div key={cat}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
              {cat}
            </DropdownMenuLabel>
            {list.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => pick(item)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 cursor-pointer"
              >
                <span className="min-w-0 flex-1 truncate">{item.description}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatMoney(item.unit_price)}</span>
              </button>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}