import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const ALLOWED = ["salt_reminders", "ac_filter_reminders", "sprinkler_tuneups", "backflow_tests"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();
    if (!email) return Response.json({ error: "email required" }, { status: 400 });

    const toggles = body.toggles || {};
    const update = {};
    for (const key of ALLOWED) {
      if (typeof toggles[key] === "boolean") update[key] = toggles[key];
    }

    const customers = await base44.asServiceRole.entities.Customer.list("-updated_date", 500);
    const customer = customers.find((c) => typeof c.email === 'string' && c.email.trim().toLowerCase() === email);
    if (!customer) return Response.json({ error: "No customer profile found for that email." }, { status: 404 });

    const updated = await base44.asServiceRole.entities.Customer.update(customer.id, update);
    return Response.json({ ok: true, customer: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}