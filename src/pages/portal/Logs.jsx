import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Activity, AlertTriangle, CheckCheck, Clock3, RefreshCw, Send, XCircle, Webhook, Bug, CheckCircle2, Link2, Server, MessageSquareText } from 'lucide-react';

const LEVEL_STYLES = {
  success: { bg:'bg-emerald-50', text:'text-emerald-700', border:'border-emerald-200', icon:CheckCircle2 },
  warning: { bg:'bg-amber-50', text:'text-amber-700', border:'border-amber-200', icon:AlertTriangle },
  error: { bg:'bg-red-50', text:'text-red-700', border:'border-red-200', icon:XCircle },
  info: { bg:'bg-blue-50', text:'text-blue-700', border:'border-blue-200', icon:Bug },
};

const MESSAGE_STATUS_STYLES = {
  queued: 'bg-gray-100 text-gray-600',
  sent: 'bg-sky-50 text-sky-700',
  delivered: 'bg-blue-50 text-blue-700',
  read: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
};

const PROCESSING_STYLES = {
  processed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  skipped: 'bg-amber-50 text-amber-700',
  pending: 'bg-gray-100 text-gray-600',
};

const BOOL_STYLES = {
  success: 'bg-emerald-50 text-emerald-700',
  error: 'bg-red-50 text-red-700',
  warning: 'bg-amber-50 text-amber-700',
  neutral: 'bg-gray-100 text-gray-600',
};

const formatDateTime = (value) => value ? new Date(value).toLocaleString() : '-';
const clip = (value, length = 120) => value && value.length > length ? `${value.slice(0, length)}...` : (value || '-');

function SummaryCard({ label, value, hint, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="font-display text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-2">{hint}</p>}
    </div>
  );
}

