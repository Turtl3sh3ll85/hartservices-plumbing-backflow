import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets, waitUntil } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const customer = body?.customer;
    if (!customer || !customer.name) {
      return Response.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const webhookUrl = secrets.get('ZAPIER_CONTACTS_WEBHOOK_URL');
    if (!webhookUrl) {
      return Response.json({ error: 'Zapier webhook URL not configured' }, { status: 500 });
    }

    const payload = {
      name: customer.name,
      company: customer.company || '',
      email: customer.email || '',
      phone: customer.phone || '',
      street: customer.street || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
    };

    // Fire-and-forget so the customer save isn't blocked by Zapier latency.
    waitUntil(
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((r) => { if (!r.ok) console.error('Zapier push failed:', r.status); })
        .catch((e) => console.error('Zapier push error:', e.message))
    );

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}