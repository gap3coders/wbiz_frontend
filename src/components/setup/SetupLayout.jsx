import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ArrowLeft, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlobalHeader from '../Layout/GlobalHeader';

const STEPS = [
  { num: 1, label: 'Welcome' },
  { num: 2, label: 'Connect' },
  { num: 3, label: 'Select Number' },
];

export default function SetupLayout({ step = 1, backTo, children }) {
  const navigate = useNavigate();
  const { allTenants, tenant, cancelSetup } = useAuth();
  const [cancelling, setCancelling] = useState(false);

  // Show cancel button if user has at least one other active business
  const hasOtherActiveBiz = allTenants.some(
    (t) => String(t._id) !== String(tenant?._id) && t.setup_status === 'active'
  );

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      const result = await cancelSetup(true);
      navigate(result.redirect_to || '/portal/dashboard', { replace: true });
    } catch (err) {
      console.error('Cancel setup failed:', err);
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* ── Global Header ──────────────────────────────────────── */}
      <GlobalHeader />

      {/* ── Stepper bar ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-surface-200/60">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 h-[48px] flex items-center justify-between">
          {/* Cancel / close button on left */}
          <div className="w-24">
            {hasOtherActiveBiz && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1.5 text-[12px] text-surface-400 hover:text-red-500 font-medium transition-colors"
              >
                {cancelling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                Cancel
              </button>
            )}
          </div>

          {/* Steps */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {STEPS.map((s, i) => {
              const isActive = s.num === step;
              const isDone = s.num < step;
              return (
                <div key={s.num} className="flex items-center gap-1.5 sm:gap-2">
                  {i > 0 && (
                    <div className={`hidden sm:block w-6 h-px ${isDone ? 'bg-brand-400' : 'bg-surface-200'}`} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${
                        isActive
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                          : isDone
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-surface-100 text-surface-400'
                      }`}
                    >
                      {isDone ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        s.num
                      )}
                    </div>
                    <span
                      className={`hidden sm:inline text-[12px] font-medium ${
                        isActive ? 'text-surface-900' : isDone ? 'text-brand-700' : 'text-surface-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spacer to balance layout */}
          <div className="w-24" />
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {/* Back button */}
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center gap-2 text-[13px] text-surface-400 hover:text-surface-600 mb-8 font-medium transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
        )}

        <div className="animate-fade-in-up">{children}</div>
      </main>

      <footer className="border-t border-surface-200/60 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          <p className="text-[11px] text-surface-400">&copy; {new Date().getFullYear()} WBIZ.IN. All rights reserved.</p>
          <p className="text-[11px] text-surface-400">Your Business. Your WhatsApp. One Powerful Platform.</p>
        </div>
      </footer>
    </div>
  );
}
