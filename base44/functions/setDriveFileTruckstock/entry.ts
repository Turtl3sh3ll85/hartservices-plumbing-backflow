import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { drive_file_id, truckstock } = body;
    if (!drive_file_id) return Response.json({ error: 'drive_file_id required' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.DriveFileMeta.filter({ drive_file_id });
    if (existing.length > 0) {
      const updated = await base44.asServiceRole.entities.DriveFileMeta.update(existing[0].id, { truckstock: !!truckstock });
      return Response.json({ meta: updated });
    }
    const created = await base44.asServiceRole.entities.DriveFileMeta.create({ drive_file_id, truckstock: !!truckstock });
    return Response.json({ meta: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}