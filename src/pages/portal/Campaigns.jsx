import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Megaphone, Plus, Play, Trash2, CheckCircle2, Clock, XCircle,
  RefreshCw, Send, Pause, Eye, RotateCcw, AlertTriangle,
  FileText, Users, Search, ChevronRight, TrendingUp,
} from 'lucide-react';

import { CAMPAIGN_STATUS_MAP as STATUS_MAP, getStatus, DEFAULT_STATUS } from '../../constants/statusMaps';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'failed', label: 'Failed' },
];

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchCampaigns = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get('/campaigns');
      setCampaigns(data.data.campaigns || []);
    } catch {
      if (!silent) toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  /* Auto-refresh every 5s */
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchCampaigns(true);
    }, 5000);
    return () => clearInterval(id);
  }, [fetchCampaigns]);

  /* Actions */
  const launchCampaign = async (id) => {
    if (!window.confirm('Launch this campaign? Messages will be sent via Meta API immediately.')) return;
    try { await api.post(`/campaigns/${id}/launch`); toast.success('Campaign launched!'); fetchCampaigns(); } catch { toast.error('Failed to launch'); }
  };
  const rerunCampaign = async (id) => {
    if (!window.confirm('Rerun this campaign now?')) return;
    try { await api.post(`/campaigns/${id}/rerun`); toast.success('Rerun started'); fetchCampaigns(); } catch { toast.error('Failed to rerun'); }
  };
  const deleteCampaign = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try { await api.delete(`/campaigns/${id}`); toast.success('Campaign deleted'); fetchCampaigns(); } catch { toast.error('Failed to delete'); }
  };

  /* Filtering */
  const filteredCampaigns = useMemo(() => {
    let list = statusFilter === 'all' ? campaigns : campaigns.filter(c => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(q) || c.template_name?.toLowerCase().includes(q));
    }
    return list;
  }, [campaigns, statusFilter, search]);

  /* KPI counts */
  const counts = useMemo(() => ({
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    failed: campaigns.filter(c => c.status === 'failed').length,
  }), [campaigns]);

  const totalSent = campaigns.reduce((s, c) => s + (c.stats?.sent || 0), 0);

  const kpis = [
    { label: 'Total Campaigns', value: counts.total, icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: 'all time' },
    { label: 'Active', value: counts.running, icon: Play, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', sub: 'running now' },
    { label: 'Completed', value: counts.completed, icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', sub: 'finished' },
    { label: 'Scheduled', value: counts.scheduled, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', sub: 'upcoming' },
    { label: 'Failed', value: counts.failed, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', sub: 'needs attention' },
    { label: 'Messages Sent', value: totalSent.toLocaleString(), icon: Send, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', sub: 'total delivered' },
  ];

  /* Skeleton */
  const Skel = ({ h = 'h-32' }) => <div className={`bg-white rounded-xl border border-surface-200 ${h} animate-pulse`} />;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Campaigns</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5" />
            Create and manage bulk message campaigns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCampaigns(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => navigate('/portal/campaigns/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Campaign
          </button>
        </div>
      </div>

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

      {/* ── Filter Row: Tabs + Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${
                statusFilter === tab.key
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Campaigns Table ── */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '180ms' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-bold text-surface-900">Campaigns</h3>
            <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
              {filteredCampaigns.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-50 rounded-lg animate-pulse" />)}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="py-16 text-center">
            <Megaphone className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-[13px] text-surface-500 font-medium">
              {statusFilter === 'all' ? 'No campaigns yet' : `No ${statusFilter} campaigns`}
            </p>
            <p className="text-[11px] text-surface-400 mt-1">
              {statusFilter === 'all' ? 'Create your first campaign to start sending bulk messages' : 'Try a different filter'}
            </p>
            {statusFilter === 'all' && (
              <button
                onClick={() => navigate('/portal/campaigns/new')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Campaign
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/60">
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Campaign</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Template</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Sent</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Delivered</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Read</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Failed</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400 w-[140px]">Progress</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Date</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredCampaigns.map(campaign => {
                  const st = campaign.status || 'draft';
                  const sm = STATUS_MAP[st] || STATUS_MAP.draft;
                  const total = campaign.stats?.total || 0;
                  const sent = campaign.stats?.sent || 0;
                  const delivered = campaign.stats?.delivered || 0;
                  const read = campaign.stats?.read || 0;
                  const failed = campaign.stats?.failed || 0;
                  const progress = total > 0 ? Math.round((sent / total) * 100) : 0;

                  return (
                    <tr
                      key={campaign._id}
                      className="hover:bg-surface-50/60 transition-colors cursor-pointer"
                      onClick={() => navigate(`/portal/campaigns/${campaign._id}`)}
                    >
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-semibold text-surface-900 truncate max-w-[200px]">{campaign.name}</p>
                        {campaign.target_type === 'tags' && campaign.target_tags?.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {campaign.target_tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">{tag}</span>
                            ))}
                            {campaign.target_tags.length > 2 && <span className="text-[9px] text-surface-400">+{campaign.target_tags.length - 2}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[12px] text-surface-600 font-medium">{campaign.template_name || '—'}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sm.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                          {sm.label}
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
                      <td className="px-5 py-3 text-[12px] text-surface-500 whitespace-nowrap">
                        {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {['draft', 'scheduled', 'paused'].includes(st) && (
                            <button onClick={() => launchCampaign(campaign._id)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Launch">
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => navigate(`/portal/campaigns/${campaign._id}`)} className="p-1.5 hover:bg-surface-100 text-surface-600 rounded-lg transition-colors" title="View Details">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => rerunCampaign(campaign._id)} className="p-1.5 hover:bg-surface-100 text-surface-600 rounded-lg transition-colors" title="Rerun">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          {['draft', 'completed', 'failed'].includes(st) && (
                            <button onClick={() => deleteCampaign(campaign._id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
