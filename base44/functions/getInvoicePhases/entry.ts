import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const PHASES_SHEET_ID = "1n-SQ6SVeigDuddiow5ofH8hdrw4gi7WlkcgMz-7G8xo";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googleworkspace");
    if (!accessToken) return Response.json({ error: "Google Sheets not connected" }, { status: 400 });

    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${PHASES_SHEET_ID}?fields=sheets.properties.title`,
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
      `https://sheets.googleapis.com/v4/spreadsheets/${PHASES_SHEET_ID}/values/${encodeURIComponent(firstSheet)}!A:A`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!valsRes.ok) {
      const err = await valsRes.json().catch(() => ({}));
      return Response.json({ error: err?.error?.message || "Failed to read spreadsheet values." }, { status: valsRes.status });
    }
    const vals = await valsRes.json();
    const rows = vals.values || [];

    const phases = [];
    const seen = new Set();
    for (let i = 1; i < rows.length; i++) {
      const v = String(rows[i]?.[0] || "").trim();
      if (v && !seen.has(v.toLowerCase())) {
        seen.add(v.toLowerCase());
        phases.push(v);
      }
    }

    return Response.json({ phases });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}