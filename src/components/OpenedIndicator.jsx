import { Eye, EyeOff } from "lucide-react";

function formatOpened(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function OpenedIndicator({ opened, lastOpenedDate, className = "" }) {
  if (opened) {
    const label = formatOpened(lastOpenedDate);
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ${className}`}
        title={label ? `Opened ${label}` : "Opened"}
      >
        <Eye className="w-3 h-3" />
        <span className="hidden sm:inline">{label ? `Opened ${label}` : "Opened"}</span>
        <span className="sm:hidden">Opened</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full ${className}`}
      title="Not opened yet"
    >
      <EyeOff className="w-3 h-3" />
      <span>Not opened</span>
    </span>
  );
}