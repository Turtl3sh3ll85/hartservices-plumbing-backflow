import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.email.trim().toLowerCase();
    const match = (val) => typeof val === 'string' && val.trim().toLowerCase() === email;

    const [invoices, estimates, customers] = await Promise.all([
      base44.asServiceRole.entities.Invoice.list("-created_date", 200),
      base44.asServiceRole.entities.Estimate.list("-created_date", 200),
      base44.asServiceRole.entities.Customer.list("-updated_date", 500),
    ]);

    const myInvoices = invoices.filter((i) => match(i.customer_email));
    const myEstimates = estimates.filter((e) => match(e.customer_email));
    const myCustomers = customers.filter((c) => match(c.email));

    return Response.json({
      invoices: myInvoices,
      estimates: myEstimates,
      customers: myCustomers,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}