import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/invoice";
import CategoryTransactionsDialog from "@/components/reports/CategoryTransactionsDialog";

const PALETTE = [
  "#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2",
  "#db2777", "#ca8a04", "#4f46e5", "#059669", "#dc2626",
  "#7c3aed", "#0d9488", "#b45309", "#be185d", "#1d4ed8",
];

export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["ynabTransactions"],
    queryFn: () => base44.entities.YnabTransaction.list("-date", 500),
  });

  // Category tax classification from the categories spreadsheet (column B).
  // Categories marked "personal" are excluded from this business expense graph.
  const { data: categoryItems = [] } = useQuery({
    queryKey: ["sheetCategories", "items"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getSheetCategories", {});
      return res.data?.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const personalCategories = useMemo(
    () => new Set(categoryItems.filter((c) => (c.tax_type || "").toLowerCase() === "personal").map((c) => c.name.toLowerCase())),
    [categoryItems],
  );

  const HIDDEN_CATEGORIES = ["transfer", "income", "inflows", "ready to assign"];
  const isHidden = (cat) => {
    const key = cat.trim().toLowerCase();
    if (HIDDEN_CATEGORIES.includes(key)) return true;
    if (personalCategories.has(key)) return true;
    return false;
  };

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const tx of transactions) {
      const cat = (tx.custom_category || "").trim() || (tx.category || "").trim() || "Uncategorized";
      if (isHidden(cat)) continue;
      const amt = Math.abs(Number(tx.amount) || 0);
      map.set(cat, (map.get(cat) || 0) + amt);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, personalCategories]);

  const total = useMemo(() => byCategory.reduce((s, e) => s + e.value, 0), [byCategory]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Expense Graph</h1>
        <p className="text-muted-foreground text-sm mt-1">Spending insights across all transactions.</p>
      </div>

      <Card className="p-6">
        <h2 className="font-heading text-xl font-semibold mb-1">Overview</h2>
        <p className="text-sm text-muted-foreground mb-6">All transactions by category</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : byCategory.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">No transactions to display.</div>
        ) : (
          <div className="space-y-6">
            <div className="relative w-full" style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
                    paddingAngle={2}
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatMoney(value)}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-semibold tabular-nums">{formatMoney(total)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {byCategory.map((entry, i) => {
                const pct = total ? (entry.value / total) * 100 : 0;
                return (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => setSelectedCategory(entry.name)}
                    className="flex items-center gap-3 min-h-11 px-3 py-2 rounded-lg border bg-card text-card-foreground hover:bg-accent/60 transition-colors text-left"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="flex-1 min-w-0 text-sm font-medium truncate">{entry.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-14 text-right">{pct.toFixed(1)}%</span>
                    <span className="text-sm font-semibold tabular-nums shrink-0 w-28 text-right">{formatMoney(entry.value)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <CategoryTransactionsDialog
        category={selectedCategory}
        transactions={transactions}
        onClose={() => setSelectedCategory(null)}
      />
    </div>
  );
}