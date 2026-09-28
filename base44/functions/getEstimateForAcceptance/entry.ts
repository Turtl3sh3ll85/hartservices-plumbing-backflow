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
    return Response.json({ estimate, customer, settings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}