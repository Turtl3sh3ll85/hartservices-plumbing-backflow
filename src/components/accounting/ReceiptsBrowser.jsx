import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Folder, FileText, Check, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";

const RECEIPTS_FOLDER_ID = "1MqxUfevtS1FQ-lbmS0dtawmS6o7ui51H";

function FileThumb({ file }) {
  const [err, setErr] = useState(false);
  if (file.thumbnailLink && !err) {
    return (
      <img
        src={file.thumbnailLink}
        alt={file.name}
        loading="lazy"
        className="w-full h-full object-cover"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center">
      <FileText className="w-10 h-10 text-muted-foreground" />
    </div>
  );
}

function FileGrid({ files, onPick }) {
  const isPickMode = !!onPick;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {files.map((f) => (
        <div key={f.id} className="rounded-lg border bg-card overflow-hidden flex flex-col">
          <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
            <FileThumb file={f} />
          </div>
          <div className="p-2 flex-1 flex flex-col gap-1.5">
            <span className="text-xs font-medium truncate" title={f.name}>{f.name}</span>
            <div className="flex items-center gap-1">
              {isPickMode && (
                <Button size="sm" className="h-7 text-xs flex-1" onClick={() => onPick(f)}>
                  <Check className="w-3 h-3 mr-1" /> Pin
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" asChild>
                <a href={f.webViewLink} target="_blank" rel="noreferrer" aria-label="Open in Drive">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SubfolderSection({ sub, expanded, onToggle, onPick }) {
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["driveReceipts", sub.id],
    queryFn: async () => {
      const res = await base44.functions.invoke("listDriveReceipts", { folder_id: sub.id });
      return res.data?.files || [];
    },
    enabled: expanded,
  });
  return (
    <div className="rounded-lg border">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left px-3 py-2.5 min-h-11 hover:bg-accent"
      >
        {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
        <Folder className="w-4 h-4 text-primary shrink-0" />
        <span className="font-medium truncate">{sub.name}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No files in this subfolder.</p>
          ) : (
            <FileGrid files={files} onPick={onPick} />
          )}
        </div>
      )}
    </div>
  );
}

export default function ReceiptsBrowser({ onPick }) {
  const [expanded, setExpanded] = useState({});
  const folderId = RECEIPTS_FOLDER_ID;

  const { data: root = { files: [], folders: [] }, isLoading: loadingRoot } = useQuery({
    queryKey: ["driveReceipts", folderId],
    queryFn: async () => {
      const res = await base44.functions.invoke("listDriveReceipts", { folder_id: folderId });
      return { files: res.data?.files || [], folders: res.data?.folders || [] };
    },
    enabled: !!folderId,
  });

  const toggleSub = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="space-y-4">
      {loadingRoot ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {root.files.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Receipts folder</h3>
              <FileGrid files={root.files} onPick={onPick} />
            </div>
          )}
          {root.folders.map((sub) => (
            <SubfolderSection
              key={sub.id}
              sub={sub}
              expanded={!!expanded[sub.id]}
              onToggle={() => toggleSub(sub.id)}
              onPick={onPick}
            />
          ))}
          {root.files.length === 0 && root.folders.length === 0 && (
            <p className="text-sm text-muted-foreground py-6">No files in this folder.</p>
          )}
        </>
      )}
    </div>
  );
}