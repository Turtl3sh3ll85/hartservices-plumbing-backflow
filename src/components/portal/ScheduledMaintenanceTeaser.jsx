import { CalendarClock, Droplets, BellOff, Waves, Wind } from "lucide-react";

const ITEMS = [
  { icon: Droplets, label: "Backflow Test Reminder" },
  { icon: BellOff, label: "Turn off daily reminders" },
  { icon: Waves, label: "Fill my Salt Tank" },
  { icon: Wind, label: "Change my AC Filters" },
];

export default function ScheduledMaintenanceTeaser() {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card">
      <div className="pointer-events-none select-none opacity-50 grayscale">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-heading font-semibold">Scheduled Maintenance</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-lg border bg-muted/40 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-card/40 backdrop-grayscale">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
          <CalendarClock className="w-4 h-4" /> Coming Soon
        </span>
      </div>
    </div>
  );
}