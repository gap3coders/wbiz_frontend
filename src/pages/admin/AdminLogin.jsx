import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, Loader2, Shield } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back, Admin!');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-white to-brand-50/30 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-100 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-100 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-500 to-emerald-600 rounded-xl mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">WBIZ.IN</h1>
          <p className="text-sm text-surface-600">Admin Control Panel</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-surface-200 p-8 mb-6">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Login</h2>
            <p className="text-sm text-surface-600">Sign in to the administration panel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-semibold text-gray-900 mb-2">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@wbiz.in" className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-surface-200 bg-white text-sm text-gray-900 placeholder-surface-400 transition-all focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-semibold text-gray-900 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input id="admin-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-surface-200 bg-white text-sm text-gray-900 placeholder-surface-400 transition-all focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors p-1">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-2.5 px-4 mt-2 bg-brand-600 hover:bg-brand-700 disabled:bg-surface-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2">
              {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Signing in...</span></>) : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-xs text-surface-400">WBIZ.IN Administration Panel — Authorized personnel only</p>
        </div>
      </div>
    </div>
  );
}
