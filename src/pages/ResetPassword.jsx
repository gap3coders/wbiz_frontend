import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return toast.error('Password must be 8+ chars with 1 uppercase and 1 number');
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      toast.success('Password reset successful!');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. Token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-50 via-white to-brand-50/30 flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-brand-100 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-100 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-[420px] text-center">
          <h2 className="font-bold text-lg text-gray-900 mb-2">Invalid reset link</h2>
          <p className="text-sm text-surface-600 mb-4">No reset token found in the URL.</p>
          <Link to="/forgot-password" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">Request a new link</Link>
        </div>
      </div>
    );
  }

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
          {!done ? (
            <>
              {/* Form header */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Set new password</h2>
                <p className="text-sm text-surface-600">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">New password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                      className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-sm text-gray-900 placeholder-surface-400 pr-10 transition-all focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 p-1 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-surface-500 mt-1.5">8+ characters with 1 uppercase and 1 number</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-sm text-gray-900 placeholder-surface-400 transition-all focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="••••••••" />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
                  )}
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-surface-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Password updated!</h2>
              <p className="text-sm text-surface-600">Redirecting to login...</p>
            </div>
          )}
        </div>

        {/* Footer link */}
        <div className="text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-surface-600 hover:text-surface-800 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
