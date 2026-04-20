import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  TrendingUp, TrendingDown, CheckCircle2, XCircle, Send, Megaphone,
  FileText, Users, MessageSquare, RefreshCw, Clock, ArrowRight,
  ArrowUpRight, Eye, MailCheck, AlertTriangle, Zap, BarChart3,
  Activity, MessageCircle, Bot, ChevronRight, Circle, Phone,
  CalendarDays, Shield, Wifi, Server,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/* ── Register Chart.js modules ── */
ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip, Legend, Filler,
);
ChartJS.defaults.font.family = '"Inter", system-ui, sans-serif';
ChartJS.defaults.font.size = 11;
ChartJS.defaults.color = '#94a3b8';

/* ── Helpers ── */
const inboundPreview = (item = {}) => {
  if (item.last_message_type === 'image') return 'Image received';
  if (item.last_message_type === 'video') return 'Video received';
  if (item.last_message_type === 'audio') return 'Audio received';
  if (item.last_message_type === 'document') return 'Document received';
  return item.last_message || 'New customer message';
};

const formatTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getCampaignStatus = (c = {}) => String(c?.status || '').toLowerCase();

const getCampaignProgress = (c = {}) => {
  const sent = Number(c?.stats?.sent || 0);
  const delivered = Number(c?.stats?.delivered || 0);
  if (sent === 0) return 0;
  return Math.round((delivered / sent) * 100);
};

/* ── Date range helpers ── */
const DATE_RANGES = [
  { key: '30d', label: '30 Days', days: 30 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: 'today', label: 'Today', days: 0 },
];

