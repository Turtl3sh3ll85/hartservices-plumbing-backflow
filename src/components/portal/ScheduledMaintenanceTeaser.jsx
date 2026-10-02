import { CalendarClock } from "lucide-react";

export default function ScheduledMaintenanceTeaser() {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card">
      <div className="pointer-events-none select-none opacity-50 grayscale">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-heading font-semibold">Scheduled Maintenance</h2>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-2/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-2 w-full rounded bg-muted" />
              <div className="h-2 w-2/3 rounded bg-muted" />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-2 w-full rounded bg-muted" />
              <div className="h-2 w-2/3 rounded bg-muted" />
            </div>
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