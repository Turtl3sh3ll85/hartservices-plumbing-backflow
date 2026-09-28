import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MobileSelect } from "@/components/ui/mobile-select";
import EmptyState from "@/components/EmptyState";
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
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

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
              <div className="min-w-0">
                <div className="font-medium truncate">{u.full_name || u.email}</div>
                <div className="text-sm text-muted-foreground truncate">{u.email}</div>
              </div>
              <div className="w-full sm:w-48">
                <MobileSelect
                  value={u.role}
                  onValueChange={(v) => changeRole(u, v)}
                  options={ROLE_OPTIONS}
                  placeholder="Select role"
                  ariaLabel="User role"
                  triggerClassName="w-full"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}