import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_uri, file_name, mime_type } = body;
    if (!file_uri || !file_name) {
      return Response.json({ error: 'file_uri and file_name are required' }, { status: 400 });
    }
    const mimeType = mime_type || 'application/octet-stream';

    // 1. Get a short-lived signed URL for the privately uploaded file
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri });
    const fileRes = await fetch(signed_url);
    if (!fileRes.ok) return Response.json({ error: 'Failed to read uploaded file' }, { status: 502 });
    const fileBytes = new Uint8Array(await fileRes.arrayBuffer());

    // 2. Get the builder's Google Drive access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googleworkspace');
    if (!accessToken) return Response.json({ error: 'Google Drive not connected' }, { status: 400 });

    // 3. Multipart upload to Google Drive
    const boundary = 'base44-' + Math.random().toString(16).slice(2);
    const metadata = JSON.stringify({ name: file_name, mimeType: mimeType });
    const enc = new TextEncoder();
    const head = enc.encode(
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    );
    const tail = enc.encode(`\r\n--${boundary}--`);
    const payload = new Uint8Array(head.length + fileBytes.length + tail.length);
    payload.set(head, 0);
    payload.set(fileBytes, head.length);
    payload.set(tail, head.length + fileBytes.length);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: payload,
      }
    );
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return Response.json({ error: `Drive upload failed: ${errText}` }, { status: 502 });
    }
    const uploaded = await uploadRes.json();
    const fileId = uploaded.id;

    // 4. Make the file viewable by anyone with the link (so customers can open it)
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      });
    } catch (e) { /* non-fatal */ }

    return Response.json({
      drive_file_id: fileId,
      drive_link: uploaded.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      thumbnail_url: uploaded.thumbnailLink || '',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}