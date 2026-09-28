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

    // Invite as "user" (the only non-staff role the platform accepts), then
    // promote to the app's "customer" role immediately.
    try {
      await base44.users.inviteUser(email, "user");
    } catch (e) {
      return Response.json({ created: false, error: `invite failed: ${e.message}` });
    }

    try {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users && users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, { role: "customer" });
      }
    } catch (e) {
      // Account was created; the signup workflow will set the role if this fails
    }

    return Response.json({ created: true, to: email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}