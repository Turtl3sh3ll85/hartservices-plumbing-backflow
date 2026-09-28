import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { UserCog, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MobileSelect } from "@/components/ui/mobile-select";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "tech", label: "Tech" },
  { value: "accountant", label: "Accountant" },
  { value: "customer", label: "Customer" },
];

const roleLabel = (r) => ROLE_OPTIONS.find((o) => o.value === r)?.label || r || "—";

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });
  const companyByEmail = new Map(
    customers
      .filter((c) => c.email && c.company)
      .map((c) => [c.email.toLowerCase(), c.company])
  );
  const displayName = (u) => companyByEmail.get((u.email || "").toLowerCase()) || u.full_name || u.email;

  const changeRole = async (user, role) => {
    if (role === user.role) return;
    const prev = users;
    queryClient.setQueryData(["users"], (old) => (old || []).map((u) => (u.id === user.id ? { ...u, role } : u)));
    try {
      await base44.entities.User.update(user.id, { role });
      toast({ description: `${user.full_name || user.email} is now ${roleLabel(role)}.` });
    } catch (e) {
      queryClient.setQueryData(["users"], prev);
      toast({ variant: "destructive", description: "Could not update role." });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await base44.entities.User.delete(pendingDelete.id);
      queryClient.setQueryData(["users"], (old) => (old || []).filter((u) => u.id !== pendingDelete.id));
      toast({ description: `${pendingDelete.full_name || pendingDelete.email} was removed.` });
      setPendingDelete(null);
    } catch (e) {
      toast({ variant: "destructive", description: "Could not remove user." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">Assign each user a role — customers see their documents, accountants see the books.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : users.length === 0 ? (
        <EmptyState icon={UserCog} title="No users yet" description="Invite users from the dashboard, then set their role here." />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {users.map((u) => (
            <Card key={u.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <Link to={`/users/${u.id}`} className="min-w-0 hover:underline">
                <div className="font-medium truncate">{displayName(u)}</div>
                <div className="text-sm text-muted-foreground truncate">{u.email}</div>
              </Link>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:w-48">
                  <MobileSelect
                    value={u.role}
                    onValueChange={(v) => changeRole(u, v)}
                    options={ROLE_OPTIONS}
                    placeholder="Select role"
                    ariaLabel="User role"
                    triggerClassName="w-full"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setPendingDelete(u)}
                  disabled={u.id === currentUser?.id}
                  aria-label={`Remove ${u.full_name || u.email}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove user?"
        description={`This removes ${pendingDelete?.full_name || pendingDelete?.email || "this user"} from the app. Their saved documents and history are not deleted.`}
        confirmLabel="Remove"
        destructive
        onConfirm={confirmDelete}
      />
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}