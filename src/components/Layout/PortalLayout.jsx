import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Avatar from '../ui/Avatar';
import usePortalSocket from '../../hooks/usePortalSocket';
import {
  LayoutDashboard, MessageCircle, Send, Image, Bot, FileText,
  Megaphone, Users, BarChart3, Settings, Bell, Menu, X, LogOut,
  ChevronLeft, ChevronRight, Clock, Search, CreditCard, Command,
  CheckCircle2, AlertTriangle, Info, Zap, MessageSquare as MsgIcon,
  ShieldCheck, Phone, Webhook, Server, QrCode, LayoutList, Database, UserPlus,
  CalendarClock, Smartphone, ChevronDown, Check, GitBranch, Key,
} from 'lucide-react';

/* ── Inline Meta (WhatsApp) icon ─────────────────────────────────────── */
const MetaIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2C6.48 2 2 6.22 2 11.35c0 2.94 1.56 5.57 4 7.27V22l3.2-1.76c.9.25 1.84.38 2.8.38 5.52 0 10-4.22 10-9.35S17.52 2 12 2z" fill="#25D366"/>
    <path d="M13.12 14.06l-2.44-2.6L6.5 14.06l4.58-4.86 2.5 2.6 4.12-2.6-4.58 4.86z" fill="#fff"/>
  </svg>
);

/* ── Inline WBIZ.IN app icon ─────────────────────────────────────────── */
const WbizIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#wbiz_grad)"/>
    <defs><linearGradient id="wbiz_grad" x1="2" y1="2" x2="22" y2="22"><stop stopColor="#25D366"/><stop offset="1" stopColor="#128C7E"/></linearGradient></defs>
    <text x="12" y="16.5" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800" fontFamily="Inter,system-ui,sans-serif">W</text>
  </svg>
);

