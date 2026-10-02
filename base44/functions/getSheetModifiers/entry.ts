import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const HEADER_MAP = {
  name: ["name", "modifier", "label", "description", "item"],
  price_adjustment: ["price adjustment", "price_adjustment", "adjustment", "price", "amount", "cost", "fee"],
};

function matchHeader(header) {
  const h = String(header || "").trim().toLowerCase();
  if (!h) return null;
  for (const [field, names] of Object.entries(HEADER_MAP)) {
    if (names.includes(h)) return field;
  }
  return null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const sheetId = body.sheet_id && String(body.sheet_id).trim();
    const sheetName = body.sheet_name && String(body.sheet_name).trim();
    if (!sheetId) return Response.json({ error: "No modifier sheet ID provided." }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googleworkspace");

    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) {
      const err = await metaRes.json().catch(() => ({}));
      return Response.json({ error: err?.error?.message || "Failed to read spreadsheet metadata." }, { status: metaRes.status });
    }
    const meta = await metaRes.json();
    const sheets = meta?.sheets || [];
    let firstSheet = sheets[0]?.properties?.title;
    if (sheetName) {
      const found = sheets.find((s) => s?.properties?.title === sheetName);
      if (found) firstSheet = found.properties.title;
    }
    if (!firstSheet) return Response.json({ error: "Spreadsheet has no sheets." }, { status: 400 });

    const valsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(firstSheet)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!valsRes.ok) {
      const err = await valsRes.json().catch(() => ({}));
      return Response.json({ error: err?.error?.message || "Failed to read spreadsheet values." }, { status: valsRes.status });
    }
    const vals = await valsRes.json();
    const rows = vals.values || [];
    if (rows.length < 2) return Response.json({ modifiers: [] });

    const headers = rows[0];
    const fieldIndex = {};
    headers.forEach((h, idx) => {
      const field = matchHeader(h);
      if (field && fieldIndex[field] === undefined) fieldIndex[field] = idx;
    });

    if (fieldIndex.name === undefined) return Response.json({ error: "Could not find a name column in the modifier sheet." }, { status: 400 });

    const modifiers = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => !String(c || "").trim())) continue;
      const name = String(row[fieldIndex.name] || "").trim();
      if (!name) continue;
      const price_adjustment = fieldIndex.price_adjustment !== undefined ? parseFloat(row[fieldIndex.price_adjustment]) || 0 : 0;
      modifiers.push({ name, price_adjustment });
    }

    return Response.json({ modifiers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}