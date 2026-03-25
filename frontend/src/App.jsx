import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LeaveRequests from "./pages/LeaveRequests";
import PendingLeaves from "./pages/PendingLeaves";
import UsersPage from "./pages/UsersPage";
import ChangePassword from "./pages/ChangePassword";
import TeamCalendar from "./pages/TeamCalendar";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layout/AppLayout";
import { getToken, getMustChangePassword } from "./services/auth";

export default function App() {
  const token = getToken();
  const mustChangePassword = getMustChangePassword();

  return (
    <Routes>
      <Route
        path="/"
        element={
          token
            ? mustChangePassword
              ? <Navigate to="/change-password" replace />
              : <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />

      <Route path="/login" element={<Login />} />

      <Route
        path="/change-password"
        element={
          token ? <ChangePassword /> : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {mustChangePassword ? (
              <Navigate to="/change-password" replace />
            ) : (
              <AppLayout>
                <Dashboard />
              </AppLayout>
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave"
        element={
          <ProtectedRoute>
            {mustChangePassword ? (
              <Navigate to="/change-password" replace />
            ) : (
              <AppLayout>
                <LeaveRequests />
              </AppLayout>
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave/pending"
        element={
          <ProtectedRoute>
            {mustChangePassword ? (
              <Navigate to="/change-password" replace />
            ) : (
              <AppLayout>
                <PendingLeaves />
              </AppLayout>
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/team-calendar"
        element={
          <ProtectedRoute>
            {mustChangePassword ? (
              <Navigate to="/change-password" replace />
            ) : (
              <AppLayout>
                <TeamCalendar />
              </AppLayout>
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            {mustChangePassword ? (
              <Navigate to="/change-password" replace />
            ) : (
              <AppLayout>
                <UsersPage />
              </AppLayout>
            )}
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}