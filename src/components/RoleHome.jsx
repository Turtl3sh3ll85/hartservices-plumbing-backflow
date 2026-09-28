import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/pages/Dashboard";

export default function RoleHome() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return <LandingPage />;
  if (user.role === "customer") {
    return <Navigate to={`/portal?email=${encodeURIComponent(user.email)}`} replace />;
  }
  return <Dashboard />;
}