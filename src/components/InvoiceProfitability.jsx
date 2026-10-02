import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Upload, Paperclip, TrendingUp, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";

export default function InvoiceProfitability({ invoiceId, invoiceTotal }) {
  const { toast } = useToast();
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const list = await base44.entities.Transaction.filter({ matched_invoice_id: invoiceId });
      setTxs(list);
    } catch (e) {
      toast({ title: "Failed to load profitability", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [invoiceId]);

  const expenses = useMemo(() => txs.reduce((s, t) => s + Math.abs(t.amount || 0), 0), [txs]);
  const profit = (invoiceTotal || 0) - expenses;

  const downloadReceipt = async (tx) => {
    if (!tx.receipt_file_uri) return;
    setBusy(true);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: tx.receipt_file_uri });
      window.open(signed_url, "_blank");
    } catch (e) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (f && active) pinReceipt(active, f);
    e.target.value = "";
  };

  const pinReceipt = async (tx, file) => {
    setBusy(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await base44.functions.invoke("snapReceipt", {
        file_uri,
        file_name: file.name,
        transaction_id: tx.id,
      });
      setTxs((prev) => prev.map((t) => (t.id === tx.id ? { ...t, receipt_file_uri: file_uri } : t)));
      setActive((a) => (a && a.id === tx.id ? { ...a, receipt_file_uri: file_uri } : a));
      toast({ title: "Receipt pinned to transaction" });
    } catch (e) {
      toast({ title: "Failed to pin receipt", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Profitability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : txs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No transactions pinned to this invoice yet.</div>
        ) : (
          <div className="divide-y rounded-lg border">
            {txs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{t.payee || "Unknown"}</span>
                    {t.receipt_file_uri && <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(t.date)}{t.account_name ? ` · ${t.account_name}` : ""}
                    {t.custom_category || t.category ? ` · ${t.custom_category || t.category}` : ""}
                  </div>
                </div>
                <div className="font-medium tabular-nums text-destructive shrink-0">
                  −{formatCurrency(Math.abs(t.amount || 0))}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice total</span>
            <span className="font-medium tabular-nums">{formatCurrency(invoiceTotal || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pinned expenses</span>
            <span className="font-medium tabular-nums text-destructive">−{formatCurrency(expenses)}</span>
          </div>
          <div className="flex justify-between border-t pt-1.5">
            <span className="font-semibold">Profit</span>
            <span className={`font-semibold tabular-nums ${profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {formatCurrency(profit)}
            </span>
          </div>
        </div>
      </CardContent>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="truncate">{active?.payee || "Transaction"}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {formatCurrency(Math.abs(active.amount || 0))}{active.date ? ` · ${formatDate(active.date)}` : ""}
              </div>
              <div className="flex flex-col gap-2">
                {active.receipt_file_uri ? (
                  <Button variant="outline" onClick={() => downloadReceipt(active)} disabled={busy}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download receipt
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground">No receipt attached yet.</div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {active.receipt_file_uri ? "Replace receipt" : "Upload receipt"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}