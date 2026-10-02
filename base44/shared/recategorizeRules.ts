// Fetches auto-recategorization rules from the categories spreadsheet and applies
// them to transaction payee/name text. Shared by the YNAB and Plaid sync functions
// and by the on-demand refreshRecategorization backend function.
//
// Spreadsheet: 13lEp40pEclIWP2haTyDsCBsEJ75HWim4CNLWElmLhSg
//   - "recategorize" tab: column A = text to search for in the payee/name,
//     column B = the category to recategorize to. A transaction whose payee
//     matches any row's search text is recategorized to that row's category.
//
// Matching is bidirectional: a rule matches when the payee contains the rule text
// OR the rule text contains the payee (case-insensitive), so a short payee like
// "Hartservices" still matches a sheet entry like "Hartservices Plumbing And
// Backflow LLC".

const CATEGORIES_SHEET_ID = "13lEp40pEclIWP2haTyDsCBsEJ75HWim4CNLWElmLhSg";

export async function fetchRecategorizeRules(base44) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googleworkspace");
  const headers = { Authorization: `Bearer ${accessToken}` };

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values/${encodeURIComponent("recategorize")}`,
    { headers },
  );
  const json = await res.json();
  const rules = (json.values || [])
    .slice(1) // skip header row
    .map((r) => ({ text: String(r[0] || "").trim(), category: String(r[1] || "").trim() }))
    .filter((r) => r.text && r.category);

  return { rules };
}

function matches(payee, ruleText) {
  const p = (payee || "").toLowerCase().trim();
  const r = (ruleText || "").toLowerCase().trim();
  if (!p || !r) return false;
  return p.includes(r) || r.includes(p);
}

// Returns the target category if a rule matches the payee/name text, else null.
// Rules are applied in sheet order; the first match wins.
export function recategorize(payee, rules) {
  if (!rules) return null;
  for (const r of rules.rules) {
    if (matches(payee, r.text)) return r.category;
  }
  return null;
}

// Applies the rules across all stored transactions for the given entity.
// Recategorization overrides a blank custom_category OR an auto-applied
// "Personal" tag (the personal-account default bucket), because the sheet rules
// are authoritative reclassifications. Deliberate business categories are
// preserved. Recategorizations to "Transfer" also mark the record ignored.
// Reads the category catalog (first tab) and returns a Map of lowercased
// category name -> pinnable boolean (column C: "true" = pinnable / a job).
// Categories not present in the sheet are left out of the map (unknown).
export async function fetchPinnableCategories(base44) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googleworkspace");
  const headers = { Authorization: `Bearer ${accessToken}` };

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}?fields=sheets.properties.title`,
    { headers },
  );
  const meta = await metaRes.json();
  const firstSheet = meta?.sheets?.[0]?.properties?.title;
  if (!firstSheet) return new Map();

  const valsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values/${encodeURIComponent(firstSheet)}`,
    { headers },
  );
  const vals = await valsRes.json();
  const rows = vals.values || [];

  const map = new Map();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const name = String(row[0] || "").trim();
    if (!name) continue;
    map.set(name.toLowerCase(), String(row[2] || "").trim().toLowerCase() === "true");
  }
  return map;
}

// Returns true when the category is explicitly marked NOT pinnable (column C
// = "false"/blank) in the categories sheet, meaning the transaction is not a
// job and should not be matchable to an invoice. Unknown categories -> false.
export function isNotAJobCategory(category, pinnableMap) {
  if (!pinnableMap) return false;
  const key = (category || "").trim().toLowerCase();
  if (!key || !pinnableMap.has(key)) return false;
  return pinnableMap.get(key) === false;
}

// Applies the rules across all stored transactions for the given entity.
// Recategorization overrides a blank custom_category OR an auto-applied
// "Personal" tag (the personal-account default bucket), because the sheet rules
// are authoritative reclassifications. Deliberate business categories are
// preserved. Recategorizations to "Transfer" also mark the record ignored.
//
// Pinnable pass: column C of the categories sheet decides whether a
// transaction in a category is a matchable job. "false" marks the record
// "not_a_job" and unlinks any invoice; "true" restores it to "unmatched".
export async function applyRecategorizeToStored(base44, entityName, rules, pinnableMap) {
  const entity = base44.asServiceRole.entities[entityName];
  const all = await entity.list("-date", 1000);

  const updates = [];
  for (const t of all) {
    // 1. Recategorize pass: only override blank or "Personal" custom categories.
    const c = (t.custom_category || "").trim().toLowerCase();
    let newCategory = null;
    if (!c || c === "personal") {
      for (const r of rules.rules) {
        if (matches(t.payee, r.text)) { newCategory = r.category; break; }
      }
    }

    const effectiveCategory = (newCategory || t.custom_category || t.category || "").trim();
    const patch = { id: t.id };
    let changed = false;

    if (newCategory) {
      patch.custom_category = newCategory;
      changed = true;
      if (newCategory.toLowerCase() === "transfer") {
        patch.matched = "ignored";
        patch.matched_invoice_id = null;
      }
    }

    // 2. Pinnable pass (column C of the categories sheet).
    if (pinnableMap && effectiveCategory) {
      const key = effectiveCategory.toLowerCase();
      if (pinnableMap.has(key)) {
        const pinnable = pinnableMap.get(key);
        if (!pinnable && t.matched !== "not_a_job") {
          patch.matched = "not_a_job";
          patch.matched_invoice_id = null;
          changed = true;
        } else if (pinnable && t.matched === "not_a_job") {
          patch.matched = "unmatched";
          changed = true;
        }
      }
    }

    if (changed) updates.push(patch);
  }

  for (let i = 0; i < updates.length; i += 500) {
    await entity.bulkUpdate(updates.slice(i, i + 500));
  }
  return { recategorized: updates.length };
}