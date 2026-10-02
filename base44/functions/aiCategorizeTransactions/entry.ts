import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  fetchRecategorizeRules,
  fetchPinnableCategories,
  applyRecategorizeToStored,
} from '../../shared/recategorizeRules.ts';

const CATEGORIES_SHEET_ID = '13lEp40pEclIWP2haTyDsCBsEJ75HWim4CNLWElmLhSg';
const PAYEES_PER_CALL = 12;
const MAX_PAYEES_PER_RUN = 60;

// "Deep think" auto-categorizer: finds transactions with no category, groups
// them by payee, and asks an LLM (with web search) what kind of company each
// payee actually is. It then writes new payee -> category rules into the
// "recategorize" tab of the categories spreadsheet and adds any brand-new
// categories to the first tab (with a tax type + pinnable flag), so future
// syncs auto-categorize the same payees. Finally it re-applies the rules to
// stored Plaid + YNAB transactions so the change is immediate.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'accountant') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googleworkspace');
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // 1. Load existing category names + recategorize rules.
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}?fields=sheets.properties.title`,
      { headers },
    );
    const meta = await metaRes.json();
    const firstSheet = meta?.sheets?.[0]?.properties?.title;
    if (!firstSheet) return Response.json({ error: 'Spreadsheet has no sheets.' }, { status: 400 });

    const catValsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values/${encodeURIComponent(firstSheet)}`,
      { headers },
    );
    const catVals = await catValsRes.json();
    const catRows = catVals.values || [];
    const existingCategories = new Set();
    for (let i = 1; i < catRows.length; i++) {
      const name = String((catRows[i] || [])[0] || '').trim();
      if (name) existingCategories.add(name.toLowerCase());
    }

    const rules = await fetchRecategorizeRules(base44);
    const rulePayees = new Set(rules.rules.map((r) => r.text.toLowerCase()));

    // 2. Find uncategorized payees (no custom category, not ignored, no rule yet).
    const plaidTxs = await base44.asServiceRole.entities.Transaction.list('-date', 1000);
    const ynabTxs = await base44.asServiceRole.entities.YnabTransaction.list('-date', 1000);
    const payeeSet = new Set();
    const collect = (list) => {
      for (const t of list) {
        if (t.matched === 'ignored' || t.matched === 'not_a_job') continue;
        if ((t.custom_category || '').trim()) continue;
        const payee = (t.payee || '').trim();
        if (!payee) continue;
        if (rulePayees.has(payee.toLowerCase())) continue;
        payeeSet.add(payee);
      }
    };
    collect(plaidTxs);
    collect(ynabTxs);

    let payees = Array.from(payeeSet);
    if (payees.length > MAX_PAYEES_PER_RUN) payees = payees.slice(0, MAX_PAYEES_PER_RUN);

    if (payees.length === 0) {
      return Response.json({ ok: true, scanned: 0, categorized: 0, newCategories: 0, message: 'No uncategorized payees found.' });
    }

    // 3. Ask the LLM (with web search) what kind of company each payee is.
    const decisions = [];
    for (let i = 0; i < payees.length; i += PAYEES_PER_CALL) {
      const batch = payees.slice(i, i + PAYEES_PER_CALL);
      const prompt = `You are an accounting assistant for a plumbing & backflow service business.
For each transaction payee below, use web search to determine what kind of company it actually is,
then assign the best matching accounting category.

Category name rules — STRICT:
- Short and concise: 1-3 words max (e.g. "Auto Parts", "Software", "Hardware", "Fuel", "Insurance").
- Flat, never tiered: no "Parent > Child", no "Category - Subcategory", no slashes, no colons.
- Plain nouns/short phrases only, title case.
- Reuse an existing category whenever it clearly fits; only propose a new one when nothing fits.

Also classify each payee:
- tax_type: "business" if it's a business expense, "personal" if it's a personal/non-deductible charge.
- pinnable: true if this category could represent a billable job (materials/labor for a customer project),
  false if it's an overhead/operating expense.

Existing categories to prefer: ${Array.from(existingCategories).slice(0, 80).join(', ') || '(none yet)'}

Payees to classify:
${batch.map((p, idx) => `${idx + 1}. ${p}`).join('\n')}

Return ONLY the decisions array.`;

      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: 'gemini_3_8_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            decisions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  payee: { type: 'string' },
                  category: { type: 'string' },
                  tax_type: { type: 'string', enum: ['business', 'personal'] },
                  pinnable: { type: 'boolean' },
                },
                required: ['payee', 'category', 'tax_type', 'pinnable'],
              },
            },
          },
          required: ['decisions'],
        },
      });

      const data = llmRes?.decisions || llmRes?.data?.decisions || [];
      for (const d of data) {
        if (!d || !d.payee || !d.category) continue;
        decisions.push({
          payee: String(d.payee).trim(),
          category: String(d.category).trim(),
          tax_type: d.tax_type === 'personal' ? 'personal' : 'business',
          pinnable: !!d.pinnable,
        });
      }
    }

    if (decisions.length === 0) {
      return Response.json({ ok: true, scanned: payees.length, categorized: 0, newCategories: 0, message: 'AI returned no decisions.' });
    }

    // 4. Append new categories to the first tab (category catalog).
    const newCategories = [];
    const seenNew = new Set();
    for (const d of decisions) {
      const key = d.category.toLowerCase();
      if (existingCategories.has(key) || seenNew.has(key)) continue;
      seenNew.add(key);
      newCategories.push([d.category, d.tax_type, d.pinnable ? 'true' : 'false']);
    }
    if (newCategories.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values/${encodeURIComponent(firstSheet)}!A:C:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ values: newCategories }),
        },
      );
    }

    // 5. Append payee -> category rules to the "recategorize" tab.
    const ruleRows = decisions.map((d) => [d.payee, d.category, '']);
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values/${encodeURIComponent('recategorize')}!A:C:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ values: ruleRows }),
      },
    );

    // 6. Re-apply all rules to stored transactions so the change is immediate.
    const refreshedRules = await fetchRecategorizeRules(base44);
    const pinnableMap = await fetchPinnableCategories(base44);
    const plaid = await applyRecategorizeToStored(base44, 'Transaction', refreshedRules, pinnableMap);
    const ynab = await applyRecategorizeToStored(base44, 'YnabTransaction', refreshedRules, pinnableMap);

    return Response.json({
      ok: true,
      scanned: payees.length,
      categorized: decisions.length,
      newCategories: newCategories.length,
      applied: { plaid: plaid.recategorized, ynab: ynab.recategorized },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}