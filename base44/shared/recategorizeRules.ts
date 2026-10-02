// Fetches auto-recategorization rules from the categories spreadsheet and applies
// them to transaction payee/name text. Shared by the YNAB and Plaid sync functions.
//
// Spreadsheet: 13lEp40pEclIWP2haTyDsCBsEJ75HWim4CNLWElmLhSg
//   - "recategorize to transfer": single column of payee name substrings. A
//     transaction whose payee matches any of these is recategorized to "Transfer".
//   - "recategorize to rebate":   [text, category] pairs. A transaction whose
//     payee matches the text is recategorized to the paired category.
//
// Matching is bidirectional: a rule matches when the payee contains the rule text
// OR the rule text contains the payee (case-insensitive), so a short payee like
// "Hartservices" still matches a sheet entry like "Hartservices Plumbing And
// Backflow LLC".

const CATEGORIES_SHEET_ID = "13lEp40pEclIWP2haTyDsCBsEJ75HWim4CNLWElmLhSg";

export async function fetchRecategorizeRules(base44) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googleworkspace");
  const headers = { Authorization: `Bearer ${accessToken}` };

  const transferRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values/${encodeURIComponent("recategorize to transfer")}`,
    { headers },
  );
  const transferJson = await transferRes.json();
  const transferNames = (transferJson.values || [])
    .slice(1)
    .map((r) => String(r[0] || "").trim())
    .filter(Boolean);

  const rebateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values/${encodeURIComponent("recategorize to rebate")}`,
    { headers },
  );
  const rebateJson = await rebateRes.json();
  const rebateRules = (rebateJson.values || [])
    .slice(1)
    .map((r) => ({ text: String(r[0] || "").trim(), category: String(r[1] || "").trim() }))
    .filter((r) => r.text && r.category);

  return { transferNames, rebateRules };
}

function matches(payee, ruleText) {
  const p = (payee || "").toLowerCase().trim();
  const r = (ruleText || "").toLowerCase().trim();
  if (!p || !r) return false;
  return p.includes(r) || r.includes(p);
}

// Returns the target category if a rule matches the payee/name text, else null.
// Transfer rules take precedence over rebate rules.
export function recategorize(payee, rules) {
  if (!rules) return null;
  for (const t of rules.transferNames) {
    if (matches(payee, t)) return "Transfer";
  }
  for (const r of rules.rebateRules) {
    if (matches(payee, r.text)) return r.category;
  }
  return null;
}

// Applies the rules across all stored transactions for the given entity.
// Only transactions without an existing custom_category are recategorized
// (manual categorizations are preserved). Transfer recategorizations also mark
// the record ignored. Uses client-side bidirectional matching.
export async function applyRecategorizeToStored(base44, entityName, rules) {
  const entity = base44.asServiceRole.entities[entityName];
  const all = await entity.list("-date", 1000);
  const blank = all.filter(
    (t) => !t.custom_category || !String(t.custom_category).trim(),
  );

  const transferUpdates = [];
  const rebateUpdates = [];
  for (const t of blank) {
    let matched = false;
    for (const name of rules.transferNames) {
      if (matches(t.payee, name)) {
        transferUpdates.push({
          id: t.id,
          custom_category: "Transfer",
          matched: "ignored",
          matched_invoice_id: null,
        });
        matched = true;
        break;
      }
    }
    if (matched) continue;
    for (const r of rules.rebateRules) {
      if (matches(t.payee, r.text)) {
        rebateUpdates.push({ id: t.id, custom_category: r.category });
        break;
      }
    }
  }

  if (transferUpdates.length) await entity.bulkUpdate(transferUpdates);
  if (rebateUpdates.length) await entity.bulkUpdate(rebateUpdates);

  return { transferCount: transferUpdates.length, rebateCount: rebateUpdates.length };
}