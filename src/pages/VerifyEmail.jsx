import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        const result = await verifyEmail(token);
        setStatus('success');
        toast.success('Email verified successfully!');
        setTimeout(() => {
          navigate(result.redirect_to || '/portal/setup', { replace: true });
        }, 2000);
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.response?.data?.error || 'Verification failed. The link may be expired or invalid.');
      }
    };

    verify();
  }, [token]);

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
          <div className="text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
                <h2 className="text-lg font-bold text-gray-900 mb-2">Verifying your email...</h2>
                <p className="text-sm text-surface-600">Please wait while we confirm your email address.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-brand-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Email verified!</h2>
                <p className="text-sm text-surface-600 mb-4">Redirecting you to set up your WhatsApp connection...</p>
                <div className="w-12 h-1.5 bg-brand-100 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-brand-600 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Verification failed</h2>
                <p className="text-sm text-surface-600 mb-6">{errorMsg}</p>
                <Link to="/login"
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-all">
                  Go to Login
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Footer link */}
        {status === 'error' && (
          <div className="text-center">
            <Link to="/login" className="text-sm text-surface-600 hover:text-surface-800 font-medium transition-colors">
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
