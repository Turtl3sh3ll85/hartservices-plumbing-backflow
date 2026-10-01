import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};
    const { invoice_id, ready, note } = body;
    if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });

    const patch = {
      customer_ready_for_next_stage: !!ready,
      ready_for_next_stage_date: ready ? new Date().toISOString() : null,
      ready_note: note || '',
    };
    await base44.asServiceRole.entities.Invoice.update(invoice_id, patch);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}