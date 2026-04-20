import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { AlertTriangle, Crown, ArrowRight, X } from 'lucide-react';

export default function UpgradeModal() {
  const { tenant, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);

  useEffect(() => {
    checkSubscription();
  }, [tenant]);

  const checkSubscription = async () => {
    try {
      const { data } = await api.get('/billing/subscription');
      const sub = data.data;
      setSubscriptionData(sub);

      if (sub.lifetime_access) {
        setShow(false);
        return;
      }

      if (sub.is_expired) {
        setShow(true);
      }
    } catch {
      // If billing endpoint fails, don't block user
    }
  };

  if (!show) return null;

  const isTrialExpired = subscriptionData?.plan_status === 'trial' && subscriptionData?.is_expired;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-surface-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            {isTrialExpired ? (
              <AlertTriangle className="w-7 h-7 text-white" />
            ) : (
              <Crown className="w-7 h-7 text-white" />
            )}
          </div>
          <h2 className="text-[20px] font-extrabold text-white tracking-tight">
            {isTrialExpired ? 'Trial Expired' : 'Plan Expired'}
          </h2>
          <p className="text-[13px] text-white/80 mt-1">
            {isTrialExpired
              ? 'Your 7-day free trial has ended'
              : 'Your subscription has expired'}
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-[13px] text-surface-600 leading-relaxed text-center">
            To continue using WBIZ.IN and access all features including messaging, campaigns, and analytics, please upgrade to a paid plan.
          </p>

          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2 text-[12px] text-surface-500">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Messaging disabled
            </div>
            <div className="flex items-center gap-2 text-[12px] text-surface-500">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Campaigns paused
            </div>
            <div className="flex items-center gap-2 text-[12px] text-surface-500">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Auto-responses stopped
            </div>
          </div>

          <button
            onClick={() => navigate('/portal/pricing')}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white text-[14px] font-bold rounded-xl transition-colors shadow-sm shadow-brand-500/20"
          >
            <Crown className="w-4 h-4" />
            Upgrade Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
