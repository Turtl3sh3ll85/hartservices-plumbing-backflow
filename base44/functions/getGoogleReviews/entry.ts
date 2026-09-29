import { secrets } from "base44:runtime";

const BUSINESS_PHONE = "+12104300692";
const BUSINESS_QUERY = "HartServices Plumbing and Backflow LLC San Antonio TX";
const KNOWN_PLACE_ID = "ChIJHS_1ii98q4gR21TKzA3w1Kg";

async function findByPhone(apiKey) {
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(BUSINESS_PHONE)}&inputtype=phonenumber&fields=place_id,name&key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status === "OK" && data.candidates?.length) {
    return data.candidates[0].place_id;
  }
  return null;
}

async function findByText(apiKey, query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status === "OK" && data.results?.length) {
    return data.results[0].place_id;
  }
  return null;
}

async function resolvePlaceId(apiKey, override) {
  if (override) return override;
  const byPhone = await findByPhone(apiKey);
  if (byPhone) return byPhone;
  const byText = await findByText(apiKey, BUSINESS_QUERY);
  if (byText) return byText;
  if (KNOWN_PLACE_ID) return KNOWN_PLACE_ID;
  throw new Error("Could not resolve Google Place ID by phone or business name");
}

async function fetchDetailsV1(apiKey, placeId) {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=displayName,formattedAddress,rating,userRatingCount,reviews&key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.error) {
    return { error: data.error.message || JSON.stringify(data.error) };
  }
  return data;
}

export default async function(req) {
  try {
    const apiKey = (secrets.get("GOOGLE_PLACES_API_KEY") || "").trim();
    const override = (secrets.get("GOOGLE_PLACE_ID") || "").trim();
    if (!apiKey) {
      return Response.json({ error: "Missing Google Places API key" }, { status: 500 });
    }

    let body = null;
    try { body = await req.json(); } catch {}
    const testQuery = body?.test_query;
    const testPhone = !!body?.test_phone;

    if (testPhone) {
      const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(BUSINESS_PHONE)}&inputtype=phonenumber&fields=place_id,name,formatted_address,rating,user_ratings_total&key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url);
      const data = await resp.json();
      return Response.json(data);
    }
    if (testQuery) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(testQuery)}&key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url);
      const data = await resp.json();
      return Response.json({ status: data.status, count: (data.results || []).length, first: data.results?.[0]?.name, place_id: data.results?.[0]?.place_id, error: data.error_message });
    }

    let placeId = await resolvePlaceId(apiKey, override);
    let data = await fetchDetailsV1(apiKey, placeId);

    // If the stored/override Place ID is stale, resolve a fresh one and retry.
    if (data.error && override) {
      placeId = await resolvePlaceId(apiKey, "");
      data = await fetchDetailsV1(apiKey, placeId);
    }

    if (data.error) {
      return Response.json({ error: data.error }, { status: 502 });
    }

    const reviews = (data.reviews || []).map((r) => ({
      name: r.authorAttribution?.displayName,
      when: r.relativePublishTimeDescription,
      text: r.text?.text,
      rating: r.rating,
      profile_photo_url: r.authorAttribution?.photoUri,
      time: r.publishTime,
    }));

    return Response.json({
      rating: data.rating,
      user_ratings_total: data.userRatingCount,
      reviews,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}