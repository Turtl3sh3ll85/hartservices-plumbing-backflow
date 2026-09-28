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

    const existing = await base44.asServiceRole.entities.InvoiceAttachment.filter({ drive_file_id });
    let removed = 0;
    for (const att of existing) {
      try {
        await base44.asServiceRole.entities.InvoiceAttachment.delete(att.id);
        removed++;
      } catch (e) {}
    }
    return Response.json({ removed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}