// Transfer auto-categorization and internal-transfer detection.
//
// Uses Plaid's native personal_finance_category.primary field (TRANSFER_IN /
// TRANSFER_OUT) to auto-categorize transfers — more reliable than spreadsheet
// text-matching because Plaid tags every transfer automatically, including from
// platforms like GetSequence.io, without manual payee rules.
//
// Internal vs external: Plaid cannot natively distinguish the two, but if both
// the source and destination accounts are connected, a debit on Account A and
// a credit on Account B for the same amount within a few days is an internal
// transfer. No matching counterpart = external. This runs after each sync.

const TRANSFER_PFC_PREFIX = "TRANSFER";

// Returns the transfer settings from the Settings entity, with defaults.
export async function fetchTransferSettings(base44) {
  const list = await base44.asServiceRole.entities.Settings.list("-created_date", 1);
  const s = list[0] || {};
  return {
    autoCategorize: s.auto_categorize_transfers !== false,
    ignore: s.ignore_transfers !== false,
    categoryName: (s.transfer_category_name || "Transfer").trim() || "Transfer",
    internalCategoryName: (s.internal_transfer_category_name || "Internal Transfer").trim() || "Internal Transfer",
    externalCategoryName: (s.external_transfer_category_name || "External Transfer").trim() || "External Transfer",
    detectInternal: s.detect_internal_transfers !== false,
    autoIgnoreCategories: Array.isArray(s.auto_ignore_categories) ? s.auto_ignore_categories : [],
  };
}

// Returns true when the Plaid transaction's personal_finance_category.primary
// indicates a transfer (TRANSFER_IN or TRANSFER_OUT).
export function isPlaidTransfer(tx) {
  const pfc = tx?.personal_finance_category?.primary || "";
  return pfc.toUpperCase().startsWith(TRANSFER_PFC_PREFIX);
}

// Returns { category, ignore, pfcPrimary } for a Plaid transfer, or null when
// transfers are not enabled / the transaction is not a transfer.
//
// External transfers are never ignored:
//  - TRANSFER_IN (money in) → categorized as "Income"
//  - TRANSFER_OUT (payment out) → no category set, falls through to the
//    recategorize rules so it gets categorized like any other expense.
// Internal vs external is resolved later by detectInternalTransfers, which
// reclassifies matched pairs as internal transfers (and ignores them if the
// setting is on).
export function evaluateTransfer(tx, settings) {
  if (!settings?.autoCategorize) return null;
  const pfc = tx?.personal_finance_category?.primary || "";
  if (!isPlaidTransfer(tx)) return null;
  const isIncoming = pfc.toUpperCase() === "TRANSFER_IN";
  return {
    category: isIncoming ? "Income" : null,
    ignore: false,
    pfcPrimary: pfc,
  };
}

// Returns true when the transaction's Plaid PFC primary matches one of the
// additional auto-ignore categories configured in Settings (beyond transfers).
export function matchesAutoIgnoreCategory(tx, settings) {
  const cats = settings?.autoIgnoreCategories;
  if (!cats || !cats.length) return null;
  const pfc = (tx?.personal_finance_category?.primary || "").toUpperCase();
  if (!pfc) return null;
  const match = cats.find((c) => (c || "").trim().toUpperCase() === pfc);
  return match ? pfc : null;
}

// Two-sided matching: pairs debits and credits across connected accounts by
// amount (exact absolute-value match) and date (within ±3 days). Paired
// records get transfer_type "internal"; unpaired transfers get "external".
// Only runs on transactions already tagged as transfers (plaid_pfc_primary set).
export async function detectInternalTransfers(base44, settings) {
  if (!settings) settings = await fetchTransferSettings(base44);
  const all = await base44.asServiceRole.entities.Transaction.list("-date", 1000);
  const transfers = all.filter((t) => t.plaid_pfc_primary && t.amount != null);

  // Group by absolute amount for quick pair lookup.
  const byAbsAmount = new Map();
  for (const t of transfers) {
    const key = Math.abs(t.amount).toFixed(2);
    if (!byAbsAmount.has(key)) byAbsAmount.set(key, []);
    byAbsAmount.get(key).push(t);
  }

  const updates = [];
  for (const t of transfers) {
    const key = Math.abs(t.amount).toFixed(2);
    const candidates = (byAbsAmount.get(key) || []).filter(
      (c) =>
        c.id !== t.id &&
        c.account_name !== t.account_name &&
        Math.sign(c.amount) !== Math.sign(t.amount) &&
        withinDays(t.date, c.date, 3),
    );

    const isInternal = candidates.length > 0;

    if (isInternal) {
      // Internal transfers: categorize as internal, optionally ignore.
      const newCat = settings.internalCategoryName;
      const patch = { id: t.id, transfer_type: "internal", custom_category: newCat };
      if (settings.ignore) {
        patch.matched = "ignored";
        patch.matched_invoice_id = null;
      }
      if (
        t.transfer_type !== "internal" ||
        t.custom_category !== newCat ||
        (settings.ignore && t.matched !== "ignored")
      ) {
        updates.push(patch);
      }
    } else {
      // External: only set transfer_type — leave category (Income for incoming,
      // recategorized for outgoing) and matched status untouched.
      if (t.transfer_type !== "external") {
        updates.push({ id: t.id, transfer_type: "external" });
      }
    }
  }

  if (!updates.length) return { internal: 0, external: 0, updated: 0 };

  for (let i = 0; i < updates.length; i += 500) {
    await base44.asServiceRole.entities.Transaction.bulkUpdate(updates.slice(i, i + 500));
  }

  return {
    updated: updates.length,
    internal: updates.filter((u) => u.transfer_type === "internal").length,
    external: updates.filter((u) => u.transfer_type === "external").length,
  };
}

function withinDays(dateA, dateB, days) {
  if (!dateA || !dateB) return false;
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  if (isNaN(a) || isNaN(b)) return false;
  return Math.abs(a - b) <= days * 86400000;
}