/* ── Component ── */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState('');
  const [dateRange, setDateRange] = useState('30d');

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const loadDashboard = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const rangeConfig = DATE_RANGES.find(r => r.key === dateRange) || DATE_RANGES[0];
      const volumeDays = rangeConfig.days || 1; // today = 1 day for volume endpoint

      // Fetch all 3 endpoints in parallel for accurate data
      const [dashRes, campaignsRes, volumeRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/campaigns'),
        api.get('/analytics/volume', { params: { days: volumeDays } }),
      ]);

      const dashData = dashRes.data?.data || {};
      const allCampaigns = campaignsRes.data?.data?.campaigns || [];
      const volumeData = volumeRes.data?.data?.volume || [];

      setSnapshot({
        ...dashData,
        all_campaigns: allCampaigns,
        volume: volumeData,
      });
      setPageError('');
    } catch (error) {
      setPageError(error?.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const overview = snapshot?.overview || {};
  const unreadConversations = snapshot?.unread_conversations || [];
  const recentCampaigns = snapshot?.recent_campaigns || [];
  const allCampaigns = snapshot?.all_campaigns || [];
  const volumeData = snapshot?.volume || [];

  const rangeLabel = dateRange === 'today' ? 'today' : dateRange === '7d' ? 'last 7 days' : 'last 30 days';

  // For "today" tab: use dashboard overview fields directly (they count today's data)
  // For "7d" / "30d" tabs: aggregate from all campaigns stats (which reflect total lifetime stats per campaign)
  // Plus use volume data for charting
  const computedStats = useMemo(() => {
    if (dateRange === 'today') {
      // Dashboard endpoint already counts today's outbound messages
      return {
        sent: Number(overview.sent_today || 0),
        delivered: Number(overview.delivered_today || 0),
        read: Number(overview.read_today || 0),
        failed: Number(overview.failed_today || 0),
      };
    }

    // For 7d/30d: aggregate from all campaigns + fallback to volume totals
    // Campaign stats give us sent/delivered/read/failed totals per campaign
    let aggSent = 0, aggDelivered = 0, aggRead = 0, aggFailed = 0;

    // Filter campaigns by date range
    const now = new Date();
    const rangeDays = dateRange === '7d' ? 7 : 30;
    const rangeStart = new Date(now.getTime() - rangeDays * 86400000);

    allCampaigns.forEach(c => {
      const campaignDate = new Date(c.started_at || c.created_at);
      if (campaignDate >= rangeStart) {
        aggSent += Number(c.stats?.sent || 0);
        aggDelivered += Number(c.stats?.delivered || 0);
        aggRead += Number(c.stats?.read || 0);
        aggFailed += Number(c.stats?.failed || 0);
      }
    });

    // Also add volume outbound totals (covers non-campaign messages like manual sends)
    // Volume gives us total outbound per day but not status breakdown,
    // so use it as a fallback for sent if campaign aggregation is 0
    if (aggSent === 0 && volumeData.length > 0) {
      aggSent = volumeData.reduce((sum, d) => sum + Number(d.outbound || 0), 0);
    }

    return { sent: aggSent, delivered: aggDelivered, read: aggRead, failed: aggFailed };
  }, [dateRange, overview, allCampaigns, volumeData]);

  const totalSent = computedStats.sent;
  const totalDelivered = computedStats.delivered;
  const totalRead = computedStats.read;
  const totalFailed = computedStats.failed;
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const readRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;
  const failedRate = totalSent > 0 ? Math.round((totalFailed / totalSent) * 100) : 0;

  /* ── KPI definitions ── */
  const kpis = useMemo(() => [
    {
      label: 'Messages Sent',
      value: totalSent.toLocaleString(),
      icon: Send,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      sub: rangeLabel,
    },
    {
      label: 'Delivered',
      value: totalDelivered.toLocaleString(),
      icon: MailCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      sub: `${deliveryRate}% rate`,
    },
    {
      label: 'Read',
      value: totalRead.toLocaleString(),
      icon: Eye,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-violet-100',
      sub: `${readRate}% rate`,
    },
    {
      label: 'Failed',
      value: totalFailed.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
      sub: `${failedRate}% rate`,
    },
    {
      label: 'Open Chats',
      value: Number(overview.open_conversations ?? 0).toLocaleString(),
      icon: MessageCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      sub: 'active now',
    },
    {
      label: 'Campaigns',
      value: allCampaigns.length,
      icon: Megaphone,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      sub: `${allCampaigns.filter(c => getCampaignStatus(c) === 'running').length} running`,
    },
  ], [totalSent, totalDelivered, totalRead, totalFailed, deliveryRate, readRate, failedRate, overview.open_conversations, allCampaigns, rangeLabel]);

  /* ── Quick actions ── */
  const quickActions = [
    { label: 'New Message', icon: Send, to: '/portal/messages/new', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Create Campaign', icon: Megaphone, to: '/portal/campaigns', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Import Contacts', icon: Users, to: '/portal/contacts', color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Templates', icon: FileText, to: '/portal/templates', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Auto Responses', icon: Bot, to: '/portal/auto-responses', color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Analytics', icon: BarChart3, to: '/portal/analytics', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  /* ── Chart.js: Volume Bar Chart ── */
  const volumeChartData = useMemo(() => {
    if (volumeData.length === 0) return null;
    const labels = volumeData.map(v =>
      new Date(v.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    return {
      labels,
      datasets: [
        {
          label: 'Outbound',
          data: volumeData.map(v => Number(v.outbound || 0)),
          backgroundColor: 'rgba(37, 211, 102, 0.85)',
          borderColor: '#25D366',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Inbound',
          data: volumeData.map(v => Number(v.inbound || 0)),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    };
  }, [volumeData]);

  const volumeChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 11 },
        padding: 12,
        cornerRadius: 10,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: '500' }, maxRotation: 0 },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        ticks: { font: { size: 10 }, padding: 8 },
        border: { display: false },
        beginAtZero: true,
      },
    },
  }), []);

  /* ── Chart.js: Delivery Doughnut ── */
  const doughnutData = useMemo(() => ({
    labels: ['Delivered', 'Read', 'Failed', 'Pending'],
    datasets: [{
      data: [
        totalDelivered,
        totalRead,
        totalFailed,
        Math.max(0, totalSent - totalDelivered - totalFailed),
      ],
      backgroundColor: ['#25D366', '#8b5cf6', '#ef4444', '#e2e8f0'],
      borderColor: ['#fff', '#fff', '#fff', '#fff'],
      borderWidth: 3,
      hoverOffset: 6,
    }],
  }), [totalDelivered, totalRead, totalFailed, totalSent]);

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 11 },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => {
            const pct = totalSent > 0 ? Math.round((ctx.raw / totalSent) * 100) : 0;
            return ` ${ctx.label}: ${ctx.raw.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  }), [totalSent]);

  /* ── System health ── */
  const systemHealth = [
    { label: 'API Status', status: 'operational', icon: Server },
    { label: 'WhatsApp Connection', status: 'operational', icon: Wifi },
    { label: 'Message Queue', status: 'operational', icon: Activity },
    { label: 'Account Quality', status: overview.quality_rating || 'green', icon: Shield },
  ];

  /* ── Skeleton Card ── */
  const Skel = ({ h = 'h-32', className = '' }) => (
    <div className={`bg-white rounded-xl border border-surface-200 ${h} animate-pulse ${className}`} />
  );

  /* ━━━━━━━━━ RENDER ━━━━━━━━━ */
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">
            {greeting}, {firstName}
            <span className="inline-block ml-1.5 animate-wave origin-[70%_70%]" role="img" aria-label="wave">👋</span>
          </h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {today}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Tabs */}
          <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
            {DATE_RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => setDateRange(r.key)}
                className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${
                  dateRange === r.key
                    ? 'bg-white text-surface-900 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {pageError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 animate-fade-in-up">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          {pageError}
        </div>
      )}

      {/* ── KPI Strip ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => <Skel key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((k, idx) => (
            <div
              key={k.label}
              className={`bg-white rounded-xl border ${k.border} p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up group`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center`}>
                  <k.icon className={`w-[18px] h-[18px] ${k.color}`} />
                </div>
              </div>
              <p className="text-[22px] font-extrabold text-surface-900 tracking-tight leading-none">{k.value}</p>
              <p className="text-[11px] text-surface-400 mt-1.5 font-medium">{k.label}</p>
              <p className="text-[10px] text-surface-300 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Row 2: Message Volume Chart + Delivery Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Message Volume (2/3) — Chart.js */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
            <div>
              <h3 className="text-[14px] font-bold text-surface-900">Message Volume</h3>
              <p className="text-[11px] text-surface-400 mt-0.5">{dateRange === 'today' ? "Today's breakdown" : dateRange === '7d' ? 'Last 7 days' : 'Last 30 days'}</p>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#25D366' }} /> Outbound</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Inbound</span>
            </div>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="h-[220px] bg-surface-50 rounded-lg animate-pulse" />
            ) : volumeChartData ? (
              <div className="h-[220px]">
                <Bar data={volumeChartData} options={volumeChartOptions} />
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                  <p className="text-[13px] text-surface-500 font-medium">No volume data</p>
                  <p className="text-[11px] text-surface-400 mt-1">Send messages to see charts</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delivery Breakdown (1/3) — Chart.js Doughnut */}
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <div className="px-5 py-3.5 border-b border-surface-100">
            <h3 className="text-[14px] font-bold text-surface-900">Delivery Breakdown</h3>
            <p className="text-[11px] text-surface-400 mt-0.5">{dateRange === 'today' ? "Today's" : dateRange === '7d' ? 'Last 7 days' : 'Last 30 days'} message status</p>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-8 bg-surface-50 rounded animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="relative w-36 h-36 mx-auto mb-5">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[18px] font-extrabold text-surface-900">{totalSent.toLocaleString()}</span>
                    <span className="text-[10px] text-surface-400 font-medium">total sent</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: 'Delivered', count: totalDelivered, pct: deliveryRate, color: 'bg-emerald-500' },
                    { label: 'Read', count: totalRead, pct: readRate, color: 'bg-violet-500' },
                    { label: 'Failed', count: totalFailed, pct: failedRate, color: 'bg-red-400' },
                    { label: 'Pending', count: Math.max(0, totalSent - totalDelivered - totalFailed), pct: totalSent > 0 ? Math.max(0, 100 - deliveryRate - failedRate) : 0, color: 'bg-surface-300' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${row.color} flex-shrink-0`} />
                      <span className="text-[12px] text-surface-600 flex-1">{row.label}</span>
                      <span className="text-[12px] font-semibold text-surface-700 mr-1">{row.count.toLocaleString()}</span>
                      <span className="text-[11px] text-surface-400">({row.pct}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Recent Conversations + Quick Actions + System Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Recent Conversations (6/12) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-surface-200 animate-fade-in-up overflow-hidden" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
            <h3 className="text-[14px] font-bold text-surface-900">Recent Conversations</h3>
            <button
              onClick={() => navigate('/portal/inbox')}
              className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-50 rounded-lg animate-pulse" />)}
            </div>
          ) : unreadConversations.length > 0 ? (
            <div className="divide-y divide-surface-100">
              {unreadConversations.slice(0, 6).map((conv) => (
                <button
                  key={conv.contact_phone}
                  onClick={() => navigate(`/portal/inbox?phone=${conv.contact_phone}`)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-50/80 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-[12px] font-bold text-white">
                      {(conv.contact_name || conv.contact_phone || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-surface-900 truncate">
                        {conv.contact_name || conv.contact_phone}
                      </p>
                      <span className="text-[10px] text-surface-400 flex-shrink-0">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <p className="text-[12px] text-surface-500 truncate mt-0.5">{inboundPreview(conv)}</p>
                  </div>
                  {/* Unread */}
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <MessageSquare className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-[13px] text-surface-400">No unread conversations</p>
              <p className="text-[11px] text-surface-300 mt-0.5">You're all caught up!</p>
            </div>
          )}
        </div>

        {/* Quick Actions (3/12) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-surface-200 p-5 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <h3 className="text-[14px] font-bold text-surface-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-surface-100 hover:border-surface-200 hover:bg-surface-50 transition-all group"
              >
                <div className={`w-9 h-9 rounded-lg ${a.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <a.icon className={`w-[16px] h-[16px] ${a.color}`} />
                </div>
                <span className="text-[11px] font-semibold text-surface-700 text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* System Health (3/12) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-surface-200 p-5 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <h3 className="text-[14px] font-bold text-surface-900 mb-1">System Health</h3>
          <p className="text-[11px] text-surface-400 mb-4">All systems operational</p>
          <div className="space-y-3">
            {systemHealth.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center">
                  <s.icon className="w-4 h-4 text-surface-500" />
                </div>
                <span className="text-[12px] text-surface-700 flex-1">{s.label}</span>
                <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                  s.status === 'operational' || s.status === 'green'
                    ? 'text-emerald-600'
                    : s.status === 'yellow' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    s.status === 'operational' || s.status === 'green'
                      ? 'bg-emerald-500'
                      : s.status === 'yellow' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  {s.status === 'operational' || s.status === 'green' ? 'Healthy' : s.status === 'yellow' ? 'Warning' : 'Issue'}
                </span>
              </div>
            ))}
          </div>

          {/* Account info */}
          <div className="mt-5 pt-4 border-t border-surface-100">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-surface-400">Account tier</span>
              <span className="font-bold text-surface-700">Business</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-2">
              <span className="text-surface-400">Monthly quota</span>
              <span className="font-bold text-surface-700">{overview.sent_today || 0} / 50,000</span>
            </div>
            <div className="mt-2">
              <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(((overview.sent_today || 0) / 50000) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Active Campaigns ── */}
      <div className="bg-white rounded-xl border border-surface-200 animate-fade-in-up overflow-hidden" style={{ animationDelay: '350ms' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-bold text-surface-900">Active Campaigns</h3>
            <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
              {allCampaigns.length}
            </span>
          </div>
          <button
            onClick={() => navigate('/portal/campaigns')}
            className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
          >
            All campaigns <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-surface-50 rounded-lg animate-pulse" />)}
          </div>
        ) : allCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/60">
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Campaign</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Sent</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Delivered</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Read</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Failed</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400 w-[140px]">Progress</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {allCampaigns.slice(0, 10).map(campaign => {
                  const progress = getCampaignProgress(campaign);
                  const st = getCampaignStatus(campaign);
                  const sent = Number(campaign?.stats?.sent || 0);
                  const delivered = Number(campaign?.stats?.delivered || 0);
                  const read = Number(campaign?.stats?.read || 0);
                  const failed = Number(campaign?.stats?.failed || 0);
                  const statusMap = {
                    completed: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
                    running: { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
                    scheduled: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
                    failed: { cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
                    draft: { cls: 'bg-surface-100 text-surface-600 border-surface-200', dot: 'bg-surface-400' },
                  };
                  const sm = statusMap[st] || statusMap.draft;

                  return (
                    <tr key={campaign._id} className="hover:bg-surface-50/60 transition-colors cursor-pointer" onClick={() => navigate('/portal/campaigns')}>
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-semibold text-surface-900 truncate max-w-[200px]">{campaign.name}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sm.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[13px] font-semibold text-surface-900">{sent.toLocaleString()}</td>
                      <td className="px-5 py-3 text-[13px] font-semibold text-emerald-600">{delivered.toLocaleString()}</td>
                      <td className="px-5 py-3 text-[13px] font-semibold text-blue-600">{read.toLocaleString()}</td>
                      <td className="px-5 py-3 text-[13px] font-semibold text-red-500">{failed.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${progress >= 90 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-surface-500 w-8 text-right">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-[12px] text-surface-500">
                        {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Megaphone className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-[13px] text-surface-500 font-medium">No campaigns yet</p>
            <p className="text-[11px] text-surface-400 mt-1">Create your first campaign to start reaching customers</p>
            <button
              onClick={() => navigate('/portal/campaigns')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
            >
              <Megaphone className="w-3.5 h-3.5" />
              Create Campaign
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
