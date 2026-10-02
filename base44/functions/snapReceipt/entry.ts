import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Snap a receipt photo: attach it directly to a transaction, or save it for
// the receipt scanner to auto-match once the transaction posts. The photo is
// uploaded privately by the client (UploadPrivateFile) and passed here as a
// file_uri. AI vision extracts merchant / amount / date for matching.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'accountant') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({})) || {};
    const { file_uri, file_name, transaction_id, invoice_id } = body;
    if (!file_uri) return Response.json({ error: 'file_uri is required' }, { status: 400 });

    // Read the receipt photo with AI vision to pull out structured data used
    // both for display and for later matching by the scanner.
    let extracted = { merchant: '', amount: null, date: null };
    try {
      const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri });
      const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt:
          'Read this receipt photo and extract the merchant name, the total amount as a number, ' +
          'and the transaction date as YYYY-MM-DD. If a field is not visible, return an empty string or null.',
        response_json_schema: {
          type: 'object',
          properties: {
            merchant: { type: 'string' },
            amount: { type: 'number' },
            date: { type: 'string' },
          },
        },
        file_urls: [signed.signed_url],
      });
      extracted = {
        merchant: llm.merchant || '',
        amount: llm.amount != null ? Number(llm.amount) : null,
        date: llm.date || null,
      };
    } catch (e) {
      // Non-fatal: the receipt is still stored; scanner will read it later.
    }

    const matched = !!transaction_id;
    const receipt = await base44.asServiceRole.entities.Receipt.create({
      transaction_id: transaction_id || null,
      invoice_id: invoice_id || null,
      file_uri,
      file_name: file_name || 'snap',
      from_email: null,
      subject: 'Snapped receipt',
      received_date: extracted.date ? new Date(extracted.date).toISOString() : new Date().toISOString(),
      amount: extracted.amount,
      merchant: extracted.merchant,
      matched,
    });

    // Pin the receipt to the Plaid transaction so the paperclip shows on the
    // Transactions page and the scanner skips it.
    if (transaction_id) {
      try {
        await base44.asServiceRole.entities.Transaction.update(transaction_id, {
          receipt_file_uri: receipt.id,
        });
      } catch (e) {}
    }

    return Response.json({
      ok: true,
      receipt_id: receipt.id,
      extracted,
      save_for_later: !transaction_id,
      pinned_to_invoice: !!invoice_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}