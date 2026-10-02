import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, computeTotals } from "@/lib/format";
import { formatMoney, lineTotal, groupLineItemsBySection } from "@/lib/invoice";

export default function AcceptEstimate() {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedItems, setSelectedItems] = useState({}); // index -> qty

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

  const reviewContract = () => {
    navigate(`/contract/${estimateId}`, {
      state: {
        selectedOption: mode === "side_by_side" ? selectedOption : undefined,
        selectedItems: mode === "a_la_carte" ? selectedItems : undefined,
      },
    });
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
          <>
            <div className="border rounded-lg overflow-hidden">
              {groupLineItemsBySection(estimate.line_items).map(({ section, items }, gi) => (
                <div key={gi}>
                  {section && <div className="bg-primary/10 text-primary font-medium text-sm px-3 py-2">{section}</div>}
                  {items.map((li, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 px-3 py-2 border-t first:border-t-0">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{li.description || "—"}</div>
                        <div className="text-xs text-muted-foreground">{li.quantity ?? 0} × {formatMoney(li.unit_price)}</div>
                        {li.details && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{li.details}</div>}
                      </div>
                      <div className="text-sm font-medium tabular-nums shrink-0">{formatMoney(lineTotal(li))}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatMoney(estimate.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{formatMoney(estimate.tax)}</span></div>
                {estimate.cc_fee_enabled && <div className="flex justify-between"><span className="text-muted-foreground">Credit card fee</span><span className="tabular-nums">{formatMoney(estimate.cc_fee)}</span></div>}
                <div className="flex justify-between font-semibold border-t pt-1.5"><span>Total</span><span className="tabular-nums">{formatMoney(estimate.total)}</span></div>
              </div>
            </div>
          </>
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

        <Button
          onClick={reviewContract}
          disabled={mode === "a_la_carte" && aLaCarteChosen.length === 0}
          className="w-full"
          size="lg"
        >
          <CheckCircle2 className="w-5 h-5" />
          Review & Accept
        </Button>
      </div>
    </div>
  );
}