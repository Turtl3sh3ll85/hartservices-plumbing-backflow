import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets, waitUntil } from 'base44:runtime';
import { fetchRecategorizeRules, recategorize, applyRecategorizeToStored, fetchPinnableCategories, isNotAJobCategory } from '../../shared/recategorizeRules.ts';
import { runReceiptMatch } from '../../shared/receiptMatching.ts';
import { fetchTransferSettings, evaluateTransfer, detectInternalTransfers } from '../../shared/transferRules.ts';

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
    const resetCursor = body.reset_cursor === true;

    // Transfer settings from the app Settings entity (replaces spreadsheet
    // transfer rules with Plaid's native personal_finance_category).
    const transferSettings = await fetchTransferSettings(base44);

    // Auto-recategorize stored transactions to Transfer / Rebate categories
    // based on payee name rules pulled from the categories spreadsheet.
    let recategorized = { recategorized: 0 };
    let rules = null;
    let pinnableMap = null;
    try {
      rules = await fetchRecategorizeRules(base44);
      pinnableMap = await fetchPinnableCategories(base44);
      recategorized = await applyRecategorizeToStored(base44, 'Transaction', rules, pinnableMap);
    } catch (e) {
      // Non-fatal: connector may be temporarily unavailable.
    }

    for (const item of items) {
      let cursor = resetCursor ? undefined : (item.cursor || undefined);
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
          await upsertTransaction(base44, item, tx, rules, pinnableMap, transferSettings);
          added++;
        }
        for (const tx of (data.modified || [])) {
          await upsertTransaction(base44, item, tx, rules, pinnableMap, transferSettings);
          updated++;
        }
        cursor = data.next_cursor;
        hasMore = data.has_more === true;
      }

      if (resetCursor || (cursor && cursor !== item.cursor)) {
        await base44.asServiceRole.entities.PlaidItem.update(item.id, { cursor });
      }
    }

    // Detect internal vs external transfers via two-sided matching across
    // connected accounts (e.g. GetSequence.io moves between own accounts).
    let transferDetection = { internal: 0, external: 0, updated: 0 };
    if (transferSettings.detectInternal) {
      try {
        transferDetection = await detectInternalTransfers(base44);
      } catch (e) {
        // Non-fatal.
      }
    }

    // Every new transaction batch triggers an AI receipt scan (emails + PDFs)
    // in the background so the sync stays fast.
    if (added > 0) waitUntil(runReceiptMatch(base44));

    return Response.json({ ok: true, items: items.length, added, updated, recategorized, transferDetection });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function upsertTransaction(base44, item, tx, rules, pinnableMap, transferSettings) {
  const plaidId = tx.transaction_id;
  const account = (item.accounts || []).find((a) => a.account_id === tx.account_id);
  const existing = await base44.asServiceRole.entities.Transaction.filter({ plaid_transaction_id: plaidId }, '-created_date', 1);
  const payee = tx.merchant_name || tx.name || '';

  // Plaid native transfer detection (personal_finance_category.primary).
  const transferMatch = evaluateTransfer(tx, transferSettings);

  const payload = {
    plaid_transaction_id: plaidId,
    account_name: account?.name || item.institution_name || '',
    account_mask: account?.mask || '',
    date: tx.date,
    amount: tx.amount || 0,
    payee,
    category: (tx.category || []).join(' > '),
    memo: tx.merchant_name || '',
    last_synced_date: new Date().toISOString(),
  };
  if (transferMatch) {
    payload.plaid_pfc_primary = transferMatch.pfcPrimary;
  }

  const ruleMatch = recategorize(payee, rules);
  const ruleCat = ruleMatch?.category || null;

  if (existing && existing.length) {
    const update = { ...payload };
    const hasCat = existing[0].custom_category && String(existing[0].custom_category).trim();
    // Plaid PFC transfer takes priority over blank/recategorize rules.
    if (transferMatch) {
      update.custom_category = transferMatch.category;
      if (transferMatch.ignore) {
        update.matched = 'ignored';
        update.matched_invoice_id = null;
      }
    } else if (!hasCat && ruleMatch) {
      update.custom_category = ruleCat;
      if (ruleMatch.ignore) {
        update.matched = 'ignored';
        update.matched_invoice_id = null;
      }
    }
    await base44.asServiceRole.entities.Transaction.update(existing[0].id, update);
  } else {
    const create = { ...payload, matched: 'unmatched' };
    if (transferMatch) {
      create.custom_category = transferMatch.category;
      if (transferMatch.ignore) {
        create.matched = 'ignored';
        create.matched_invoice_id = null;
      }
    } else if (ruleMatch) {
      create.custom_category = ruleCat;
      if (ruleMatch.ignore) {
        create.matched = 'ignored';
        create.matched_invoice_id = null;
      }
    }
    if (create.matched === 'unmatched' && isNotAJobCategory(ruleCat || payload.category, pinnableMap)) {
      create.matched = 'not_a_job';
      create.matched_invoice_id = null;
    }
    await base44.asServiceRole.entities.Transaction.create(create);
  }
}