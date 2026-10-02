import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect } from "@/components/ui/mobile-select";

const blank = { description: "", details: "", quantity: 1, unit: "", unit_price: 0, markup: 0 };

export default function ManualLineItemDialog({ open, onOpenChange, onAdd, sections = [], defaultSection }) {
  const [form, setForm] = useState(blank);
  const [section, setSection] = useState("");

  useEffect(() => {
    if (open) {
      setForm(blank);
      setSection(defaultSection ?? sections[0] ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = () => {
    if (!form.description.trim()) return;
    onAdd(
      {
        description: form.description,
        details: form.details,
        quantity: Number(form.quantity) || 1,
        unit: form.unit,
        unit_price: Number(form.unit_price) || 0,
        markup: Number(form.markup) || 0,
      },
      section
    );
    onOpenChange(false);
  };

  const sectionOptions = sections.map((s, i) => ({ value: String(i), label: s || "Untitled" }));
  const sectionValue = String(Math.max(0, sections.indexOf(section)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add line item manually</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Section</Label>
            <MobileSelect
              value={sectionValue}
              onValueChange={(v) => setSection(sections[Number(v)] ?? "")}
              placeholder="Select section"
              options={sectionOptions}
            />
          </div>
          <div>
            <Label>Description *</Label>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Replace kitchen sink faucet" />
          </div>
          <div>
            <Label>Details</Label>
            <Textarea value={form.details} onChange={(e) => set("details", e.target.value)} rows={2} placeholder="Optional details" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input type="number" step="1" min="0" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="e.g. each, hr, ft" />
            </div>
            <div>
              <Label>Unit Price</Label>
              <Input type="number" step="0.01" min="0" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} />
            </div>
            <div>
              <Label>Markup %</Label>
              <Input type="number" step="1" min="0" value={form.markup} onChange={(e) => set("markup", e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.description.trim()}>Add item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}