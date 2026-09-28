// Parses a Wave transaction CSV export into expense rows.
// Maps columns by header name; returns [{ date, description, amount, vendor }].
// All parsing happens client-side so the file never leaves the browser.

function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\r|\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (cells[idx] || "").trim(); });
    rows.push(obj);
  }
  return { headers, rows };
}

function findColumn(headers, patterns) {
  return headers.find((h) => patterns.some((p) => p.test(h)));
}

function toNumber(val) {
  if (val == null) return 0;
  const cleaned = String(val).replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function normalizeDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function parseExpensesCsv(text) {
  const { headers, rows } = parseCsv(text);
  if (!rows.length) return [];

  const dateCol = findColumn(headers, [/^transaction date$/, /^posted date$/, /^date$/]);
  const descCol = findColumn(headers, [/^description$/, /^memo$/, /^payee$/, /^narration$/, /^name$/]);
  const vendorCol = findColumn(headers, [/^vendor$/, /^payee$/, /^merchant$/, /^supplier$/]);

  let amountKey = findColumn(headers, [/^amount/]);
  let debitCol = null;
  let creditCol = null;
  if (!amountKey) {
    debitCol = findColumn(headers, [/^debit/]);
    creditCol = findColumn(headers, [/^credit/]);
  }

  const getAmount = (r) => {
    if (amountKey) return toNumber(r[amountKey]);
    return (debitCol ? toNumber(r[debitCol]) : 0) - (creditCol ? toNumber(r[creditCol]) : 0);
  };

  const out = [];
  for (const r of rows) {
    const description = descCol ? r[descCol] : "";
    const amount = getAmount(r);
    if (!description && amount === 0) continue;
    out.push({
      date: normalizeDate(dateCol ? r[dateCol] : ""),
      description: description || "",
      amount,
      vendor: vendorCol ? r[vendorCol] : "",
    });
  }
  return out;
}