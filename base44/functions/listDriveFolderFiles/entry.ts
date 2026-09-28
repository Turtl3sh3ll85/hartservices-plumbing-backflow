import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const FOLDER_ID = "1MqxUfevtS1FQ-lbmS0dtawmS6o7ui51H";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googleworkspace");

    const query = `'${FOLDER_ID}' in parents and trashed=false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,thumbnailLink,webViewLink,iconLink,fileExtension,size)&orderBy=modifiedTime desc&pageSize=100`;

    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return Response.json({ error: `Drive API error: ${errText}` }, { status: resp.status });
    }
    const data = await resp.json();
    const files = data.files || [];

    // Determine which Drive files are already attached to an invoice
    const attachments = await base44.asServiceRole.entities.InvoiceAttachment.filter({});
    const attachedIds = new Set(attachments.map((a: any) => a.drive_file_id).filter(Boolean));

    return Response.json({
      files: files.map((f: any) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
        thumbnailLink: f.thumbnailLink || null,
        webViewLink: f.webViewLink,
        iconLink: f.iconLink || null,
        size: f.size || null,
        attached: attachedIds.has(f.id),
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}