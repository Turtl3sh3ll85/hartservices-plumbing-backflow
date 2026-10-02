import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TERMS, ACKNOWLEDGMENT } from "@/lib/serviceTerms";

export default function ReviewContract() {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("getEstimateForAcceptance", { estimate_id: estimateId });
        setData(res.data);
      } catch (e) {} finally { setLoading(false); }
    })();
  }, [estimateId]);

  const { estimate, customer, settings } = data || {};

  const accept = async () => {
    setAccepting(true);
    try {
      const payload = { estimate_id: estimateId };
      if (state.selectedOption) payload.selected_option_label = state.selectedOption;
      if (state.selectedItems) {
        const chosen = estimate.line_items
          .map((li, i) => ({ ...li, quantity: Number(state.selectedItems[i] || 0) }))
          .filter((li) => li.quantity > 0);
        payload.selected_line_items = chosen.map((li) => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price }));
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
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to estimate
        </button>

        <div className="text-center">
          <h1 className="text-2xl font-heading font-semibold">{settings?.business_name || "Service Agreement"}</h1>
          <p className="text-sm text-muted-foreground">{estimate.name || estimate.number}</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Prepared for</div>
            <div className="font-medium">{customer?.name || "Customer"}</div>
            {customer?.company && <div className="text-sm text-muted-foreground">{customer.company}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6 space-y-5">
            <h2 className="font-heading font-semibold text-lg">Service Terms & Conditions</h2>
            {TERMS.map((t, i) => (
              <div key={i} className="space-y-1.5">
                <h3 className="font-semibold text-sm">{t.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{t.body}</p>
              </div>
            ))}
            <div className="border-t pt-4">
              <p className="text-sm italic text-muted-foreground whitespace-pre-line">{ACKNOWLEDGMENT}</p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={accept} disabled={accepting} className="w-full" size="lg">
          <CheckCircle2 className="w-5 h-5" />
          {accepting ? "Converting to invoice…" : "I Accept"}
        </Button>
      </div>
    </div>
  );
}