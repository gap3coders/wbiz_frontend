import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Crown, Zap, Check, Loader2, Clock, CreditCard, Star,
  MessageCircle, Users, BarChart3, ArrowRight, X, ArrowLeft,
} from 'lucide-react';

export default function Pricing() {
  const { user, tenant, allTenants, fetchUser, cancelSetup } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [processing, setProcessing] = useState(null); // plan slug being processed
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Show cancel if user has another active business and current tenant is pending
  const isPendingSetup = tenant?.setup_status === 'pending_plan' || tenant?.setup_status === 'pending_setup';
  const hasOtherActiveBiz = allTenants.some(
    (t) => String(t._id) !== String(tenant?._id) && t.setup_status === 'active'
  );
  const showCancel = isPendingSetup && hasOtherActiveBiz;

  const handleCancelSetup = async () => {
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        api.get('/billing/plans'),
        api.get('/billing/subscription').catch(() => null),
      ]);
      setPlans(plansRes.data.data?.plans || []);
      if (subRes) setSubscriptionInfo(subRes.data.data);
    } catch {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async (planSlug) => {
    setProcessing('trial');
    try {
      const { data } = await api.post('/billing/start-trial', { plan_slug: planSlug || 'starter' });
      toast.success('Trial started! Redirecting to setup...');
      await fetchUser();
      navigate(data.data?.redirect_to || '/portal/setup');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to start trial');
    } finally {
      setProcessing(null);
    }
  };

  const handlePurchase = async (planSlug) => {
    setProcessing(planSlug);
    try {
      // Step 1: Create Razorpay order
      const { data } = await api.post('/billing/create-order', {
        plan_slug: planSlug,
        billing_cycle: billingCycle,
      });

      const orderData = data.data;

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'WBIZ.IN',
        description: `${orderData.plan?.name || planSlug} - ${billingCycle} plan`,
        order_id: orderData.order_id,
        handler: async (response) => {
          // Step 3: Verify payment
          try {
            const verifyRes = await api.post('/billing/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              subscription_id: orderData.subscription_id,
            });
            toast.success('Payment successful! Plan activated.');
            await fetchUser();
            navigate(verifyRes.data.data?.redirect_to || '/portal/dashboard');
          } catch {
            toast.error('Payment verification failed. Please contact support.');
          }
          setProcessing(null);
        },
        modal: {
          ondismiss: () => setProcessing(null),
        },
        prefill: {
          name: user?.full_name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#25D366',
        },
      };

      // Load Razorpay SDK if not already
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        toast.error('Payment failed. Please try again.');
        setProcessing(null);
      });
      rzp.open();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to initiate payment');
      setProcessing(null);
    }
  };

  const trialUsed = subscriptionInfo?.trial_used || tenant?.trial_used;
  const isLifetime = subscriptionInfo?.lifetime_access;
  const currentPlan = subscriptionInfo?.plan?.slug || tenant?.plan;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Cancel bar for new business setup */}
        {showCancel && (
          <div className="mb-6 flex items-center justify-between bg-white border border-surface-200 rounded-xl px-5 py-3">
            <p className="text-[13px] text-surface-500">
              Setting up a new business: <span className="font-semibold text-surface-700">{tenant?.name}</span>
            </p>
            <button
              onClick={handleCancelSetup}
              disabled={cancelling}
              className="flex items-center gap-1.5 text-[13px] text-surface-400 hover:text-red-500 font-medium transition-colors"
            >
              {cancelling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              Cancel & Go Back
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-[11px] font-bold mb-4">
            <Crown className="w-3.5 h-3.5" />
            PRICING PLANS
          </div>
          <h1 className="text-[28px] font-extrabold text-surface-900 tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-[14px] text-surface-500 mt-2 max-w-lg mx-auto">
            Start with a free trial or pick the plan that fits your business needs. Upgrade anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'
            }`}
          >
            Yearly
            <span className="ml-1.5 text-[10px] font-bold text-emerald-500">Save 20%</span>
          </button>
        </div>

        {/* Trial Banner */}
        {!trialUsed && !isLifetime && (
          <div className="mb-8 bg-gradient-to-r from-brand-50 to-emerald-50 border border-brand-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-surface-900">7-Day Free Trial</p>
                <p className="text-[12px] text-surface-500">Try all features free. No credit card required.</p>
              </div>
            </div>
            <button
              onClick={() => handleStartTrial('starter')}
              disabled={processing === 'trial'}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-bold rounded-xl transition-colors shadow-sm shadow-brand-500/20 disabled:opacity-50"
            >
              {processing === 'trial' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              Start Free Trial
            </button>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const isCurrentPlan = currentPlan === plan.slug;
            const isPopular = plan.is_popular;

            return (
              <div
                key={plan._id || plan.slug}
                className={`relative bg-white rounded-2xl border overflow-hidden transition-shadow ${
                  isPopular
                    ? 'border-brand-300 shadow-lg shadow-brand-500/10'
                    : 'border-surface-200 hover:shadow-md'
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-brand-500 to-emerald-500 py-1.5 text-center">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center justify-center gap-1">
                      <Star className="w-3 h-3" /> Most Popular
                    </span>
                  </div>
                )}

                <div className={`p-6 ${isPopular ? 'pt-10' : ''}`}>
                  <h3 className="text-[16px] font-extrabold text-surface-900">{plan.name}</h3>
                  <p className="text-[12px] text-surface-400 mt-1">{plan.description}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-[11px] text-surface-400">{plan.currency || 'INR'}</span>
                    <span className="text-[32px] font-extrabold text-surface-900 tracking-tight">
                      {price ? price.toLocaleString('en-IN') : '0'}
                    </span>
                    <span className="text-[12px] text-surface-400">
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>

                  {/* Limits */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-surface-500">
                      <MessageCircle className="w-3.5 h-3.5 text-brand-500" />
                      {plan.message_limit?.toLocaleString()} msgs/mo
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-surface-500">
                      <Users className="w-3.5 h-3.5 text-brand-500" />
                      {plan.seats_limit} seats
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-surface-500">
                      <BarChart3 className="w-3.5 h-3.5 text-brand-500" />
                      {plan.campaign_limit_monthly} campaigns/mo
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-surface-500">
                      <CreditCard className="w-3.5 h-3.5 text-brand-500" />
                      {plan.contact_limit?.toLocaleString()} contacts
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-4 space-y-2 border-t border-surface-100 pt-4">
                    {(plan.features || []).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px] text-surface-600">
                        <Check className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handlePurchase(plan.slug)}
                    disabled={processing === plan.slug || isLifetime || (isCurrentPlan && !subscriptionInfo?.is_expired)}
                    className={`mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-bold rounded-xl transition-colors disabled:opacity-50 ${
                      isPopular
                        ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                        : 'bg-surface-900 hover:bg-surface-800 text-white'
                    }`}
                  >
                    {processing === plan.slug ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrentPlan && !subscriptionInfo?.is_expired ? (
                      'Current Plan'
                    ) : (
                      <>
                        Get Started <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-[12px] text-surface-400">
            All plans include SSL encryption, 99.9% uptime, and priority support.
            Payments secured by Razorpay.
          </p>
        </div>
      </div>
    </div>
  );
}
