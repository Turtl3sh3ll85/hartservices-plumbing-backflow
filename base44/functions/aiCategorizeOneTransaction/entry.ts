import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { fetchCategoryDefinitions, formatCategoryGuidelines, ensureCategoryDefinition } from '../../shared/categoryDefinitions.ts';

const CATEGORIES_SHEET_ID = '13lEp40pEclIWP2haTyDsCBsEJ75HWim4CNLWElmLhSg';

// AI-categorizes a single payee (with web search), writes the payee -> category
// rule into the recategorize tab (updating the row in place if the payee already
// has one), adds the category to the catalog tab if it is new, and returns the
// short flat category name so the caller can apply it to the transaction.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'accountant') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const payee = String(body.payee || '').trim();
    if (!payee) return Response.json({ error: 'payee is required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googleworkspace');
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // 0. Load category definitions (name + description) for the AI prompt.
    const defMap = await fetchCategoryDefinitions(base44);

    // 1. Load existing category names (catalog tab).
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

    // 2. Ask the LLM (with web search) what kind of company this payee is.
    const prompt = `You are an accounting assistant for a plumbing & backflow service business.
Use web search to determine what kind of company this transaction payee actually is, then assign
the best matching accounting category.

Category name rules — STRICT:
- Short and concise: 1-3 words max (e.g. "Auto Parts", "Software", "Hardware", "Fuel", "Insurance").
- Flat, never tiered: no "Parent > Child", no "Category - Subcategory", no slashes, no colons.
- Plain nouns/short phrases only, title case.
- Reuse an existing category whenever it clearly fits; only propose a new one when nothing fits.

Also classify:
- tax_type: "business" if it's a business expense, "personal" if it's a personal/non-deductible charge.
- pinnable: true if this category could represent a billable job (materials/labor for a customer project),
  false if it's an overhead/operating expense.

Existing categories to prefer: ${Array.from(existingCategories).slice(0, 80).join(', ') || '(none yet)'}

Category application guidelines (follow these when deciding which category fits):
${formatCategoryGuidelines(defMap)}

Payee to classify: ${payee}

Return ONLY the decision object.`;

    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          decision: {
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
        required: ['decision'],
      },
    });

    const d = llmRes?.decision || llmRes?.data?.decision;
    if (!d || !d.category) return Response.json({ error: 'AI returned no decision.' }, { status: 500 });

    const category = String(d.category).trim();
    const tax_type = d.tax_type === 'personal' ? 'personal' : 'business';
    const pinnable = !!d.pinnable;

    // 3. Add the category to the catalog tab if it is new.
    if (!existingCategories.has(category.toLowerCase())) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values/${encodeURIComponent(firstSheet)}!A:C:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ values: [[category, tax_type, pinnable ? 'true' : 'false']] }),
        },
      );
      // Also create a TransactionCategory record so it appears in the Settings
      // category manager for the user to define a description.
      await ensureCategoryDefinition(base44, category, tax_type, pinnable);
    }

    // 4. Write/update the payee -> category rule in the recategorize tab.
    const recatValsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values/${encodeURIComponent('recategorize')}`,
      { headers },
    );
    const recatVals = await recatValsRes.json();
    const recatRows = recatVals.values || [];
    let existingRow = 0;
    for (let i = 1; i < recatRows.length; i++) {
      if (String((recatRows[i] || [])[0] || '').trim().toLowerCase() === payee.toLowerCase()) {
        existingRow = i + 1; // 1-based sheet row
        break;
      }
    }
    if (existingRow > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values:batchUpdate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            valueInputOption: 'RAW',
            data: [{ range: `recategorize!B${existingRow}`, values: [[category]] }],
          }),
        },
      );
    } else {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values/${encodeURIComponent('recategorize')}!A:C:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ values: [[payee, category, '']] }),
        },
      );
    }

    return Response.json({ ok: true, payee, category, tax_type, pinnable });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}