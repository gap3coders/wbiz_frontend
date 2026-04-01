import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, MessageSquare, Mail, Loader2 } from 'lucide-react';

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

  // Show success message if just registered
  useEffect(() => {
    if (location.state?.registered) {
      toast.success('Account created! Check your email to verify.');
    }
  }, [location.state]);

  // Lockout countdown timer
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
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] bg-brand-gradient flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-10 w-72 h-72 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-display font-bold text-xl">WhatsApp SaaS</span>
          </div>
          <h1 className="text-white font-display text-4xl font-bold leading-tight mb-4">
            Welcome back
          </h1>
          <p className="text-emerald-100 text-lg leading-relaxed max-w-md">
            Sign in to manage your WhatsApp Business conversations, campaigns, and more.
          </p>
        </div>
        <div className="relative z-10">
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
            <p className="text-emerald-100 text-sm italic">"This platform transformed how we handle customer support via WhatsApp. Response times dropped by 60%."</p>
            <p className="text-white font-medium text-sm mt-3">— Priya Sharma, Head of Support</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-gray-900">WhatsApp SaaS</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Sign in to your account</h2>
          <p className="text-gray-500 mb-8">Enter your credentials to access your portal</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm transition-all hover:border-gray-300" placeholder="you@company.com" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-emerald-600 font-medium hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm pr-10 transition-all hover:border-gray-300" placeholder="Enter password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-sm text-gray-600">Remember me for 30 days</span>
              </label>
            </div>

            {/* Lockout warning */}
            {lockedUntil && countdown > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700 font-medium">
                  Account temporarily locked. Try again in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </p>
              </div>
            )}

            {/* Unverified email - resend */}
            {showResend && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <p className="text-sm text-amber-800">Email not verified.</p>
                <button type="button" onClick={handleResend}
                  className="text-sm font-semibold text-amber-700 hover:text-amber-900 underline">Resend verification</button>
              </div>
            )}

            <button type="submit" disabled={loading || (lockedUntil && countdown > 0)}
              className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-600/20">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account? <Link to="/register" className="text-emerald-600 font-semibold hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
