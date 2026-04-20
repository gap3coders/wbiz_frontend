import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SetupLayout from '../../components/setup/SetupLayout';
import {
  ArrowRight, ExternalLink, Shield, Smartphone, Wifi,
  CheckCircle2, AlertTriangle,
} from 'lucide-react';

export default function SetupWelcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <SetupLayout step={1}>
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-500/25">
          <Wifi className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 mb-2 tracking-tight">
          Welcome, {firstName}!
        </h1>
        <p className="text-[15px] text-surface-500 max-w-md mx-auto leading-relaxed">
          Let's connect your WhatsApp Business account in just a few steps.
        </p>
      </div>

      {/* Steps preview card */}
      <div className="bg-white rounded-2xl border border-surface-200/80 p-6 sm:p-8 mb-5 shadow-card">
        <h3 className="text-[14px] font-bold text-surface-900 mb-5">Here's what we'll do</h3>
        <div className="space-y-4">
          {[
            { num: 1, title: 'Connect your Meta account', desc: 'Log in with Facebook to authorize access', icon: Shield, color: 'from-blue-500 to-blue-600' },
            { num: 2, title: 'Choose your WhatsApp number', desc: 'Select which business number to use', icon: Smartphone, color: 'from-brand-500 to-brand-600' },
            { num: 3, title: 'Start messaging', desc: "You're all set to send and receive messages", icon: Wifi, color: 'from-violet-500 to-violet-600' },
          ].map((step) => (
            <div key={step.num} className="flex items-start gap-4 p-3.5 rounded-xl bg-surface-50/80 border border-surface-100 hover:border-surface-200 transition-colors">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                <step.icon className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-surface-900">{step.title}</p>
                <p className="text-[12px] text-surface-500 mt-0.5">{step.desc}</p>
              </div>
              <span className="ml-auto text-[11px] font-bold text-surface-300 bg-surface-100 rounded-md px-2 py-0.5 flex-shrink-0">
                {step.num}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Prerequisites */}
      <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-5 sm:p-6 mb-8">
        <div className="flex items-center gap-2.5 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <h4 className="text-[13px] font-bold text-amber-900">Before you start</h4>
        </div>
        <ul className="space-y-2.5">
          {[
            'A Facebook Business Manager account',
            'A phone number ready for WhatsApp Business',
            'Your number must NOT already be on WhatsApp Business API',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] text-amber-800 leading-snug">
              <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/portal/setup/connect')}
          className="flex-1 py-3.5 px-6 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-[14px] shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
        <a
          href="https://business.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="py-3.5 px-6 bg-white border border-surface-200 text-surface-600 font-semibold rounded-xl hover:bg-surface-50 hover:border-surface-300 transition-all flex items-center justify-center gap-2 text-[13px]"
        >
          Meta Business Manager <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </SetupLayout>
  );
}
