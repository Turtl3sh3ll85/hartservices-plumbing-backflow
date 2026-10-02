import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { formatCurrency } from "@/lib/format";

const ITEMS_SHEET_ID = "13lEp40pEclIWP2haTyDsCBsEJ75HWim4CNLWElmLhSg";
const ITEMS_SHEET_NAME = "Items";

export default function SheetItemPicker({ onPick, onManualEntry, sheetId = ITEMS_SHEET_ID, sheetName = ITEMS_SHEET_NAME }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getSheetLineItems", { sheet_id: sheetId, sheet_name: sheetName });
      setItems(res.data?.line_items || []);
      setLoaded(true);
    } catch (e) { /* ignore */ }
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add line item
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start">
        <Command>
          <CommandInput placeholder="Search sheet items…" />
          {onManualEntry && (
            <div className="border-b">
              <button
                type="button"
                onClick={() => { onManualEntry(); setOpen(false); }}
                className="flex items-center w-full px-2 py-2 text-sm hover:bg-accent"
              >
                <Pencil className="w-4 h-4 mr-2" /> Manual entry…
              </button>
            </div>
          )}
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && grouped.length === 0 && <CommandEmpty>No items found.</CommandEmpty>}
            {grouped.map(([cat, list]) => (
              <CommandGroup key={cat} heading={cat}>
                {list.map((item, idx) => (
                  <CommandItem
                    key={idx}
                    value={`${item.description} ${cat}`}
                    onSelect={() => { onPick(item); setOpen(false); }}
                  >
                    <span className="flex-1 truncate">{item.description}</span>
                    <span className="text-muted-foreground ml-2 shrink-0 tabular-nums">{formatCurrency(item.unit_price)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}