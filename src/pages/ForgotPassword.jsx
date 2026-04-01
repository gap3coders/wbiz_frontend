import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-gray-900">WhatsApp SaaS</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {!sent ? (
            <>
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Forgot your password?</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm" placeholder="you@company.com" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-6">If an account exists for <strong>{email}</strong>, we've sent a password reset link.</p>
              {debugState ? (
                <div className={`mb-6 rounded-2xl border p-4 text-left text-sm ${
                  debugState.email_sent
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50'
                }`}>
                  <p className="font-semibold text-gray-900 mb-2">Local debug status</p>
                  <div className="space-y-1 text-gray-700">
                    <p>Requested email: <strong>{debugState.requested_email || 'n/a'}</strong></p>
                    <p>User found: <strong>{debugState.user_found ? 'Yes' : 'No'}</strong></p>
                    <p>Token created: <strong>{debugState.token_created ? 'Yes' : 'No'}</strong></p>
                    <p>Email attempted: <strong>{debugState.email_attempted ? 'Yes' : 'No'}</strong></p>
                    <p>Email sent: <strong>{debugState.email_sent ? 'Yes' : 'No'}</strong></p>
                    {debugState.skipped_reason ? <p>Skipped reason: <strong>{debugState.skipped_reason}</strong></p> : null}
                    {debugState.email_error ? <p className="text-rose-700">Email error: <strong>{debugState.email_error}</strong></p> : null}
                  </div>
                </div>
              ) : null}
              {debugMissing ? (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
                  <p className="font-semibold mb-1">Local debug data is missing</p>
                  <p>Your frontend reached the API, but the backend returned only the generic success message. Restart the backend and make sure it is running the latest forgot-password code.</p>
                </div>
              ) : null}
              <button onClick={() => setSent(false)} className="text-sm text-emerald-600 font-medium hover:underline">Try a different email</button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
