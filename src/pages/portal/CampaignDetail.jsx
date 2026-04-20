import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Megaphone, ArrowLeft, RefreshCw, Send, CheckCircle2, XCircle, Eye,
  Clock, Play, Pause, Trash2, RotateCcw, Download, Loader2,
  AlertTriangle, FileText, Users, Tag, Calendar, ChevronLeft, ChevronRight,
  TrendingUp, BarChart3, MessageSquare, ExternalLink, Mail,
} from 'lucide-react';

import { CAMPAIGN_STATUS_MAP, MESSAGE_STATUS_MAP, getStatus, DEFAULT_STATUS } from '../../constants/statusMaps';

/* ── Constants ── */
const DETAIL_PAGE_SIZE = 25;
const EXPORT_PAGE_SIZE = 100;

// Merge campaign + message status maps for this page
const STATUS_MAP = { ...CAMPAIGN_STATUS_MAP, ...MESSAGE_STATUS_MAP };

const LOG_TABS = [
  { key: 'all', label: 'All Messages' },
  { key: 'sent', label: 'Sent' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'read', label: 'Read' },
  { key: 'failed', label: 'Failed' },
];

/* ── Helpers ── */
const csvEscape = (v = '') => `"${String(v ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/"/g, '""')}"`;
const buildCsv = (rows = []) => rows.map(row => row.map(c => csvEscape(c)).join(',')).join('\r\n');
const downloadCsv = (filename, content) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  window.URL.revokeObjectURL(url);
};
const toFileSlug = (v = '') => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'campaign';
const formatExportDate = (v) => { try { return v ? new Date(v).toISOString() : ''; } catch { return String(v || ''); } };

const getFileFromMessage = (msg = {}) => {
  const preview = msg?.template_params?.preview || {};
  const link = String(preview.header_link || msg.media_url || '').trim();
  let name = '';
  try { name = decodeURIComponent(new URL(link, window.location.origin).pathname.split('/').pop() || ''); } catch { name = ''; }
  return { url: link, name: String(preview.header_file_name || msg.media_filename || name || '').trim(), type: String(preview.header_type || '').trim() };
};

const getPageNumbers = (current, total) => {
  if (total <= 1) return [1];
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
};

