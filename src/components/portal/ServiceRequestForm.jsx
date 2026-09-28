import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect } from "@/components/ui/mobile-select";
import { Wrench, Loader2 } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "service", label: "Service request" },
  { value: "appointment", label: "Schedule appointment" },
];

export default function ServiceRequestForm({ email }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ request_type: "service", subject: "", details: "", preferred_date: "" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.subject.trim()) { toast({ description: "Add a short subject." }); return; }
    setSaving(true);
    try {
      const res = await base44.functions.invoke("createServiceRequestByEmail", { email, ...form });
      if (!res.data || res.data.error) throw new Error(res.data?.error || "Failed to send");
      toast({ title: "Request sent", description: "The office will follow up shortly." });
      setForm({ request_type: "service", subject: "", details: "", preferred_date: "" });
    } catch (e) {
      toast({ variant: "destructive", title: "Could not send", description: e.message });
    }
    setSaving(false);
  };

  return (
    <div>
      <h2 className="font-heading font-semibold mb-3 flex items-center gap-2"><Wrench className="w-4 h-4" /> Request an appointment or service</h2>
      <Card className="p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <MobileSelect value={form.request_type} onValueChange={(v) => setForm({ ...form, request_type: v })} options={TYPE_OPTIONS} ariaLabel="Request type" triggerClassName="w-full" />
          </div>
          <div className="space-y-1.5">
            <Label>Preferred date</Label>
            <Input type="date" value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Briefly, what do you need?" />
        </div>
        <div className="space-y-1.5">
          <Label>Details</Label>
          <Textarea rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Add any details that help us prepare." />
        </div>
        <Button type="button" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wrench className="w-4 h-4 mr-1.5" />}
          {saving ? "Sending…" : "Send request"}
        </Button>
      </Card>
    </div>
  );
}