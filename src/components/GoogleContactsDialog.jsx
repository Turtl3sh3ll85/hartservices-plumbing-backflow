import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function GoogleContactsDialog({ open, onOpenChange, onPick }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await base44.functions.invoke("listGoogleContacts", {});
        if (!cancelled) setContacts(res.data.contacts || []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load contacts");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const filtered = query
    ? contacts.filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(query.toLowerCase()))
    : contacts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose from Google Contacts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search contacts..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading contacts…</p>
          ) : error ? (
            <p className="text-sm text-red-600 py-6 text-center">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No contacts found.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-1">
              {filtered.map((c, i) => (
                <button key={i} type="button" onClick={() => { onPick(c); onOpenChange(false); }} className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="w-4 h-4 text-muted-foreground" /></div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{c.name || c.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.email}{c.phone ? ` · ${c.phone}` : ""}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}