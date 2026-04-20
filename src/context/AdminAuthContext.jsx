import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchAdmin = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/auth/me');
      const a = data?.data?.admin || data?.admin;
      if (a) { setAdmin(a); setIsAuthenticated(true); }
      else { setAdmin(null); setIsAuthenticated(false); }
    } catch {
      setAdmin(null);
      setIsAuthenticated(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAdmin(); }, [fetchAdmin]);

  const login = async (email, password) => {
    const { data } = await api.post('/admin/auth/login', { email, password });
    const a = data?.data?.admin || data?.admin;
    setAdmin(a);
    setIsAuthenticated(true);
    return a;
  };

  const logout = async () => {
    try { await api.post('/admin/auth/logout'); } catch { /* silent */ }
    setAdmin(null);
    setIsAuthenticated(false);
  };

  const refresh = async () => {
    try {
      const { data } = await api.post('/admin/auth/refresh');
      const a = data?.data?.admin || data?.admin;
      if (a) { setAdmin(a); setIsAuthenticated(true); }
    } catch { setAdmin(null); setIsAuthenticated(false); }
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, isAuthenticated, login, logout, refresh, fetchAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be inside AdminAuthProvider');
  return ctx;
}
