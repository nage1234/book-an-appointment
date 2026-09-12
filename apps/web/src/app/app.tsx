import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/authentication/login';
import Register from './pages/authentication/register';
import ForgotPassword from './pages/authentication/forgotPassword';
import AvailabilityDashboard from './pages/dashboard/dashboard';
import AdminDashboard from './pages/dashboard/adminDashboard';
import { useAuth } from './pages/authentication/useAuth';

function RequireAuth({ children, role }: { children: ReactNode; role?: 'admin' }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.type !== role) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AvailabilityDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth role="admin">
            <AdminDashboard />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
