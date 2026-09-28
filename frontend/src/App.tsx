import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './stores/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import NewSessionPage from './pages/NewSessionPage';
import SessionPage from './pages/SessionPage';
import ReportPage from './pages/ReportPage';
import HistoryPage from './pages/HistoryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    // Mutations (POST /start, POST /end, etc.) must NEVER auto-retry.
    // A 400 ACTIVE response from /start means the session is already running —
    // retrying would create duplicate Agora agents.
    mutations: { retry: false },
  },
});

function LayoutRoute() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing page is accessible to all */}
            <Route path="/" element={<LandingPage />} />

            {/* Public only */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected with sidebar */}
            <Route element={<ProtectedRoute />}>
              <Route element={<LayoutRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/session/new" element={<NewSessionPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/session/:id/report" element={<ReportPage />} />
              </Route>

              {/* Full-screen session (no sidebar) */}
              <Route path="/session/:id" element={<SessionPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
