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
export async function applyRecategorizeToStored(base44, entityName, rules) {
  const entity = base44.asServiceRole.entities[entityName];
  const all = await entity.list("-date", 1000);
  const candidates = all.filter((t) => {
    const c = (t.custom_category || "").trim().toLowerCase();
    return !c || c === "personal";
  });

  const updates = [];
  for (const t of candidates) {
    for (const r of rules.rules) {
      if (matches(t.payee, r.text)) {
        const patch = { id: t.id, custom_category: r.category };
        if (r.category.toLowerCase() === "transfer") {
          patch.matched = "ignored";
          patch.matched_invoice_id = null;
        }
        updates.push(patch);
        break;
      }
    }
  }

  if (updates.length) await entity.bulkUpdate(updates);
  return { recategorized: updates.length };
}