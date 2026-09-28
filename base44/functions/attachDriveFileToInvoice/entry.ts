import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'tech', 'accountant'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { invoice_id, drive_file_id, drive_link, file_name, thumbnail_url, mime_type, caption } = body;

    if (!invoice_id || !drive_file_id || !file_name) {
      return Response.json({ error: 'Missing required fields: invoice_id, drive_file_id, file_name' }, { status: 400 });
    }

    const isImage = mime_type && mime_type.startsWith('image/');

    const attachment = await base44.entities.InvoiceAttachment.create({
      invoice_id,
      drive_file_id,
      drive_link: drive_link || null,
      file_name,
      thumbnail_url: thumbnail_url || null,
      mime_type: mime_type || null,
      type: isImage ? 'photo' : 'document',
      caption: caption || null,
      internal: true,
    });

    return Response.json({ attachment });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}