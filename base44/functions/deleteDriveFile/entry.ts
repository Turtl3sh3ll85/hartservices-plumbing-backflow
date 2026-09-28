import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { drive_file_id } = body;
    if (!drive_file_id) return Response.json({ error: 'drive_file_id required' }, { status: 400 });

    // Refuse to delete a file that is still attached to an invoice
    const existing = await base44.asServiceRole.entities.InvoiceAttachment.filter({ drive_file_id });
    if (existing.length > 0) {
      return Response.json({ error: 'File is still attached to an invoice. Unattach it first.' }, { status: 409 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googleworkspace");
    const delResp = await fetch(`https://www.googleapis.com/drive/v3/files/${drive_file_id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!delResp.ok && delResp.status !== 204) {
      return Response.json({ error: `Drive delete error: ${await delResp.text()}` }, { status: delResp.status });
    }
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}