import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  LayoutDashboard, Building2, Users, CreditCard, Mail, Shield,
  Settings, LogOut, Menu, X, ChevronLeft, ChevronRight,
  FileText, Server, Search, Command, MessageCircle,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/admin/tenants', label: 'Tenants', icon: Building2 },
      { to: '/admin/users', label: 'Portal Users', icon: Users },
      { to: '/admin/plans', label: 'Plans & Pricing', icon: CreditCard },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/email-templates', label: 'Email Templates', icon: Mail },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/admin-users', label: 'Admin Users', icon: Shield },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
      { to: '/admin/system', label: 'System Info', icon: Server },
      { to: '/admin/config', label: 'Configuration', icon: Settings },
    ],
  },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/admin/login', { replace: true });
  };

  const getPageTitle = () => {
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (location.pathname.startsWith(item.to)) return item.label;
      }
    }
    return 'Dashboard';
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className={`h-full flex flex-col sidebar-gradient ${mobile ? 'w-[272px]' : collapsed ? 'w-[68px]' : 'w-[252px]'} transition-all duration-300 ease-in-out`}>
      {/* Brand */}
      <div className={`flex items-center ${collapsed && !mobile ? 'justify-center px-2' : 'px-4'} h-[60px] flex-shrink-0`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/20">
          <Shield className="w-[18px] h-[18px] text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div className="ml-3 min-w-0">
            <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">WBIZ.IN</h1>
            <p className="text-[10px] text-surface-500 font-medium mt-0.5 uppercase tracking-wider">Admin Panel</p>
          </div>
        )}
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-surface-400" />
          </button>
        )}
      </div>

      <div className="mx-3 border-t border-white/[0.06]" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-5' : ''}>
            {(!collapsed || mobile) && (
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-surface-500/70">{section.label}</span>
              </div>
            )}
            {collapsed && !mobile && si > 0 && <div className="mx-2 mb-2 border-t border-white/[0.06]" />}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `
                    group flex items-center gap-2.5 rounded-lg transition-all duration-150 relative
                    ${collapsed && !mobile ? 'justify-center px-0 py-2.5 mx-0.5' : 'px-3 py-[7px]'}
                    ${isActive ? 'bg-brand-500/[0.12] text-brand-400' : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.05]'}
                  `}
                  title={collapsed && !mobile ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !collapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-brand-400 rounded-r-full" />}
                      <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-brand-400' : 'text-surface-500 group-hover:text-surface-300'}`} strokeWidth={isActive ? 2.2 : 1.8} />
                      {(!collapsed || mobile) && <span className="text-[13px] font-medium truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse */}
      {!mobile && (
        <div className="px-2.5 mb-1">
          <button onClick={() => setCollapsed(c => !c)} className="w-full flex items-center justify-center p-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-white/[0.05] transition-colors">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* User */}
      <div className="border-t border-white/[0.06] p-2.5">
        <div className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.05] transition-colors ${collapsed && !mobile ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
            {(admin?.full_name || 'A')[0]?.toUpperCase()}
          </div>
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-surface-200 truncate leading-none">{admin?.full_name || 'Admin'}</p>
              <p className="text-[11px] text-surface-500 truncate mt-0.5">{admin?.role === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
            </div>
          )}
          <button onClick={handleLogout}
            className={`p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ${collapsed && !mobile ? 'hidden' : ''}`}
            title="Logout">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block flex-shrink-0"><SidebarContent /></aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full animate-slide-left"><SidebarContent mobile /></div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-surface-200/80 flex items-center gap-4 px-4 lg:px-6 flex-shrink-0 z-10">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:flex items-center gap-3">
            <h2 className="text-[15px] font-bold text-surface-900">{getPageTitle()}</h2>
            <span className="text-surface-300">|</span>
            <nav className="flex items-center gap-1 text-[12px] text-surface-400">
              <span>Admin</span><span className="text-surface-300">/</span>
              <span className="text-surface-600 font-medium">{getPageTitle()}</span>
            </nav>
          </div>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2 px-3 py-[7px] rounded-lg border border-surface-200 bg-surface-50/80 text-surface-400 cursor-pointer hover:border-surface-300 transition-colors w-[200px]">
            <Search className="w-3.5 h-3.5" /><span className="text-[12px]">Search...</span>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200">
            <Shield className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-[11px] font-bold text-brand-700">{admin?.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 w-full"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
