import { useState } from "react";
import { Plus, Trash2, SlidersHorizontal, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import SheetItemPicker from "@/components/SheetItemPicker";
import ManualLineItemDialog from "@/components/ManualLineItemDialog";
import ModifiersDialog from "@/components/ModifiersDialog";

const ITEMS_SHEET_ID = "13lEp40pEclIWP2haTyDsCBsEJ75HWim4CNLWElmLhSg";
const ITEMS_SHEET_NAME = "Items";
const MODIFIERS_SHEET_NAME = "Modifiers";

const lineTotal = (li) => {
  const base = (Number(li.quantity) || 0) * (Number(li.unit_price) || 0);
  const markup = Number(li.markup) || 0;
  const marked = markup ? base * (1 + markup / 100) : base;
  const mods = (li.modifiers || []).reduce((s, m) => s + (Number(m.price_adjustment) || 0), 0);
  return marked + mods;
};

const blankItem = (section = "") => ({
  description: "", details: "", quantity: 1, unit_price: 0, unit: "", markup: 0, modifiers: [], section,
});

export default function LineItemsEditor({ items, onChange }) {
  const list = items || [];
  const [modOpenFor, setModOpenFor] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSection, setManualSection] = useState("");

  const update = (i, patch) => {
    const next = [...list];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));

  const addSheetItem = (item, section) => {
    onChange([...list, {
      description: item.description || "",
      details: item.details || "",
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      unit: item.unit || "",
      markup: Number(item.markup) || 0,
      image_url: item.image_url || "",
      modifiers: [],
      section,
    }]);
  };

  const addManualItem = (item, section) => {
    onChange([...list, { ...blankItem(section), ...item }]);
  };

  const addModifiers = (i, mods) => update(i, { modifiers: [...(list[i].modifiers || []), ...mods] });
  const removeModifier = (i, mi) => update(i, { modifiers: (list[i].modifiers || []).filter((_, idx) => idx !== mi) });

  // Ordered list of section names ("" = untitled)
  const sectionOrder = [];
  list.forEach((li) => {
    const s = li.section || "";
    if (!sectionOrder.includes(s)) sectionOrder.push(s);
  });
  if (sectionOrder.length === 0) sectionOrder.push("");

  const addSection = () => {
    const n = sectionOrder.filter((s) => s).length + 1;
    onChange([...list, blankItem(`Section ${n}`)]);
  };
  const setSectionName = (oldName, newName) => {
    const hasItems = list.some((li) => (li.section || "") === oldName);
    if (!hasItems && newName.trim()) {
      onChange([...list, blankItem(newName)]);
    } else {
      onChange(list.map((li) => (li.section || "") === oldName ? { ...li, section: newName } : li));
    }
  };
  const removeSection = (name) => {
    const idx = sectionOrder.indexOf(name);
    const prev = idx > 0 ? sectionOrder[idx - 1] : "";
    onChange(list.map((li) => (li.section || "") === name ? { ...li, section: prev } : li));
  };

  return (
    <div className="space-y-4">
      {sectionOrder.map((sectionName) => {
        const indices = list.map((_, i) => i).filter((i) => (list[i].section || "") === sectionName);
        const isNamed = sectionName !== "";
        return (
          <div key={sectionName || "_default"} className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-primary/10 border-b">
              <Input
                className="font-heading font-semibold text-base h-9 max-w-xs border-0 bg-transparent px-1 focus-visible:ring-1"
                value={sectionName}
                placeholder="Section name (optional)"
                onChange={(e) => setSectionName(sectionName, e.target.value)}
              />
              {isNamed && (
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => removeSection(sectionName)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove section
                </Button>
              )}
            </div>
            <div className="p-3 sm:p-4 space-y-3">
              {indices.map((i) => {
                const li = list[i];
                return (
                  <div key={i} className="rounded-lg border p-3 space-y-2 bg-background">
                    <div className="flex gap-2 items-start">
                      <Input placeholder="Description" value={li.description || ""} onChange={(e) => update(i, { description: e.target.value })} className="flex-1" />
                      <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove line item">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <Textarea placeholder="Details (optional)" value={li.details || ""} onChange={(e) => update(i, { details: e.target.value })} rows={2} />
                    <div className="flex gap-2 items-center flex-wrap">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground mb-1">Qty</span>
                        <Input type="number" step="1" min="0" value={li.quantity ?? 1} onChange={(e) => update(i, { quantity: parseFloat(e.target.value) || 0 })} className="w-24" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground mb-1">Unit</span>
                        <Input placeholder="e.g. each, hr, ft" value={li.unit || ""} onChange={(e) => update(i, { unit: e.target.value })} className="w-28" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground mb-1">Unit Price</span>
                        <Input type="number" step="0.01" min="0" value={li.unit_price ?? 0} onChange={(e) => update(i, { unit_price: parseFloat(e.target.value) || 0 })} className="w-32" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground mb-1">Markup %</span>
                        <Input type="number" step="1" min="0" value={li.markup ?? 0} onChange={(e) => update(i, { markup: parseFloat(e.target.value) || 0 })} className="w-24" />
                      </div>
                      <div className="ml-auto text-right">
                        <span className="text-xs text-muted-foreground block mb-1">Line Total</span>
                        <span className="font-medium">{formatCurrency(lineTotal(li))}</span>
                      </div>
                    </div>
                    {li.modifiers && li.modifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {li.modifiers.map((m, mi) => (
                          <span key={mi} className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary text-xs px-2 py-1">
                            {m.name}
                            <span className="text-primary/70">+{formatCurrency(Number(m.price_adjustment) || 0)}</span>
                            <button type="button" onClick={() => removeModifier(i, mi)} className="ml-0.5 hover:text-destructive" aria-label={`Remove ${m.name}`}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => setModOpenFor(i)} className="text-muted-foreground">
                      <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Add modifier
                    </Button>
                  </div>
                );
              })}
              <SheetItemPicker
                onPick={(item) => addSheetItem(item, sectionName)}
                onManualEntry={() => { setManualSection(sectionName); setManualOpen(true); }}
              />
            </div>
          </div>
        );
      })}

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={addSection}>
          <FolderPlus className="w-4 h-4 mr-1" /> Add section
        </Button>
      </div>

      <ModifiersDialog
        open={modOpenFor !== null}
        onOpenChange={(o) => !o && setModOpenFor(null)}
        onPick={(mods) => modOpenFor !== null && addModifiers(modOpenFor, mods)}
        sheetId={ITEMS_SHEET_ID}
        sheetName={MODIFIERS_SHEET_NAME}
      />
      <ManualLineItemDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onAdd={addManualItem}
        sections={sectionOrder}
        defaultSection={manualSection}
      />
    </div>
  );
}