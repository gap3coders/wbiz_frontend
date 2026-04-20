import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [showResend, setShowResend] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  useEffect(() => {
    if (location.state?.registered) {
      toast.success('Account created! Check your email to verify.');
    }
  }, [location.state]);

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((new Date(lockedUntil) - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown(0);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockedUntil) return;
    setLoading(true);
    setShowResend(false);

    try {
      const result = await login(email, password, rememberMe);
      toast.success('Welcome back!');
      navigate(result.redirect_to || '/portal/dashboard');
    } catch (err) {
      const res = err.response?.data;
      if (err.response?.status === 429) {
        setLockedUntil(res?.data?.locked_until);
        toast.error(res?.error || 'Too many attempts. Account locked.');
      } else if (res?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setShowResend(true);
        setUnverifiedEmail(res?.data?.email || email);
        toast.error('Please verify your email first');
      } else if (res?.data?.code === 'PENDING_APPROVAL') {
        toast.error('Your account is pending admin approval');
        navigate('/pending-approval');
      } else {
        toast.error(res?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-verification', { email: unverifiedEmail });
      toast.success('Verification email sent!');
      setShowResend(false);
    } catch {
      toast.error('Failed to resend');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-white to-brand-50/30 flex items-center justify-center p-4">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-100 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-100 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-500 to-emerald-600 rounded-xl mb-4">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">WBIZ.IN</h1>
          <p className="text-sm text-surface-600">WhatsApp Business Platform</p>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 p-8 mb-6">
          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-sm text-surface-600">Sign in to your account</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-surface-200 bg-white text-sm text-gray-900 placeholder-surface-400 transition-all focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-surface-200 bg-white text-sm text-gray-900 placeholder-surface-400 transition-all focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me checkbox */}
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border border-surface-200 text-brand-600 bg-white focus:ring-1 focus:ring-brand-500 cursor-pointer"
              />
              <span className="text-sm text-surface-600">Keep me signed in for 30 days</span>
            </label>

            {/* Lockout warning */}
            {lockedUntil && countdown > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-900 mb-1">Account temporarily locked</p>
                <p className="text-xs text-red-800">
                  Try again in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </p>
              </div>
            )}

            {/* Unverified email - resend */}
            {showResend && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-amber-900">Email verification required</p>
                  <p className="text-xs text-amber-800 mt-0.5">Check your inbox for the verification link</p>
                </div>
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors whitespace-nowrap"
                >
                  Resend
                </button>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || (lockedUntil && countdown > 0)}
              className="w-full py-2.5 px-4 mt-2 bg-brand-600 hover:bg-brand-700 disabled:bg-surface-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="text-center space-y-3">
          <p className="text-sm text-surface-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
              Create one
            </Link>
          </p>
          <p className="text-xs text-surface-400">
            By signing in, you agree to our{' '}
            <a href="#" className="text-surface-600 hover:text-surface-700 underline">
              Terms
            </a>{' '}
            and{' '}
            <a href="#" className="text-surface-600 hover:text-surface-700 underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
