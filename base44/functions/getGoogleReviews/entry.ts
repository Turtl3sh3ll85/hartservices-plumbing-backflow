import { secrets } from "base44:runtime";

const BUSINESS_QUERY = "HartServices Plumbing and Backflow LLC San Antonio TX";

async function resolvePlaceId(apiKey, override) {
  if (override) return override;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(BUSINESS_QUERY)}&key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url);
  const body = await resp.text();
  let data;
  try { data = JSON.parse(body); } catch { data = {}; }
  if (data.status !== "OK" || !data.results?.length) {
    throw new Error(`Text search failed (${data.status || resp.status}): ${(data.error_message || body).slice(0, 300)}`);
  }
  return data.results[0].place_id;
}

async function fetchDetails(apiKey, placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${encodeURIComponent(apiKey)}&reviews_sort=newest`;
  const resp = await fetch(url);
  const data = await resp.json();
  return data;
}

export default async function(req) {
  try {
    const apiKey = (secrets.get("GOOGLE_PLACES_API_KEY") || "").trim();
    const override = (secrets.get("GOOGLE_PLACE_ID") || "").trim();
    if (!apiKey) {
      return Response.json({ error: "Missing Google Places API key" }, { status: 500 });
    }
    let testQuery = null;
    try {
      const body = await req.json();
      testQuery = body?.test_query;
    } catch {}
    if (testQuery) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(testQuery)}&key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url);
      const data = await resp.json();
      return Response.json({ status: data.status, count: (data.results || []).length, first: data.results?.[0]?.name, place_id: data.results?.[0]?.place_id, error: data.error_message });
    }

    let placeId = override || "";
    let data = null;
    if (placeId) {
      data = await fetchDetails(apiKey, placeId);
    }
    if (!data || data.status !== "OK") {
      placeId = await resolvePlaceId(apiKey, "");
      data = await fetchDetails(apiKey, placeId);
    }

    if (data.status !== "OK") {
      return Response.json({ error: data.error_message || data.status }, { status: 502 });
    }

    const result = data.result || {};
    const reviews = (result.reviews || []).map((r) => ({
      name: r.author_name,
      when: r.relative_time_description,
      text: r.text,
      rating: r.rating,
      profile_photo_url: r.profile_photo_url,
      time: r.time,
    }));

    return Response.json({
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      reviews,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}