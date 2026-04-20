import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { refreshAccessToken } from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [whatsappAccount, setWhatsappAccount] = useState(null);
  const [allTenants, setAllTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch current user on mount — relies on httpOnly access_token cookie
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data.user);
      setTenant(data.data.tenant);
      setWhatsappAccount(data.data.whatsapp_account);
      setAllTenants(data.data.all_tenants || []);
      setIsAuthenticated(true);
    } catch {
      // Cookie may be expired or missing — try silent refresh once
      try {
        await refreshAccessToken();
        const { data } = await api.get('/auth/me');
        setUser(data.data.user);
        setTenant(data.data.tenant);
        setWhatsappAccount(data.data.whatsapp_account);
        setAllTenants(data.data.all_tenants || []);
        setIsAuthenticated(true);
      } catch {
        setUser(null);
        setTenant(null);
        setWhatsappAccount(null);
        setAllTenants([]);
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password, remember_me = false) => {
    const { data } = await api.post('/auth/login', { email, password, remember_me });
    const result = data.data;
    // access_token cookie set by backend automatically
    setUser(result.user);
    setIsAuthenticated(true);
    await fetchUser(); // Reload full user data with tenant
    return result;
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    return data.data;
  };

  const verifyEmail = async (token) => {
    const { data } = await api.post('/auth/verify-email', { token });
    const result = data.data;
    // access_token cookie set by backend automatically
    setUser(result.user);
    setIsAuthenticated(true);
    await fetchUser();
    return result;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) { /* ignore */ }
    setUser(null);
    setTenant(null);
    setWhatsappAccount(null);
    setAllTenants([]);
    setIsAuthenticated(false);
  };

  const switchTenant = async (tenantId) => {
    const { data } = await api.post('/auth/switch-tenant', { tenant_id: tenantId });
    const result = data.data;
    setTenant(result.tenant);
    setWhatsappAccount(result.whatsapp_account);
    await fetchUser(); // Full reload to refresh everything
    return result;
  };

  const createBusiness = async () => {
    const { data } = await api.post('/auth/create-business');
    const result = data.data;
    setTenant(result.tenant);
    setWhatsappAccount(null);
    await fetchUser(); // Full reload
    return result;
  };

  const cancelSetup = async (deletePending = false) => {
    const { data } = await api.post('/auth/cancel-setup', { delete_pending: deletePending });
    const result = data.data;
    setTenant(result.tenant);
    await fetchUser(); // Full reload
    return result;
  };

  const forgotPassword = async (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (import.meta.env.DEV) {
      console.info('[Auth UI][Forgot Password][Request]', { email: normalizedEmail });
    }
    const response = await api.post('/auth/forgot-password', { email: normalizedEmail });
    const responseData = response?.data?.data || {};
    const debugHeader = response?.headers?.['x-forgot-password-debug'] || 'missing';
    if (import.meta.env.DEV) {
      console.info('[Auth UI][Forgot Password][Response]', responseData);
    }

    if (responseData?.debug) {
      if (import.meta.env.DEV) {
        console.info('[Auth UI][Forgot Password][Debug]', responseData.debug);
      }
    } else if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      if (import.meta.env.DEV) {
        console.warn('[Auth UI][Forgot Password][Debug Missing]', {
          header: debugHeader,
          hint: 'Backend returned the generic response only. Restart the backend or confirm it is running the latest forgot-password route.',
        });
      }
    }

    return {
      ...responseData,
      debugHeader,
    };
  };

  const resetPassword = async (token, new_password) => {
    const { data } = await api.post('/auth/reset-password', { token, new_password });
    return data.data;
  };

  const updateUserState = (updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const value = {
    user,
    tenant,
    whatsappAccount,
    setWhatsappAccount,
    allTenants,
    loading,
    isAuthenticated,
    login,
    register,
    verifyEmail,
    logout,
    forgotPassword,
    resetPassword,
    fetchUser,
    updateUserState,
    switchTenant,
    createBusiness,
    cancelSetup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
