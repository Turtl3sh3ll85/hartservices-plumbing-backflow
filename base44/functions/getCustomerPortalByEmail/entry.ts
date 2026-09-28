import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();
    if (!email) return Response.json({ error: "email required" }, { status: 400 });

    const match = (val) => typeof val === 'string' && val.trim().toLowerCase() === email;

    const [invoices, estimates, customers, backflowReports] = await Promise.all([
      base44.asServiceRole.entities.Invoice.list("-created_date", 200),
      base44.asServiceRole.entities.Estimate.list("-created_date", 200),
      base44.asServiceRole.entities.Customer.list("-updated_date", 500),
      base44.asServiceRole.entities.BackflowTestReport.list("-test_date", 200),
    ]);

    const myCustomers = customers.filter((c) => match(c.email));
    const customerIds = new Set(myCustomers.map((c) => c.id));

    return Response.json({
      invoices: invoices.filter((i) => match(i.customer_email)),
      estimates: estimates.filter((e) => match(e.customer_email)),
      customers: myCustomers,
      backflow_reports: backflowReports.filter((r) => customerIds.has(r.customer_id)),
      resolved_email: email,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}