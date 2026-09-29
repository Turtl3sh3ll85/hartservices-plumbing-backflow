export default function CustomerGroupHeader({ name, count }) {
  return (
    <div className="px-4 py-2 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 select-none">
      {name}
      {typeof count === "number" ? (
        <span className="ml-1.5 font-normal normal-case text-muted-foreground/60">{count}</span>
      ) : null}
    </div>
  );
}