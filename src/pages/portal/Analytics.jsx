import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  BarChart3, Send, CheckCheck, Eye, MessageSquare, Users, Megaphone, TrendingUp,
  RefreshCw, Calendar, ArrowUpRight, ArrowDownRight, Loader2, ChevronLeft, ChevronRight,
  MailCheck, AlertTriangle,
} from 'lucide-react';

/* ── Register Chart.js modules ── */
ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip, Legend, Filler,
);

/* ── Constants ── */
const DAY_OPTIONS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
];

const MSG_TYPE_COLORS = {
  text: { bg: 'bg-blue-50', border: 'border-blue-200', bar: 'bg-blue-500', text: 'text-blue-700', hex: '#3b82f6' },
  template: { bg: 'bg-violet-50', border: 'border-violet-200', bar: 'bg-violet-500', text: 'text-violet-700', hex: '#8b5cf6' },
  image: { bg: 'bg-indigo-50', border: 'border-indigo-200', bar: 'bg-indigo-500', text: 'text-indigo-700', hex: '#6366f1' },
  document: { bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500', text: 'text-amber-700', hex: '#f59e0b' },
  audio: { bg: 'bg-cyan-50', border: 'border-cyan-200', bar: 'bg-cyan-500', text: 'text-cyan-700', hex: '#06b6d4' },
  video: { bg: 'bg-pink-50', border: 'border-pink-200', bar: 'bg-pink-500', text: 'text-pink-700', hex: '#ec4899' },
  location: { bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-500', text: 'text-orange-700', hex: '#f97316' },
  reaction: { bg: 'bg-rose-50', border: 'border-rose-200', bar: 'bg-rose-400', text: 'text-rose-700', hex: '#fb7185' },
  sticker: { bg: 'bg-purple-50', border: 'border-purple-200', bar: 'bg-purple-400', text: 'text-purple-700', hex: '#a855f7' },
  unknown: { bg: 'bg-surface-50', border: 'border-surface-200', bar: 'bg-surface-400', text: 'text-surface-700', hex: '#94a3b8' },
};

const STATUS_MAP = {
  active: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  running: { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  completed: { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  scheduled: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  draft: { cls: 'bg-surface-100 text-surface-600 border-surface-200', dot: 'bg-surface-400' },
  paused: { cls: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  failed: { cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

/* ── Chart.js global defaults ── */
ChartJS.defaults.font.family = '"Inter", system-ui, sans-serif';
ChartJS.defaults.font.size = 11;
ChartJS.defaults.color = '#94a3b8';

export default function Analytics() {
  const [snapshot, setSnapshot] = useState(null);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('30d');

  /* ── Data Fetching (same as Dashboard) ── */
  const fetchData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const rangeConfig = DAY_OPTIONS.find(r => r.key === dateRange) || DAY_OPTIONS[2];
      const volumeDays = rangeConfig.days || 1;

      const [dashRes, campaignsRes, volumeRes, typesRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/campaigns'),
        api.get('/analytics/volume', { params: { days: volumeDays } }),
        api.get('/analytics/message-types').catch(() => ({ data: { data: { breakdown: [] } } })),
      ]);

      const dashData = dashRes.data?.data || {};
      const allCampaigns = campaignsRes.data?.data?.campaigns || [];
      const volumeData = volumeRes.data?.data?.volume || [];

      setSnapshot({ ...dashData, all_campaigns: allCampaigns, volume: volumeData });
      setTypes(typesRes.data?.data?.breakdown || []);
    } catch (err) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Derived data ── */
  const overview = snapshot?.overview || {};
  const allCampaigns = snapshot?.all_campaigns || [];
  const volumeData = snapshot?.volume || [];

  /* ── Computed stats (identical to Dashboard logic) ── */
  const computedStats = useMemo(() => {
    if (dateRange === 'today') {
      return {
        sent: Number(overview.sent_today || 0),
        delivered: Number(overview.delivered_today || 0),
        read: Number(overview.read_today || 0),
        failed: Number(overview.failed_today || 0),
      };
    }
    let aggSent = 0, aggDelivered = 0, aggRead = 0, aggFailed = 0;
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

  const rangeLabel = dateRange === 'today' ? 'today' : dateRange === '7d' ? 'last 7 days' : 'last 30 days';

  /* ── KPI Cards ── */
  const metrics = [
    { label: 'Messages Sent', value: totalSent.toLocaleString(), icon: Send, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: rangeLabel },
    { label: 'Delivered', value: totalDelivered.toLocaleString(), icon: MailCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', sub: `${deliveryRate}% rate` },
    { label: 'Read', value: totalRead.toLocaleString(), icon: Eye, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', sub: `${readRate}% rate` },
    { label: 'Failed', value: totalFailed.toLocaleString(), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', sub: `${failedRate}% rate` },
    { label: 'Open Chats', value: Number(overview.open_conversations ?? 0).toLocaleString(), icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', sub: 'active now' },
    { label: 'Campaigns', value: allCampaigns.length, icon: Megaphone, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', sub: `${allCampaigns.filter(c => String(c?.status || '').toLowerCase() === 'running').length} running` },
  ];

  /* ── Chart.js: Volume Bar Chart Data ── */
  const volumeChartData = useMemo(() => {
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

  /* ── Chart.js: Message Types Horizontal Bar ── */
  const typesChartData = useMemo(() => {
    const sorted = [...types].sort((a, b) => b.count - a.count).slice(0, 8);
    return {
      labels: sorted.map(t => t._id?.charAt(0).toUpperCase() + t._id?.slice(1)),
      datasets: [{
        data: sorted.map(t => t.count),
        backgroundColor: sorted.map(t => (MSG_TYPE_COLORS[t._id] || MSG_TYPE_COLORS.unknown).hex + 'cc'),
        borderColor: sorted.map(t => (MSG_TYPE_COLORS[t._id] || MSG_TYPE_COLORS.unknown).hex),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }],
    };
  }, [types]);

  const typesChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
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
            const total = types.reduce((a, m) => a + m.count, 0) || 1;
            const pct = Math.round((ctx.raw / total) * 100);
            return ` ${ctx.raw.toLocaleString()} messages (${pct}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        ticks: { font: { size: 10 }, padding: 4 },
        border: { display: false },
        beginAtZero: true,
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11, weight: '600' }, padding: 8 },
        border: { display: false },
      },
    },
  }), [types]);

  const Skel = ({ h = 'h-24' }) => <div className={`bg-white rounded-xl border border-surface-200 ${h} animate-pulse`} />;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Analytics</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Message statistics and campaign performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(true)} disabled={refreshing} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
            {DAY_OPTIONS.map(d => (
              <button key={d.key} onClick={() => setDateRange(d.key)} className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${dateRange === d.key ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">{[1,2,3,4,5,6].map(i => <Skel key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {metrics.map((k, idx) => (
            <div key={k.label} className={`bg-white rounded-xl border ${k.border} p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up`} style={{ animationDelay: `${idx * 60}ms` }}>
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

      {/* ── Charts Row ── */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {/* Message Volume Bar Chart (Chart.js) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-surface-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
              <div className="flex items-center gap-3">
                <h3 className="text-[14px] font-bold text-surface-900">Message Volume</h3>
                <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
                  {dateRange === 'today' ? 'Today' : `Last ${DAY_OPTIONS.find(d => d.key === dateRange)?.days || 30}d`}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#25D366' }} />
                  <span className="text-[10px] font-semibold text-surface-400">Outbound</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                  <span className="text-[10px] font-semibold text-surface-400">Inbound</span>
                </div>
              </div>
            </div>
            <div className="p-5">
              {volumeData.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                    <p className="text-[13px] text-surface-500 font-medium">No data available</p>
                    <p className="text-[11px] text-surface-400 mt-1">Send some messages to see volume charts</p>
                  </div>
                </div>
              ) : (
                <div className="h-[260px]">
                  <Bar data={volumeChartData} options={volumeChartOptions} />
                </div>
              )}
            </div>
          </div>

          {/* Delivery Breakdown Doughnut (Chart.js) */}
          <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-100">
              <h3 className="text-[14px] font-bold text-surface-900">Delivery Breakdown</h3>
              <p className="text-[11px] text-surface-400 mt-0.5">{rangeLabel} message status</p>
            </div>
            <div className="p-5">
              <div className="relative w-40 h-40 mx-auto mb-5">
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
            </div>
          </div>
        </div>
      )}

      {/* ── Message Types Chart ── */}
      {!loading && types.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '230ms' }}>
          <div className="px-5 py-3.5 border-b border-surface-100">
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-bold text-surface-900">Message Types</h3>
              <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{types.length} types</span>
            </div>
          </div>
          <div className="p-5">
            <div className="h-[220px]">
              <Bar data={typesChartData} options={typesChartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* ── Campaign Performance Table ── */}
      {!loading && (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '260ms' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-bold text-surface-900">Campaign Performance</h3>
              <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{allCampaigns.length}</span>
            </div>
          </div>

          {allCampaigns.length === 0 ? (
            <div className="py-16 text-center">
              <Megaphone className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-[13px] text-surface-500 font-medium">No campaigns yet</p>
              <p className="text-[11px] text-surface-400 mt-1">Create your first campaign to see performance metrics</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50/60">
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Campaign</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                    <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Sent</th>
                    <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Delivered</th>
                    <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Read</th>
                    <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Failed</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400 w-[140px]">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {allCampaigns.map((c, idx) => {
                    const st = String(c.status || '').toLowerCase();
                    const sm = STATUS_MAP[st] || STATUS_MAP.draft;
                    const sent = Number(c.stats?.sent || 0);
                    const delivered = Number(c.stats?.delivered || 0);
                    const read = Number(c.stats?.read || 0);
                    const failed = Number(c.stats?.failed || 0);
                    const progress = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-surface-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-[13px] font-semibold text-surface-900 truncate max-w-[200px]">{c.name}</p>
                          <p className="text-[11px] text-surface-400">{c.template_name}{c.scheduled_at ? ` · ${new Date(c.scheduled_at).toLocaleDateString()}` : ''}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sm.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                            {st.charAt(0).toUpperCase() + st.slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-[13px] font-semibold text-surface-900">{sent.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-[13px] font-bold text-emerald-600">{delivered.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-[13px] font-bold text-blue-600">{read.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-[13px] font-bold text-red-600">{failed.toLocaleString()}</td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
