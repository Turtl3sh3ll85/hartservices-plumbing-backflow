import { ChevronDown, Wallet, Building2, User, Route, Tag, X, GitMerge } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function AccountGroup({ account, txs, collapsed, onToggleCollapse, renderSection, categorize, labelType, onSetLabel, mergedSources = [], onUnmerge, onMerge }) {
  const cats = categorize(txs);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 px-1">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 flex-1 text-left min-h-11 min-w-0"
          aria-expanded={!collapsed}
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform shrink-0", collapsed && "-rotate-90")} />
          <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
          <h2 className="font-heading text-lg font-semibold truncate">{account}</h2>
          <span className="text-sm text-muted-foreground shrink-0">· {txs.length}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 shrink-0">
              {labelType === "business" ? (
                <><Building2 className="w-3.5 h-3.5 text-primary" /> Business</>
              ) : labelType === "personal" ? (
                <><User className="w-3.5 h-3.5 text-emerald-600" /> Personal</>
              ) : labelType === "routing" ? (
                <><Route className="w-3.5 h-3.5 text-amber-600" /> Routing</>
              ) : (
                <><Tag className="w-3.5 h-3.5 text-muted-foreground" /> Label</>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onSetLabel("business")}><Building2 className="w-4 h-4 mr-2" /> Business</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetLabel("personal")}><User className="w-4 h-4 mr-2" /> Personal</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetLabel("routing")}><Route className="w-4 h-4 mr-2" /> Routing</DropdownMenuItem>
            {labelType && labelType !== "unlabeled" && (
              <DropdownMenuItem onClick={() => onSetLabel("unlabeled")}><X className="w-4 h-4 mr-2" /> Clear label</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMerge}><GitMerge className="w-4 h-4 mr-2" /> Merge into...</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!collapsed && mergedSources.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1 pl-11">
          {mergedSources.map((src) => (
            <span key={src} className="inline-flex items-center gap-1 rounded-full bg-muted text-xs px-2 py-0.5">
              <GitMerge className="w-3 h-3 text-muted-foreground" />
              <span className="max-w-[140px] truncate">{src}</span>
              <button
                type="button"
                onClick={() => onUnmerge(src)}
                className="hover:bg-accent rounded-full p-0.5"
                aria-label={`Unmerge ${src}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {!collapsed && (
        <>
          {renderSection("Unmatched", cats.unmatched)}
          {cats.matched.length > 0 && renderSection("Matched", cats.matched)}
        </>
      )}
    </div>
  );
}