export function groupInvoicesByCustomer(invoices, customerMap = {}) {
  const groups = new Map();
  for (const inv of invoices) {
    const key = inv.customer_id || "__unknown__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(inv);
  }
  const entries = Array.from(groups.entries()).map(([key, items]) => {
    const customer = customerMap[key];
    const name = customer?.name || "Unknown";
    const sorted = [...items].sort(
      (a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)
    );
    return { key, name, items: sorted, isUnknown: !customer };
  });
  entries.sort((a, b) => {
    if (a.isUnknown !== b.isUnknown) return a.isUnknown ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  return entries;
}