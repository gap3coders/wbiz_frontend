import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { MessageCircle, Shield } from 'lucide-react';

import Register from './pages/Register';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import PendingApproval from './pages/PendingApproval';
import Pricing from './pages/portal/Pricing';
import SetupWelcome from './pages/setup/SetupWelcome';
import SetupConnect from './pages/setup/SetupConnect';
import SetupSelectNumber from './pages/setup/SetupSelectNumber';
import Dashboard from './pages/portal/Dashboard';
import Inbox from './pages/portal/Inbox';
import NewMessage from './pages/portal/NewMessage';
import MediaLibraryPage from './pages/portal/MediaLibraryPage';
import AutoResponses from './pages/portal/AutoResponses';
import DateTriggers from './pages/portal/DateTriggers';
import Templates from './pages/portal/Templates';
import TemplateCreate from './pages/portal/TemplateCreate';
import AutoResponseCreate from './pages/portal/AutoResponseCreate';
import Campaigns from './pages/portal/Campaigns';
import CampaignCreate from './pages/portal/CampaignCreate';
import CampaignDetail from './pages/portal/CampaignDetail';
import Contacts from './pages/portal/Contacts';
import CustomFields from './pages/portal/CustomFields';
import TeamMembers from './pages/portal/TeamMembers';
import Analytics from './pages/portal/Analytics';
import Activity from './pages/portal/Activity';
import SettingsPage from './pages/portal/Settings';
import Billing from './pages/portal/Billing';
import QuickReplies from './pages/portal/QuickReplies';
import QuickReplyCreate from './pages/portal/QuickReplyCreate';
import QRCodeGenerator from './pages/portal/QRCodeGenerator';
import InteractiveMessages from './pages/portal/InteractiveMessages';
import PhoneNumbers from './pages/portal/PhoneNumbers';
import Flows from './pages/portal/Flows';
import FlowBuilder from './pages/portal/FlowBuilder';
import ApiKeys from './pages/portal/ApiKeys';
import TemplateAnalytics from './pages/portal/TemplateAnalytics';
import PortalLayout from './components/Layout/PortalLayout';
import MinimalLayout from './components/Layout/MinimalLayout';
import UpgradeModal from './components/UpgradeModal';