export default function Logs() {
  const [hours, setHours] = useState(72);
  const [logs, setLogs] = useState(null);
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
      const { data } = await api.get('/logs/whatsapp', { params: { hours } });
      setLogs(data.data);
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
  }, [hours]);

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
  const callbackReachability = metaAppSubscription?.is_publicly_reachable === true
    ? { label: 'Public HTTPS', style: BOOL_STYLES.success }
    : metaAppSubscription?.is_localhost || metaAppSubscription?.is_private_network
      ? { label: 'Not Public', style: BOOL_STYLES.error }
      : metaAppSubscription?.callback_url
        ? { label: 'Unknown', style: BOOL_STYLES.warning }
        : { label: 'Missing', style: BOOL_STYLES.neutral };
  const appSubscriptionBadge = metaAppSubscription
    ? metaAppSubscription.active === false
      ? { label: 'Inactive', style: BOOL_STYLES.warning }
      : { label: 'Active', style: BOOL_STYLES.success }
    : { label: 'Missing', style: BOOL_STYLES.error };
  const wabaSubscriptionBadge = metaWabaSubscription?.is_current_app_subscribed === true
    ? { label: 'Linked', style: BOOL_STYLES.success }
    : metaWabaSubscription?.is_current_app_subscribed === false
      ? { label: 'Not Linked', style: BOOL_STYLES.error }
      : { label: 'Unknown', style: BOOL_STYLES.neutral };
  const messagesFieldBadge = metaAppSubscription?.fields?.includes('messages')
    ? { label: 'Subscribed', style: BOOL_STYLES.success }
    : metaAppSubscription
      ? { label: 'Missing', style: BOOL_STYLES.error }
      : { label: 'Unknown', style: BOOL_STYLES.neutral };
  const templateFieldBadge = metaAppSubscription?.fields?.includes('message_template_status_update')
    ? { label: 'Subscribed', style: BOOL_STYLES.success }
    : metaAppSubscription
      ? { label: 'Missing', style: BOOL_STYLES.warning }
      : { label: 'Unknown', style: BOOL_STYLES.neutral };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 animate-fade-in-up">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Meta Logs</h1>
          <p className="text-gray-500 text-sm mt-0.5">This page combines live webhook subscription details from Meta with the webhook events our server has actually received. Accepted sends are not the same as delivered or received chats.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {[24, 72, 168].map((value) => (
              <button key={value} onClick={() => setHours(value)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${hours === value ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                {value === 168 ? '7d' : `${value}h`}
              </button>
            ))}
          </div>
          <button onClick={() => fetchLogs(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={resetContactSchema}
            disabled={resettingSchema}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <AlertTriangle className={`w-4 h-4 ${resettingSchema ? 'animate-pulse' : ''}`} />
            {resettingSchema ? 'Resetting...' : 'Reset Contact Schema'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}</div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">{[1, 2].map((i) => <div key={i} className="h-96 bg-white rounded-2xl animate-pulse" />)}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay:'50ms' }}>
            <SummaryCard label="Webhook Events" value={summary.webhook_events || 0} hint={`Last ${summary.window_hours || hours} hours`} icon={Webhook} color="from-cyan-500 to-sky-600" />
            <SummaryCard label="Pending Callbacks" value={summary.pending_delivery_updates || 0} hint="Accepted but not delivered/read yet" icon={Clock3} color="from-amber-500 to-orange-600" />
            <SummaryCard label="Delivered / Read" value={`${summary.outbound_delivered || 0} / ${summary.outbound_read || 0}`} hint="Webhook-confirmed delivery states" icon={CheckCheck} color="from-emerald-500 to-teal-600" />
            <SummaryCard label="Failed Messages" value={summary.outbound_failed || 0} hint={summary.last_webhook_at ? `Last webhook: ${formatDateTime(summary.last_webhook_at)}` : 'No webhook received yet'} icon={XCircle} color="from-rose-500 to-red-600" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 animate-fade-in-up" style={{ animationDelay:'75ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-gray-400" />
              <div>
                <h2 className="font-display font-semibold text-gray-900">Meta Webhook Status</h2>
                <p className="text-xs text-gray-500 mt-0.5">These values are fetched live from Meta on refresh, not from our local webhook database.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">App Subscription</p>
                <span className={`inline-flex mt-3 px-2.5 py-1 rounded-full text-xs font-semibold ${appSubscriptionBadge.style}`}>{appSubscriptionBadge.label}</span>
                <p className="text-xs text-gray-500 mt-3">{metaAppSubscription?.object || 'whatsapp_business_account not found on Meta'}</p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">WABA Linked To App</p>
                <span className={`inline-flex mt-3 px-2.5 py-1 rounded-full text-xs font-semibold ${wabaSubscriptionBadge.style}`}>{wabaSubscriptionBadge.label}</span>
                <p className="text-xs text-gray-500 mt-3">{metaWebhook?.waba_id || 'No WABA ID saved locally'}</p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Callback Reachability</p>
                <span className={`inline-flex mt-3 px-2.5 py-1 rounded-full text-xs font-semibold ${callbackReachability.style}`}>{callbackReachability.label}</span>
                <p className="text-xs text-gray-500 mt-3">{metaAppSubscription?.host || 'No callback URL from Meta'}</p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Messages Field</p>
                <span className={`inline-flex mt-3 px-2.5 py-1 rounded-full text-xs font-semibold ${messagesFieldBadge.style}`}>{messagesFieldBadge.label}</span>
                <p className="text-xs text-gray-500 mt-3">{metaAppSubscription?.fields?.length ? metaAppSubscription.fields.join(', ') : 'No subscribed fields returned by Meta'}</p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Template Status Field</p>
                <span className={`inline-flex mt-3 px-2.5 py-1 rounded-full text-xs font-semibold ${templateFieldBadge.style}`}>{templateFieldBadge.label}</span>
                <p className="text-xs text-gray-500 mt-3">Needed for approved/rejected template notifications.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">Current Meta Callback</h3>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Callback URL</p>
                <p className="text-sm text-gray-700 break-all">{metaAppSubscription?.callback_url || 'Meta did not return a callback URL for whatsapp_business_account.'}</p>
                {metaWebhook?.lookup_error && <p className="text-xs text-red-600 mt-3">{metaWebhook.lookup_error}</p>}
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquareText className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">Meta Snapshot</h3>
                </div>
                <details>
                  <summary className="text-sm font-medium text-gray-600 cursor-pointer">Open live Meta data</summary>
                  <div className="mt-3 rounded-xl bg-gray-950 text-gray-100 p-4 overflow-auto">
                    <pre className="text-[11px] whitespace-pre-wrap break-words">{JSON.stringify(metaWebhook, null, 2)}</pre>
                  </div>
                </details>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 animate-fade-in-up" style={{ animationDelay:'100ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-gray-400" />
              <h2 className="font-display font-semibold text-gray-900">Health Checks</h2>
            </div>
            {diagnostics.length === 0 ? (
              <p className="text-sm text-gray-400">No diagnostics yet.</p>
            ) : (
              <div className="space-y-3">
                {diagnostics.map((item, index) => {
                  const style = LEVEL_STYLES[item.level] || LEVEL_STYLES.info;
                  const Icon = style.icon;
                  return (
                    <div key={index} className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/80 ${style.text}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${style.text}`}>{item.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up" style={{ animationDelay:'150ms' }}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-gray-900">Outbound Message Status</h2>
                  <p className="text-xs text-gray-500 mt-0.5">These are your locally tracked outbound sends and their latest webhook-driven state.</p>
                </div>
                <Send className="w-4 h-4 text-gray-400" />
              </div>
              {outboundMessages.length === 0 ? (
                <div className="py-16 text-center">
                  <Send className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No outbound messages recorded in this window.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">When</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Recipient</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Message</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outboundMessages.map((message) => (
                        <tr key={message._id} className="border-b border-gray-50 align-top">
                          <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(message.timestamp)}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">{message.contact_phone}</p>
                            <p className="text-[11px] text-gray-400 mt-1 break-all">{message.wa_message_id || '-'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700">{clip(message.content)}</p>
                            {message.error_message && <p className="text-xs text-red-600 mt-1">{message.error_message}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${MESSAGE_STATUS_STYLES[message.status] || 'bg-gray-100 text-gray-600'}`}>{message.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up" style={{ animationDelay:'200ms' }}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-gray-900">Recent Webhook Events</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Raw callback activity from Meta, including good, bad, and skipped processing.</p>
                </div>
                <Webhook className="w-4 h-4 text-gray-400" />
              </div>
              {webhookEvents.length === 0 ? (
                <div className="py-16 text-center">
                  <Webhook className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No webhook events recorded in this window.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {webhookEvents.map((event) => {
                    const level = LEVEL_STYLES[event.level] || LEVEL_STYLES.info;
                    return (
                      <details key={event._id} className="group px-6 py-4">
                        <summary className="list-none cursor-pointer">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PROCESSING_STYLES[event.processing_status] || 'bg-gray-100 text-gray-600'}`}>{event.processing_status}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-600">{event.event_type}</span>
                                {event.meta_status && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${level.bg} ${level.text}`}>{event.meta_status}</span>}
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{event.summary}</p>
                              <p className="text-xs text-gray-500 mt-1">{formatDateTime(event.created_at)}{event.contact_phone ? ` • ${event.contact_phone}` : ''}{event.wa_message_id ? ` • ${event.wa_message_id}` : ''}</p>
                              {event.error_message && <p className="text-xs text-red-600 mt-2">{event.error_message}</p>}
                            </div>
                            <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">Open</span>
                          </div>
                        </summary>
                        <div className="mt-4 rounded-xl bg-gray-950 text-gray-100 p-4 overflow-auto">
                          <pre className="text-[11px] whitespace-pre-wrap break-words">{JSON.stringify(event.payload, null, 2)}</pre>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
