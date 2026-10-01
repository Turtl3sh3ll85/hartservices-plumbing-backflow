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

    if (!fromWorkflow) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin' && user.role !== 'accountant') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const clientId = secrets.get('PLAID_CLIENT_ID');
    const secret = secrets.get('PLAID_SECRET');
    if (!clientId || !secret) return Response.json({ error: 'Plaid credentials not configured' }, { status: 500 });
    const base = plaidBaseUrl();

    const items = await base44.asServiceRole.entities.PlaidItem.list('-created_date', 50);
    let added = 0;
    let updated = 0;

    for (const item of items) {
      let cursor = item.cursor || undefined;
      let hasMore = true;
      let retried = false;

      while (hasMore) {
        const syncRes = await fetch(`${base}/transactions/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, secret, access_token: item.access_token, cursor, count: 100 }),
        });

        if (!syncRes.ok) {
          const errText = await syncRes.text();
          if (!retried && /SYNC|cursor|INVALID_CURSOR/i.test(errText)) {
            cursor = undefined;
            retried = true;
            continue;
          }
          throw new Error(`Plaid ${syncRes.status}: ${errText}`);
        }

        const data = await syncRes.json();
        for (const tx of (data.added || [])) {
          await upsertTransaction(base44, item, tx);
          added++;
        }
        for (const tx of (data.modified || [])) {
          await upsertTransaction(base44, item, tx);
          updated++;
        }
        cursor = data.next_cursor;
        hasMore = data.has_more === true;
      }

      if (cursor && cursor !== item.cursor) {
        await base44.asServiceRole.entities.PlaidItem.update(item.id, { cursor });
      }
    }

    return Response.json({ ok: true, items: items.length, added, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function upsertTransaction(base44, item, tx) {
  const plaidId = tx.transaction_id;
  const account = (item.accounts || []).find((a) => a.account_id === tx.account_id);
  const existing = await base44.asServiceRole.entities.Transaction.filter({ plaid_transaction_id: plaidId }, '-created_date', 1);
  const payload = {
    plaid_transaction_id: plaidId,
    account_name: account?.name || item.institution_name || '',
    account_mask: account?.mask || '',
    date: tx.date,
    amount: tx.amount || 0,
    payee: tx.merchant_name || tx.name || '',
    category: (tx.category || []).join(' > '),
    memo: tx.merchant_name || '',
    last_synced_date: new Date().toISOString(),
  };
  if (existing && existing.length) {
    await base44.asServiceRole.entities.Transaction.update(existing[0].id, payload);
  } else {
    await base44.asServiceRole.entities.Transaction.create({ ...payload, matched: 'unmatched' });
  }
}