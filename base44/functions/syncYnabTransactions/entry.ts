import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

const YNAB_BASE = 'https://api.ynab.com/v1';

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

    const token = secrets.get('YNAB_ACCESS_TOKEN');
    if (!token) return Response.json({ error: 'YNAB_ACCESS_TOKEN not set' }, { status: 500 });

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 1. List budgets, pick the first
    const budgetRes = await fetch(`${YNAB_BASE}/budgets`, { headers });
    if (!budgetRes.ok) {
      const err = await budgetRes.text();
      return Response.json({ error: `YNAB budgets failed: ${err}` }, { status: 502 });
    }
    const budgetJson = await budgetRes.json();
    const budgets = budgetJson?.data?.budgets || [];
    if (!budgets.length) return Response.json({ error: 'No YNAB budgets found' }, { status: 400 });
    const budgetId = budgets[0].id;

    // Fetch account names
    const accountsRes = await fetch(`${YNAB_BASE}/budgets/${budgetId}/accounts`, { headers });
    const accountsJson = await accountsRes.json();
    const accountMap = Object.fromEntries((accountsJson?.data?.accounts || []).map((a) => [a.id, a.name]));

    // Account labels (personal/business/routing + merges)
    const labels = await base44.asServiceRole.entities.AccountLabel.list();
    const labelType = Object.fromEntries(labels.filter((l) => l.type).map((l) => [l.account_name, l.type]));
    const mergeInto = Object.fromEntries(labels.filter((l) => l.merge_into).map((l) => [l.account_name, l.merge_into]));
    const resolveType = (name) => {
      let cur = name;
      const seen = new Set();
      while (mergeInto[cur] && !seen.has(cur)) { seen.add(cur); cur = mergeInto[cur]; }
      return labelType[cur] || null;
    };

    // 2. Determine since_date
    let sinceDate = body.since_date;
    if (!sinceDate) {
      const existing = await base44.asServiceRole.entities.YnabTransaction.list('-last_synced_date', 1);
      const last = existing[0];
      if (last?.date) {
        const d = new Date(last.date);
        d.setDate(d.getDate() - 3);
        sinceDate = d.toISOString().slice(0, 10);
      } else {
        const d = new Date();
        d.setDate(d.getDate() - 60);
        sinceDate = d.toISOString().slice(0, 10);
      }
    }

    // 3. Fetch transactions
    const txRes = await fetch(`${YNAB_BASE}/budgets/${budgetId}/transactions?since_date=${sinceDate}`, { headers });
    if (!txRes.ok) {
      const err = await txRes.text();
      return Response.json({ error: `YNAB transactions failed: ${err}` }, { status: 502 });
    }
    const txJson = await txRes.json();
    const transactions = txJson?.data?.transactions || [];

    // 4. Build existing map by ynab_id
    const allExisting = await base44.asServiceRole.entities.YnabTransaction.list('-date', 1000);
    const existingMap = Object.fromEntries(allExisting.map((t) => [t.ynab_id, t]));

    const now = new Date().toISOString();
    const toCreate = [];
    const toUpdate = [];

    for (const tx of transactions) {
      const dollars = Math.round((Number(tx.amount) || 0) / 1000 * 100) / 100;
      const accountName = accountMap[tx.account_id] || '';
      const isPersonal = resolveType(accountName) === 'personal';
      const record = {
        ynab_id: tx.id,
        account_name: accountName,
        date: tx.date,
        amount: dollars,
        payee: tx.payee_name || '',
        category: tx.category_name || '',
        memo: tx.memo || '',
        cleared: tx.cleared || '',
        last_synced_date: now,
      };
      if (isPersonal) record.custom_category = 'Personal';
      const existing = existingMap[tx.id];
      if (existing) {
        const updatePayload = {
          id: existing.id,
          account_name: record.account_name,
          date: record.date,
          amount: record.amount,
          payee: record.payee,
          category: record.category,
          memo: record.memo,
          cleared: record.cleared,
          last_synced_date: now,
        };
        if (isPersonal && !existing.custom_category) updatePayload.custom_category = 'Personal';
        toUpdate.push(updatePayload);
      } else {
        toCreate.push(record);
      }
    }

    let created = 0;
    let updated = 0;
    if (toCreate.length) {
      await base44.asServiceRole.entities.YnabTransaction.bulkCreate(toCreate);
      created = toCreate.length;
    }
    if (toUpdate.length) {
      await base44.asServiceRole.entities.YnabTransaction.bulkUpdate(toUpdate);
      updated = toUpdate.length;
    }

    return Response.json({
      ok: true,
      budget_id: budgetId,
      since_date: sinceDate,
      fetched: transactions.length,
      created,
      updated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}