import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, computeTotals } from "@/lib/format";

export default function AcceptEstimate() {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedItems, setSelectedItems] = useState({}); // index -> qty
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("getEstimateForAcceptance", { estimate_id: estimateId });
        setData(res.data);
        if (res.data?.estimate?.selection_mode === "side_by_side") {
          const first = res.data.estimate.options?.[0];
          if (first) setSelectedOption(first.label);
        }
      } catch (e) {} finally { setLoading(false); }
    })();
  }, [estimateId]);

  const { estimate, customer, settings } = data || {};
  const mode = estimate?.selection_mode || "single";

  const aLaCarteItems = estimate?.line_items || [];
  const aLaCarteChosen = aLaCarteItems
    .map((li, i) => ({ ...li, quantity: Number(selectedItems[i] || 0) }))
    .filter((li) => li.quantity > 0);
  const aLaCarteTotals = computeTotals(aLaCarteChosen, estimate?.tax_rate, estimate?.cc_fee_enabled);

  const accept = async () => {
    setAccepting(true);
    try {
      const payload = { estimate_id: estimateId, customer_ready: ready };
      if (mode === "side_by_side") payload.selected_option_label = selectedOption;
      if (mode === "a_la_carte") {
        payload.selected_line_items = aLaCarteChosen.map((li) => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price }));
      }
      const res = await base44.functions.invoke("acceptEstimate", payload);
      if (res.data?.invoice_id) {
        navigate(`/pay/${res.data.invoice_id}`);
      }
    } catch (e) {
      alert(e.message || "Failed to accept");
    } finally { setAccepting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!estimate) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Estimate not found.</div>;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-semibold">{settings?.business_name || "Estimate"}</h1>
          <p className="text-sm text-muted-foreground">{estimate.name || estimate.number}</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Prepared for</div>
            <div className="font-medium">{customer?.name || "Customer"}</div>
            {customer?.company && <div className="text-sm text-muted-foreground">{customer.company}</div>}
          </CardContent>
        </Card>

        {mode === "single" && (
          <Card>
            <CardContent className="p-4 space-y-2">
              {(estimate.line_items || []).map((li, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="min-w-0">{li.description}</span>
                  <span className="tabular-nums">{formatCurrency((li.quantity || 0) * (li.unit_price || 0))}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total</span><span className="tabular-nums">{formatCurrency(estimate.total)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "side_by_side" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">Choose one option:</p>
            {(estimate.options || []).map((opt, i) => {
              const sel = selectedOption === opt.label;
              return (
                <button key={i} onClick={() => setSelectedOption(opt.label)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${sel ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{opt.label}</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(opt.total)}</span>
                  </div>
                  {sel && <Check className="w-4 h-4 text-primary mt-2" />}
                </button>
              );
            })}
          </div>
        )}

        {mode === "a_la_carte" && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium">Select the items you'd like:</p>
              {aLaCarteItems.map((li, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <input
                    type="checkbox"
                    checked={selectedItems[i] > 0}
                    onChange={(e) => setSelectedItems((s) => ({ ...s, [i]: e.target.checked ? (li.quantity || 1) : 0 }))}
                    className="w-4 h-4"
                  />
                  <span className="flex-1 text-sm">{li.description}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{formatCurrency(li.unit_price)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Your total</span><span className="tabular-nums">{formatCurrency(aLaCarteTotals.total)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <label className="flex items-center gap-2 justify-center text-sm">
          <input type="checkbox" checked={ready} onChange={(e) => setReady(e.target.checked)} className="w-4 h-4" />
          I'm ready to begin work once approved
        </label>

        <Button onClick={accept} disabled={accepting || (mode === "a_la_carte" && aLaCarteChosen.length === 0)} className="w-full" size="lg">
          <CheckCircle2 className="w-5 h-5" />
          {accepting ? "Accepting…" : "Accept & continue to invoice"}
        </Button>
      </div>
    </div>
  );
}