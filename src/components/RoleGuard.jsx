import { useAuth } from "@/lib/AuthContext";
import AccessDenied from "@/components/AccessDenied";

export default function RoleGuard({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <AccessDenied />;
  return children;
}