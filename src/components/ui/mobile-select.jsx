import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const triggerBase =
  "flex h-11 sm:h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function MobileSelect({ value, onValueChange, placeholder, triggerClassName, ariaLabel, options, groups }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const allOptions = groups ? groups.flatMap((g) => g.options) : options || [];
  const selectedLabel = allOptions.find((o) => o.value === value)?.label;

  const handleSelect = (v) => {
    onValueChange?.(v);
    setOpen(false);
  };

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName} aria-label={ariaLabel}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {groups
            ? groups.map((g) => (
                <SelectGroup key={g.label}>
                  <SelectLabel>{g.label}</SelectLabel>
                  {g.options.map((o) => (
                    <SelectItem key={o.value} value={o.value} disabled={o.disabled}>{o.label}</SelectItem>
                  ))}
                </SelectGroup>
              ))
            : allOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} disabled={o.disabled}>{o.label}</SelectItem>
              ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button type="button" aria-label={ariaLabel} className={cn(triggerBase, triggerClassName)}>
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value ? (selectedLabel || placeholder) : placeholder}</span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{placeholder || ariaLabel || "Select"}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-2 pb-6">
          {groups
            ? groups.map((g) => (
                <div key={g.label} className="pb-1">
                  <div className="px-3 py-1.5 text-sm font-semibold text-muted-foreground">{g.label}</div>
                  {g.options.map((o) => (
                    <OptionRow key={o.value} option={o} selected={o.value === value} onSelect={() => handleSelect(o.value)} />
                  ))}
                </div>
              ))
            : allOptions.map((o) => (
                <OptionRow key={o.value} option={o} selected={o.value === value} onSelect={() => handleSelect(o.value)} />
              ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function OptionRow({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      disabled={option.disabled}
      onClick={onSelect}
      className="flex w-full items-center justify-between rounded-md px-3 min-h-11 py-2.5 text-sm text-left hover:bg-accent focus:bg-accent disabled:opacity-50 disabled:pointer-events-none"
    >
      <span className="truncate">{option.label}</span>
      {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </button>
  );
}