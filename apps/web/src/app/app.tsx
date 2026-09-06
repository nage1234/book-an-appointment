import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/authentication/login';
import Register from './pages/authentication/register';
import DashboardCustomer from './pages/dashboard/dashboard';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<DashboardCustomer />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
