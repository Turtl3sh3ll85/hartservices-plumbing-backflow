import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

function plaidBaseUrl() {
  const env = (secrets.get('PLAID_ENV') || 'sandbox').toLowerCase();
  if (env === 'production') return 'https://production.plaid.com';
  if (env === 'development') return 'https://development.plaid.com';
  return 'https://sandbox.plaid.com';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};
    const fromWorkflow = body.from_workflow === true;

    // Auth: workflow calls skip user check; direct calls require admin/accountant
    if (!fromWorkflow) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin' && user.role !== 'accountant') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const clientId = secrets.get('PLAID_CLIENT_ID');
    const secret = secrets.get('PLAID_SECRET');
    if (!clientId || !secret) {
      return Response.json({ error: 'Plaid credentials not configured (PLAID_CLIENT_ID / PLAID_SECRET)' }, { status: 500 });
    }

    // Get all connected Plaid items
    const items = await base44.asServiceRole.entities.PlaidItem.list('-created_date', 100);
    if (!items || items.length === 0) {
      return Response.json({ message: 'No Plaid items to sync', items_synced: 0, transactions_added: 0 });
    }

    const base = plaidBaseUrl();
    let totalAdded = 0;
    let totalRemoved = 0;
    const errors = [];

    for (const item of items) {
      try {
        // Build account_id → name map from stored accounts
        const accountMap = new Map();
        for (const acc of (item.accounts || [])) {
          accountMap.set(acc.account_id, acc.name || (acc.mask ? `****${acc.mask}` : acc.account_id));
        }

        // Fetch existing Plaid-sourced transactions for this item to avoid duplicates
        const existing = await base44.asServiceRole.entities.YnabTransaction.list('-date', 500);
        const existingIds = new Set(
          (existing || [])
            .filter((t) => (t.ynab_id || '').startsWith(`plaid_${item.item_id}_`))
            .map((t) => t.ynab_id)
        );
        const existingByPlaidId = new Map(
          (existing || [])
            .filter((t) => (t.ynab_id || '').startsWith(`plaid_${item.item_id}_`))
            .map((t) => [t.ynab_id, t])
        );

        let cursor = item.cursor || undefined;
        let hasMore = true;
        let itemAdded = 0;
        let itemRemoved = 0;
        let retried = false;

        while (hasMore) {
          const syncRes = await fetch(`${base}/transactions/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: clientId,
              secret,
              access_token: item.access_token,
              cursor,
            }),
          });

          if (!syncRes.ok) {
            const errBody = await syncRes.json().catch(() => null);
            // Stale cursor — Plaid asks us to restart pagination from scratch
            if (errBody?.error_code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' && !retried) {
              retried = true;
              cursor = undefined;
              continue;
            }
            const errText = await syncRes.text();
            throw new Error(`Plaid API ${syncRes.status}: ${errText}`);
          }

          const data = await syncRes.json();
          const added = data.added || [];
          const removed = data.removed || [];

          // Create new transactions
          const toCreate = [];
          for (const tx of added) {
            const txId = `plaid_${item.item_id}_${tx.transaction_id}`;
            if (existingIds.has(txId)) continue;

            const accountName = accountMap.get(tx.account_id) || item.institution_name || 'Plaid Account';
            toCreate.push({
              ynab_id: txId,
              account_name: accountName,
              date: tx.date,
              amount: Math.round((tx.amount || 0) * 1000), // dollars → milliunits
              payee: tx.merchant_name || tx.name || 'Unknown',
              category: (tx.category || []).join(' > '),
              memo: tx.pending ? 'Pending' : '',
              cleared: tx.pending ? 'uncleared' : 'cleared',
              matched: 'unmatched',
              last_synced_date: new Date().toISOString(),
            });
            existingIds.add(txId);
          }

          if (toCreate.length > 0) {
            await base44.asServiceRole.entities.YnabTransaction.bulkCreate(toCreate);
            itemAdded += toCreate.length;
          }

          // Delete removed transactions
          for (const tx of removed) {
            const txId = `plaid_${item.item_id}_${tx.transaction_id}`;
            const existingTx = existingByPlaidId.get(txId);
            if (existingTx) {
              await base44.asServiceRole.entities.YnabTransaction.delete(existingTx.id);
              itemRemoved++;
            }
          }

          cursor = data.next_cursor;
          hasMore = data.has_more === true;
        }

        // Persist the latest cursor so the next run is incremental
        await base44.asServiceRole.entities.PlaidItem.update(item.id, { cursor });

        totalAdded += itemAdded;
        totalRemoved += itemRemoved;
      } catch (err) {
        errors.push({ item_id: item.item_id, institution: item.institution_name, error: err.message });
      }
    }

    return Response.json({
      message: 'Plaid sync complete',
      items_synced: items.length,
      transactions_added: totalAdded,
      transactions_removed: totalRemoved,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}