import { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  BarChart3, Send, CheckCircle2, Eye, XCircle, TrendingUp,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, FileText,
  Loader2,
} from 'lucide-react';

const TIME_RANGES = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
];

export default function TemplateAnalytics() {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [sortCol, setSortCol] = useState('sent');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/templates/analytics', { params: { range } });
      setAnalytics(data.data?.analytics || data.data?.templates || data.analytics || data.templates || data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load template analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [range]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...analytics];
    arr.sort((a, b) => {
      let va = a[sortCol] ?? 0;
      let vb = b[sortCol] ?? 0;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [analytics, sortCol, sortDir]);

  /* Summary stats */
  const summary = useMemo(() => {
    const totalSent = analytics.reduce((s, t) => s + (t.total_sent || t.sent || 0), 0);
    const totalDelivered = analytics.reduce((s, t) => s + (t.delivered || 0), 0);
    const totalRead = analytics.reduce((s, t) => s + (t.read || 0), 0);
    const avgDelivery = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0.0';
    const avgRead = totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : '0.0';
    const top = analytics.reduce((best, t) => (!best || (t.total_sent || t.sent || 0) > (best.total_sent || best.sent || 0) ? t : best), null);
    return { totalSent, avgDelivery, avgRead, topName: top?.template_name || top?.name || '-' };
  }, [analytics]);

  const kpis = [
    { label: 'Total Sent', value: summary.totalSent.toLocaleString(), icon: Send, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: `in last ${range}` },
    { label: 'Avg Delivery Rate', value: `${summary.avgDelivery}%`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', sub: 'delivered / sent' },
    { label: 'Avg Read Rate', value: `${summary.avgRead}%`, icon: Eye, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', sub: 'read / delivered' },
    { label: 'Top Template', value: summary.topName, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', sub: 'most sent template' },
  ];

  /* Daily detail view */
  const handleRowClick = async (template) => {
    setSelectedTemplate(template);
    setLoadingDaily(true);
    try {
      const id = template._id || template.id || template.template_id;
      const { data } = await api.get(`/templates/analytics/${encodeURIComponent(template.template_name || template.name || id)}`, { params: { range } });
      setDailyData(data.data?.daily_breakdown || data.data?.daily || data.daily_breakdown || data.daily || data.data || []);
    } catch {
      setDailyData([]);
    } finally {
      setLoadingDaily(false);
    }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 text-surface-300" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-600" /> : <ArrowDown className="w-3 h-3 text-brand-600" />;
  };

  const Skel = ({ h = 'h-32' }) => <div className={`bg-white rounded-xl border border-surface-200 ${h} animate-pulse`} />;

  /* Simple bar chart using div heights */
  const maxDailyVal = useMemo(() => {
    if (!dailyData.length) return 1;
    return Math.max(...dailyData.map((d) => Math.max(d.sent || 0, d.delivered || 0, d.read || 0)), 1);
  }, [dailyData]);

  if (selectedTemplate) {
    return (
      <div className="space-y-6">
        {/* Back header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedTemplate(null)}
            className="p-2 rounded-lg border border-surface-200 bg-white text-surface-500 hover:bg-surface-50 hover:text-surface-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">{selectedTemplate.name}</h1>
            <p className="text-[13px] text-surface-400 mt-0.5">Daily breakdown for last {range}</p>
          </div>
        </div>

        {/* Summary cards for this template */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Sent', value: selectedTemplate.sent || 0, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Delivered', value: selectedTemplate.delivered || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Read', value: selectedTemplate.read || 0, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
            { label: 'Failed', value: selectedTemplate.failed || 0, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
          ].map((s, idx) => (
            <div key={s.label} className={`bg-white rounded-xl border ${s.border} p-4 animate-fade-in-up`} style={{ animationDelay: `${idx * 60}ms` }}>
              <p className="text-[22px] font-extrabold text-surface-900 tracking-tight leading-none">{s.value.toLocaleString()}</p>
              <p className="text-[11px] text-surface-400 mt-1.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Daily bar chart */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h3 className="text-[14px] font-bold text-surface-900 mb-4">Daily Performance</h3>
          {loadingDaily ? (
            <div className="flex items-center justify-center py-12 text-surface-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-[13px]">Loading daily data...</span>
            </div>
          ) : dailyData.length === 0 ? (
            <p className="text-[13px] text-surface-400 text-center py-8">No daily data available</p>
          ) : (
            <>
              {/* Legend */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span className="text-[11px] text-surface-500 font-medium">Sent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-[11px] text-surface-500 font-medium">Delivered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-violet-500" />
                  <span className="text-[11px] text-surface-500 font-medium">Read</span>
                </div>
              </div>
              {/* Chart */}
              <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
                {dailyData.map((day, i) => {
                  const sentH = ((day.sent || 0) / maxDailyVal) * 100;
                  const delH = ((day.delivered || 0) / maxDailyVal) * 100;
                  const readH = ((day.read || 0) / maxDailyVal) * 100;
                  const dateLabel = day.date ? new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : `D${i + 1}`;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 min-w-[32px] flex-1 group">
                      <div className="flex items-end gap-[2px] h-40 w-full justify-center">
                        <div
                          className="w-2.5 bg-blue-500 rounded-t transition-all duration-300 group-hover:bg-blue-600"
                          style={{ height: `${Math.max(sentH, 2)}%` }}
                          title={`Sent: ${day.sent || 0}`}
                        />
                        <div
                          className="w-2.5 bg-emerald-500 rounded-t transition-all duration-300 group-hover:bg-emerald-600"
                          style={{ height: `${Math.max(delH, 2)}%` }}
                          title={`Delivered: ${day.delivered || 0}`}
                        />
                        <div
                          className="w-2.5 bg-violet-500 rounded-t transition-all duration-300 group-hover:bg-violet-600"
                          style={{ height: `${Math.max(readH, 2)}%` }}
                          title={`Read: ${day.read || 0}`}
                        />
                      </div>
                      <span className="text-[9px] text-surface-400 font-medium whitespace-nowrap">{dateLabel}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Template Analytics</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Performance metrics for your message templates
          </p>
        </div>
        <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.key}
              onClick={() => setRange(tr.key)}
              className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${
                range === tr.key
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Strip ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skel key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <p className="text-[22px] font-extrabold text-surface-900 tracking-tight leading-none truncate">{k.value}</p>
              <p className="text-[11px] text-surface-400 mt-1.5 font-medium">{k.label}</p>
              <p className="text-[10px] text-surface-300 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-surface-200 animate-fade-in-up overflow-hidden" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-bold text-surface-900">Template Performance</h3>
            <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
              {analytics.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-surface-50 rounded-lg animate-pulse" />)}
          </div>
        ) : analytics.length === 0 ? (
          <div className="py-16 text-center">
            <BarChart3 className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-[13px] text-surface-500 font-medium">No analytics data yet</p>
            <p className="text-[11px] text-surface-400 mt-1">Send some templates to see performance metrics here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/60">
                  {[
                    { key: 'name', label: 'Template' },
                    { key: 'sent', label: 'Sent' },
                    { key: 'delivered', label: 'Delivered' },
                    { key: 'read', label: 'Read' },
                    { key: 'failed', label: 'Failed' },
                    { key: 'delivery_rate', label: 'Delivery %' },
                    { key: 'read_rate', label: 'Read %' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400 cursor-pointer hover:text-surface-600 select-none"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {sorted.map((t, idx) => {
                  const deliveryRate = t.delivery_rate ?? (t.sent > 0 ? ((t.delivered || 0) / t.sent * 100).toFixed(1) : '0.0');
                  const readRate = t.read_rate ?? (t.delivered > 0 ? ((t.read || 0) / t.delivered * 100).toFixed(1) : '0.0');
                  return (
                    <tr
                      key={t._id || t.id || t.template_id || idx}
                      onClick={() => handleRowClick(t)}
                      className="hover:bg-surface-50/60 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <p className="text-[13px] font-semibold text-surface-900 truncate max-w-[200px]">{t.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[12px] font-medium text-surface-900">{(t.sent || 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-[12px] text-surface-600">{(t.delivered || 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-[12px] text-surface-600">{(t.read || 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-[12px] text-red-600 font-medium">{(t.failed || 0).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-surface-100 rounded-full max-w-[60px]">
                            <div
                              className="h-1.5 bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(parseFloat(deliveryRate), 100)}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-semibold text-surface-700">{deliveryRate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-surface-100 rounded-full max-w-[60px]">
                            <div
                              className="h-1.5 bg-violet-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(parseFloat(readRate), 100)}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-semibold text-surface-700">{readRate}%</span>
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
    </div>
  );
}
