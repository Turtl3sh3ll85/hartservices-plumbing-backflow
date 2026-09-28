// Sends email through the Google Workspace (Gmail) connector.
// This bypasses the built-in SendEmail integration's custom-domain requirement,
// since Gmail sends from the authenticated account directly.

function base64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendGmail(
  base44: any,
  { to, subject, html, fromName }: { to: string; subject: string; html: string; fromName?: string }
) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googleworkspace");

  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
  ];
  const raw = lines.join("\r\n") + "\r\n\r\n" + html;

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64urlEncode(raw) }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail API error ${res.status}: ${body}`);
  }

  return res.json();
}