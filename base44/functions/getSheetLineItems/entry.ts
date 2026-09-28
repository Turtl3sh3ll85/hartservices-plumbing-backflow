import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const HEADER_MAP = {
  description: ["description", "item", "name", "task", "service", "product"],
  quantity: ["quantity", "qty", "q", "count"],
  unit_price: ["unit price", "unitprice", "price", "rate", "cost", "amount"],
  category: ["category", "type", "group", "section"],
  image_url: ["thumbnail", "thumbnail url", "image", "image url", "photo", "photo url", "picture", "img"],
  details: ["details", "long description", "long desc", "note", "notes"],
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
    const settings = await base44.entities.Settings.list();
    const sheetId = (body.sheet_id && String(body.sheet_id).trim()) || settings?.[0]?.google_sheet_id;
    if (!sheetId) return Response.json({ error: "No Google Sheet ID provided or configured in Settings." }, { status: 400 });

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
    const firstSheet = meta?.sheets?.[0]?.properties?.title;
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
    if (rows.length < 2) return Response.json({ line_items: [] });

    const headers = rows[0];
    const fieldIndex = {};
    headers.forEach((h, idx) => {
      const field = matchHeader(h);
      if (field && fieldIndex[field] === undefined) fieldIndex[field] = idx;
    });

    const line_items = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => !String(c || "").trim())) continue;
      const description = fieldIndex.description !== undefined ? String(row[fieldIndex.description] || "").trim() : "";
      if (!description) continue;
      const quantity = fieldIndex.quantity !== undefined ? parseFloat(row[fieldIndex.quantity]) || 1 : 1;
      const unit_price = fieldIndex.unit_price !== undefined ? parseFloat(row[fieldIndex.unit_price]) || 0 : 0;
      const category = fieldIndex.category !== undefined ? String(row[fieldIndex.category] || "").trim() : "";
      const image_url = fieldIndex.image_url !== undefined ? String(row[fieldIndex.image_url] || "").trim() : "";
      const details = fieldIndex.details !== undefined ? String(row[fieldIndex.details] || "").trim() : "";
      line_items.push({ description, quantity, unit_price, category, image_url, details, markup: 0, markup_mode: "preset" });
    }

    return Response.json({ line_items });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}