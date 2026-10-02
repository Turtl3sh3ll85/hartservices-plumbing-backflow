// Shared receipt-matching logic: scans Gmail for receipt emails and their PDF
// attachments, uses AI to match them to transactions by payee name + date +
// amount, and pins matched receipts. Used by the findReceiptsInEmail backend
// function (manual / standalone) and auto-triggered by the Plaid and YNAB sync
// functions for every new transaction batch (via waitUntil).
//
// Gmail connector must be authorized. All failures are swallowed so a missing
// connector or transient Gmail error never breaks a sync.

const LOOKBACK_DAYS = 45;
const MAX_EMAILS = 20;
const MAX_PDF_UPLOADS = 6;
const MAX_SAVED_PHOTOS = 6;

export async function runReceiptMatch(base44) {
  try {
    const targets = await loadTargets(base44);
    if (!targets.length) return { scanned: 0, matched: 0 };

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const auth = { Authorization: `Bearer ${accessToken}` };

    // Skip emails already processed into a Receipt so we don't re-pin duplicates.
    const existing = await base44.asServiceRole.entities.Receipt.list('-created_date', 200);
    const usedEmailIds = new Set((existing || []).map((r) => r.gmail_message_id).filter(Boolean));

    const q = `has:attachment newer_than:${LOOKBACK_DAYS}d`;
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${MAX_EMAILS}`,
      { headers: auth },
    );
    if (!listRes.ok) return { scanned: 0, matched: 0 };
    const messages = (await listRes.json()).messages || [];

    const candidates = [];
    const pdfFileUrls = [];
    const pdfEmailOrder = [];
    for (const m of messages) {
      if (usedEmailIds.has(m.id)) continue;
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: auth },
      );
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();
      const headers = msg.payload?.headers || [];
      const subject = headers.find((h) => h.name === 'Subject')?.value || '';
      const from = headers.find((h) => h.name === 'From')?.value || '';
      const dateHdr = headers.find((h) => h.name === 'Date')?.value || '';
      const body = extractBody(msg.payload).slice(0, 1200);
      const attach = findAttachment(msg.payload);

      let fileUrl = null;
      let fileUri = null;
      let fileName = attach?.filename || subject || 'receipt';
      if (attach && pdfFileUrls.length < MAX_PDF_UPLOADS) {
        try {
          const dl = await downloadAttachment(auth, m.id, attach);
          if (dl) {
            const up = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
              file: new File([dl.bytes], dl.filename, { type: dl.mimeType }),
            });
            fileUri = up.file_uri;
            const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri });
            fileUrl = signed.signed_url;
            fileName = dl.filename;
            pdfFileUrls.push(fileUrl);
            pdfEmailOrder.push(m.id);
          }
        } catch (e) {
          // Best-effort: body text still used for matching.
        }
      }

      candidates.push({ id: m.id, subject, from, date: dateHdr, body, fileUrl, fileUri, fileName });
    }
    if (!candidates.length) return { scanned: 0, matched: 0 };

    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        'Match receipt emails (and their attached PDF receipts) to business transactions. ' +
        'Transactions: ' + JSON.stringify(targets.map((t) => ({ id: t.id, entity: t.entity, name: t.payee, date: t.date, amount: t.amount }))) + '. ' +
        'Emails: ' + JSON.stringify(candidates.map((c) => ({ id: c.id, subject: c.subject, from: c.from, date: c.date, body: c.body }))) + '. ' +
        (pdfFileUrls.length
          ? 'Attached PDF files (file_urls) are the receipts for these emails, in this exact order: ' + JSON.stringify(pdfEmailOrder) + '. Read each PDF to find the actual merchant, total amount, and date. '
          : '') +
        'A receipt is a purchase/invoice containing a merchant name, total amount, and date. ' +
        'Match a receipt to a transaction ONLY when ALL of these hold: the merchant name is similar to the transaction payee/name, the receipt total equals the transaction amount within $2.00, AND the dates are within 3 days. ' +
        'Return one match per transaction, with confidence 0-1.',
      response_json_schema: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                transaction_id: { type: 'string' },
                entity: { type: 'string' },
                email_id: { type: 'string' },
                amount: { type: 'number' },
                merchant: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
          },
        },
      },
      ...(pdfFileUrls.length ? { file_urls: pdfFileUrls } : {}),
    });
    const matches = llmRes.matches || [];

    let linked = 0;
    for (const match of matches) {
      if (match.confidence < 0.7) continue;
      const c = candidates.find((x) => x.id === match.email_id);
      const tx = targets.find((t) => t.id === match.transaction_id && t.entity === match.entity);
      if (!c || !tx) continue;

      const receipt = await base44.asServiceRole.entities.Receipt.create({
        transaction_id: tx.id,
        gmail_message_id: c.id,
        from_email: c.from,
        subject: c.subject,
        received_date: new Date(c.date).toISOString(),
        file_uri: c.fileUri || null,
        file_name: c.fileName,
        amount: match.amount,
        merchant: match.merchant || '',
        matched: true,
      });

      if (tx.entity === 'Transaction') {
        await base44.asServiceRole.entities.Transaction.update(tx.id, {
          receipt_file_uri: receipt.id,
          receipt_email_id: c.id,
        });
      }
      linked++;
    }

    return { scanned: candidates.length, matched: linked };
  } catch (e) {
    return { scanned: 0, matched: 0, error: e.message };
  }
}

// Match saved (unlinked) receipt photos to transactions. These are receipts
// snapped in the Snap Receipt page and saved for later — they have a file_uri
// but no transaction yet. The hourly scanner reads each photo with AI vision
// and pins it to a matching transaction once one posts.
export async function matchSavedPhotoReceipts(base44) {
  try {
    const saved = await base44.asServiceRole.entities.Receipt.filter({ matched: false }, '-created_date', MAX_SAVED_PHOTOS);
    const pending = (saved || []).filter((r) => r.file_uri && !r.transaction_id);
    if (!pending.length) return { scanned: 0, matched: 0 };

    const targets = await loadTargets(base44);
    if (!targets.length) return { scanned: pending.length, matched: 0 };

    const photos = [];
    for (const r of pending) {
      try {
        const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: r.file_uri });
        photos.push({ receipt: r, url: signed.signed_url });
      } catch (e) {
        // Skip unreadable photos.
      }
    }
    if (!photos.length) return { scanned: pending.length, matched: 0 };

    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        'Match receipt photos to business transactions. ' +
        'Transactions: ' + JSON.stringify(targets.map((t) => ({ id: t.id, entity: t.entity, name: t.payee, date: t.date, amount: t.amount }))) + '. ' +
        'Receipt photos (file_urls) are provided in this exact order: ' + JSON.stringify(photos.map((p) => p.receipt.id)) + '. ' +
        'Read each receipt photo to find the merchant name, total amount, and date. ' +
        'Match a receipt to a transaction ONLY when ALL hold: the merchant name is similar to the transaction payee/name, the receipt total equals the transaction amount within $2.00, AND the dates are within 3 days. ' +
        'Return one match per receipt, with confidence 0-1.',
      response_json_schema: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                receipt_id: { type: 'string' },
                transaction_id: { type: 'string' },
                entity: { type: 'string' },
                amount: { type: 'number' },
                merchant: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
          },
        },
      },
      file_urls: photos.map((p) => p.url),
    });
    const matches = llmRes.matches || [];

    let linked = 0;
    for (const match of matches) {
      if (match.confidence < 0.7) continue;
      const tx = targets.find((t) => t.id === match.transaction_id && t.entity === match.entity);
      if (!tx) continue;
      const photo = photos.find((p) => p.receipt.id === match.receipt_id);
      const invoiceId = photo?.receipt?.invoice_id || null;

      await base44.asServiceRole.entities.Receipt.update(match.receipt_id, {
        matched: true,
        transaction_id: tx.id,
        merchant: match.merchant || '',
        amount: match.amount,
      });

      // When the receipt was pinned to an invoice, link the matched transaction
      // to that same invoice so profitability ties the expense to the invoice.
      if (tx.entity === 'Transaction') {
        const patch = { receipt_file_uri: match.receipt_id };
        if (invoiceId) { patch.matched_invoice_id = invoiceId; patch.matched = 'matched'; }
        await base44.asServiceRole.entities.Transaction.update(tx.id, patch);
      } else if (tx.entity === 'YnabTransaction' && invoiceId) {
        await base44.asServiceRole.entities.YnabTransaction.update(tx.id, {
          matched_invoice_id: invoiceId,
          matched: 'matched',
        });
      }
      linked++;
    }

    return { scanned: photos.length, matched: linked };
  } catch (e) {
    return { scanned: 0, matched: 0, error: e.message };
  }
}

async function loadTargets(base44) {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString().slice(0, 10);
  const targets = [];
  try {
    const plaid = await base44.asServiceRole.entities.Transaction.filter(
      { matched: 'unmatched', date: { $gte: since } },
      '-date',
      100,
    );
    for (const t of plaid) {
      if (t.receipt_email_id || t.receipt_file_uri) continue; // already pinned
      targets.push({ id: t.id, entity: 'Transaction', payee: t.payee || '', date: t.date, amount: Math.abs(Number(t.amount) || 0) });
    }
  } catch (e) {}
  try {
    const ynab = await base44.asServiceRole.entities.YnabTransaction.filter(
      { matched: 'unmatched', date: { $gte: since } },
      '-date',
      100,
    );
    for (const t of ynab) {
      targets.push({ id: t.id, entity: 'YnabTransaction', payee: t.payee || '', date: t.date, amount: Math.abs(Number(t.amount) || 0) });
    }
  } catch (e) {}
  return targets;
}

function findAttachment(payload) {
  if (!payload) return null;
  if (payload.filename && payload.body?.attachmentId) {
    return { filename: payload.filename, attachmentId: payload.body.attachmentId, mimeType: payload.mimeType || 'application/octet-stream' };
  }
  for (const p of payload.parts || []) {
    const found = findAttachment(p);
    if (found) return found;
  }
  return null;
}

function extractBody(payload) {
  if (!payload) return '';
  if (payload.body?.data) {
    const mime = payload.mimeType || '';
    if (mime.startsWith('text/')) return decodeBase64Url(payload.body.data).replace(/<[^>]+>/g, ' ');
  }
  let text = '';
  for (const p of payload.parts || []) {
    text += extractBody(p);
  }
  return text;
}

async function downloadAttachment(auth, messageId, attach) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attach.attachmentId}`,
    { headers: auth },
  );
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.data) return null;
  const bytes = decodeBase64UrlToBytes(json.data);
  return { bytes, filename: attach.filename, mimeType: attach.mimeType };
}

function decodeBase64Url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  try { return atob(b64); } catch (e) { return ''; }
}

function decodeBase64UrlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}