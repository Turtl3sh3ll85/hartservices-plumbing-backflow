export function formatCurrency(n) {
  const v = Number(n || 0);
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(d);
  }
}

export function formatDateTime(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return String(d);
  }
}

export function computeTotals(lineItems, taxRate = 0, ccFeeEnabled = false) {
  const subtotal = (lineItems || []).reduce((sum, li) => {
    const base = (Number(li.quantity) || 0) * (Number(li.unit_price) || 0);
    const markup = Number(li.markup) || 0;
    const marked = markup ? base * (1 + markup / 100) : base;
    const mods = (li.modifiers || []).reduce((s, m) => s + (Number(m?.price_adjustment) || 0), 0);
    return sum + marked + mods;
  }, 0);
  const tax = subtotal * (Number(taxRate) || 0) / 100;
  const ccFee = ccFeeEnabled ? Math.round((subtotal * 0.03) * 100) / 100 : 0;
  const total = subtotal + tax + ccFee;
  return { subtotal, tax, cc_fee: ccFee, total };
}

export function paymentAmounts(schedule, total) {
  return (schedule || []).map((p) => {
    if (p.type === 'amount') return Number(p.value) || 0;
    return (Number(total) || 0) * ((Number(p.value) || 0) / 100);
  });
}

export function amountPaidTotal(schedule, total = 0) {
  const amounts = paymentAmounts(schedule, total);
  return (schedule || []).reduce((sum, p, i) => sum + (p.paid ? amounts[i] : 0), 0);
}

export function nextDuePayment(schedule, total) {
  const amounts = paymentAmounts(schedule, total);
  const idx = (schedule || []).findIndex((p) => !p.paid);
  if (idx === -1) return null;
  return { index: idx, payment: schedule[idx], amount: amounts[idx] };
}

export function scheduleIsValid(schedule, total) {
  const list = schedule || [];
  if (!list.length) return true;
  const amounts = paymentAmounts(list, total);
  const sum = amounts.reduce((a, b) => a + b, 0);
  return Math.abs(sum - (Number(total) || 0)) < 0.01;
}