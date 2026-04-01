import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { LayoutDashboard, MessageSquare, Send, FileText, Megaphone, Users, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Bell, Search, Menu, X, CheckCircle2, AlertTriangle, Info, XCircle, Activity, FolderOpen, Bot } from 'lucide-react';

const NAV_ITEMS = [
  { to:'/portal/dashboard', icon:LayoutDashboard, label:'Dashboard' },
  { to:'/portal/inbox', icon:MessageSquare, label:'Live Chat', badge:null },
  { to:'/portal/messages/new', icon:Send, label:'New Message' },
  { to:'/portal/media-library', icon:FolderOpen, label:'Gallery' },
  { to:'/portal/auto-responses', icon:Bot, label:'Auto Responses' },
  { to:'/portal/templates', icon:FileText, label:'Templates' },
  { to:'/portal/campaigns', icon:Megaphone, label:'Campaigns' },
  { to:'/portal/contacts', icon:Users, label:'Contacts' },
  { to:'/portal/analytics', icon:BarChart3, label:'Analytics' },
  { to:'/portal/logs', icon:Activity, label:'Logs' },
  { divider:true },
  { to:'/portal/settings', icon:Settings, label:'Settings' },
];

const SEV_STYLES = {
  success: { bg:'bg-emerald-50', border:'border-emerald-200', icon:CheckCircle2, iconColor:'text-emerald-600' },
  warning: { bg:'bg-amber-50', border:'border-amber-200', icon:AlertTriangle, iconColor:'text-amber-600' },
  error: { bg:'bg-red-50', border:'border-red-200', icon:XCircle, iconColor:'text-red-600' },
  info: { bg:'bg-blue-50', border:'border-blue-200', icon:Info, iconColor:'text-blue-600' },
};

export default function PortalLayout() {
  const { user, tenant, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const fetchNotifs = useCallback(async () => {
    if (loading || !isAuthenticated) return;
    try {
      const { data } = await api.get('/notifications', { params: { limit: 20 } });
      setNotifications(data.data.notifications || []);
      setUnreadCount(data.data.unread_count || 0);
    } catch (e) {}
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (loading || !isAuthenticated) return undefined;
    fetchNotifs();
    const i = setInterval(fetchNotifs, 15000);
    return () => clearInterval(i);
  }, [fetchNotifs, isAuthenticated, loading]);
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => { try { await api.post('/notifications/mark-read', {}); setUnreadCount(0); setNotifications(n => n.map(x => ({ ...x, read: true }))); } catch (e) {} };
  const handleLogout = async () => { await logout(); toast.success('Logged out'); navigate('/login'); };

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 flex items-center gap-3 border-b border-gray-800/50">
        <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0"><MessageSquare className="w-4 h-4 text-white" /></div>
        {!collapsed && <span className="font-display font-bold text-white text-base truncate">WASend</span>}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item, i) => {
          if (item.divider) return <div key={i} className="my-3 border-t border-gray-800/50" />;
          return (
            <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-800/50">
        <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initials}</div>
          {!collapsed && <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{user?.full_name}</p><p className="text-xs text-gray-500 truncate">{tenant?.name}</p></div>}
        </div>
        <button onClick={handleLogout} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full mt-1 ${collapsed ? 'justify-center' : ''}`}>
          <LogOut className="w-5 h-5 flex-shrink-0" />{!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`hidden lg:flex flex-col bg-[#0a1628] transition-all duration-300 relative ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-20 w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 border-2 border-[#0a1628] z-10">
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} /><aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-[#0a1628]"><SidebarContent /></aside></div>}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"><Menu className="w-5 h-5" /></button>
            <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2 w-72">
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search conversations, contacts..." className="bg-transparent border-none text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) fetchNotifs(); }} className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] px-1">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>

              {showNotif && (
                <div className="absolute right-0 top-12 w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-emerald-600 font-medium hover:underline">Mark all read</button>}
                      <button onClick={() => setShowNotif(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center"><Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No notifications yet</p></div>
                    ) : notifications.map(n => {
                      const s = SEV_STYLES[n.severity] || SEV_STYLES.info;
                      const SIcon = s.icon;
                      return (
                        <div key={n._id} onClick={() => { if (n.link) { navigate(n.link); setShowNotif(false); } }}
                          className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all ${!n.read ? 'bg-blue-50/30' : ''} ${n.link ? 'cursor-pointer' : ''}`}>
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <SIcon className={`w-4 h-4 ${s.iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-xs font-bold ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${n.source === 'meta' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{n.source}</span>
                                {Number(n.duplicate_count || 1) > 1 ? (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-700">
                                    x{n.duplicate_count}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                            </div>
                            {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-8 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">{initials}</div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.full_name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
