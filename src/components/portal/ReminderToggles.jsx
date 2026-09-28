import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";

const TOGGLES = [
  { key: "salt_reminders", label: "Salt reminders", desc: "Get notified when it's time to refill salt." },
  { key: "ac_filter_reminders", label: "AC filter reminders", desc: "Seasonal reminders to swap AC filters." },
  { key: "sprinkler_tuneups", label: "Sprinkler tune-ups", desc: "Reminders for sprinkler system check-ups." },
  { key: "backflow_tests", label: "Backflow tests", desc: "Annual backflow test reminders." },
];

export default function ReminderToggles({ customer }) {
  const { toast } = useToast();
  const [vals, setVals] = useState({
    salt_reminders: !!customer.salt_reminders,
    ac_filter_reminders: !!customer.ac_filter_reminders,
    sprinkler_tuneups: !!customer.sprinkler_tuneups,
    backflow_tests: !!customer.backflow_tests,
  });

  const toggle = async (key, checked) => {
    const prev = vals[key];
    setVals((v) => ({ ...v, [key]: checked }));
    try {
      await base44.entities.Customer.update(customer.id, { [key]: checked });
    } catch (e) {
      setVals((v) => ({ ...v, [key]: prev }));
      toast({ variant: "destructive", description: "Could not update preference." });
    }
  };

  return (
    <div>
      <h2 className="font-heading font-semibold mb-3 flex items-center gap-2"><Bell className="w-4 h-4" /> Reminders &amp; Service Plans</h2>
      <Card className="p-0 overflow-hidden">
        <div className="divide-y">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-3 p-4 min-h-11">
              <div className="min-w-0">
                <div className="font-medium">{t.label}</div>
                <div className="text-sm text-muted-foreground">{t.desc}</div>
              </div>
              <Switch checked={vals[t.key]} onCheckedChange={(c) => toggle(t.key, c)} aria-label={t.label} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}