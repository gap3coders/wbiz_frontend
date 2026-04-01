import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Send,
  Shield,
  Users,
  WalletCards,
  XCircle,
  Zap,
} from 'lucide-react';

const readinessTone = (status) => {
  if (status === 'success') {
    return {
      shell: 'border-emerald-200 bg-emerald-50',
      badge: 'bg-emerald-500 text-white',
      icon: CheckCircle2,
      text: 'text-emerald-700',
      label: 'Ready',
    };
  }

  if (status === 'warning') {
    return {
      shell: 'border-amber-200 bg-amber-50',
      badge: 'bg-amber-500 text-white',
      icon: AlertTriangle,
      text: 'text-amber-700',
      label: 'Needs attention',
    };
  }

  return {
    shell: 'border-rose-200 bg-rose-50',
    badge: 'bg-rose-500 text-white',
    icon: XCircle,
    text: 'text-rose-700',
    label: 'Blocked',
  };
};

const checkTone = (status) => {
  if (status === 'success') return 'border-emerald-100 bg-emerald-50/80 text-emerald-700';
  if (status === 'warning') return 'border-amber-100 bg-amber-50/80 text-amber-700';
  return 'border-rose-100 bg-rose-50/80 text-rose-700';
};

const readinessPill = (status, label) => {
  if (status === 'success') {
    return {
      className: 'bg-emerald-100 text-emerald-700',
      text: `${label} ready`,
    };
  }

  if (status === 'warning') {
    return {
      className: 'bg-amber-100 text-amber-700',
      text: `${label} needs review`,
    };
  }

  return {
    className: 'bg-rose-100 text-rose-700',
    text: `${label} blocked`,
  };
};

const formatTime = (value) => (value ? new Date(value).toLocaleString() : 'Not available');

