// YNAB transaction <-> invoice payment matching logic (client-side).

// Suggest a best invoice match for a transaction.
// Invoices: list of invoice records with amount_paid/paid_date/total/payment_status.
// Returns the best candidate invoice or null.
export function suggestInvoiceMatch(transaction, invoices = []) {
  if (!transaction || transaction.matched === "matched" || transaction.matched === "ignored") return null;
  const txAmount = Number(transaction.amount) || 0;
  if (txAmount <= 0) return null; // only match incoming payments (positive amounts)

  const txDate = transaction.date ? new Date(transaction.date) : null;
  const candidates = invoices.filter((inv) => {
    const paid = Number(inv.amount_paid) || 0;
    if (paid <= 0) return false;
    if (Math.abs(txAmount - paid) < 1) return true; // exact amount match
    if (inv.paid_date && txDate) {
      const d = new Date(inv.paid_date);
      const diff = Math.abs(d - txDate) / 86400000;
      return diff <= 3 && Math.abs(txAmount - paid) < paid * 0.1;
    }
    return false;
  });

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const da = Math.abs(txAmount - (Number(a.amount_paid) || 0));
    const db = Math.abs(txAmount - (Number(b.amount_paid) || 0));
    if (Math.abs(da - db) < 1) {
      const ad = a.paid_date && txDate ? Math.abs(new Date(a.paid_date) - txDate) : Infinity;
      const bd = b.paid_date && txDate ? Math.abs(new Date(b.paid_date) - txDate) : Infinity;
      return ad - bd;
    }
    return da - db;
  });
  return candidates[0];
}

// Compute suggested matches for a batch of transactions.
// Returns map: ynab_id -> invoiceId (only for transactions currently unmatched).
export function computeSuggestions(transactions = [], invoices = []) {
  const result = {};
  for (const tx of transactions) {
    if (tx.matched === "matched" || tx.matched === "ignored") continue;
    const match = suggestInvoiceMatch(tx, invoices);
    if (match) result[tx.ynab_id] = match.id;
  }
  return result;
}