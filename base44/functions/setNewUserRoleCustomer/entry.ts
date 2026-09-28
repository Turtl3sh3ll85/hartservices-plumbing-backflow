import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const STAFF_ROLES = ["admin", "tech", "accountant"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { user_id } = body;
    if (!user_id) return Response.json({ error: "user_id required" }, { status: 400 });

    const user = await base44.asServiceRole.entities.User.get(user_id).catch(() => null);
    if (!user) return Response.json({ updated: false, reason: "user not found" });

    if (STAFF_ROLES.includes(user.role)) {
      return Response.json({ updated: false, reason: "staff role preserved", role: user.role });
    }
    if (user.role === "customer") {
      return Response.json({ updated: false, reason: "already customer" });
    }

    await base44.asServiceRole.entities.User.update(user_id, { role: "customer" });
    return Response.json({ updated: true, user_id, email: user.email, previous_role: user.role });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}