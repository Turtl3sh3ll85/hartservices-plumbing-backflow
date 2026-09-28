import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();
    if (!email) return Response.json({ error: "email required" }, { status: 400 });

    const customers = await base44.asServiceRole.entities.Customer.list("-updated_date", 500);
    const customer = customers.find((c) => typeof c.email === 'string' && c.email.trim().toLowerCase() === email);
    if (!customer) return Response.json({ error: "No customer profile found for that email." }, { status: 404 });

    const created = await base44.asServiceRole.entities.ServiceRequest.create({
      customer_id: customer.id,
      request_type: body.request_type || "service",
      subject: body.subject || "",
      details: body.details || "",
      preferred_date: body.preferred_date || undefined,
      status: "new",
    });

    return Response.json({ ok: true, id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}