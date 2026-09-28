import { useRef, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { formatMoney } from "@/lib/invoice";

export default function LineItemDescriptionPicker({ li, catalog = [], grouped = [], onMerge, onUpdate, editable = true }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const hasText = !!(li.description && String(li.description).trim());

  const selectCustom = () => {
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        placeholder="Type custom or pick from catalog…"
        value={li.description || ""}
        onChange={(e) => onUpdate("description", e.target.value)}
        disabled={!editable}
        onFocus={() => { if (!hasText && editable) setOpen(true); }}
        className="pr-9"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="absolute inset-0 pointer-events-none" aria-hidden />
        </PopoverAnchor>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          tabIndex={-1}
          disabled={!editable}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen((o) => !o)}
          aria-label="Open catalog"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
        <PopoverContent className="p-0 w-[320px] max-w-[calc(100vw-2rem)]" align="start" collisionPadding={8}>
          <Command>
            <CommandInput placeholder="Search catalog…" />
            <div className="p-1 border-b">
              <button
                type="button"
                onClick={selectCustom}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent transition-colors"
              >
                <Pencil className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">Custom — type your own</span>
              </button>
            </div>
            <CommandList>
              <CommandEmpty>No catalog items.</CommandEmpty>
              {grouped.map(([cat, entries]) => (
                <CommandGroup key={cat} heading={cat}>
                  {entries.map(({ c, idx }) => (
                    <CommandItem
                      key={idx}
                      value={`${c.description} ${c.category || ""}`}
                      onSelect={() => {
                        onMerge({
                          description: c.description,
                          unit_price: c.unit_price,
                          quantity: c.quantity || li.quantity || 1,
                          image_url: c.image_url || li.image_url || "",
                          details: c.details || li.details || "",
                        });
                        setOpen(false);
                      }}
                    >
                      <span className="flex-1 truncate">{c.description}</span>
                      <span className="text-muted-foreground ml-2 shrink-0 tabular-nums">{formatMoney(c.unit_price)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}