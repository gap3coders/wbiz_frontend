import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Activity, AlertTriangle, CheckCheck, ChevronLeft, ChevronRight, Clock3, RefreshCw, Send, XCircle, Webhook, Bug, CheckCircle2, Link2, Server, MessageSquareText, MoreHorizontal } from 'lucide-react';
import StatusBadge from '../../components/Portal/StatusBadge';

const LEVEL_STYLES = {
  success: { bg:'bg-emerald-50', text:'text-emerald-700', border:'border-emerald-200', icon:CheckCircle2 },
  warning: { bg:'bg-amber-50', text:'text-amber-700', border:'border-amber-200', icon:AlertTriangle },
  error: { bg:'bg-red-50', text:'text-red-700', border:'border-red-200', icon:XCircle },
  info: { bg:'bg-blue-50', text:'text-blue-700', border:'border-blue-200', icon:Bug },
};

const MESSAGE_STATUS_TONES = {
  queued: 'neutral',
  sent: 'success',
  delivered: 'success',
  read: 'success',
  failed: 'danger',
};

const PROCESSING_STATUS_TONES = {
  processed: 'success',
  failed: 'danger',
  skipped: 'warning',
  pending: 'neutral',
};

const formatDateTime = (value) => value ? new Date(value).toLocaleString() : '-';
const clip = (value, length = 120) => value && value.length > length ? `${value.slice(0, length)}...` : (value || '-');
const LOG_PAGE_SIZE = 10;

const getPageNumbers = (current, total) => {
  if (total <= 1) return [1];
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return Array.from(pages).filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
};

function SummaryCard({ label, value, hint, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-card p-4">
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-2">{hint}</p>}
    </div>
  );
}

