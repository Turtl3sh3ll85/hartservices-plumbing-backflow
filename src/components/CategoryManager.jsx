import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Save, Search } from "lucide-react";

export default function CategoryManager() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [inUse, setInUse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [defined, txs] = await Promise.all([
        base44.entities.TransactionCategory.list("-name", 500),
        base44.entities.Transaction.list("-date", 1000),
      ]);

      const usedSet = new Set();
      for (const t of txs) {
        const cat = (t.custom_category || "").trim();
        if (cat) usedSet.add(cat);
      }
      try {
        const ynabTxs = await base44.entities.YnabTransaction.list("-date", 1000);
        for (const t of ynabTxs) {
          const cat = (t.custom_category || "").trim();
          if (cat) usedSet.add(cat);
        }
      } catch {}

      const definedNames = new Set(defined.map((c) => c.name.toLowerCase()));
      const undefinedInUse = Array.from(usedSet)
        .filter((c) => !definedNames.has(c.toLowerCase()))
        .sort();

      setCategories(defined);
      setInUse(undefinedInUse);
    } catch (e) {
      toast({ title: "Failed to load categories", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = (id, field, value) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  const saveCategory = async (cat) => {
    setSavingId(cat.id);
    try {
      await base44.entities.TransactionCategory.update(cat.id, {
        name: cat.name,
        description: cat.description || "",
        tax_type: cat.tax_type || "business",
        pinnable: !!cat.pinnable,
      });
      toast({ title: "Category saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Category already exists", variant: "destructive" });
      return;
    }
    setSavingId("new");
    try {
      const created = await base44.entities.TransactionCategory.create({
        name,
        description: newDesc.trim(),
        tax_type: "business",
        pinnable: false,
      });
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewDesc("");
      toast({ title: "Category added" });
    } catch (e) {
      toast({ title: "Add failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const defineInUse = async (catName) => {
    setSavingId(`define-${catName}`);
    try {
      const created = await base44.entities.TransactionCategory.create({
        name: catName,
        description: "",
        tax_type: "business",
        pinnable: false,
      });
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setInUse((prev) => prev.filter((c) => c !== catName));
      toast({ title: "Category added — enter a description below" });
    } catch (e) {
      toast({ title: "Add failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const deleteCategory = async (cat) => {
    try {
      await base44.entities.TransactionCategory.delete(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      toast({ title: "Category deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const filtered = categories.filter((c) =>
    !filter ||
    c.name.toLowerCase().includes(filter.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(filter.toLowerCase()),
  );

  if (loading) return <p className="text-sm text-muted-foreground">Loading categories…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search categories…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {inUse.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
            {inUse.length} categor{inUse.length === 1 ? "y" : "ies"} in use but not yet defined
          </p>
          <div className="flex flex-wrap gap-1.5">
            {inUse.map((cat) => (
              <button
                key={cat}
                onClick={() => defineInUse(cat)}
                disabled={savingId === `define-${cat}`}
                className="text-xs rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                + {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((cat) => (
          <div key={cat.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Input
                value={cat.name}
                onChange={(e) => updateField(cat.id, "name", e.target.value)}
                className="font-medium"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => saveCategory(cat)}
                  disabled={savingId === cat.id}
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCategory(cat)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            <Textarea
              placeholder="Describe how this category should be applied (e.g. 'Use for all fuel purchases including gas stations and vehicle charging')"
              value={cat.description || ""}
              onChange={(e) => updateField(cat.id, "description", e.target.value)}
              className="text-sm"
              rows={2}
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Tax type:</span>
                <select
                  value={cat.tax_type || "business"}
                  onChange={(e) => updateField(cat.id, "tax_type", e.target.value)}
                  className="rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                >
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={!!cat.pinnable}
                  onCheckedChange={(v) => updateField(cat.id, "pinnable", v)}
                />
                <span className="text-muted-foreground">Billable job</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-dashed p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Add new category</p>
        <Input
          placeholder="Category name (e.g. Vehicle Maintenance)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Textarea
          placeholder="How should this category be applied? (e.g. 'Use for all vehicle repair and maintenance costs, including oil changes, tire replacement, and inspections')"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          rows={2}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={addCategory}
          disabled={!newName.trim() || savingId === "new"}
        >
          <Plus className="w-4 h-4" /> Add category
        </Button>
      </div>
    </div>
  );
}