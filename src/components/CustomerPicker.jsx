import { useMemo, useState } from "react";
import { Search, ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function CustomerLine({ c, selected }) {
  const hasCompany = !!(c.company && c.company.trim());
  return (
    <div className="flex items-start gap-2 w-full">
      <Check className={cn("w-4 h-4 mt-0.5 shrink-0", selected ? "text-primary" : "opacity-0")} />
      <div className="min-w-0 flex-1">
        {hasCompany && <div className="text-sm font-semibold leading-tight truncate">{c.company}</div>}
        <div className={cn("text-sm leading-tight truncate", hasCompany ? "font-normal text-muted-foreground" : "font-semibold")}>{c.name}</div>
        <div className="text-xs text-muted-foreground truncate flex flex-wrap gap-x-2">
          {c.email && <span>{c.email}</span>}
          {c.phone && <span>{c.phone}</span>}
        </div>
      </div>
    </div>
  );
}

export default function CustomerPicker({ customers, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = customers.find((c) => c.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.company, c.email, c.phone].filter(Boolean).some((f) => f.toLowerCase().includes(q))
    );
  }, [customers, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex-1 min-h-9 h-auto flex items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-left text-sm hover:bg-accent"
        >
          {selected ? (
            <div className="min-w-0 flex-1 py-1">
              <CustomerLine c={selected} selected={false} />
            </div>
          ) : (
            <span className="text-muted-foreground">Select customer…</span>
          )}
          <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="w-4 h-4 mr-2 shrink-0 opacity-50" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers…"
            className="h-9 border-0 focus-visible:ring-0 px-0"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">No customers found.</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onChange(c.id); setOpen(false); setQuery(""); }}
              className={cn(
                "w-full text-left rounded-md px-2 py-2 hover:bg-accent transition-colors",
                c.id === value && "bg-accent/60"
              )}
            >
              <CustomerLine c={c} selected={c.id === value} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}