/* ── Component ── */
export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: DETAIL_PAGE_SIZE });
  const [logFilter, setLogFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const fetchDetail = useCallback(async (page = 1, silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get(`/campaigns/${id}`, { params: { page, limit: DETAIL_PAGE_SIZE } });
      setDetailData(data.data);
      setPagination(data.data.pagination || { page: 1, pages: 1, total: 0, limit: DETAIL_PAGE_SIZE });
    } catch {
      if (!silent) toast.error('Failed to load campaign details');
    } finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  /* Auto-refresh */
  useEffect(() => {
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') fetchDetail(pagination.page, true);
    }, 4000);
    return () => clearInterval(iv);
  }, [fetchDetail, pagination.page]);

  const campaign = detailData?.campaign || {};
  const liveStats = detailData?.live_stats || {};
  const errors = detailData?.errors || [];
  const messages = detailData?.messages || [];

  const st = campaign.status || 'draft';
  const sm = STATUS_MAP[st] || STATUS_MAP.draft;

  const total = pagination.total || 0;
  const sent = liveStats.sent || 0;
  const delivered = liveStats.delivered || 0;
  const read = liveStats.read || 0;
  const failed = liveStats.failed || 0;
  const queued = liveStats.queued || 0;
  const completionPct = total > 0 ? Math.round((sent / total) * 100) : 0;
  const deliveryPct = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
  const readPct = sent > 0 ? Math.round((read / sent) * 100) : 0;

  const filteredMessages = useMemo(() => {
    if (logFilter === 'all') return messages;
    return messages.filter(m => m.status === logFilter);
  }, [messages, logFilter]);

  const pageNumbers = getPageNumbers(pagination.page, pagination.pages);

  /* Actions */
  const launchCampaign = async () => {
    if (!window.confirm('Launch this campaign? Messages sent immediately.')) return;
    try { await api.post(`/campaigns/${id}/launch`); toast.success('Launched!'); fetchDetail(1); } catch { toast.error('Failed'); }
  };
  const rerunCampaign = async () => {
    if (!window.confirm('Rerun this campaign?')) return;
    try { await api.post(`/campaigns/${id}/rerun`); toast.success('Rerun started'); navigate('/portal/campaigns'); } catch { toast.error('Failed'); }
  };
  const deleteCampaign = async () => {
    if (!window.confirm('Delete this campaign?')) return;
    try { await api.delete(`/campaigns/${id}`); toast.success('Deleted'); navigate('/portal/campaigns'); } catch { toast.error('Failed'); }
  };

  /* Export CSV */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = [];
      let page = 1, pages = 1;
      while (page <= pages) {
        const { data } = await api.get(`/campaigns/${id}`, { params: { page, limit: EXPORT_PAGE_SIZE } });
        rows.push(...(data?.data?.messages || []));
        pages = data?.data?.pagination?.pages || 1;
        page += 1;
      }
      const csvRows = [
        ['Campaign', 'Template', 'Recipient Name', 'Recipient Phone', 'Status', 'Text', 'File Name', 'File URL', 'File Type', 'Timestamp', 'Error Source', 'Error Message'],
        ...rows.map(msg => {
          const f = getFileFromMessage(msg);
          return [campaign.name, msg.template_name || campaign.template_name, msg.contact_name, msg.contact_phone, msg.status, msg.content, f.name, f.url, f.type, formatExportDate(msg.timestamp), msg.error_source, msg.error_message];
        }),
      ];
      downloadCsv(`${toFileSlug(campaign.name)}-report.csv`, buildCsv(csvRows));
      toast.success(`Exported ${rows.length} rows`);
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  /* KPIs */
  const kpis = [
    { label: 'Total Recipients', value: total.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: 'in campaign' },
    { label: 'Sent', value: sent.toLocaleString(), icon: Send, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', sub: `${completionPct}% complete` },
    { label: 'Delivered', value: delivered.toLocaleString(), icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', sub: `${deliveryPct}% rate` },
    { label: 'Read', value: read.toLocaleString(), icon: Eye, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', sub: `${readPct}% rate` },
    { label: 'Failed', value: failed.toLocaleString(), icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', sub: sent > 0 ? `${Math.round((failed / total) * 100)}% rate` : '0%' },
    { label: 'Queued', value: queued.toLocaleString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', sub: 'pending' },
  ];

  /* Skeleton */
  const Skel = ({ h = 'h-32' }) => <div className={`bg-white rounded-xl border border-surface-200 ${h} animate-pulse`} />;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/portal/campaigns')} className="w-8 h-8 rounded-lg border border-surface-200 bg-white flex items-center justify-center text-surface-500 hover:bg-surface-50 hover:border-surface-300 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">{loading ? 'Loading...' : campaign.name || 'Campaign'}</h1>
              {!loading && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sm.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                  {sm.label}
                </span>
              )}
            </div>
            <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Campaign performance & message logs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {['draft', 'scheduled', 'paused'].includes(st) && (
            <button onClick={launchCampaign} className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
              <Play className="w-3.5 h-3.5" /> Launch
            </button>
          )}
          <button onClick={rerunCampaign} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Rerun
          </button>
          <button onClick={exportCsv} disabled={exporting} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all disabled:opacity-50">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export
          </button>
          {['draft', 'completed', 'failed'].includes(st) && (
            <button onClick={deleteCampaign} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-white text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
          <button onClick={() => fetchDetail(pagination.page, true)} disabled={refreshing} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{[1,2,3,4,5,6].map(i => <Skel key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((k, idx) => (
            <div key={k.label} className={`bg-white rounded-xl border ${k.border} p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up`} style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center`}><k.icon className={`w-[18px] h-[18px] ${k.color}`} /></div>
              </div>
              <p className="text-[22px] font-extrabold text-surface-900 tracking-tight leading-none">{k.value}</p>
              <p className="text-[11px] text-surface-400 mt-1.5 font-medium">{k.label}</p>
              <p className="text-[10px] text-surface-300 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Progress + Campaign Info ── */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Progress */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-surface-200 p-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <h3 className="text-[14px] font-bold text-surface-900 mb-1">Delivery Progress</h3>
            <p className="text-[11px] text-surface-400 mb-5">Real-time campaign completion</p>
            <div className="space-y-4">
              {/* Overall */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold text-surface-700">Overall Completion</span>
                  <span className="text-[13px] font-bold text-brand-600">{completionPct}%</span>
                </div>
                <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
              {/* Delivery */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold text-surface-700">Delivery Rate</span>
                  <span className="text-[13px] font-bold text-emerald-600">{deliveryPct}%</span>
                </div>
                <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${deliveryPct}%` }} />
                </div>
              </div>
              {/* Read */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold text-surface-700">Read Rate</span>
                  <span className="text-[13px] font-bold text-violet-600">{readPct}%</span>
                </div>
                <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-700" style={{ width: `${readPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Info */}
          <div className="bg-white rounded-xl border border-surface-200 p-5 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
            <h3 className="text-[14px] font-bold text-surface-900 mb-4">Campaign Info</h3>
            <div className="space-y-3">
              {[
                { label: 'Template', value: campaign.template_name, icon: FileText },
                { label: 'Language', value: campaign.template_language || 'en', icon: MessageSquare },
                { label: 'Target', value: campaign.target_type === 'all' ? 'All Contacts' : campaign.target_type === 'tags' ? 'By Tags' : 'Manual', icon: Users },
                { label: 'Created', value: campaign.created_at ? new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', icon: Calendar },
                { label: 'Started', value: campaign.started_at ? new Date(campaign.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—', icon: Play },
                { label: 'Completed', value: campaign.completed_at ? new Date(campaign.completed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—', icon: CheckCircle2 },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-surface-50 flex items-center justify-center flex-shrink-0"><row.icon className="w-3.5 h-3.5 text-surface-400" /></div>
                  <span className="text-[11px] text-surface-400 flex-1">{row.label}</span>
                  <span className="text-[12px] font-semibold text-surface-900 truncate max-w-[140px]">{row.value || '—'}</span>
                </div>
              ))}
              {campaign.target_tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-surface-100">
                  {campaign.target_tags.map(tag => (
                    <span key={tag} className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Error Log ── */}
      {!loading && errors.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '220ms' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-bold text-surface-900">Recent Errors</h3>
              <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">{errors.length}</span>
            </div>
          </div>
          <div className="divide-y divide-surface-100 max-h-[240px] overflow-y-auto">
            {errors.map((err, idx) => (
              <div key={idx} className="flex items-start gap-3 px-5 py-3">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${err.error_source === 'meta' ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <AlertTriangle className={`w-3.5 h-3.5 ${err.error_source === 'meta' ? 'text-red-500' : 'text-amber-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${err.error_source === 'meta' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {err.error_source || 'platform'}
                    </span>
                    <span className="text-[12px] font-semibold text-surface-900">+{err.contact_phone || err.phone}</span>
                  </div>
                  <p className="text-[11px] text-surface-600">{err.error_message || err.error}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Message Log ── */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '280ms' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-surface-100 gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-bold text-surface-900">Message Log</h3>
            <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{pagination.total}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
              {LOG_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setLogFilter(tab.key)}
                  className={`px-2.5 py-[5px] rounded-md text-[11px] font-semibold transition-all ${
                    logFilter === tab.key ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-surface-400">Page {pagination.page}/{pagination.pages}</span>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-surface-50 rounded-lg animate-pulse" />)}</div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-[13px] text-surface-500 font-medium">{logFilter === 'all' ? 'No messages yet' : `No ${logFilter} messages`}</p>
            <p className="text-[11px] text-surface-400 mt-1">Messages will appear here as the campaign progresses</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/60">
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Recipient</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Message</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">File</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Timestamp</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredMessages.map((msg, idx) => {
                  const msgSm = STATUS_MAP[msg.status] || STATUS_MAP.draft;
                  const fileData = getFileFromMessage(msg);
                  return (
                    <tr key={`${msg.contact_phone}-${msg.timestamp}-${idx}`} className="hover:bg-surface-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-emerald-400 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                            {(msg.contact_name || msg.contact_phone || '?')[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-surface-900">{msg.contact_name || msg.contact_phone}</p>
                            <p className="text-[10px] text-surface-400">+{msg.contact_phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${msgSm.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${msgSm.dot}`} />
                          {msgSm.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[11px] text-surface-600 max-w-[200px] truncate">{msg.content || '—'}</p>
                      </td>
                      <td className="px-5 py-3">
                        {fileData.url ? (
                          <a href={fileData.url} target="_blank" rel="noreferrer" className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {fileData.name || 'View'}
                          </a>
                        ) : <span className="text-[11px] text-surface-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-[11px] text-surface-500 whitespace-nowrap">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {msg.error_message ? (
                          <div>
                            {msg.error_source && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border mr-1 ${msg.error_source === 'meta' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{msg.error_source}</span>
                            )}
                            <span className="text-[11px] text-red-600">{msg.error_message}</span>
                          </div>
                        ) : <span className="text-[11px] text-surface-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
            <p className="text-[11px] text-surface-400">
              Showing {((pagination.page - 1) * DETAIL_PAGE_SIZE) + 1}–{Math.min(pagination.page * DETAIL_PAGE_SIZE, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchDetail(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {pageNumbers.map((num, idx) => {
                const prevNum = pageNumbers[idx - 1];
                return (
                  <span key={num} className="flex items-center">
                    {prevNum && num - prevNum > 1 && <span className="text-[11px] text-surface-400 px-1">...</span>}
                    <button
                      onClick={() => fetchDetail(num)}
                      className={`w-8 h-8 rounded-lg text-[11px] font-semibold transition-all ${
                        num === pagination.page ? 'bg-brand-600 text-white' : 'border border-surface-200 bg-white text-surface-600 hover:bg-surface-50'
                      }`}
                    >
                      {num}
                    </button>
                  </span>
                );
              })}
              <button
                onClick={() => fetchDetail(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
