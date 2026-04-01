import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Register from './pages/Register';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SetupWelcome from './pages/setup/SetupWelcome';
import SetupConnect from './pages/setup/SetupConnect';
import SetupSelectNumber from './pages/setup/SetupSelectNumber';
import Dashboard from './pages/portal/Dashboard';
import Inbox from './pages/portal/Inbox';
import NewMessage from './pages/portal/NewMessage';
import MediaLibraryPage from './pages/portal/MediaLibraryPage';
import AutoResponses from './pages/portal/AutoResponses';
import Templates from './pages/portal/Templates';
import Campaigns from './pages/portal/Campaigns';
import Contacts from './pages/portal/Contacts';
import Analytics from './pages/portal/Analytics';
import Logs from './pages/portal/Logs';
import SettingsPage from './pages/portal/Settings';
import PortalLayout from './components/Layout/PortalLayout';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requiredStatus }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login/" replace />;
  if (requiredStatus && user?.status !== requiredStatus) {
    if (user?.status === 'pending_verification') return <Navigate to="/login/" replace />;
    if (user?.status === 'pending_setup') return <Navigate to="/portal/setup/" replace />;
    if (user?.status === 'active') return <Navigate to="/portal/dashboard/" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) {
    if (user?.status === 'pending_setup') return <Navigate to="/portal/setup/" replace />;
    if (user?.status === 'active') return <Navigate to="/portal/dashboard/" replace />;
  }
  return children;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return (
    <Routes>
      <Route path="/register" element={<Navigate to="/register/" replace />} />
      <Route path="/login" element={<Navigate to="/login/" replace />} />
      <Route path="/register/" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/login/" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/portal/setup" element={<ProtectedRoute requiredStatus="pending_setup"><SetupWelcome /></ProtectedRoute>} />
      <Route path="/portal/setup/connect" element={<ProtectedRoute requiredStatus="pending_setup"><SetupConnect /></ProtectedRoute>} />
      <Route path="/portal/setup/select-number" element={<ProtectedRoute requiredStatus="pending_setup"><SetupSelectNumber /></ProtectedRoute>} />
      <Route path="/portal" element={<ProtectedRoute requiredStatus="active"><PortalLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="messages/new" element={<NewMessage />} />
        <Route path="media-library" element={<MediaLibraryPage />} />
        <Route path="auto-responses" element={<AutoResponses />} />
        <Route path="templates" element={<Templates />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="logs" element={<Logs />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
      <Route path="/" element={<Navigate to="/login/" replace />} />
      <Route path="*" element={<Navigate to="/login/" replace />} />
    </Routes>
  );
}
