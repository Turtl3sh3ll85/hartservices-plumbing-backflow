import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CustomerGroupHeader from "@/components/CustomerGroupHeader";

export default function CustomerGroupedList({ items, customers, renderItem, customerKey = "customer_id" }) {
  const [collapsed, setCollapsed] = useState({});
  const [groupOrder, setGroupOrder] = useState([]);

  const customerInfo = (id) => {
    const c = customers.find((c) => c.id === id);
    return { company: c?.company, name: c?.name || "Unknown customer" };
  };

  const groups = Object.entries(
    items.reduce((acc, item) => {
      const key = item[customerKey] || "unknown";
      (acc[key] ||= []).push(item);
      return acc;
    }, {})
  );
  const orderedGroups = [...groups].sort((a, b) => {
    const ai = groupOrder.indexOf(a[0]);
    const bi = groupOrder.indexOf(b[0]);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const onDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const ids = orderedGroups.map(([cid]) => cid);
    const [moved] = ids.splice(result.source.index, 1);
    ids.splice(result.destination.index, 0, moved);
    setGroupOrder(ids);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="customer-groups">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
            {orderedGroups.map(([cid, group], index) => {
              const info = customerInfo(cid);
              const isCollapsed = collapsed[cid];
              return (
                <Draggable draggableId={cid} index={index} key={cid}>
                  {(p) => (
                    <div ref={p.innerRef} {...p.draggableProps} className="rounded-lg border bg-card overflow-hidden">
                      <CustomerGroupHeader
                        company={info.company}
                        name={info.name}
                        count={group.length}
                        collapsed={isCollapsed}
                        onToggle={() => setCollapsed((prev) => ({ ...prev, [cid]: !prev[cid] }))}
                        dragHandleProps={p.dragHandleProps}
                      />
                      {!isCollapsed && (
                        <div className="divide-y">
                          {group.map((item) => renderItem({ item, info }))}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}