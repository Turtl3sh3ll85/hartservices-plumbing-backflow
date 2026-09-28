import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { estimate_id } = body;
    if (!estimate_id) return Response.json({ error: "estimate_id required" }, { status: 400 });

    const estimate = await base44.asServiceRole.entities.Estimate.get(estimate_id);
    if (!estimate) return Response.json({ error: "Estimate not found" }, { status: 404 });

    let customer = null;
    if (estimate.customer_id) {
      try { customer = await base44.asServiceRole.entities.Customer.get(estimate.customer_id); } catch (e) {}
    }
    let settings = null;
    try {
      const allSettings = await base44.asServiceRole.entities.Settings.list();
      settings = allSettings[0] || null;
    } catch (e) {}

    // Stamp the open timestamp every time; mark opened the first time
    const now = new Date().toISOString();
    try {
      if (!estimate.opened) {
        await base44.asServiceRole.entities.Estimate.update(estimate_id, { opened: true, last_opened_date: now });
        estimate.opened = true;
      } else {
        await base44.asServiceRole.entities.Estimate.update(estimate_id, { last_opened_date: now });
      }
      estimate.last_opened_date = now;
    } catch (e) {}

    return Response.json({ estimate, customer, settings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}