import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugState, setDebugState] = useState(null);
  const [debugMissing, setDebugMissing] = useState(false);
  const isLocalDebugSession = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setDebugState(null);
    setDebugMissing(false);
    try {
      const result = await forgotPassword(email);
      setDebugState(result?.debug || null);
      setDebugMissing(Boolean(isLocalDebugSession && !result?.debug));
      toast.success('If the email exists, the reset link request was accepted.');
      setSent(true);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Forgot Password Page][Submit Failed]', error?.response?.data || error);
      }
      toast.error('Could not submit the reset request right now. Please try again.');
    } finally {
      setLoading(false);
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
          {!sent ? (
            <>
              {/* Form header */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Forgot your password?</h2>
                <p className="text-sm text-surface-600">Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-surface-200 bg-white text-sm text-gray-900 placeholder-surface-400 transition-all focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="you@company.com" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-surface-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-surface-600 mb-6">If an account exists for <strong>{email}</strong>, we've sent a password reset link.</p>

              {debugState ? (
                <div className={`mb-6 rounded-lg border p-3 text-left text-xs ${
                  debugState.email_sent ? 'border-brand-200 bg-brand-50' : 'border-surface-200 bg-surface-50'
                }`}>
                  <p className="font-semibold text-gray-900 mb-2">Local debug status</p>
                  <div className="space-y-0.5 text-gray-700">
                    <p>Requested email: <strong>{debugState.requested_email || 'n/a'}</strong></p>
                    <p>User found: <strong>{debugState.user_found ? 'Yes' : 'No'}</strong></p>
                    <p>Token created: <strong>{debugState.token_created ? 'Yes' : 'No'}</strong></p>
                    <p>Email attempted: <strong>{debugState.email_attempted ? 'Yes' : 'No'}</strong></p>
                    <p>Email sent: <strong>{debugState.email_sent ? 'Yes' : 'No'}</strong></p>
                    {debugState.skipped_reason ? <p>Skipped reason: <strong>{debugState.skipped_reason}</strong></p> : null}
                    {debugState.email_error ? <p className="text-red-700">Email error: <strong>{debugState.email_error}</strong></p> : null}
                  </div>
                </div>
              ) : null}

              {debugMissing ? (
                <div className="mb-6 rounded-lg border border-surface-200 bg-surface-50 p-3 text-left text-xs text-gray-700">
                  <p className="font-semibold mb-1">Local debug data is missing</p>
                  <p>Your frontend reached the API, but the backend returned only the generic success message.</p>
                </div>
              ) : null}

              <button onClick={() => setSent(false)} className="text-sm text-brand-600 font-semibold hover:text-brand-700 transition-colors">Try a different email</button>
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
