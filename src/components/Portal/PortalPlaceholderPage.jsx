import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function InfoCard({ label, value, muted = false }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">{label}</p>
      <p className={`text-sm font-semibold ${muted ? 'text-gray-500' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

export default function PortalPlaceholderPage({
  icon: Icon,
  title,
  description,
  status = 'Planned',
  primaryAction,
  secondaryAction,
  highlights = [],
  nextSteps = [],
}) {
  const { tenant, whatsappAccount } = useAuth();

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-[#0a1628] via-[#10233d] to-[#075E54] rounded-[28px] p-8 sm:p-10 text-white overflow-hidden relative mb-8">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-52 h-52 bg-emerald-300 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold uppercase tracking-[0.18em] mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            {status}
          </div>

          <div className="flex items-start gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">{title}</h1>
              <p className="text-emerald-50/90 text-base sm:text-lg leading-relaxed">{description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {primaryAction && (
              <Link
                to={primaryAction.to}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-gray-900 text-sm font-semibold hover:bg-emerald-50 transition-colors"
              >
                {primaryAction.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            {secondaryAction && (
              <Link
                to={secondaryAction.to}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
              >
                {secondaryAction.label}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <InfoCard label="Workspace" value={tenant?.name || 'No workspace loaded'} muted={!tenant?.name} />
        <InfoCard
          label="Connected Number"
          value={whatsappAccount?.display_phone_number || 'WhatsApp account not connected'}
          muted={!whatsappAccount?.display_phone_number}
        />
        <InfoCard label="Feature Status" value={status} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr,0.9fr] gap-6">
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-display text-xl font-semibold text-gray-900 mb-5">What This Area Will Handle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highlights.map((item) => (
              <div key={item.title} className="rounded-2xl bg-gray-50 border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-display text-xl font-semibold text-gray-900 mb-5">Next Steps</h2>
          <div className="space-y-3">
            {nextSteps.map((step) => (
              <div key={step} className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm text-emerald-900 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
