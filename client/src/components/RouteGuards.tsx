import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { isStaffRole } from "../lib/roles";

function FullPageLoader() {
  const { messages } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex items-center gap-3 text-sm font-medium text-muted">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sika-red" />
        {messages.nav.loading}
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (isStaffRole(user.role)) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isStaffRole(user.role)) return <Navigate to="/factures/nouvelle" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) {
    return <Navigate to={isStaffRole(user.role) ? "/admin" : "/factures/nouvelle"} replace />;
  }
  return <Outlet />;
}
