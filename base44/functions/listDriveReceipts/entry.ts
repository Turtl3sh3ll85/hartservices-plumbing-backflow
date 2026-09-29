import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const DRIVE = 'https://www.googleapis.com/drive/v3';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'accountant') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({})) || {};
    let folderId = (body.folder_id || '').toString().replace(/['"\\]/g, '').trim();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googleworkspace');
    if (!accessToken) return Response.json({ error: 'Google Drive not connected' }, { status: 400 });
    const headers = { Authorization: `Bearer ${accessToken}` };

    if (folderId) {
      const q = `'${folderId}' in parents and trashed=false`;
      const url = `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink,thumbnailLink,fileExtension,size)&orderBy=modifiedTime desc&pageSize=200`;
      const res = await fetch(url, { headers });
      if (!res.ok) return Response.json({ error: `Drive list failed: ${await res.text()}` }, { status: 502 });
      const json = await res.json();
      const all = json.files || [];
      const files = all.filter((f) => f.mimeType !== 'application/vnd.google-apps.folder');
      const folders = all.filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
      return Response.json({ files, folders });
    }

    const q = `mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const url = `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&orderBy=name&pageSize=200`;
    const res = await fetch(url, { headers });
    if (!res.ok) return Response.json({ error: `Drive folders failed: ${await res.text()}` }, { status: 502 });
    const json = await res.json();
    return Response.json({ folders: json.files || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}