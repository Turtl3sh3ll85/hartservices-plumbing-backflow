import StatusBadge from "@/components/StatusBadge";

export default function TransactionTags({ transaction, showCategory = true }) {
  const category = (transaction.custom_category || "").trim();
  const status = transaction.matched || "unmatched";
  const label = status === "ignored" ? "Transaction not for a job" : status;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showCategory && category && (
        <span className="inline-flex rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">{category}</span>
      )}
      <StatusBadge status={status} label={label} />
    </div>
  );
}