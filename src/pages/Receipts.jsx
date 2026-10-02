import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Save, Link2, FileText, Loader2, X, Clock, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import SnapTransactionPicker from "@/components/accounting/SnapTransactionPicker";
import SnapInvoicePicker from "@/components/accounting/SnapInvoicePicker";

function ReceiptThumb({ uri }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri })
      .then((r) => { if (active) setUrl(r.signed_url); })
      .catch(() => {});
    return () => { active = false; };
  }, [uri]);
  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <img src={url} alt="Receipt" className="w-full h-full object-cover" />;
}

export default function Receipts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(null); // "save" | transaction id | invoice id
  const [txPickerOpen, setTxPickerOpen] = useState(false);
  const [invPickerOpen, setInvPickerOpen] = useState(false);

  const { data: pending = [] } = useQuery({
    queryKey: ["pendingReceipts"],
    queryFn: () => base44.entities.Receipt.filter({ matched: false }, "-created_date", 50),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["snapInvoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const invoiceLabel = (id) => {
    const inv = invoices.find((i) => i.id === id);
    return inv ? (inv.name || inv.number || "Invoice") : "Invoice";
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  const submit = async ({ transaction_id, invoice_id }) => {
    if (!file) return;
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const res = await base44.functions.invoke("snapReceipt", {
        file_uri,
        file_name: file.name,
        transaction_id: transaction_id || null,
        invoice_id: invoice_id || null,
      });
      const title = transaction_id
        ? "Receipt attached to transaction"
        : invoice_id
          ? "Receipt pinned to invoice"
          : "Receipt saved for later";
      toast({
        title,
        description: res.data?.extracted?.merchant ? `Merchant: ${res.data.extracted.merchant}` : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["pendingReceipts"] });
      reset();
    } catch (e) {
      toast({ title: "Failed to save receipt", description: e.message, variant: "destructive" });
    }
  };

  const saveForLater = async () => { setBusy("save"); await submit({}); setBusy(null); };
  const attachToTx = async (tx) => { setBusy(tx.id); await submit({ transaction_id: tx.id }); setTxPickerOpen(false); setBusy(null); };
  const attachToInvoice = async (inv) => { setBusy(inv.id); await submit({ invoice_id: inv.id }); setInvPickerOpen(false); setBusy(null); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Snap Receipt</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Take a photo of a receipt and attach it to a transaction or invoice, or save it for the scanner to match automatically once the transaction posts.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {!preview ? (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-12 cursor-pointer hover:bg-accent/50 transition-colors min-h-44">
              <Camera className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium">Upload Receipt From Photos</span>
              <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border bg-muted">
                <img src={preview} alt="Receipt preview" className="w-full max-h-80 object-contain" />
                <button
                  onClick={reset}
                  disabled={!!busy}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-50"
                  aria-label="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setTxPickerOpen(true)} disabled={!!busy} className="flex-1">
                  {busy && busy !== "save" && busy !== "invoice" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Attach to Transaction
                </Button>
                <Button onClick={() => setInvPickerOpen(true)} disabled={!!busy} className="flex-1">
                  {busy === "invoice" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Attach to Invoice
                </Button>
                <Button variant="outline" onClick={saveForLater} disabled={!!busy} className="flex-1">
                  {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save for Later
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" /> Saved for later
          <span className="text-muted-foreground text-sm font-normal">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No receipts waiting. Saved receipts are matched to transactions automatically every hour.
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {pending.map((r) => (
              <div key={r.id} className="rounded-lg border bg-card overflow-hidden">
                <div className="aspect-[4/3] bg-muted">
                  {r.file_uri ? (
                    <ReceiptThumb uri={r.file_uri} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-0.5">
                  <div className="text-xs font-medium truncate">{r.merchant || r.file_name || "Receipt"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.amount != null ? formatCurrency(r.amount) : "—"} · {formatDate(r.created_date)}
                  </div>
                  {r.invoice_id && (
                    <div className="text-xs text-primary inline-flex items-center gap-1 truncate">
                      <FileText className="w-3 h-3 shrink-0" /> {invoiceLabel(r.invoice_id)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SnapTransactionPicker
        open={txPickerOpen}
        onClose={() => setTxPickerOpen(false)}
        onPick={attachToTx}
        busyId={busy}
      />
      <SnapInvoicePicker
        open={invPickerOpen}
        onClose={() => setInvPickerOpen(false)}
        onPick={attachToInvoice}
        busyId={busy}
      />
    </div>
  );
}