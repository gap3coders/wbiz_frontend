import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CreditCard,
  Landmark,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import api from '../../api/axios';
import { formatConversationName, formatDateTime, formatRelativeTime, toneForSeverity } from '../../utils/portal';

function BillingMetric({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm shadow-gray-100/70">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Meta</span>
      </div>
      <p className="font-display text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {hint ? <p className="text-xs text-gray-400 mt-2">{hint}</p> : null}
    </div>
  );
}

export default function Billing() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const devError = (...args) => {
    if (import.meta.env.DEV) console.error(...args);
  };

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const { data } = await api.get('/billing/overview');
        setOverview(data.data);
        setPageError(null);
      } catch (error) {
        devError('[Billing] Failed to load billing overview', error);
        setPageError({
          message: error.response?.data?.error || 'Failed to load billing overview',
          source: error.response?.data?.meta?.source || 'app',
          code: error.response?.data?.meta?.code || null,
        });
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, []);

  const categoryRows = useMemo(
    () =>
      Object.entries(overview?.pricing_summary?.by_category || {}).sort((left, right) => right[1] - left[1]),
    [overview]
  );

  const modelRows = useMemo(
    () =>
      Object.entries(overview?.pricing_summary?.by_pricing_model || {}).sort((left, right) => right[1] - left[1]),
    [overview]
  );

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-[#081425] via-[#10233d] to-[#075E54] rounded-[30px] p-8 text-white relative overflow-hidden mb-8">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-300 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-52 h-52 bg-cyan-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-semibold uppercase tracking-[0.18em] mb-4">
            <ReceiptText className="w-3.5 h-3.5" />
            Billing & charges
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">Meta funding and charge signals</h1>
          <p className="text-emerald-50/90 text-base sm:text-lg leading-relaxed">
            This screen is separate from analytics and focuses on billing setup, funding identifiers, shared credit lines, and pricing signals flowing back from Meta delivery statuses.
          </p>
        </div>
      </div>

      {pageError ? (
        <section className="mb-8 rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5">
          <p className="text-sm font-semibold text-amber-900">Billing notice</p>
          <p className="text-sm text-amber-800 mt-2">{pageError.message}</p>
          <p className="text-xs text-amber-700 mt-2">
            Source: {pageError.source}
            {pageError.code ? ` | Meta code: ${pageError.code}` : ''}
          </p>
        </section>
      ) : null}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <BillingMetric
          icon={WalletCards}
          label="Currency"
          value={overview?.account?.currency || '--'}
          accent="from-emerald-500 to-teal-600"
          hint={overview?.account?.display_phone_number || 'Connected sender number'}
        />
        <BillingMetric
          icon={CreditCard}
          label="Funding ID"
          value={overview?.account?.primary_funding_id ? 'Linked' : 'Missing'}
          accent="from-blue-500 to-cyan-600"
          hint={overview?.account?.primary_funding_id || 'No payment method exposed by Meta'}
        />
        <BillingMetric
          icon={Landmark}
          label="Credit Lines"
          value={overview?.account?.line_of_credit_count ?? 0}
          accent="from-violet-500 to-fuchsia-600"
          hint={overview?.account?.business_name || 'No business mapping returned'}
        />
        <BillingMetric
          icon={ReceiptText}
          label="Billable signals (30d)"
          value={overview?.pricing_summary?.billable_count ?? 0}
          accent="from-amber-500 to-orange-600"
          hint={`${overview?.pricing_summary?.non_billable_count ?? 0} non-billable signals`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr,1.05fr] gap-6 mb-8">
        <section className="bg-white rounded-[30px] border border-gray-100 p-6 shadow-sm shadow-gray-100/70">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-gray-900">Funding setup</h2>
              <p className="text-sm text-gray-500">Live Meta billing identifiers for this connected WABA</p>
            </div>
            <CreditCard className="w-5 h-5 text-emerald-500" />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-1">Business mapping</p>
                <p className="text-sm font-semibold text-gray-900">{overview?.account?.business_name || 'Not returned by Meta'}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-1">Primary funding ID</p>
                <p className="text-sm font-semibold text-gray-900 break-all">{overview?.account?.primary_funding_id || 'Not returned'}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-1">Purchase order number</p>
                <p className="text-sm font-semibold text-gray-900">{overview?.account?.purchase_order_number || 'Not configured'}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-1">Review status</p>
                <p className="text-sm font-semibold text-gray-900">{overview?.account?.business_review_status || 'Unknown'}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-1">Sender registration</p>
                <p className="text-sm font-semibold text-gray-900">{overview?.account?.sender_registration_status || 'unknown'}</p>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-[30px] border border-gray-100 p-6 shadow-sm shadow-gray-100/70">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-gray-900">Charge signals</h2>
              <p className="text-sm text-gray-500">Categories and pricing models seen in recent Meta status pricing payloads</p>
            </div>
            <WalletCards className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="rounded-3xl bg-gray-50 border border-gray-100 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">By category</p>
              <div className="space-y-2">
                {categoryRows.length ? (
                  categoryRows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600 capitalize">{label.replaceAll('_', ' ')}</span>
                      <span className="text-sm font-semibold text-gray-900">{value}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No pricing categories seen yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-gray-50 border border-gray-100 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">By pricing model</p>
              <div className="space-y-2">
                {modelRows.length ? (
                  modelRows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600 capitalize">{label.replaceAll('_', ' ')}</span>
                      <span className="text-sm font-semibold text-gray-900">{value}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No pricing model data seen yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {(overview?.notices || []).map((notice) => (
              <div key={notice.id} className={`rounded-3xl border px-5 py-4 ${toneForSeverity('warning')}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{notice.title}</p>
                    <p className="text-sm mt-1">{notice.message}</p>
                    <p className="text-xs mt-2 opacity-80">Source: {notice.source}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr,1.1fr] gap-6">
        <section className="bg-white rounded-[30px] border border-gray-100 p-6 shadow-sm shadow-gray-100/70">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-gray-900">Shared credit lines</h2>
              <p className="text-sm text-gray-500">Lines of credit returned by Meta for the owning business</p>
            </div>
            <Landmark className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="space-y-3">
            {(overview?.account?.credit_lines || []).length ? (
              overview.account.credit_lines.map((creditLine) => (
                <div key={creditLine.id} className="rounded-3xl border border-gray-100 px-5 py-4">
                  <p className="text-sm font-semibold text-gray-900 break-all">{creditLine.legal_entity_name || 'Legal entity not returned'}</p>
                  <p className="text-xs text-gray-400 mt-2 break-all">Credit line ID: {creditLine.id}</p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                <p className="text-sm font-semibold text-gray-700">No shared credit lines returned</p>
                <p className="text-sm text-gray-500 mt-1">If billing is managed elsewhere or this is a test account, Meta may not expose a line of credit here.</p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-[30px] border border-gray-100 p-6 shadow-sm shadow-gray-100/70">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-gray-900">Recent priced events</h2>
              <p className="text-sm text-gray-500">Latest outbound messages where Meta returned pricing metadata in status webhooks</p>
            </div>
            <ReceiptText className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
            {(overview?.recent_priced_messages || []).length ? (
              overview.recent_priced_messages.map((item) => (
                <div key={item._id} className="rounded-3xl border border-gray-100 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatConversationName(item.contact || item)}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.to}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-3">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700 capitalize">
                          {String(item.category || 'unknown').replaceAll('_', ' ')}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 capitalize">
                          {String(item.pricing_model || 'unknown').replaceAll('_', ' ')}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.billable ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-700'}`}>
                          {item.billable ? 'Billable' : 'Non-billable'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{formatRelativeTime(item.message_timestamp)}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDateTime(item.message_timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                <p className="text-sm font-semibold text-gray-700">No priced status events yet</p>
                <p className="text-sm text-gray-500 mt-1">Once Meta returns pricing metadata on delivery statuses, those events will appear here automatically.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
