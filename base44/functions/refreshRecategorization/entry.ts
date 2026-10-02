import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { fetchRecategorizeRules, applyRecategorizeToStored, fetchPinnableCategories } from '../../shared/recategorizeRules.ts';

// Re-applies the spreadsheet recategorization rules to all stored Plaid and
// YNAB transactions. Used by the "Force refresh" button on the transactions page
// so that edits to the "recategorize" tab take effect immediately, without
// waiting for the next scheduled sync.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'accountant') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rules = await fetchRecategorizeRules(base44);
    const pinnableMap = await fetchPinnableCategories(base44);
    const plaid = await applyRecategorizeToStored(base44, 'Transaction', rules, pinnableMap);
    const ynab = await applyRecategorizeToStored(base44, 'YnabTransaction', rules, pinnableMap);

    return Response.json({
      ok: true,
      plaid: plaid.recategorized,
      ynab: ynab.recategorized,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}