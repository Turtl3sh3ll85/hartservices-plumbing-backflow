import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const uid = user.id;
    const entities = ['Customer', 'Invoice', 'Estimate', 'InvoiceAttachment'];
    const results = {};
    for (const name of entities) {
      try {
        await base44.asServiceRole.entities[name].deleteMany({ created_by_id: uid });
        results[name] = 'deleted';
      } catch (e) {
        results[name] = e.message;
      }
    }
    return Response.json({ deleted: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}