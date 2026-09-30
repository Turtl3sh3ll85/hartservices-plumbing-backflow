export async function applyInvoicePhase(base44, invoice, phase, note, by) {
  const now = new Date().toISOString();
  const history = Array.isArray(invoice.phase_history) ? invoice.phase_history : [];
  history.push({ phase, note, date: now, by });
  return base44.asServiceRole.entities.Invoice.update(invoice.id, {
    phase,
    phase_note: note,
    phase_changed_date: now,
    phase_history: history,
  });
}