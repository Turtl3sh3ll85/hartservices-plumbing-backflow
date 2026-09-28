import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MobileSelect } from "@/components/ui/mobile-select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, UserPlus } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "tech", label: "Tech" },
  { value: "accountant", label: "Accountant" },
  { value: "customer", label: "Customer" },
];

export default function InviteUserDialog({ open, onOpenChange, onInvited }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await base44.users.inviteUser(trimmed, role);
      toast({ description: `Invitation sent to ${trimmed}.` });
      setEmail("");
      setRole("user");
      onOpenChange(false);
      onInvited?.();
    } catch (err) {
      toast({ variant: "destructive", description: err?.message || "Could not invite user." });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold mb-1">Invite user</h2>
        <p className="text-sm text-muted-foreground mb-4">They'll receive an email with a link to join the app.</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus required disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <MobileSelect value={role} onValueChange={setRole} options={ROLE_OPTIONS} triggerClassName="w-full" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
              Send invite
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}