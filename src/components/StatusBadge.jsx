export default function StatusBadge({ status, label }) {
  const map = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-primary/15 text-primary",
    approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    signed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    converted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    matched: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    not_a_job: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
    suggested: "bg-primary/15 text-primary",
    in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    scheduled: "bg-primary/15 text-primary",
    declined: "bg-destructive/15 text-destructive",
    cancelled: "bg-destructive/15 text-destructive",
    overdue: "bg-destructive/15 text-destructive",
    unpaid: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    partial: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  };
  const cls = map[status] || "bg-muted text-muted-foreground";
  const text = label || (status || "").replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {text}
    </span>
  );
}