import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const CATEGORIES_SHEET_ID = "13lEp40pEclIWP2haTyDsCBsEJ75HWim4CNLWElmLhSg";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googleworkspace");

    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}?fields=sheets.properties.title`,
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
      `https://sheets.googleapis.com/v4/spreadsheets/${CATEGORIES_SHEET_ID}/values/${encodeURIComponent(firstSheet)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!valsRes.ok) {
      const err = await valsRes.json().catch(() => ({}));
      return Response.json({ error: err?.error?.message || "Failed to read spreadsheet values." }, { status: valsRes.status });
    }
    const vals = await valsRes.json();
    const rows = vals.values || [];

    const categories = [];
    const activeCategories = [];
    const seen = new Set();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const name = String(row[0] || "").trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      categories.push(name);
      const flag = String(row[2] || "").trim().toLowerCase();
      if (flag === "true") {
        activeCategories.push(name);
      }
    }

    return Response.json({ categories, activeCategories });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}