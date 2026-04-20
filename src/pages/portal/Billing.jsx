import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CreditCard,
  Landmark,
  ReceiptText,
  WalletCards,
  TrendingUp,
  Download,
} from 'lucide-react';
import api from '../../api/axios';
import { formatConversationName, formatDateTime, formatRelativeTime, toneForSeverity } from '../../utils/portal';

function BillingMetric({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-[11px] uppercase tracking-wider text-surface-400 font-semibold">Meta</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-[13px] text-gray-600 mt-1">{label}</p>
      {hint ? <p className="text-[11px] text-surface-400 mt-2">{hint}</p> : null}
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
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Billing & Charges</h1>
            <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
              <ReceiptText className="w-3.5 h-3.5" /> Meta billing setup, funding identifiers, and pricing signals
            </p>
          </div>
        </div>

          {pageError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-[13px] font-semibold text-amber-900">Billing notice</p>
              <p className="text-[13px] text-amber-800 mt-2">{pageError.message}</p>
              <p className="text-[11px] text-amber-700 mt-2">
                Source: {pageError.source}
                {pageError.code ? ` | Meta code: ${pageError.code}` : ''}
              </p>
            </div>
          )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            hint={overview?.account?.primary_funding_id || 'No payment method'}
          />
          <BillingMetric
            icon={Landmark}
            label="Credit Lines"
            value={overview?.account?.line_of_credit_count ?? 0}
            accent="from-violet-500 to-fuchsia-600"
            hint={overview?.account?.business_name || 'No business mapping'}
          />
          <BillingMetric
            icon={ReceiptText}
            label="Billable Signals"
            value={overview?.pricing_summary?.billable_count ?? 0}
            accent="from-amber-500 to-orange-600"
            hint={`${overview?.pricing_summary?.non_billable_count ?? 0} non-billable`}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funding Setup */}
          <div className="bg-white rounded-xl border border-surface-200 shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">Funding Setup</h2>
                <p className="text-[12px] text-surface-500 mt-1">Live Meta billing identifiers</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-14 bg-surface-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-surface-50 border border-surface-200 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-surface-400 font-semibold mb-1">Business Mapping</p>
                  <p className="text-[13px] font-semibold text-gray-900">{overview?.account?.business_name || 'Not returned'}</p>
                </div>
                <div className="rounded-lg bg-surface-50 border border-surface-200 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-surface-400 font-semibold mb-1">Primary Funding ID</p>
                  <p className="text-[13px] font-semibold text-gray-900 break-all font-mono text-[12px]">{overview?.account?.primary_funding_id || 'Not returned'}</p>
                </div>
                <div className="rounded-lg bg-surface-50 border border-surface-200 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-surface-400 font-semibold mb-1">PO Number</p>
                  <p className="text-[13px] font-semibold text-gray-900">{overview?.account?.purchase_order_number || 'Not configured'}</p>
                </div>
                <div className="rounded-lg bg-surface-50 border border-surface-200 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-surface-400 font-semibold mb-1">Review Status</p>
                  <p className="text-[13px] font-semibold text-gray-900">{overview?.account?.business_review_status || 'Unknown'}</p>
                </div>
                <div className="rounded-lg bg-surface-50 border border-surface-200 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-surface-400 font-semibold mb-1">Sender Registration</p>
                  <p className="text-[13px] font-semibold text-gray-900">{overview?.account?.sender_registration_status || 'Unknown'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Charge Signals */}
          <div className="bg-white rounded-xl border border-surface-200 shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">Charge Signals</h2>
                <p className="text-[12px] text-surface-500 mt-1">Categories and pricing models</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="rounded-lg bg-surface-50 border border-surface-200 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-surface-400 font-semibold mb-3">By Category</p>
                <div className="space-y-2">
                  {categoryRows.length ? (
                    categoryRows.map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <span className="text-[12px] text-gray-600 capitalize">{label.replaceAll('_', ' ')}</span>
                        <span className="text-[12px] font-semibold text-gray-900">{value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-gray-500">No data yet</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-surface-50 border border-surface-200 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-surface-400 font-semibold mb-3">By Model</p>
                <div className="space-y-2">
                  {modelRows.length ? (
                    modelRows.map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <span className="text-[12px] text-gray-600 capitalize">{label.replaceAll('_', ' ')}</span>
                        <span className="text-[12px] font-semibold text-gray-900">{value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-gray-500">No data yet</p>
                  )}
                </div>
              </div>
            </div>

            {(overview?.notices || []).length > 0 && (
              <div className="space-y-2 pt-4 border-t border-surface-200">
                {(overview?.notices || []).map((notice) => (
                  <div key={notice.id} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-amber-900">{notice.title}</p>
                        <p className="text-[12px] text-amber-800 mt-1">{notice.message}</p>
                        <p className="text-[11px] text-amber-700 mt-1">Source: {notice.source}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Credit Lines & Priced Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Credit Lines */}
          <div className="bg-white rounded-xl border border-surface-200 shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">Shared Credit Lines</h2>
                <p className="text-[12px] text-surface-500 mt-1">Lines of credit from Meta</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-violet-600" />
              </div>
            </div>

            <div className="space-y-3">
              {(overview?.account?.credit_lines || []).length ? (
                overview.account.credit_lines.map((creditLine) => (
                  <div key={creditLine.id} className="rounded-lg border border-surface-200 bg-surface-50 px-4 py-3">
                    <p className="text-[13px] font-semibold text-gray-900">{creditLine.legal_entity_name || 'Legal entity not returned'}</p>
                    <p className="text-[11px] text-surface-400 mt-2 break-all font-mono">ID: {creditLine.id}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border-2 border-dashed border-surface-200 bg-surface-50 px-6 py-10 text-center">
                  <p className="text-[13px] font-semibold text-gray-700">No credit lines</p>
                  <p className="text-[12px] text-gray-500 mt-1">Meta may not expose lines for test accounts</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Priced Events */}
          <div className="bg-white rounded-xl border border-surface-200 shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">Recent Priced Events</h2>
                <p className="text-[12px] text-surface-500 mt-1">Latest messages with pricing metadata</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <ReceiptText className="w-5 h-5 text-orange-600" />
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {(overview?.recent_priced_messages || []).length ? (
                overview.recent_priced_messages.map((item) => (
                  <div key={item._id} className="rounded-lg border border-surface-200 bg-surface-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{formatConversationName(item.contact || item)}</p>
                        <p className="text-[12px] text-gray-600 mt-1 font-mono">{item.to}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-3">
                          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold capitalize">
                            {String(item.category || 'unknown').replaceAll('_', ' ')}
                          </span>
                          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] font-semibold capitalize">
                            {String(item.pricing_model || 'unknown').replaceAll('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                            item.billable
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.billable ? 'Billable' : 'Non-billable'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] text-surface-400">{formatRelativeTime(item.message_timestamp)}</p>
                        <p className="text-[11px] text-surface-400 mt-1">{formatDateTime(item.message_timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border-2 border-dashed border-surface-200 bg-surface-50 px-6 py-10 text-center">
                  <p className="text-[13px] font-semibold text-gray-700">No priced events yet</p>
                  <p className="text-[12px] text-gray-500 mt-1">Pricing metadata will appear once received</p>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
