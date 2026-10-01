import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};
    const fromWorkflow = body.from_workflow === true;

    if (!fromWorkflow) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin' && user.role !== 'accountant') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const auth = { Authorization: `Bearer ${accessToken}` };

    // Unmatched transactions from the last 45 days that still need a receipt
    const since = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
    const txs = await base44.asServiceRole.entities.Transaction.filter(
      { matched: 'unmatched', date: { $gte: since } },
      '-date',
      100
    );
    if (!txs.length) return Response.json({ ok: true, scanned: 0, matched: 0 });

    // Recent emails with attachments
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent('has:attachment newer_than:45d')}&maxResults=50`,
      { headers: auth }
    );
    if (!listRes.ok) {
      const t = await listRes.text();
      return Response.json({ error: `Gmail list failed: ${listRes.status} ${t}` }, { status: 502 });
    }
    const messages = (await listRes.json()).messages || [];
    const candidates = [];
    for (const m of messages) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: auth }
      );
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();
      const headers = msg.payload?.headers || [];
      const subject = headers.find((h) => h.name === 'Subject')?.value || '';
      const from = headers.find((h) => h.name === 'From')?.value || '';
      const dateHdr = headers.find((h) => h.name === 'Date')?.value || '';
      const attach = findAttachment(msg.payload);
      if (!attach) continue;
      candidates.push({ id: m.id, subject, from, date: dateHdr, attachment: attach });
    }
    if (!candidates.length) return Response.json({ ok: true, scanned: 0, matched: 0 });

    // LLM matches receipt emails to transactions by amount + date proximity
    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        'Match receipt emails to business transactions. ' +
        'Transactions: ' + JSON.stringify(txs.map((t) => ({ id: t.id, amount: t.amount, date: t.date, payee: t.payee }))) + '. ' +
        'Emails: ' + JSON.stringify(candidates.map((c) => ({ id: c.id, subject: c.subject, from: c.from, date: c.date }))) + '. ' +
        'A receipt email is a purchase receipt/invoice containing a total amount. ' +
        'Match only when the email total equals the transaction amount within $2.00 AND the dates are within 3 days. ' +
        'Return matches with confidence 0-1.',
      response_json_schema: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                transaction_id: { type: 'string' },
                email_id: { type: 'string' },
                amount: { type: 'number' },
                merchant: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
          },
        },
      },
    });
    const matches = llmRes.matches || [];

    let linked = 0;
    for (const match of matches) {
      if (match.confidence < 0.7) continue;
      const c = candidates.find((x) => x.id === match.email_id);
      const tx = txs.find((t) => t.id === match.transaction_id);
      if (!c || !tx) continue;

      const receipt = await base44.asServiceRole.entities.Receipt.create({
        transaction_id: tx.id,
        gmail_message_id: c.id,
        from_email: c.from,
        subject: c.subject,
        received_date: new Date(c.date).toISOString(),
        file_name: c.attachment?.filename || c.subject || 'receipt',
        amount: match.amount,
        merchant: match.merchant || '',
        matched: true,
      });
      await base44.asServiceRole.entities.Transaction.update(tx.id, {
        receipt_file_uri: receipt.id,
        receipt_email_id: c.id,
      });
      linked++;
    }

    return Response.json({ ok: true, scanned: candidates.length, matched: linked });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function findAttachment(payload) {
  if (!payload) return null;
  if (payload.filename && payload.body?.attachmentId) {
    return { filename: payload.filename, attachmentId: payload.body.attachmentId };
  }
  for (const p of payload.parts || []) {
    const found = findAttachment(p);
    if (found) return found;
  }
  return null;
}