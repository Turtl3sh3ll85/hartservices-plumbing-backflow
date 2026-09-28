import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatMoney } from "@/lib/invoice";

export default function AttachInvoiceDialog({ file, onClose }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [caption, setCaption] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["allInvoices"],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = !q ? invoices : invoices.filter((i) =>
      (i.name || "").toLowerCase().includes(q) ||
      (i.number || "").toLowerCase().includes(q) ||
      (i.customer_email || "").toLowerCase().includes(q)
    );
    return list.slice(0, 50);
  }, [invoices, search]);

  const handleAttach = async () => {
    if (!selectedId) return;
    setAttaching(true);
    setError(null);
    try {
      await base44.functions.invoke("attachDriveFileToInvoice", {
        invoice_id: selectedId,
        drive_file_id: file.id,
        drive_link: file.webViewLink,
        file_name: file.name,
        thumbnail_url: file.thumbnailLink,
        mime_type: file.mimeType,
        caption: caption || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["driveFolderFiles"] });
      onClose();
    } catch (e) {
      setError(e.message || "Failed to attach file.");
    } finally {
      setAttaching(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">Attach "{file?.name}" to invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." className="pl-9" />
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-lg">
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">No invoices found.</div>
            ) : (
              filtered.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedId(inv.id)}
                  className={`w-full text-left p-3 flex items-center justify-between gap-2 border-b last:border-b-0 transition-colors ${selectedId === inv.id ? "bg-primary/10" : "hover:bg-accent"}`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate text-sm">{inv.name || inv.number || "Invoice"}</div>
                    <div className="text-xs text-muted-foreground truncate">{inv.number}{inv.customer_email ? ` · ${inv.customer_email}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm tabular-nums">{formatMoney(inv.total)}</span>
                    <StatusBadge status={inv.payment_status} />
                  </div>
                </button>
              ))
            )}
          </div>
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={attaching}>Cancel</Button>
          <Button onClick={handleAttach} disabled={!selectedId || attaching}>
            {attaching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Attach"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}