// App version 2.0 - Production Build
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RefreshProvider } from './context/RefreshContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import ActivitiesPage from './pages/ActivitiesPage';
import MyActivitiesPage from './pages/MyActivitiesPage';
import EnrollmentsPage from './pages/EnrollmentsPage';
import ProgramsPage from './pages/ProgramsPage';
import RoomsPage from './pages/RoomsPage';
import UsersPage from './pages/UsersPage';
import ServicesPage from './pages/ServicesPage';
import NotificationsPage from './pages/NotificationsPage';
import AuditPage from './pages/AuditPage';
import UserStatsPage from './pages/UserStatsPage';
import RequestsPage from './pages/RequestsPage';
import MyRequestsPage from './pages/MyRequestsPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="my-activities" element={<MyActivitiesPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="enrollments" element={<ProtectedRoute roles={['admin', 'coordinator']}><EnrollmentsPage /></ProtectedRoute>} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />

        {/* Rutas restringidas */}
        <Route path="users" element={<ProtectedRoute roles={['admin', 'coordinator']}><UsersPage /></ProtectedRoute>} />
        <Route path="user-stats" element={<ProtectedRoute roles={['admin', 'coordinator']}><UserStatsPage /></ProtectedRoute>} />
        <Route path="requests" element={<ProtectedRoute roles={['admin', 'coordinator']}><RequestsPage /></ProtectedRoute>} />
        <Route path="my-requests" element={<MyRequestsPage />} />
        <Route path="audit" element={<ProtectedRoute roles={['admin']}><AuditPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RefreshProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1a1f35',
                color: '#f1f5f9',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                fontSize: '0.9rem'
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } }
            }}
          />
          <AppRoutes />
        </RefreshProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
