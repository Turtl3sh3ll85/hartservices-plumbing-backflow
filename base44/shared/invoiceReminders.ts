export function isOpenInvoice(inv: any): boolean {
  if (!inv) return false;
  if (["draft", "cancelled", "paid"].includes(inv.status)) return false;
  if (inv.payment_status === "paid") return false;
  return inv.payment_status === "unpaid" || inv.payment_status === "partial";
}

export function money(n: number): string {
  return "$" + (Number(n) || 0).toFixed(2);
}