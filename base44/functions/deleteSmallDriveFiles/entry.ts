import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const FOLDER_ID = "1MqxUfevtS1FQ-lbmS0dtawmS6o7ui51H";
const MIN_BYTES = 2048; // 2KB threshold

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googleworkspace");

    const query = `'${FOLDER_ID}' in parents and trashed=false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=200`;

    const listResp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!listResp.ok) {
      return Response.json({ error: `Drive list error: ${await listResp.text()}` }, { status: listResp.status });
    }
    const data = await listResp.json();
    const files = data.files || [];

    const smallFiles = files.filter((f: any) => {
      const size = parseInt(f.size || "0", 10);
      return size > 0 && size < MIN_BYTES;
    });

    const deleted = [];
    const failed = [];
    for (const f of smallFiles) {
      const delResp = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (delResp.ok || delResp.status === 204) {
        deleted.push({ id: f.id, name: f.name, size: f.size });
      } else {
        failed.push({ id: f.id, name: f.name, error: await delResp.text() });
      }
    }

    return Response.json({
      checkedCount: files.length,
      deletedCount: deleted.length,
      failedCount: failed.length,
      deleted,
      failed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}