export default function StatusBadge({ status }) {
  const map = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    signed: "bg-emerald-100 text-emerald-700",
    paid: "bg-emerald-100 text-emerald-700",
    completed: "bg-emerald-100 text-emerald-700",
    converted: "bg-emerald-100 text-emerald-700",
    in_progress: "bg-amber-100 text-amber-700",
    scheduled: "bg-blue-100 text-blue-700",
    declined: "bg-red-100 text-red-700",
    cancelled: "bg-red-100 text-red-700",
    overdue: "bg-red-100 text-red-700",
    unpaid: "bg-amber-100 text-amber-700",
    partial: "bg-amber-100 text-amber-700",
  };
  const cls = map[status] || "bg-muted text-muted-foreground";
  const label = (status || "").replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}