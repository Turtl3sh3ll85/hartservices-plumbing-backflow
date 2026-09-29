import { Draggable } from "@hello-pangea/dnd";
import { ChevronDown, Wallet, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AccountGroup({ account, txs, index, collapsed, onToggleCollapse, renderSection, categorize }) {
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
              className="flex items-center gap-2 flex-1 text-left min-h-11"
              aria-expanded={!collapsed}
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform shrink-0", collapsed && "-rotate-90")} />
              <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
              <h2 className="font-heading text-lg font-semibold truncate">{account}</h2>
              <span className="text-sm text-muted-foreground shrink-0">· {txs.length}</span>
            </button>
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