// Admin — lazy loaded
const AdminLayout = lazy(() => import('./components/Layout/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminTenants = lazy(() => import('./pages/admin/AdminTenants'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminPlans = lazy(() => import('./pages/admin/AdminPlans'));
const AdminEmailTemplates = lazy(() => import('./pages/admin/AdminEmailTemplates'));
const AdminAdminUsers = lazy(() => import('./pages/admin/AdminAdminUsers'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminSystemInfo = lazy(() => import('./pages/admin/AdminSystemInfo'));
const AdminSystemConfig = lazy(() => import('./pages/admin/AdminSystemConfig'));
const AdminTenantDetail = lazy(() => import('./pages/admin/AdminTenantDetail'));
const AdminUserDetail = lazy(() => import('./pages/admin/AdminUserDetail'));

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 animate-pulse">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-surface-900 tracking-tight">WBIZ.IN</p>
          <p className="text-[11px] text-surface-400 mt-0.5">Your Business. Your WhatsApp. One Powerful Platform.</p>
        </div>
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requiredStatus, allowExpired = false }) {
  const { isAuthenticated, user, tenant, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login/" replace />;

  const tenantSetup = tenant?.setup_status || 'active';

  // For first-time users, route based on user status
  if (requiredStatus && user?.status !== requiredStatus) {
    // Allow active users with pending tenant setup to access setup/pricing pages
    if (user?.status === 'active' && requiredStatus === 'pending_setup' && tenantSetup === 'pending_setup') return children;
    if (user?.status === 'active' && tenantSetup === 'pending_plan') return <Navigate to="/portal/pricing" replace />;
    if (user?.status === 'active' && tenantSetup === 'pending_setup') return <Navigate to="/portal/setup" replace />;

    if (user?.status === 'pending_verification') return <Navigate to="/login/" replace />;
    if (user?.status === 'pending_approval') return <Navigate to="/pending-approval" replace />;
    if (user?.status === 'pending_plan') return <Navigate to="/portal/pricing" replace />;
    if (user?.status === 'pending_setup') return <Navigate to="/portal/setup" replace />;
    if (user?.status === 'active') return <Navigate to="/portal/dashboard/" replace />;
  }

  return children;
}

function ActiveRoute({ children }) {
  const { isAuthenticated, user, tenant, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login/" replace />;

  const tenantSetup = tenant?.setup_status || 'active';

  // Redirect based on user status
  if (user?.status === 'pending_verification') return <Navigate to="/login/" replace />;
  if (user?.status === 'pending_approval') return <Navigate to="/pending-approval" replace />;
  if (user?.status === 'pending_plan') return <Navigate to="/portal/pricing" replace />;
  if (user?.status === 'pending_setup') return <Navigate to="/portal/setup/" replace />;
  if (user?.status !== 'active') return <Navigate to="/login/" replace />;

  // For active users, check tenant setup status
  if (tenantSetup === 'pending_plan') return <Navigate to="/portal/pricing" replace />;
  if (tenantSetup === 'pending_setup') return <Navigate to="/portal/setup" replace />;

  return (
    <>
      <UpgradeModal />
      {children}
    </>
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) {
    if (user?.status === 'pending_approval') return <Navigate to="/pending-approval" replace />;
    if (user?.status === 'pending_plan') return <Navigate to="/portal/pricing" replace />;
    if (user?.status === 'pending_setup') return <Navigate to="/portal/setup/" replace />;
    if (user?.status === 'active') return <Navigate to="/portal/dashboard/" replace />;
  }
  return children;
}

function PricingRoute({ children }) {
  const { isAuthenticated, user, tenant, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login/" replace />;
  // Allow pending_plan and active (for upgrades/new business) users
  if (user?.status === 'pending_approval') return <Navigate to="/pending-approval" replace />;
  if (user?.status === 'pending_verification') return <Navigate to="/login/" replace />;
  return children;
}

function PendingApprovalRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login/" replace />;
  if (user?.status !== 'pending_approval') {
    if (user?.status === 'pending_plan') return <Navigate to="/portal/pricing" replace />;
    if (user?.status === 'pending_setup') return <Navigate to="/portal/setup/" replace />;
    if (user?.status === 'active') return <Navigate to="/portal/dashboard/" replace />;
    return <Navigate to="/login/" replace />;
  }
  return children;
}

function AdminLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 animate-pulse">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-surface-900 tracking-tight">WBIZ Admin</p>
          <p className="text-[11px] text-surface-400 mt-0.5">Control Panel</p>
        </div>
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    </div>
  );
}

function AdminProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAdminAuth();
  if (loading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return children;
}

function AdminPublicRoute({ children }) {
  const { isAuthenticated, loading } = useAdminAuth();
  if (loading) return <AdminLoadingScreen />;
  if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />;
  return children;
}

function PortalApp() {
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

      {/* Pending Approval — works both authenticated and unauthenticated */}
      <Route path="/pending-approval" element={<MinimalLayout><PendingApproval /></MinimalLayout>} />

      {/* Pricing — accessible to pending_plan + active users */}
      <Route path="/portal/pricing" element={<PricingRoute><MinimalLayout><Pricing /></MinimalLayout></PricingRoute>} />

      {/* Setup */}
      <Route path="/portal/setup" element={<ProtectedRoute requiredStatus="pending_setup"><SetupWelcome /></ProtectedRoute>} />
      <Route path="/portal/setup/connect" element={<ProtectedRoute requiredStatus="pending_setup"><SetupConnect /></ProtectedRoute>} />
      <Route path="/portal/setup/select-number" element={<ProtectedRoute requiredStatus="pending_setup"><SetupSelectNumber /></ProtectedRoute>} />

      {/* Main Portal — active users only with upgrade modal */}
      <Route path="/portal" element={<ActiveRoute><PortalLayout /></ActiveRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="messages/new" element={<NewMessage />} />
        <Route path="media-library" element={<MediaLibraryPage />} />
        <Route path="auto-responses" element={<AutoResponses />} />
        <Route path="auto-responses/new" element={<AutoResponseCreate />} />
        <Route path="auto-responses/:id/edit" element={<AutoResponseCreate />} />
        <Route path="date-triggers" element={<DateTriggers />} />
        <Route path="templates" element={<Templates />} />
        <Route path="templates/new" element={<TemplateCreate />} />
        <Route path="templates/:id/edit" element={<TemplateCreate />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/new" element={<CampaignCreate />} />
        <Route path="campaigns/:id" element={<CampaignDetail />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="custom-fields" element={<CustomFields />} />
        <Route path="team" element={<TeamMembers />} />
        <Route path="contact-lists" element={<Navigate to="/portal/contacts" replace />} />
        <Route path="quick-replies" element={<QuickReplies />} />
        <Route path="quick-replies/new" element={<QuickReplyCreate />} />
        <Route path="quick-replies/:id/edit" element={<QuickReplyCreate />} />
        <Route path="qr-code" element={<QRCodeGenerator />} />
        <Route path="interactive-messages" element={<InteractiveMessages />} />
        <Route path="flows" element={<Flows />} />
        <Route path="flows/new/builder" element={<FlowBuilder />} />
        <Route path="flows/:id/builder" element={<FlowBuilder />} />
        <Route path="api-keys" element={<ApiKeys />} />
        <Route path="template-analytics" element={<TemplateAnalytics />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="activity" element={<Activity />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="phone-numbers" element={<PhoneNumbers />} />
        <Route path="billing" element={<Billing />} />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
      <Route path="/" element={<Navigate to="/login/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AdminApp() {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<AdminLoadingScreen />}>
        <Routes>
          <Route path="/admin/login" element={<AdminPublicRoute><AdminLogin /></AdminPublicRoute>} />
          <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="tenants" element={<AdminTenants />} />
            <Route path="tenants/:id" element={<AdminTenantDetail />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="email-templates" element={<AdminEmailTemplates />} />
            <Route path="admin-users" element={<AdminAdminUsers />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="system" element={<AdminSystemInfo />} />
            <Route path="config" element={<AdminSystemConfig />} />
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </AdminAuthProvider>
  );
}

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  return (
    <ErrorBoundary>
      {isAdminRoute ? <AdminApp /> : <PortalApp />}
    </ErrorBoundary>
  );
}
