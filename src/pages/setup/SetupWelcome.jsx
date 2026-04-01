import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, CheckCircle2, ArrowRight, ExternalLink, Smartphone, Shield, Wifi } from 'lucide-react';

export default function SetupWelcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-gray-900">WhatsApp SaaS</span>
          </div>
          {/* Progress: Step 1 of 3 */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className={`h-2 rounded-full transition-all ${step === 1 ? 'w-8 bg-emerald-500' : 'w-2 bg-gray-200'}`} />
            ))}
            <span className="text-xs text-gray-400 ml-2">Step 1 of 3</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-16 animate-fade-in-up">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-3">
            Welcome, {firstName}! 👋
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Let's connect your WhatsApp Business account in just a few steps.
          </p>
        </div>

        {/* Steps preview */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8 shadow-sm">
          <h3 className="font-display font-semibold text-gray-900 mb-6">Here's what we'll do:</h3>
          <div className="space-y-5">
            {[
              { num: 1, title: 'Connect your Meta account', desc: 'Log in with Facebook to authorize access', icon: Shield },
              { num: 2, title: 'Choose your WhatsApp number', desc: 'Select which business number to use', icon: Smartphone },
              { num: 3, title: 'Start messaging', desc: 'You\'re all set to send and receive messages', icon: Wifi },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <step.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prerequisites */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
          <h4 className="font-semibold text-amber-900 mb-3">Before you start, make sure you have:</h4>
          <ul className="space-y-2">
            {[
              'A Facebook Business Manager account',
              'A phone number ready for WhatsApp Business',
              'Your number must NOT already be on WhatsApp Business API',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => navigate('/portal/setup/connect')}
            className="flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
            Continue <ArrowRight className="w-4 h-4" />
          </button>
          <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer"
            className="py-3.5 px-6 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm">
            Meta Business Manager <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