const inboundPreview = (item = {}) => {
  if (item.last_message_type === 'image') return 'Image received';
  if (item.last_message_type === 'video') return 'Video received';
  if (item.last_message_type === 'audio') return 'Audio received';
  if (item.last_message_type === 'document') return 'Document received';
  return item.last_message || 'New customer message';
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState('');
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const loadDashboard = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await api.get('/analytics/dashboard');
      setSnapshot(data.data);
      setPageError('');
    } catch (error) {
      setPageError(error?.response?.data?.error || 'Failed to load dashboard snapshot');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const overview = snapshot?.overview || {};
  const readiness = snapshot?.readiness || null;
  const notifications = snapshot?.notifications || [];
  const unreadConversations = snapshot?.unread_conversations || [];
  const readinessStatus = readinessTone(readiness?.overall_status || 'error');
  const ReadinessIcon = readinessStatus.icon;
  const sendPill = readinessPill(readiness?.send_status || 'error', 'Send');
  const receivePill = readinessPill(readiness?.receive_status || 'warning', 'Receive');

  const metrics = useMemo(
    () => [
      { label: 'Sent Today', value: overview.sent_today ?? '-', icon: Send, color: 'from-emerald-500 to-teal-600' },
      { label: 'Delivery Rate', value: `${overview.delivery_rate ?? 0}%`, icon: CheckCheck, color: 'from-blue-500 to-indigo-600' },
      { label: 'Read Rate', value: `${overview.read_rate ?? 0}%`, icon: Eye, color: 'from-violet-500 to-purple-600' },
      { label: 'Open Chats', value: overview.open_conversations ?? '-', icon: MessageSquare, color: 'from-amber-500 to-orange-600' },
      { label: 'Campaigns', value: overview.active_campaigns ?? '-', icon: Megaphone, color: 'from-rose-500 to-pink-600' },
      { label: 'Active Senders', value: readiness?.sender_count ?? '-', icon: WalletCards, color: 'from-cyan-500 to-sky-600' },
    ],
    [overview, readiness]
  );

  const blockingChecks = readiness?.checks?.filter((item) => item.status === 'error').length || 0;
  const warningChecks = readiness?.checks?.filter((item) => item.status === 'warning').length || 0;

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="animate-fade-in-up">
          <h1 className="font-display mb-1 text-2xl font-bold text-gray-900 sm:text-3xl">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {firstName}
          </h1>
          <p className="text-sm text-gray-500">
            Live Meta snapshot for WABA readiness, WhatsApp activity, and account blockers without relying on stale failure history.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Snapshot
        </button>
      </div>

      {pageError ? (
        <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {pageError}
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className="animate-fade-in-up rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:shadow-md"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${metric.color}`}>
              <metric.icon className="h-5 w-5 text-white" />
            </div>
            <p className="font-display mb-0.5 text-2xl font-bold text-gray-900">{metric.value}</p>
            <p className="text-xs text-gray-500">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr,0.85fr]">
        <section className="animate-fade-in-up rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100/80">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${readinessStatus.badge}`}>
                <ReadinessIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-semibold text-gray-900">WABA Readiness</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${readinessStatus.shell} ${readinessStatus.text}`}>
                    {readinessStatus.label}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sendPill.className}`}>
                    {sendPill.text}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${receivePill.className}`}>
                    {receivePill.text}
                  </span>
                </div>
                <p className="max-w-3xl text-sm text-gray-600">{readiness?.summary || 'Loading readiness checks...'}</p>
                {readiness?.data_source === 'meta' ? (
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                    Based on the current live Meta snapshot
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <p className="font-medium text-gray-900">
                {readiness?.active_phone?.display_phone_number || 'No active sender'}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Live check at {formatTime(readiness?.checked_at)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Templates approved: {readiness?.approved_template_count ?? 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Funding ID: {readiness?.billing?.primary_funding_id || 'Not returned by Meta'}
              </p>
            </div>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-2">
            {readiness?.checks?.map((check) => (
              <div key={check.id} className={`rounded-2xl border p-4 ${checkTone(check.status)}`}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{check.label}</p>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                    {check.status}
                  </span>
                </div>
                <p className="text-xs leading-5">{check.detail}</p>
                {check.action_link ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (String(check.action_link).startsWith('http')) {
                        window.open(check.action_link, '_blank', 'noopener,noreferrer');
                      } else {
                        navigate(check.action_link);
                      }
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                  >
                    Open fix
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Blocking Issues</p>
              <p className="font-display mt-2 text-3xl font-bold text-gray-900">{blockingChecks}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Warnings</p>
              <p className="font-display mt-2 text-3xl font-bold text-gray-900">{warningChecks}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Sender Count</p>
              <p className="font-display mt-2 text-3xl font-bold text-gray-900">{readiness?.sender_count ?? 0}</p>
            </div>
          </div>

          {readiness?.recent_failures?.length ? (
            <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <p className="text-sm font-semibold text-rose-700">Recent Meta failure history</p>
              </div>
              <p className="mb-3 text-xs leading-5 text-rose-700/80">
                {readiness?.history_note || 'These items are historical context only and do not change the live readiness badge by themselves.'}
              </p>
              <div className="space-y-3">
                {readiness.recent_failures.map((failure) => (
                  <div key={failure._id} className="rounded-2xl bg-white/70 px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{failure.title}</p>
                        <p className="mt-1 text-xs leading-5 text-gray-600">{failure.message}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {failure.code ? (
                          <p className="text-[11px] font-bold uppercase tracking-wide text-rose-600">Code {failure.code}</p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-gray-500">{formatTime(failure.created_at)}</p>
                      </div>
                    </div>
                    {failure.action_link ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (String(failure.action_link).startsWith('http')) {
                            window.open(failure.action_link, '_blank', 'noopener,noreferrer');
                          } else {
                            navigate(failure.action_link);
                          }
                        }}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"
                      >
                        Open action
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="animate-fade-in-up rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100/80">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                <Zap className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-xs text-gray-500">Most-used WhatsApp workflows</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Send Message', icon: Send, to: '/portal/messages/new', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
                { label: 'Create Template', icon: FileText, to: '/portal/templates', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                { label: 'New Campaign', icon: Megaphone, to: '/portal/campaigns', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
                { label: 'Manage Contacts', icon: Users, to: '/portal/contacts', color: 'bg-violet-50 text-violet-600 hover:bg-violet-100' },
                { label: 'Inspect Webhooks', icon: Activity, to: '/portal/logs', color: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100' },
                { label: 'Open Billing', icon: WalletCards, to: '/portal/billing', color: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.to)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${action.color}`}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-50" />
                </button>
              ))}
            </div>
          </section>

          <section className="animate-fade-in-up rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100/80">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-gray-900">Recent Activity</h3>
                <p className="text-xs text-gray-500">Deduped Meta and platform notifications</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
                ))}
              </div>
            ) : notifications.length ? (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`rounded-2xl border px-4 py-3 text-xs ${
                      notification.severity === 'error'
                        ? 'border-rose-100 bg-rose-50'
                        : notification.severity === 'warning'
                          ? 'border-amber-100 bg-amber-50'
                          : notification.severity === 'success'
                            ? 'border-emerald-100 bg-emerald-50'
                            : 'border-blue-100 bg-blue-50'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${notification.source === 'meta' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {notification.source}
                      </span>
                      {notification.duplicate_count > 1 ? (
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                          x{notification.duplicate_count}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                    <p className="mt-1 line-clamp-2 text-gray-600">{notification.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                No recent notifications.
              </div>
            )}
          </section>

          <section className="animate-fade-in-up rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100/80">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-gray-900">Waiting Customer Messages</h3>
                <p className="text-xs text-gray-500">Unread inbound chats that still need an admin reply</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
                ))}
              </div>
            ) : unreadConversations.length ? (
              <div className="space-y-3">
                {unreadConversations.map((conversation) => (
                  <button
                    key={conversation.contact_phone}
                    type="button"
                    onClick={() => navigate(`/portal/inbox?phone=${conversation.contact_phone}`)}
                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {conversation.contact_name || conversation.contact_phone}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{inboundPreview(conversation)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                          {conversation.unread_count} unread
                        </span>
                        <p className="mt-2 text-[11px] text-gray-400">{formatTime(conversation.last_message_at)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                No unread customer messages right now.
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="animate-fade-in-up rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100/80">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900">Contact Coverage</h3>
              <p className="text-xs text-gray-500">WhatsApp reachability from your saved audience</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-gray-50 p-4 text-center">
              <p className="font-display text-2xl font-bold text-gray-900">{overview.total_contacts || 0}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
              <p className="font-display text-2xl font-bold text-emerald-600">{overview.wa_verified || 0}</p>
              <p className="text-xs text-emerald-600">On WhatsApp</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4 text-center">
              <p className="font-display text-2xl font-bold text-rose-600">{overview.wa_not_available || 0}</p>
              <p className="text-xs text-rose-600">Not on WA</p>
            </div>
          </div>
        </section>

        <section className="animate-fade-in-up rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100/80">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
              <Shield className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900">Readiness Summary</h3>
              <p className="text-xs text-gray-500">Shortcuts for the most common Meta blockers</p>
            </div>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/portal/settings')}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-left hover:bg-gray-100"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">Sender numbers</p>
                <p className="text-xs text-gray-500">Verify registration, switch active sender, or deregister a number.</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/portal/logs')}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-left hover:bg-gray-100"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">Webhook diagnostics</p>
                <p className="text-xs text-gray-500">Check callback URL, subscription fields, and webhook processing health.</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/portal/billing')}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-left hover:bg-gray-100"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">Billing and charges</p>
                <p className="text-xs text-gray-500">Review funding, payment-related blockers, and charge visibility.</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
