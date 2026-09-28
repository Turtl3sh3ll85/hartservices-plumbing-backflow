import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

function findHeaderIndex(headers, candidates) {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || "").toLowerCase().trim();
    if (!h) continue;
    if (candidates.some((c) => h.includes(c))) return i;
  }
  return -1;
}

function parseAmount(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[$,]/g, "").replace(/\(/g, "-").replace(/\)/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // try MM/DD/YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
    const dd = new Date(`${yr}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`);
    if (!isNaN(dd.getTime())) return dd.toISOString().slice(0, 10);
  }
  return null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "accountant") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const settingsList = await base44.asServiceRole.entities.Settings.list();
    const settings = settingsList[0];
    const sheetId = settings?.wave_sheet_id;
    if (!sheetId) {
      return Response.json({ error: "No Wave transactions Google Sheet ID configured. Add it in Settings." }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googleworkspace");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/A:Z`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const t = await res.text();
      return Response.json({ error: `Google Sheets API error (${res.status}): ${t}` }, { status: 502 });
    }
    const data = await res.json();
    const rows = data.values || [];
    if (rows.length < 2) return Response.json({ imported: 0, skipped: 0, total: 0, message: "The sheet is empty." });

    // locate the header row within the first 10 rows
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i].map((c) => String(c || "").toLowerCase());
      const hasDate = row.some((c) => c.includes("date"));
      const hasAmount = row.some((c) => c.includes("amount") || c.includes("debit") || c.includes("credit"));
      const hasDesc = row.some((c) => c.includes("description") || c.includes("memo"));
      if (hasDate && (hasAmount || hasDesc)) { headerRowIdx = i; break; }
    }
    const headers = rows[headerRowIdx].map((c) => String(c || ""));
    const dateIdx = findHeaderIndex(headers, ["date"]);
    const descIdx = findHeaderIndex(headers, ["description", "memo", "transaction"]);
    const amountIdx = findHeaderIndex(headers, ["amount", "debit", "credit", "value"]);
    const vendorIdx = findHeaderIndex(headers, ["vendor", "payee", "account"]);
    const catIdx = findHeaderIndex(headers, ["category"]);

    if (dateIdx < 0 && descIdx < 0 && amountIdx < 0) {
      return Response.json({ error: "Couldn't find transaction columns (Date / Description / Amount) in the sheet." }, { status: 400 });
    }

    const newRows = [];
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => !String(c || "").trim())) continue;
      const date = dateIdx >= 0 ? parseDate(row[dateIdx]) : null;
      const description = descIdx >= 0 ? String(row[descIdx] || "").trim() : "";
      const amount = amountIdx >= 0 ? parseAmount(row[amountIdx]) : null;
      if (!description && amount == null && !date) continue;
      newRows.push({
        date: date || new Date().toISOString().slice(0, 10),
        description: description || "(no description)",
        amount: amount != null ? Math.abs(amount) : 0,
        vendor: vendorIdx >= 0 ? String(row[vendorIdx] || "").trim() : "",
        category: catIdx >= 0 ? String(row[catIdx] || "").trim() : "",
        invoice_id: "",
        source: "wave_sheet",
      });
    }

    if (!newRows.length) return Response.json({ imported: 0, skipped: 0, total: 0, message: "No transaction rows found in the sheet." });

    // dedupe against existing expenses by date + description + amount
    const existing = await base44.asServiceRole.entities.Expense.list("-date", 5000);
    const key = (e) => `${e.date}|${e.description}|${e.amount}`;
    const existingKeys = new Set(existing.map(key));
    const toCreate = newRows.filter((r) => !existingKeys.has(key(r)));

    if (!toCreate.length) {
      return Response.json({ imported: 0, skipped: newRows.length, total: newRows.length, message: "No new transactions — everything is already imported." });
    }

    await base44.asServiceRole.entities.Expense.bulkCreate(toCreate);
    return Response.json({
      imported: toCreate.length,
      skipped: newRows.length - toCreate.length,
      total: newRows.length,
      message: `Imported ${toCreate.length} new transaction${toCreate.length === 1 ? "" : "s"} (${newRows.length - toCreate.length} already present).`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}