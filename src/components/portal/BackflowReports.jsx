import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Download, Loader2 } from "lucide-react";

export default function BackflowReports({ reports }) {
  const [downloading, setDownloading] = useState(null);

  const download = async (r) => {
    if (!r.file_uri) return;
    setDownloading(r.id);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: r.file_uri });
      window.open(signed_url, "_blank");
    } catch (e) {
      /* ignore */
    }
    setDownloading(null);
  };

  return (
    <div>
      <h2 className="font-heading font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Backflow test reports</h2>
      {!reports || reports.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No backflow test reports on file yet.</Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y">
            {reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 min-h-11">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.title || r.file_name || "Report"}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {r.test_date ? new Date(r.test_date).toLocaleDateString() : ""}{r.file_name ? ` · ${r.file_name}` : ""}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(r)} disabled={!r.file_uri || downloading === r.id}>
                  {downloading === r.id ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                  Download
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}