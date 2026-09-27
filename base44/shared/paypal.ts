import { secrets } from "base44:runtime";

export function getPaypalBaseUrl() {
  return secrets.get("PAYPAL_ENVIRONMENT") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getPaypalAccessToken() {
  const clientId = (secrets.get("PAYPAL_CLIENT_ID") || "").trim();
  const secret = (secrets.get("PAYPAL_CLIENT_SECRET") || "").trim();
  if (!clientId || !secret) throw new Error("PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  const base = getPaypalBaseUrl();
  const auth = btoa(`${clientId}:${secret}`);
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const err = await res.text();
    const env = secrets.get("PAYPAL_ENVIRONMENT") === "live" ? "live" : "sandbox";
    throw new Error(`PayPal authentication failed against the ${env} API: ${err}. Make sure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are copied from your ${env} PayPal app, and that PAYPAL_ENVIRONMENT is set to "sandbox" or "live" to match.`);
  }
  const data = await res.json();
  return data.access_token;
}