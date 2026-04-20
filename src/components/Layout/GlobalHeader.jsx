import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, LogOut, User, ChevronRight, LayoutDashboard } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function GlobalHeader() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login/');
    } catch {
      navigate('/login/');
    }
  };

  return (
    <header className="bg-white border-b border-surface-200/60 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
        {/* Brand */}
        <Link to={isAuthenticated ? '/portal/dashboard' : '/login/'} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <MessageCircle className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="text-[15px] font-bold text-surface-900 tracking-tight">WBIZ.IN</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user?.status === 'active' && (
            <Link
              to="/portal/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          )}

          {isAuthenticated ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-[12px] font-bold text-white shadow-sm">
                  {String(user?.full_name || user?.email || '?')[0]?.toUpperCase()}
                </div>
                <span className="hidden sm:block text-[12px] font-semibold text-surface-700 max-w-[120px] truncate">
                  {user?.full_name || user?.email || 'Account'}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-[220px] rounded-xl bg-white border border-surface-200 shadow-2xl overflow-hidden z-40 animate-slide-down">
                  <div className="px-4 py-3 border-b border-surface-100">
                    <p className="text-[12px] font-bold text-surface-900 truncate">{user?.full_name || 'User'}</p>
                    <p className="text-[11px] text-surface-400 truncate">{user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    {user?.status === 'active' && (
                      <button
                        onClick={() => { setMenuOpen(false); navigate('/portal/dashboard'); }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-surface-700 hover:bg-surface-50 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-surface-400" />
                        Go to Dashboard
                        <ChevronRight className="w-3 h-3 text-surface-300 ml-auto" />
                      </button>
                    )}
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/portal/settings'); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-surface-700 hover:bg-surface-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-surface-400" />
                      Account Settings
                      <ChevronRight className="w-3 h-3 text-surface-300 ml-auto" />
                    </button>
                    <div className="my-1 h-px bg-surface-100" />
                    <button
                      onClick={() => { setMenuOpen(false); handleLogout(); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login/"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 text-white text-[12px] font-semibold hover:bg-brand-600 transition-colors shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
