import { Draggable } from "@hello-pangea/dnd";
import { ChevronDown, Wallet, GripVertical, Building2, User, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function AccountGroup({ account, txs, index, collapsed, onToggleCollapse, renderSection, categorize, labelType, onSetLabel }) {
  const cats = categorize(txs);
  return (
    <Draggable draggableId={account} index={index}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.draggableProps} className="space-y-3">
          <div className="flex items-center gap-1 px-1">
            <button
              {...provided.dragHandleProps}
              className="touch-none text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing p-1.5 min-h-11 min-w-11 flex items-center justify-center"
              aria-label="Drag to reorder account"
            >
              <GripVertical className="w-4 h-4" />
            </button>
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
                  ) : (
                    <><Tag className="w-3.5 h-3.5 text-muted-foreground" /> Label</>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onSetLabel("business")}>
                  <Building2 className="w-4 h-4 mr-2" /> Business
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetLabel("personal")}>
                  <User className="w-4 h-4 mr-2" /> Personal
                </DropdownMenuItem>
                {labelType && labelType !== "unlabeled" && (
                  <DropdownMenuItem onClick={() => onSetLabel("unlabeled")}>
                    <X className="w-4 h-4 mr-2" /> Clear
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {!collapsed && (
            <>
              {renderSection("Unmatched", cats.unmatched)}
              {cats.matched.length > 0 && renderSection("Matched", cats.matched)}
            </>
          )}
        </div>
      )}
    </Draggable>
  );
}