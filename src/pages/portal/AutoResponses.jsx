import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Bot, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Clock3, Edit3, Hand, HelpCircle, MessageSquare,
  Pause, Play, Plus, RefreshCw, Trash2, XCircle,
  Zap, Shield, Hash, Users, Timer,
} from 'lucide-react';
import api from '../../api/axios';

/* ── Trigger config ── */
const TRIGGER_MAP = {
  keyword: { label: 'Keyword Reply', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  welcome: { label: 'Welcome Reply', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  away: { label: 'Away Message', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  fallback: { label: 'Fallback Reply', cls: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  unsubscribe: { label: 'Unsubscribe', cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  resubscribe: { label: 'Resubscribe', cls: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
};

const LOG_STATUS_MAP = {
  sent: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Sent', icon: CheckCircle2 },
  failed: { cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Failed', icon: XCircle },
  skipped: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Skipped', icon: AlertTriangle },
};

const AUTO_RESPONSE_LOG_PAGE_SIZE = 10;

const getPageNumbers = (current, total) => {
  if (total <= 1) return [1];
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
};

export default function AutoResponses() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPagination, setLogsPagination] = useState({ page: 1, pages: 1, total: 0, limit: AUTO_RESPONSE_LOG_PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');

  const fetchPage = async (page = logsPage, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get('/auto-responses', {
        params: { logs_page: page, logs_limit: AUTO_RESPONSE_LOG_PAGE_SIZE },
      });
      setRules(data.data?.rules || []);
      setLogs(data.data?.logs || []);
      setSummary(data.data?.summary || null);
      const pg = data.data?.pagination?.logs || { page: 1, pages: 1, total: 0, limit: AUTO_RESPONSE_LOG_PAGE_SIZE };
      setLogsPagination(pg);
      setLogsPage(pg.page || 1);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load auto responses');
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchPage(); }, [logsPage]);

  const deleteRule = async (rule) => {
    if (!window.confirm(`Delete auto-response "${rule.name}"?`)) return;
    try {
      await api.delete(`/auto-responses/${rule._id}`);
      toast.success('Rule deleted');
      await fetchPage(logsPage, true);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete rule');
    }
  };

  const toggleActive = async (rule) => {
    try {
      await api.put(`/auto-responses/${rule._id}`, { active: !rule.active });
      toast.success(rule.active ? 'Rule paused' : 'Rule activated');
      await fetchPage(logsPage, true);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update rule');
    }
  };

  /* KPIs matching Dashboard style */
  const kpis = useMemo(() => [
    { label: 'Total Rules', value: summary?.total_rules || 0, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: 'configured rules' },
    { label: 'Active Rules', value: summary?.active_rules || 0, icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', sub: 'currently running' },
    { label: 'Messages Sent', value: summary?.sent_count || 0, icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', sub: 'auto replies sent' },
    { label: 'Failed', value: summary?.failed_count || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', sub: 'delivery failures' },
  ], [summary]);

  const logPageNumbers = getPageNumbers(logsPagination.page, logsPagination.pages);

  const Skel = ({ h = 'h-32' }) => <div className={`bg-white rounded-xl border border-surface-200 ${h} animate-pulse`} />;

  return (
    <div className="space-y-6">

      {/* ── Header (matches Dashboard) ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Auto Responses</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            Automated reply rules from Meta webhook events
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPage(logsPage, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => navigate('/portal/auto-responses/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Rule
          </button>
        </div>
      </div>

      {/* ── Date Triggers CTA ── */}
      <div
        onClick={() => navigate('/portal/date-triggers')}
        className="flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50/50 cursor-pointer hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Timer className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-blue-800">Date-Based Triggers</span>
          <span className="text-xs text-blue-600">— Auto-send templates on birthdays, anniversaries & custom dates</span>
        </div>
        <ChevronRight className="w-4 h-4 text-blue-400" />
      </div>

      {/* ── KPI Strip (matches Dashboard) ── */}
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
              <p className="text-[22px] font-extrabold text-surface-900 tracking-tight leading-none">{k.value}</p>
              <p className="text-[11px] text-surface-400 mt-1.5 font-medium">{k.label}</p>
              <p className="text-[10px] text-surface-300 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter Row: Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up">
        <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${
              activeTab === 'rules' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${
              activeTab === 'activity' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            Activity ({logsPagination.total})
          </button>
        </div>
      </div>

      {/* ═══ RULES TAB ═══ */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-xl border border-surface-200 animate-fade-in-up overflow-hidden" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-bold text-surface-900">All Rules</h3>
              <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
                {rules.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-surface-50 rounded-lg animate-pulse" />)}
            </div>
          ) : rules.length === 0 ? (
            <div className="py-12 text-center">
              <Bot className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-[13px] text-surface-500 font-medium">No auto-response rules yet</p>
              <p className="text-[11px] text-surface-400 mt-1">Set up keyword bots, welcome messages, and after-hours replies</p>
              <button
                onClick={() => navigate('/portal/auto-responses/new')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Rule
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50/60">
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Rule</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Trigger</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Response</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Options</th>
                    <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {rules.map((rule) => {
                    const tm = TRIGGER_MAP[rule.trigger_type] || TRIGGER_MAP.keyword;

                    return (
                      <tr key={rule._id} className="hover:bg-surface-50/60 transition-colors">
                        {/* Rule name + description + keywords */}
                        <td className="px-5 py-3">
                          <p className="text-[13px] font-semibold text-surface-900 truncate max-w-[200px]">{rule.name}</p>
                          {rule.description && (
                            <p className="text-[11px] text-surface-400 truncate max-w-[200px] mt-0.5">{rule.description}</p>
                          )}
                          {rule.trigger_type === 'keyword' && rule.keywords?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {rule.keywords.slice(0, 4).map((kw) => (
                                <span key={kw} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] rounded font-semibold border border-blue-100">
                                  {kw}
                                </span>
                              ))}
                              {rule.keywords.length > 4 && (
                                <span className="px-1.5 py-0.5 bg-surface-50 text-surface-400 text-[9px] rounded font-semibold">
                                  +{rule.keywords.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        {/* Trigger type */}
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tm.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tm.dot}`} />
                            {tm.label}
                          </span>
                        </td>
                        {/* Response type */}
                        <td className="px-5 py-3">
                          <span className="text-[12px] text-surface-600 font-medium">
                            {rule.response_type === 'template' ? 'Meta Template' : 'Text Reply'}
                          </span>
                          {rule.response_type === 'template' && rule.template_name && (
                            <p className="text-[10px] text-surface-400 mt-0.5 truncate max-w-[120px]">{rule.template_name}</p>
                          )}
                        </td>
                        {/* Active status */}
                        <td className="px-5 py-3">
                          <button
                            onClick={() => toggleActive(rule)}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer transition-colors ${
                              rule.active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-surface-100 text-surface-600 border-surface-200 hover:bg-surface-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${rule.active ? 'bg-emerald-500' : 'bg-surface-400'}`} />
                            {rule.active ? 'Active' : 'Paused'}
                          </button>
                        </td>
                        {/* Options: priority, cooldown, once */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 bg-surface-50 text-surface-500 rounded text-[10px] font-semibold border border-surface-200 flex items-center gap-0.5">
                              <Hash className="w-2.5 h-2.5" />{rule.priority}
                            </span>
                            {rule.send_once_per_contact && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-semibold border border-blue-100 flex items-center gap-0.5">
                                <Users className="w-2.5 h-2.5" />Once
                              </span>
                            )}
                            {rule.cooldown_minutes > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-semibold border border-amber-100 flex items-center gap-0.5">
                                <Timer className="w-2.5 h-2.5" />{rule.cooldown_minutes}m
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => toggleActive(rule)}
                              className={`p-2 rounded-lg transition-colors ${
                                rule.active
                                  ? 'text-surface-400 hover:bg-amber-50 hover:text-amber-600'
                                  : 'text-surface-400 hover:bg-emerald-50 hover:text-emerald-600'
                              }`}
                              title={rule.active ? 'Pause' : 'Activate'}
                            >
                              {rule.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => navigate(`/portal/auto-responses/${rule._id}/edit`)}
                              className="p-2 rounded-lg text-surface-400 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteRule(rule)}
                              className="p-2 rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* ═══ ACTIVITY TAB ═══ */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border border-surface-200 animate-fade-in-up overflow-hidden" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-bold text-surface-900">Activity Log</h3>
              <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
                {logsPagination.total}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-surface-50 rounded-lg animate-pulse" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <Clock3 className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-[13px] text-surface-500 font-medium">No activity yet</p>
              <p className="text-[11px] text-surface-400 mt-1">When rules fire from Meta webhooks, the audit trail will appear here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-100 bg-surface-50/60">
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Rule</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Contact</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Reason</th>
                      <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {logs.map((log) => {
                      const lm = LOG_STATUS_MAP[log.status] || LOG_STATUS_MAP.sent;
                      return (
                        <tr key={log._id} className="hover:bg-surface-50/60 transition-colors">
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${lm.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${lm.dot}`} />
                              {lm.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-[13px] font-semibold text-surface-900">{log.rule_name}</p>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-[12px] text-surface-600">
                              {log.contact_name || log.contact_phone || 'Unknown'}
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-[11px] text-surface-400 truncate max-w-[200px]">{log.reason || '—'}</p>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <p className="text-[12px] text-surface-500">
                              {log.created_at ? new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                            </p>
                            <p className="text-[10px] text-surface-400">
                              {log.created_at ? new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logsPagination.pages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
                  <span className="text-[11px] text-surface-400">
                    Page {logsPagination.page} of {logsPagination.pages} ({logsPagination.total} total)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={logsPagination.page <= 1}
                      onClick={() => setLogsPage(logsPagination.page - 1)}
                      className="p-1.5 rounded-lg border border-surface-200 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4 text-surface-500" />
                    </button>
                    {logPageNumbers.map((page) => (
                      <button
                        key={page}
                        onClick={() => setLogsPage(page)}
                        className={`min-w-[2rem] px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${
                          page === logsPagination.page
                            ? 'bg-brand-600 text-white'
                            : 'border border-surface-200 text-surface-600 hover:bg-surface-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      disabled={logsPagination.page >= logsPagination.pages}
                      onClick={() => setLogsPage(logsPagination.page + 1)}
                      className="p-1.5 rounded-lg border border-surface-200 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4 text-surface-500" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
