import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { customer_id } = body;
    if (!customer_id) return Response.json({ error: "customer_id required" }, { status: 400 });

    const customer = await base44.asServiceRole.entities.Customer.get(customer_id).catch(() => null);
    const email = customer?.email;
    if (!email) return Response.json({ created: false, reason: "no customer email" });

    // Skip if the customer already has an app account
    let existing = [];
    try {
      existing = await base44.asServiceRole.entities.User.filter({ email });
    } catch (e) {}
    if (existing && existing.length > 0) {
      return Response.json({ created: false, reason: "already has account" });
    }

    // Create the user account with the customer role (sends the platform invite email)
    try {
      await base44.auth.inviteUser(email, "customer");
      return Response.json({ created: true, to: email });
    } catch (e) {
      return Response.json({ created: false, error: e.message });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}