/* ── Notification helpers ─────────────────────────────────────────────── */
const NOTIF_TYPE_META = {
  template_approved:  { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  template_rejected:  { icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-50' },
  template_paused:    { icon: Clock,         color: 'text-amber-500',   bg: 'bg-amber-50' },
  template_pending:   { icon: Clock,         color: 'text-blue-500',    bg: 'bg-blue-50' },
  message_failed:     { icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-50' },
  account_warning:    { icon: ShieldCheck,   color: 'text-amber-500',   bg: 'bg-amber-50' },
  quality_change:     { icon: BarChart3,     color: 'text-violet-500',  bg: 'bg-violet-50' },
  campaign_complete:  { icon: Megaphone,     color: 'text-emerald-500', bg: 'bg-emerald-50' },
  phone_verified:     { icon: Phone,         color: 'text-emerald-500', bg: 'bg-emerald-50' },
  system:             { icon: Server,        color: 'text-surface-500', bg: 'bg-surface-100' },
  meta_error:         { icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-50' },
  webhook_error:      { icon: Webhook,       color: 'text-red-500',     bg: 'bg-red-50' },
};
const SEVERITY_COLORS = {
  success: 'border-l-emerald-400',
  error:   'border-l-red-400',
  warning: 'border-l-amber-400',
  info:    'border-l-blue-400',
};
function notifMeta(n) {
  const entry = NOTIF_TYPE_META[n.type] || { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' };
  return entry;
}
function cleanMsg(text) {
  if (!text) return '';
  return text.replace(/^\[(Meta|Platform|WBIZ|System)\]\s*/i, '');
}

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/portal/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
      { to: '/portal/inbox',         label: 'Live Chat',      icon: MessageCircle, badgeKey: 'inbox' },
      { to: '/portal/messages/new',  label: 'New Message',    icon: Send },
      { to: '/portal/media-library', label: 'Gallery',        icon: Image },
    ],
  },
  {
    label: 'Messaging',
    items: [
      { to: '/portal/quick-replies',        label: 'Quick Replies',  icon: Zap },
      { to: '/portal/interactive-messages',  label: 'Interactive',    icon: LayoutList },
      { to: '/portal/auto-responses',        label: 'Auto Responses', icon: Bot },
      { to: '/portal/date-triggers',        label: 'Date Triggers',  icon: CalendarClock },
      { to: '/portal/templates',             label: 'Templates',      icon: FileText },
      { to: '/portal/flows',                 label: 'Flows',          icon: GitBranch },
    ],
  },
  {
    label: 'Outreach',
    items: [
      { to: '/portal/campaigns',      label: 'Campaigns',      icon: Megaphone },
      { to: '/portal/contacts',       label: 'Contacts',       icon: Users },
      { to: '/portal/custom-fields', label: 'Custom Fields',  icon: Database },
      { to: '/portal/qr-code',        label: 'QR Code',        icon: QrCode },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/portal/analytics',           label: 'Analytics',           icon: BarChart3 },
      { to: '/portal/template-analytics', label: 'Template Analytics', icon: BarChart3 },
      { to: '/portal/activity',           label: 'Activity',           icon: Clock },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/portal/settings',      label: 'Settings',      icon: Settings },
      { to: '/portal/billing',       label: 'Billing',       icon: CreditCard },
      { to: '/portal/team',          label: 'Team',          icon: UserPlus },
      { to: '/portal/api-keys',     label: 'API Keys',     icon: Key },
    ],
  },
];

export default function PortalLayout() {
  const { user, tenant, allTenants, switchTenant, createBusiness, logout, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'meta' | 'platform'
  const notifRef = useRef(null);
  const notifBtnRef = useRef(null);

  // ── Business (tenant) switcher state ──
  const [showBizSwitcher, setShowBizSwitcher] = useState(false);
  const [creatingBiz, setCreatingBiz] = useState(false);
  const bizSwitcherRef = useRef(null);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showNotif) return;
    const handler = (e) => {
      if (
        notifRef.current && !notifRef.current.contains(e.target) &&
        notifBtnRef.current && !notifBtnRef.current.contains(e.target)
      ) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotif]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || authLoading) return;
    try {
      const { data } = await api.get('/notifications', { params: { limit: 15 } });
      const raw = data?.notifications || data?.data?.notifications || data?.data || [];
      const items = Array.isArray(raw) ? raw : [];
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);
    } catch { /* silent */ }
  }, [isAuthenticated, authLoading]);

  const fetchInboxUnread = useCallback(async () => {
    if (!isAuthenticated || authLoading) return;
    try {
      const { data } = await api.get('/inbox/conversations', { params: { limit: 1 } });
      setInboxUnread(data?.unreadTotal || 0);
    } catch { /* silent */ }
  }, [isAuthenticated, authLoading]);

  // Close business switcher on outside click
  useEffect(() => {
    if (!showBizSwitcher) return;
    const handler = (e) => {
      if (bizSwitcherRef.current && !bizSwitcherRef.current.contains(e.target)) {
        setShowBizSwitcher(false);
        setShowCreateBiz(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBizSwitcher]);

  const handleSwitchBiz = async (tenantId) => {
    if (String(tenantId) === String(tenant?._id)) {
      setShowBizSwitcher(false);
      return;
    }
    try {
      await switchTenant(tenantId);
      setShowBizSwitcher(false);
      // Check setup status of the tenant we're switching to
      const targetTenant = allTenants.find(t => String(t._id) === String(tenantId));
      if (targetTenant?.setup_status === 'pending_plan') {
        navigate('/portal/pricing', { replace: true });
      } else if (targetTenant?.setup_status === 'pending_setup') {
        navigate('/portal/setup', { replace: true });
      } else {
        navigate('/portal/dashboard', { replace: true });
      }
    } catch { /* silent */ }
  };

  const handleCreateBiz = async () => {
    setCreatingBiz(true);
    try {
      const result = await createBusiness();
      setShowBizSwitcher(false);
      // New business needs plan selection first, then Meta setup
      navigate(result?.redirect_to || '/portal/pricing', { replace: true });
    } catch { /* silent */ }
    setCreatingBiz(false);
  };

  // WebSocket: real-time notification + inbox updates
  const handleSocketNotification = useCallback((payload) => {
    if (payload && payload._id) {
      setNotifications((prev) => [payload, ...prev].slice(0, 30));
      if (!payload.read) setUnreadCount((c) => c + 1);
    } else {
      fetchNotifications(); // fallback: re-fetch
    }
  }, [fetchNotifications]);

  const handleSocketInboxUnread = useCallback((payload) => {
    if (payload && typeof payload.count === 'number') {
      setInboxUnread(payload.count);
    } else {
      fetchInboxUnread();
    }
  }, [fetchInboxUnread]);

  usePortalSocket({
    enabled: isAuthenticated && !authLoading,
    onNotification: handleSocketNotification,
    onInboxUnread: handleSocketInboxUnread,
  });

  // Fallback polling at 60s (in case WebSocket disconnects)
  useEffect(() => {
    fetchNotifications();
    fetchInboxUnread();
    const t1 = setInterval(() => {
      if (document.visibilityState === 'visible') fetchNotifications();
    }, 60000);
    const t2 = setInterval(() => {
      if (document.visibilityState === 'visible') fetchInboxUnread();
    }, 60000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchNotifications, fetchInboxUnread]);

  const handleLogout = async () => {
    try { await logout(); } catch { /* silent */ }
    navigate('/login/', { replace: true });
  };

  const markNotifRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  // Get page title from current path
  const getPageTitle = () => {
    const path = location.pathname;
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (path.startsWith(item.to)) return item.label;
      }
    }
    return 'Dashboard';
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className={`h-full flex flex-col sidebar-gradient ${mobile ? 'w-[272px]' : collapsed ? 'w-[68px]' : 'w-[252px]'} transition-all duration-300 ease-in-out`}>

      {/* Brand */}
      <div className={`flex items-center ${collapsed && !mobile ? 'justify-center px-2' : 'px-4'} h-[60px] flex-shrink-0`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/20">
          <MessageCircle className="w-[18px] h-[18px] text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div className="ml-3 min-w-0">
            <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">WBIZ.IN</h1>
            <p className="text-[10px] text-surface-500 font-medium mt-0.5 uppercase tracking-wider">
              WA Business Suite
            </p>
          </div>
        )}
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-surface-400" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-white/[0.06]" />

      {/* Business Switcher */}
      <div className="px-2.5 py-2 relative" ref={bizSwitcherRef}>
        <button
          onClick={() => setShowBizSwitcher(s => !s)}
          className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.07] ${collapsed && !mobile ? 'justify-center' : ''}`}
          title={collapsed && !mobile ? tenant?.name || 'Business' : undefined}
        >
          <div className="relative flex-shrink-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${tenant?.setup_status === 'active' || !tenant?.setup_status ? 'bg-gradient-to-br from-brand-400/30 to-brand-600/30 border-brand-400/20' : 'bg-amber-500/20 border-amber-400/20'}`}>
              <span className={`text-[11px] font-bold ${tenant?.setup_status === 'active' || !tenant?.setup_status ? 'text-brand-300' : 'text-amber-300'}`}>
                {(tenant?.name || 'B').charAt(0).toUpperCase()}
              </span>
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-[#1a1d23] ${tenant?.setup_status === 'active' || !tenant?.setup_status ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </div>
          {(!collapsed || mobile) && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-surface-300 truncate">
                  {tenant?.name || 'Select Business'}
                </p>
                <p className="text-[10px] text-surface-500 truncate">
                  {tenant?.plan ? `${tenant.plan} plan` : 'No plan'}
                </p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-surface-500 flex-shrink-0 transition-transform ${showBizSwitcher ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>
        {/* Dropdown */}
        {showBizSwitcher && (!collapsed || mobile) && (
          <div className="absolute left-2.5 right-2.5 top-full mt-1 bg-[#2a2d35] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-500">Your Businesses</p>
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              {allTenants.map(t => {
                const isActive = String(t._id) === String(tenant?._id);
                const setupDone = !t.setup_status || t.setup_status === 'active';
                const setupLabel = t.setup_status === 'pending_plan' ? 'Needs Plan' : t.setup_status === 'pending_setup' ? 'Needs Setup' : null;
                return (
                  <button
                    key={t._id}
                    onClick={() => handleSwitchBiz(t._id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05] ${isActive ? 'bg-brand-500/[0.08]' : ''}`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border ${setupDone ? 'bg-gradient-to-br from-brand-400/20 to-brand-600/20 border-brand-400/10' : 'bg-amber-500/10 border-amber-400/20'}`}>
                      <span className={`text-[10px] font-bold ${setupDone ? 'text-brand-300' : 'text-amber-300'}`}>
                        {(t.name || 'B').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-medium text-surface-300 truncate">{t.name}</p>
                        {setupLabel && (
                          <span className="px-1.5 py-[1px] rounded text-[8px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/20 flex-shrink-0">
                            {setupLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-surface-500 truncate">{t.plan || 'starter'} · {t.plan_status || 'trial'}</p>
                    </div>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Create new business — one-click, name comes from Meta later */}
            <div className="border-t border-white/[0.06]">
              <button
                onClick={handleCreateBiz}
                disabled={creatingBiz}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05] text-surface-400 hover:text-surface-200 disabled:opacity-50"
              >
                <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center flex-shrink-0 border border-white/[0.08]">
                  <span className="text-[12px] font-bold text-surface-400">+</span>
                </div>
                <span className="text-[12px] font-medium">
                  {creatingBiz ? 'Creating...' : 'Add New Business'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-5' : ''}>
            {(!collapsed || mobile) && (
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-surface-500/70">
                  {section.label}
                </span>
              </div>
            )}
            {collapsed && !mobile && si > 0 && (
              <div className="mx-2 mb-2 border-t border-white/[0.06]" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `
                    group flex items-center gap-2.5 rounded-lg transition-all duration-150 relative
                    ${collapsed && !mobile ? 'justify-center px-0 py-2.5 mx-0.5' : 'px-3 py-[7px]'}
                    ${isActive
                      ? 'bg-brand-500/[0.12] text-brand-400'
                      : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.05]'
                    }
                  `}
                  title={collapsed && !mobile ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !collapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-brand-400 rounded-r-full" />
                      )}
                      <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-brand-400' : 'text-surface-500 group-hover:text-surface-300'}`} strokeWidth={isActive ? 2.2 : 1.8} />
                      {(!collapsed || mobile) && (
                        <span className="text-[13px] font-medium truncate">{item.label}</span>
                      )}
                      {item.badgeKey === 'inbox' && inboxUnread > 0 && (!collapsed || mobile) && (
                        <span className="ml-auto bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                          {inboxUnread > 99 ? '99+' : inboxUnread}
                        </span>
                      )}
                      {item.badgeKey === 'inbox' && inboxUnread > 0 && collapsed && !mobile && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      {!mobile && (
        <div className="px-2.5 mb-1">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-white/[0.05] transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* User */}
      <div className="border-t border-white/[0.06] p-2.5">
        <div className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.05] transition-colors ${collapsed && !mobile ? 'justify-center' : ''}`}>
          <Avatar name={user?.full_name} size="sm" />
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-surface-200 truncate leading-none">{user?.full_name || 'User'}</p>
              <p className="text-[11px] text-surface-500 truncate mt-0.5">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ${collapsed && !mobile ? 'hidden' : ''}`}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
    <div className="flex h-screen bg-surface-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full animate-slide-left">
            <SidebarContent mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-surface-200/80 flex items-center gap-4 px-4 lg:px-6 flex-shrink-0 z-10">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title + breadcrumb */}
          <div className="hidden lg:flex items-center gap-3">
            <h2 className="text-[15px] font-bold text-surface-900">{getPageTitle()}</h2>
            <span className="text-surface-300">|</span>
            <nav className="flex items-center gap-1 text-[12px] text-surface-400">
              <span>Home</span>
              <span className="text-surface-300">/</span>
              <span className="text-surface-600 font-medium">{getPageTitle()}</span>
            </nav>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-3 py-[7px] rounded-lg border border-surface-200 bg-surface-50/80 text-surface-400 cursor-pointer hover:border-surface-300 transition-colors w-[200px]">
            <Search className="w-3.5 h-3.5" />
            <span className="text-[12px]">Search...</span>
            <kbd className="ml-auto text-[10px] bg-white border border-surface-200 px-1.5 py-0.5 rounded font-mono text-surface-400">
              <Command className="w-2.5 h-2.5 inline" />K
            </kbd>
          </div>

          {/* Notifications Bell */}
          <button
            ref={notifBtnRef}
            onClick={() => setShowNotif(s => !s)}
            className="relative p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors"
            aria-label="Notifications"
            type="button"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User avatar (header) */}
          <div className="hidden lg:block">
            <Avatar name={user?.full_name} size="sm" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <div className="p-4 lg:p-6 w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-surface-200 safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1">
          {[
            { to: '/portal/dashboard', label: 'Home', icon: LayoutDashboard },
            { to: '/portal/inbox', label: 'Chat', icon: MessageCircle, badge: inboxUnread },
            { to: '/portal/campaigns', label: 'Campaigns', icon: Megaphone },
            { to: '/portal/contacts', label: 'Contacts', icon: Users },
            { to: '/portal/settings', label: 'More', icon: Menu },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] transition-colors
                ${isActive ? 'text-brand-600' : 'text-surface-400'}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.6} />
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                  {isActive && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-brand-500 rounded-full" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>

    {/* Notification Dropdown — rendered via React portal to document.body to escape overflow-hidden */}
    {showNotif && createPortal(
      <div
        ref={notifRef}
        className="fixed w-[380px] bg-white border border-surface-200 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          top: notifBtnRef.current ? notifBtnRef.current.getBoundingClientRect().bottom + 8 : 60,
          right: notifBtnRef.current ? window.innerWidth - notifBtnRef.current.getBoundingClientRect().right : 20,
          zIndex: 99999,
          animation: 'fadeInUp 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-brand-600" />
            </div>
            <h3 className="text-[14px] font-bold text-surface-900">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                {unreadCount} new
              </span>
            )}
            <button onClick={() => setShowNotif(false)} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Source filter tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-surface-100 bg-surface-50/50">
          {[
            { key: 'all',      label: 'All' },
            { key: 'meta',     label: 'Meta',  Icon: MetaIcon },
            { key: 'platform', label: 'WBIZ',  Icon: WbizIcon },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setNotifFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                notifFilter === tab.key
                  ? 'bg-white text-surface-900 shadow-sm border border-surface-200'
                  : 'text-surface-500 hover:text-surface-700 hover:bg-white/60'
              }`}
            >
              {tab.Icon && <tab.Icon className="w-3 h-3" />}
              {tab.label}
            </button>
          ))}
        </div>
        {/* Body */}
        <div className="max-h-[360px] overflow-y-auto">
          {(() => {
            const filtered = notifFilter === 'all'
              ? notifications
              : notifications.filter(n => n.source === notifFilter);
            return filtered.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6 text-surface-300" />
              </div>
              <p className="text-[13px] text-surface-500 font-medium">All caught up!</p>
              <p className="text-[11px] text-surface-400 mt-1">
                {notifFilter === 'all' ? 'No notifications yet' : `No ${notifFilter === 'meta' ? 'Meta' : 'WBIZ'} notifications`}
              </p>
            </div>
          ) : filtered.map(n => {
            const isUnread = !n.read;
            const isMeta = n.source === 'meta';
            const { icon: TypeIcon, color: typeColor, bg: typeBg } = notifMeta(n);
            const severityBorder = SEVERITY_COLORS[n.severity] || 'border-l-surface-200';
            const SourceIcon = isMeta ? MetaIcon : WbizIcon;
            const sourceLabel = isMeta ? 'Meta' : 'WBIZ';
            const sourceBadgeCls = isMeta
              ? 'bg-[#25D366]/10 text-[#128C7E] border-[#25D366]/20'
              : 'bg-brand-50 text-brand-700 border-brand-200';
            return (
              <button
                key={n._id}
                onClick={() => markNotifRead(n._id)}
                className={`w-full text-left px-4 py-3.5 hover:bg-surface-50/60 transition-colors border-b border-surface-100 last:border-b-0 flex items-start gap-3 border-l-[3px] ${severityBorder} ${isUnread ? 'bg-brand-50/20' : ''}`}
              >
                {/* Source + Type icon stack */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${typeBg}`}>
                    <TypeIcon className={`w-[18px] h-[18px] ${typeColor}`} />
                  </div>
                  {/* Source badge overlay */}
                  <div className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-md bg-white shadow-sm flex items-center justify-center ring-1 ring-surface-100">
                    <SourceIcon className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {n.title && (
                        <p className={`text-[12px] font-semibold leading-snug mb-0.5 ${isUnread ? 'text-surface-900' : 'text-surface-700'}`}>
                          {cleanMsg(n.title)}
                        </p>
                      )}
                      <p className={`text-[12px] leading-snug ${isUnread && !n.title ? 'text-surface-900 font-semibold' : 'text-surface-500'}`}>
                        {cleanMsg(n.message || n.title || 'Notification')}
                      </p>
                    </div>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-[1px] rounded-md text-[9px] font-semibold border ${sourceBadgeCls}`}>
                      {sourceLabel}
                    </span>
                    <span className="text-[10px] text-surface-400">
                      {n.created_at ? new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              </button>
            );
          });
          })()}
        </div>
      </div>,
      document.body,
    )}
    </>
  );
}
