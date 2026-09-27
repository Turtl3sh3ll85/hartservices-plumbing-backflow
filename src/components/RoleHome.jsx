import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import Dashboard from "@/pages/Dashboard";

export default function RoleHome() {
  const { user } = useAuth();
  if (user?.role === "customer") return <Navigate to="/portal" replace />;
  return <Dashboard />;
}