export default function Logs() {
  const [hours, setHours] = useState(72);
  const [logs, setLogs] = useState(null);
  const [webhookPage, setWebhookPage] = useState(1);
  const [outboundPage, setOutboundPage] = useState(1);
  const [webhookPagination, setWebhookPagination] = useState({ page: 1, pages: 1, total: 0, limit: LOG_PAGE_SIZE });
  const [outboundPagination, setOutboundPagination] = useState({ page: 1, pages: 1, total: 0, limit: LOG_PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resettingSchema, setResettingSchema] = useState(false);
  const devLog = (...args) => {
    if (import.meta.env.DEV) console.info(...args);
  };
  const devError = (...args) => {
    if (import.meta.env.DEV) console.error(...args);
  };

  const fetchLogs = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await api.get('/logs/whatsapp', {
        params: {
          hours,
          webhook_page: webhookPage,
          outbound_page: outboundPage,
          limit_events: LOG_PAGE_SIZE,
          limit_messages: LOG_PAGE_SIZE,
        },
      });
      setLogs(data.data);
      const nextWebhookPagination = data.data?.pagination?.webhook_events || { page: 1, pages: 1, total: 0, limit: LOG_PAGE_SIZE };
      const nextOutboundPagination = data.data?.pagination?.outbound_messages || { page: 1, pages: 1, total: 0, limit: LOG_PAGE_SIZE };
      setWebhookPagination(nextWebhookPagination);
      setOutboundPagination(nextOutboundPagination);
      setWebhookPage(nextWebhookPagination.page || 1);
      setOutboundPage(nextOutboundPagination.page || 1);
      devLog('[Portal Logs][Platform Snapshot]', {
        summary: data.data?.summary || {},
        diagnostics_count: data.data?.diagnostics?.length || 0,
        webhook_events_count: data.data?.webhook_events?.length || 0,
        outbound_messages_count: data.data?.outbound_messages?.length || 0,
      });
      devLog('[Portal Logs][Meta Snapshot]', data.data?.meta_webhook || {});
      devLog('[Portal Logs][Diagnostics]', data.data?.diagnostics || []);
    } catch (error) {
      devError('[Portal Logs][Fetch Failed]', error?.response?.data || error);
      toast.error(error.response?.data?.error || 'Failed to load WhatsApp logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [hours, webhookPage, outboundPage]);

  const resetContactSchema = async () => {
    if (!window.confirm('Reset contact schema fields for this tenant and re-sync phone/profile fields?')) return;
    setResettingSchema(true);
    try {
      const { data } = await api.post('/contacts/maintenance/reset-schema');
      const modifiedCount = data?.data?.modified_count || 0;
      toast.success(`Contact schema reset complete. Updated: ${modifiedCount}`);
      await fetchLogs(true);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset contact schema');
    } finally {
      setResettingSchema(false);
    }
  };

  const summary = logs?.summary || {};
  const diagnostics = logs?.diagnostics || [];
  const metaWebhook = logs?.meta_webhook || null;
  const metaAppSubscription = metaWebhook?.app_subscription || null;
  const metaWabaSubscription = metaWebhook?.waba_subscription || null;
  const outboundMessages = logs?.outbound_messages || [];
  const webhookEvents = logs?.webhook_events || [];
  const outboundPageNumbers = getPageNumbers(outboundPagination.page, outboundPagination.pages);
  const webhookPageNumbers = getPageNumbers(webhookPagination.page, webhookPagination.pages);
  const callbackReachability = metaAppSubscription?.is_publicly_reachable === true
    ? { label: 'Public HTTPS', tone: 'success' }
    : metaAppSubscription?.is_localhost || metaAppSubscription?.is_private_network
      ? { label: 'Not Public', tone: 'danger' }
      : metaAppSubscription?.callback_url
        ? { label: 'Unknown', tone: 'warning' }
        : { label: 'Missing', tone: 'danger' };
  const appSubscriptionBadge = metaAppSubscription
    ? metaAppSubscription.active === false
      ? { label: 'Inactive', tone: 'neutral' }
      : { label: 'Active', tone: 'success' }
    : { label: 'Missing', tone: 'danger' };
  const wabaSubscriptionBadge = metaWabaSubscription?.is_current_app_subscribed === true
    ? { label: 'Linked', tone: 'success' }
    : metaWabaSubscription?.is_current_app_subscribed === false
      ? { label: 'Not Linked', tone: 'danger' }
      : { label: 'Unknown', tone: 'neutral' };
  const messagesFieldBadge = metaAppSubscription?.fields?.includes('messages')
    ? { label: 'Subscribed', tone: 'success' }
    : metaAppSubscription
      ? { label: 'Missing', tone: 'danger' }
      : { label: 'Unknown', tone: 'neutral' };
  const templateFieldBadge = metaAppSubscription?.fields?.includes('message_template_status_update')
    ? { label: 'Subscribed', tone: 'success' }
    : metaAppSubscription
      ? { label: 'Missing', tone: 'danger' }
      : { label: 'Unknown', tone: 'neutral' };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Meta Logs</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Live webhook subscriptions and received events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchLogs(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 rounded-lg text-[13px] font-semibold text-surface-600 hover:bg-surface-50 transition">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={resetContactSchema}
            disabled={resettingSchema}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-[13px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            <AlertTriangle className={`w-4 h-4 ${resettingSchema ? 'animate-pulse' : ''}`} />
            {resettingSchema ? 'Resetting...' : 'Reset Schema'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-white rounded-xl border border-surface-200 animate-pulse" />)}</div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">{[1, 2].map((i) => <div key={i} className="h-80 bg-white rounded-xl border border-surface-200 animate-pulse" />)}</div>
        </div>
      ) : (
        <>
          {/* ── Filter Row: Time Range ── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up">
            <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
              {[24, 72, 168].map((value) => (
                <button key={value} onClick={() => { setHours(value); setWebhookPage(1); setOutboundPage(1); }}
                  className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${
                    hours === value ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
                  }`}>
                  {value === 168 ? '7 Days' : value === 72 ? '3 Days' : '24h'}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay:'50ms' }}>
            <SummaryCard label="Webhook Events" value={summary.webhook_events || 0} hint={`Last ${summary.window_hours || hours} hours`} icon={Webhook} color="from-blue-500 to-cyan-600" />
            <SummaryCard label="Pending Callbacks" value={summary.pending_delivery_updates || 0} hint="Accepted but not delivered/read yet" icon={Clock3} color="from-amber-500 to-orange-600" />
            <SummaryCard label="Delivered / Read" value={`${summary.outbound_delivered || 0} / ${summary.outbound_read || 0}`} hint="Webhook-confirmed delivery states" icon={CheckCheck} color="from-green-500 to-emerald-600" />
            <SummaryCard label="Failed Messages" value={summary.outbound_failed || 0} hint={summary.last_webhook_at ? `Last webhook: ${formatDateTime(summary.last_webhook_at)}` : 'No webhook received yet'} icon={XCircle} color="from-red-500 to-rose-600" />
          </div>

          {/* Meta Webhook Status */}
          <div className="bg-white rounded-xl border border-surface-200 shadow-card p-6 animate-fade-in-up" style={{ animationDelay:'75ms' }}>
            <div className="flex items-center gap-2 mb-6">
              <Server className="w-4 h-4 text-gray-400" />
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">Meta Webhook Status</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">These values are fetched live from Meta on refresh, not from our local webhook database.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
              <div className="rounded-lg border border-surface-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-3">App Subscription</p>
                <StatusBadge label={appSubscriptionBadge.label} tone={appSubscriptionBadge.tone} className="mt-0" />
                <p className="text-[11px] text-gray-500 mt-3">{metaAppSubscription?.object || 'whatsapp_business_account not found on Meta'}</p>
              </div>

              <div className="rounded-lg border border-surface-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-3">WABA Linked To App</p>
                <StatusBadge label={wabaSubscriptionBadge.label} tone={wabaSubscriptionBadge.tone} className="mt-0" />
                <p className="text-[11px] text-gray-500 mt-3">{metaWebhook?.waba_id || 'No WABA ID saved locally'}</p>
              </div>

              <div className="rounded-lg border border-surface-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-3">Callback Reachability</p>
                <StatusBadge label={callbackReachability.label} tone={callbackReachability.tone} className="mt-0" />
                <p className="text-[11px] text-gray-500 mt-3">{metaAppSubscription?.host || 'No callback URL from Meta'}</p>
              </div>

              <div className="rounded-lg border border-surface-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-3">Messages Field</p>
                <StatusBadge label={messagesFieldBadge.label} tone={messagesFieldBadge.tone} className="mt-0" />
                <p className="text-[11px] text-gray-500 mt-3">{metaAppSubscription?.fields?.length ? metaAppSubscription.fields.join(', ') : 'No subscribed fields returned by Meta'}</p>
              </div>

              <div className="rounded-lg border border-surface-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-3">Template Status Field</p>
                <StatusBadge label={templateFieldBadge.label} tone={templateFieldBadge.tone} className="mt-0" />
                <p className="text-[11px] text-gray-500 mt-3">Needed for approved/rejected template notifications.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-lg border border-surface-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[13px] font-semibold text-gray-900">Current Meta Callback</h3>
                </div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Callback URL</p>
                <p className="text-[13px] text-gray-700 break-all">{metaAppSubscription?.callback_url || 'Meta did not return a callback URL for whatsapp_business_account.'}</p>
                {metaWebhook?.lookup_error && <p className="text-[11px] text-red-600 mt-3">{metaWebhook.lookup_error}</p>}
              </div>

              <div className="rounded-lg border border-surface-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquareText className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[13px] font-semibold text-gray-900">Meta Snapshot</h3>
                </div>
                <details>
                  <summary className="text-[13px] font-medium text-gray-600 cursor-pointer">Open live Meta data</summary>
                  <div className="mt-3 rounded-lg bg-gray-900 text-gray-100 p-4 overflow-auto">
                    <pre className="text-[11px] whitespace-pre-wrap break-words">{JSON.stringify(metaWebhook, null, 2)}</pre>
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* Health Checks */}
          <div className="bg-white rounded-xl border border-surface-200 shadow-card p-6 animate-fade-in-up" style={{ animationDelay:'100ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-gray-400" />
              <h2 className="text-[15px] font-bold text-gray-900">Health Checks</h2>
            </div>
            {diagnostics.length === 0 ? (
              <p className="text-[13px] text-gray-500">No diagnostics yet.</p>
            ) : (
              <div className="space-y-3">
                {diagnostics.map((item, index) => {
                  const style = LEVEL_STYLES[item.level] || LEVEL_STYLES.info;
                  const Icon = style.icon;
                  return (
                    <div key={index} className={`rounded-lg border p-4 ${style.bg} ${style.border}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/80 ${style.text}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-[13px] font-semibold ${style.text}`}>{item.title}</p>
                          <p className="text-[13px] text-gray-700 mt-1">{item.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Logs Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Outbound Messages */}
            <div className="bg-white rounded-xl border border-surface-200 shadow-card overflow-hidden animate-fade-in-up" style={{ animationDelay:'150ms' }}>
              <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900">Outbound Message Status</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">These are your locally tracked outbound sends and their latest webhook-driven state.</p>
                </div>
                <Send className="w-4 h-4 text-gray-400" />
              </div>
              {outboundMessages.length === 0 ? (
                <div className="py-16 text-center">
                  <Send className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-[13px] text-gray-500">No outbound messages recorded in this window.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-200 bg-gray-50">
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">When</th>
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Recipient</th>
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Message</th>
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outboundMessages.map((message) => (
                        <tr key={message._id} className="border-b border-surface-200 hover:bg-gray-50 transition align-top">
                          <td className="px-6 py-3 text-[11px] text-gray-600 whitespace-nowrap">{formatDateTime(message.timestamp)}</td>
                          <td className="px-6 py-3">
                            <p className="text-[13px] font-medium text-gray-900">{message.contact_phone}</p>
                            <p className="text-[11px] text-gray-500 mt-1 break-all">{message.wa_message_id || '-'}</p>
                          </td>
                          <td className="px-6 py-3">
                            <p className="text-[13px] text-gray-700">{clip(message.content)}</p>
                            {message.error_message && <p className="text-[11px] text-red-600 mt-1">{message.error_message}</p>}
                          </td>
                          <td className="px-6 py-3">
                            <StatusBadge status={message.status} tone={MESSAGE_STATUS_TONES[message.status]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {outboundPagination.pages > 1 && (
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-t border-surface-200 px-6 py-4">
                  <span className="text-[11px] text-gray-500">Page {outboundPagination.page} of {outboundPagination.pages} - {outboundPagination.total} total</span>
                  <div className="flex items-center gap-1">
                    <button disabled={outboundPagination.page <= 1} onClick={() => setOutboundPage((current) => current - 1)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                    {outboundPageNumbers.map((page, index) => <div key={page} className="flex items-center">{index > 0 && outboundPageNumbers[index - 1] !== page - 1 ? <span className="px-2 text-[11px] text-gray-300"><MoreHorizontal className="h-3.5 w-3.5" /></span> : null}<button type="button" onClick={() => setOutboundPage(page)} className={`min-w-[2rem] rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${page === outboundPagination.page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{page}</button></div>)}
                    <button disabled={outboundPagination.page >= outboundPagination.pages} onClick={() => setOutboundPage((current) => current + 1)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>

            {/* Webhook Events */}
            <div className="bg-white rounded-xl border border-surface-200 shadow-card overflow-hidden animate-fade-in-up" style={{ animationDelay:'200ms' }}>
              <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900">Recent Webhook Events</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">Raw callback activity from Meta, including good, bad, and skipped processing.</p>
                </div>
                <Webhook className="w-4 h-4 text-gray-400" />
              </div>
              {webhookEvents.length === 0 ? (
                <div className="py-16 text-center">
                  <Webhook className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-[13px] text-gray-500">No webhook events recorded in this window.</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-200">
                  {webhookEvents.map((event) => {
                    return (
                      <details key={event._id} className="group px-6 py-4 hover:bg-gray-50 transition">
                        <summary className="list-none cursor-pointer">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <StatusBadge status={event.processing_status} tone={PROCESSING_STATUS_TONES[event.processing_status]} size="xs" uppercase />
                                <StatusBadge label={event.event_type} tone="neutral" size="xs" uppercase />
                                {event.meta_status && <StatusBadge status={event.meta_status} size="xs" uppercase />}
                              </div>
                              <p className="text-[13px] font-semibold text-gray-900">{event.summary}</p>
                              <p className="text-[11px] text-gray-500 mt-1">{formatDateTime(event.created_at)}{event.contact_phone ? ` - ${event.contact_phone}` : ''}{event.wa_message_id ? ` - ${event.wa_message_id}` : ''}</p>
                              {event.error_message && <p className="text-[11px] text-red-600 mt-2">{event.error_message}</p>}
                            </div>
                            <span className="text-[11px] text-gray-400 group-open:rotate-180 transition-transform whitespace-nowrap">Open</span>
                          </div>
                        </summary>
                        <div className="mt-4 rounded-lg bg-gray-900 text-gray-100 p-4 overflow-auto">
                          <pre className="text-[11px] whitespace-pre-wrap break-words">{JSON.stringify(event.payload, null, 2)}</pre>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
              {webhookPagination.pages > 1 && (
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-t border-surface-200 px-6 py-4">
                  <span className="text-[11px] text-gray-500">Page {webhookPagination.page} of {webhookPagination.pages} - {webhookPagination.total} total</span>
                  <div className="flex items-center gap-1">
                    <button disabled={webhookPagination.page <= 1} onClick={() => setWebhookPage((current) => current - 1)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                    {webhookPageNumbers.map((page, index) => <div key={page} className="flex items-center">{index > 0 && webhookPageNumbers[index - 1] !== page - 1 ? <span className="px-2 text-[11px] text-gray-300"><MoreHorizontal className="h-3.5 w-3.5" /></span> : null}<button type="button" onClick={() => setWebhookPage(page)} className={`min-w-[2rem] rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${page === webhookPagination.page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{page}</button></div>)}
                    <button disabled={webhookPagination.page >= webhookPagination.pages} onClick={() => setWebhookPage((current) => current + 1)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
