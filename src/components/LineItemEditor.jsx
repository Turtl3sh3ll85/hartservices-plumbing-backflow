import { Plus, Trash2, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LineItemRow from "@/components/LineItemRow";

const blankItem = (section = "") => ({
  description: "",
  quantity: 1,
  unit_price: 0,
  markup: 0,
  markup_mode: "preset",
  modifiers: [],
  section,
});

export default function LineItemEditor({ lineItems = [], onChange, editable = true, catalog = [], modifiersCatalog = [] }) {
  const update = (i, field, value) => {
    const next = [...lineItems];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  };
  const merge = (i, patch) => {
    const next = [...lineItems];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = (section = "") => onChange([...lineItems, blankItem(section)]);
  const remove = (i) => onChange(lineItems.filter((_, idx) => idx !== i));

  const addModifier = (i, v) => {
    if (v === "") return;
    const mod = modifiersCatalog[Number(v)];
    if (!mod) return;
    const next = [...lineItems];
    next[i] = { ...next[i], modifiers: [...(next[i].modifiers || []), { name: mod.name, price_adjustment: mod.price_adjustment }] };
    onChange(next);
  };
  const removeModifier = (i, mi) => {
    const next = [...lineItems];
    next[i] = { ...next[i], modifiers: (next[i].modifiers || []).filter((_, idx) => idx !== mi) };
    onChange(next);
  };

  // Ordered list of section names ("" = untitled)
  const sectionOrder = [];
  lineItems.forEach((li) => {
    const s = li.section || "";
    if (!sectionOrder.includes(s)) sectionOrder.push(s);
  });

  const addSection = () => {
    const n = sectionOrder.filter((s) => s).length + 1;
    add(`Section ${n}`);
  };

  const setSectionName = (oldName, newName) => {
    onChange(lineItems.map((li) => (li.section || "") === oldName ? { ...li, section: newName } : li));
  };

  const removeSection = (name) => {
    // move this section's items into the previous section (or untitled)
    const idx = sectionOrder.indexOf(name);
    const prev = idx > 0 ? sectionOrder[idx - 1] : "";
    onChange(lineItems.map((li) => (li.section || "") === name ? { ...li, section: prev } : li));
  };

  return (
    <div className="space-y-4">
      <div className="hidden sm:grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <div className="col-span-1">Thumb</div>
        <div className="col-span-3">Description / task</div>
        <div className="col-span-1 text-right">Qty</div>
        <div className="col-span-2 text-right">Unit price</div>
        <div className="col-span-2 text-right">Markup</div>
        <div className="col-span-3 text-right">Amount</div>
      </div>

      {sectionOrder.map((sectionName, groupIndex) => {
        const indices = lineItems.map((li, i) => i).filter((i) => (lineItems[i].section || "") === sectionName);
        const isNamed = sectionName !== "";
        return (
          <div key={groupIndex} className="space-y-2">
            <div className="flex items-center gap-2 pt-1">
              <Input
                className="font-medium h-8 max-w-xs"
                value={sectionName}
                placeholder={isNamed ? "" : "Section name (optional)"}
                onChange={(e) => setSectionName(sectionName, e.target.value)}
                disabled={!editable}
              />
              {isNamed && editable && (
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => removeSection(sectionName)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove section
                </Button>
              )}
            </div>
            {indices.map((i) => (
              <LineItemRow
                key={i}
                li={lineItems[i]}
                editable={editable}
                catalog={catalog}
                modifiersCatalog={modifiersCatalog}
                onUpdate={(field, value) => update(i, field, value)}
                onMerge={(patch) => merge(i, patch)}
                onRemove={() => remove(i)}
                onAddModifier={(v) => addModifier(i, v)}
                onRemoveModifier={(mi) => removeModifier(i, mi)}
              />
            ))}
            {editable && (
              <Button type="button" variant="ghost" size="sm" onClick={() => add(sectionName)}>
                <Plus className="w-4 h-4 mr-1" /> Add line item{isNamed ? ` to ${sectionName}` : ""}
              </Button>
            )}
          </div>
        );
      })}

      {editable && (
        <Button type="button" variant="outline" size="sm" onClick={addSection}>
          <FolderPlus className="w-4 h-4 mr-1" /> Add section
        </Button>
      )}
    </div>
  );
}