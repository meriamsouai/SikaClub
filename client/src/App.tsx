import { Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "./components/AdminShell";
import { AppShell } from "./components/AppShell";
import { AdminRoute, GuestRoute, ProtectedRoute } from "./components/RouteGuards";
import { AddInvoicePage } from "./pages/AddInvoicePage";
import { AdminAdsPage } from "./pages/AdminAdsPage";
import { AdminClientsPage } from "./pages/AdminClientsPage";
import { AdminGiftsPage } from "./pages/AdminGiftsPage";
import { AdminLeaderboardPage } from "./pages/AdminLeaderboardPage";
import { AdminInvoicesPage } from "./pages/AdminInvoicesPage";
import { AdminPendingPage } from "./pages/AdminPendingPage";
import { AdminRedemptionsPage } from "./pages/AdminRedemptionsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GiftsPage } from "./pages/GiftsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SignupPage } from "./pages/SignupPage";

export function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/factures/nouvelle" replace />} />
          <Route path="/factures/nouvelle" element={<AddInvoicePage />} />
          <Route path="/historique" element={<HistoryPage />} />
          <Route path="/factures" element={<Navigate to="/historique" replace />} />
          <Route path="/points" element={<Navigate to="/historique?tab=points" replace />} />
          <Route path="/gagner-points" element={<Navigate to="/factures/nouvelle" replace />} />
          <Route path="/cadeaux" element={<GiftsPage />} />
          <Route path="/profil" element={<DashboardPage />} />
        </Route>
      </Route>
      <Route element={<AdminRoute />}>
        <Route element={<AdminShell />}>
          <Route path="/admin" element={<AdminPendingPage />} />
          <Route path="/admin/factures" element={<AdminInvoicesPage />} />
          <Route path="/admin/echanges" element={<AdminRedemptionsPage />} />
          <Route path="/admin/clients" element={<AdminClientsPage />} />
          <Route path="/admin/classement" element={<AdminLeaderboardPage />} />
          <Route path="/admin/cadeaux" element={<AdminGiftsPage />} />
          <Route path="/admin/publicites" element={<AdminAdsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
