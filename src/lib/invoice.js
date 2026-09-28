export function installmentAmount(item, total) {
  return item.type === "percentage" ? ((Number(total) || 0) * (Number(item.value) || 0)) / 100 : Number(item.value) || 0;
}

export function lineTotal(li) {
  const base = (Number(li?.quantity) || 0) * (Number(li?.unit_price) || 0);
  const markup = Number(li?.markup) || 0;
  const marked = markup ? base * (1 + markup / 100) : base;
  const mods = (li?.modifiers || []).reduce((s, m) => s + (Number(m?.price_adjustment) || 0), 0);
  return marked + mods;
}

export function calcTotals(lineItems = [], taxRate = 0, ccFeeEnabled = false) {
  const subtotal = (lineItems || []).reduce((s, li) => s + lineTotal(li), 0);
  const tax = subtotal * ((Number(taxRate) || 0) / 100);
  const base = subtotal + tax;
  const cc_fee = ccFeeEnabled ? +(base * 0.035).toFixed(2) : 0;
  const total = base + cc_fee;
  return { subtotal, tax, cc_fee, total };
}

export function groupLineItemsBySection(lineItems = []) {
  const order = [];
  const groups = {};
  (lineItems || []).forEach((li) => {
    const s = li.section || "";
    if (!(s in groups)) { groups[s] = []; order.push(s); }
    groups[s].push(li);
  });
  return order.map((s) => ({ section: s, items: groups[s] }));
}

export function formatMoney(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);
}

export function fullAddress(obj, prefix = "") {
  const street = obj[`${prefix}street`] || obj.street || "";
  const city = obj[`${prefix}city`] || obj.city || "";
  const state = obj[`${prefix}state`] || obj.state || "";
  const zip = obj[`${prefix}zip`] || obj.zip || "";
  return [street, `${city}${city && state ? ", " : ""}${state} ${zip}`].filter((p) => p.trim()).join(", ").trim();
}

export function nextNumber(prefix, existing = []) {
  const year = new Date().getFullYear();
  const nums = existing
    .map((s) => (s || "").match(/(\d+)/))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}