import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, FileInput, Trash2, Loader2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import OpenedIndicator from "@/components/OpenedIndicator";
import CustomerGroupHeader from "@/components/CustomerGroupHeader";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";

const MODE_LABEL = { single: "Single", a_la_carte: "À la carte", side_by_side: "Side-by-side" };

export default function Estimates() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [previewEst, setPreviewEst] = useState(null);
  const [hideConverted, setHideConverted] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [groupOrder, setGroupOrder] = useState([]);
  const { settings } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();

  const convertEstimate = async (est) => {
    setConvertingId(est.id);
    try {
      const res = await base44.functions.invoke("acceptEstimate", { estimate_id: est.id });
      setItems((prev) => prev.map((i) => (i.id === est.id ? { ...i, status: "converted", converted_invoice_id: res.invoice_id } : i)));
      setPreviewEst(null);
      toast({ title: res.already_converted ? "Already converted" : "Converted to invoice" });
      navigate(`/invoices/${res.invoice_id}`);
    } catch (e) {
      toast({ title: "Conversion failed", description: e.message, variant: "destructive" });
    } finally {
      setConvertingId(null);
    }
  };

  const deleteEstimate = async (est) => {
    if (!window.confirm(`Delete estimate "${est.name || est.number || "Untitled"}"? This cannot be undone.`)) return;
    setItems((prev) => prev.filter((i) => i.id !== est.id));
    setPreviewEst(null);
    try {
      await base44.entities.Estimate.delete(est.id);
      toast({ title: "Estimate deleted" });
    } catch (e) {
      toast({ title: "Delete failed", variant: "destructive" });
      const list = await base44.entities.Estimate.list('-created_date', 200);
      setItems(list);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [list, custs] = await Promise.all([
          base44.entities.Estimate.list('-created_date', 200),
          base44.entities.Customer.list('-created_date', 200),
        ]);
        setItems(list);
        setCustomers(custs);
      } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  const customerInfo = (id) => {
    const c = customers.find((c) => c.id === id);
    return { company: c?.company, name: c?.name || "Unknown customer" };
  };

  const filtered = items.filter((e) => {
    if (hideConverted && e.status === "converted") return false;
    const q = query.toLowerCase();
    return !q || (e.name || '').toLowerCase().includes(q) || (e.number || '').toLowerCase().includes(q);
  });

  const groups = Object.entries(
    filtered.reduce((acc, est) => {
      const key = est.customer_id || "unknown";
      (acc[key] ||= []).push(est);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-semibold tracking-tight">Estimates</h1>
        <Button asChild size="sm"><Link to="/estimates/new"><Plus className="w-4 h-4" /> New estimate</Link></Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search estimates" className="pl-9" />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none min-h-11 px-2">
          <input
            type="checkbox"
            checked={hideConverted}
            onChange={(e) => setHideConverted(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Hide converted
        </label>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No estimates yet.</CardContent></Card>
      ) : (
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
                              {group.map((e) => (
                                <div key={e.id} className="relative px-4 py-3 hover:bg-accent/50 transition-colors">
                                  <button type="button" onClick={() => setPreviewEst(e)} className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-label={`Preview estimate: ${e.name || e.number || "Estimate"}`} />
                                  <div className="relative z-10 flex items-center gap-3">
                                    <div className="min-w-0 flex-1 pointer-events-none">
                                      <div className="font-medium truncate">{e.name || e.number || "Untitled estimate"}</div>
                                    </div>
                                    <span className="font-medium tabular-nums pointer-events-none whitespace-nowrap">{formatCurrency(e.total)}</span>
                                  </div>
                                  <div className="relative z-10 flex items-center gap-3 mt-1.5">
                                    <div className="flex items-center gap-2 pointer-events-none text-xs text-muted-foreground whitespace-nowrap">
                                      <span>{formatDate(e.created_date)}</span>
                                      <span>· {MODE_LABEL[e.selection_mode || "single"]}</span>
                                    </div>
                                    <OpenedIndicator opened={e.opened} lastOpenedDate={e.last_opened_date} />
                                    <StatusBadge status={e.status} />
                                    <div className="flex-1" />
                                    <Button size="icon" variant="ghost" className="pointer-events-auto shrink-0" onClick={() => deleteEstimate(e)} aria-label="Delete estimate">
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                    <div className="flex items-center gap-1 pointer-events-auto shrink-0">
                                      {e.status !== "converted" ? (
                                        <Button size="sm" variant="outline" onClick={() => convertEstimate(e)} disabled={convertingId === e.id}>
                                          {convertingId === e.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileInput className="w-4 h-4" />}
                                          <span className="hidden sm:inline">Convert</span>
                                        </Button>
                                      ) : (
                                        <Button size="sm" variant="ghost" onClick={() => e.converted_invoice_id && navigate(`/invoices/${e.converted_invoice_id}`)}>
                                          <FileInput className="w-4 h-4" />
                                          <span className="hidden sm:inline">View invoice</span>
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
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
      )}

      <DocumentPreviewDialog
        doc={previewEst}
        kind="estimate"
        customer={customers.find((c) => c.id === previewEst?.customer_id)}
        settings={settings}
        onClose={() => setPreviewEst(null)}
        onConvert={previewEst ? () => convertEstimate(previewEst) : undefined}
        onDelete={previewEst ? () => deleteEstimate(previewEst) : undefined}
      />
    </div>
  );
}