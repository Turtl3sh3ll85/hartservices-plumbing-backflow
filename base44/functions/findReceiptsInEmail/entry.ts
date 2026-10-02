import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { runReceiptMatch, matchSavedPhotoReceipts } from '../../shared/receiptMatching.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};
    const fromWorkflow = body.from_workflow === true;

    if (!fromWorkflow) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin' && user.role !== 'accountant') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const emails = await runReceiptMatch(base44);
    const photos = await matchSavedPhotoReceipts(base44);
    return Response.json({
      ok: true,
      scanned: (emails.scanned || 0) + (photos.scanned || 0),
      matched: (emails.matched || 0) + (photos.matched || 0),
      emails,
      photos,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}