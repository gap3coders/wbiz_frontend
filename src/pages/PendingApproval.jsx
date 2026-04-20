import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, LogOut, Mail, CheckCircle2 } from 'lucide-react';

export default function PendingApproval() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-surface-200 p-8 text-center shadow-sm">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>

          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">
            Pending Approval
          </h1>
          <p className="text-[13px] text-surface-500 mt-2 leading-relaxed max-w-sm mx-auto">
            Your account has been verified successfully. An administrator will review and approve your account shortly.
          </p>

          {/* Status Steps */}
          <div className="mt-6 space-y-3 text-left">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-emerald-800">Email Verified</p>
                <p className="text-[11px] text-emerald-600">Your email has been confirmed</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-amber-800">Admin Review</p>
                <p className="text-[11px] text-amber-600">Waiting for admin approval</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 border border-surface-200">
              <Mail className="w-5 h-5 text-surface-400 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-surface-500">Email Notification</p>
                <p className="text-[11px] text-surface-400">You'll receive an email once approved</p>
              </div>
            </div>
          </div>

          {user?.email && (
            <p className="text-[11px] text-surface-400 mt-5">
              Logged in as <span className="font-semibold text-surface-600">{user.email}</span>
            </p>
          )}

          <button
            onClick={() => isAuthenticated ? logout() : navigate('/login/')}
            className="mt-5 flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white hover:bg-surface-50 text-surface-600 text-[13px] font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {isAuthenticated ? 'Sign Out' : 'Back to Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
