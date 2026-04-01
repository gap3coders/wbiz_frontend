import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Loader2, MessageSquare } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | success | error
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-gray-900">WhatsApp SaaS</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
              <p className="text-gray-500 text-sm">Please wait while we confirm your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Email verified!</h2>
              <p className="text-gray-500 text-sm mb-4">Redirecting you to set up your WhatsApp connection...</p>
              <div className="w-8 h-1 bg-emerald-200 rounded-full mx-auto">
                <div className="h-full bg-emerald-600 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Verification failed</h2>
              <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
              <div className="flex gap-3 justify-center">
                <Link to="/login" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors">
                  Go to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
