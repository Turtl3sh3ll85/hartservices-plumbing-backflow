import { secrets } from "base44:runtime";

export default async function(req) {
  try {
    const apiKey = secrets.get("GOOGLE_PLACES_API_KEY");
    const placeId = secrets.get("GOOGLE_PLACE_ID");
    if (!apiKey || !placeId) {
      return Response.json({ error: "Missing Google Places configuration" }, { status: 500 });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${encodeURIComponent(apiKey)}&reviews_sort=newest`;
    const resp = await fetch(url);
    const data = await resp.json();

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