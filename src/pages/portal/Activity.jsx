import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Clock, Send, CheckCheck, AlertCircle, RefreshCw, MessageSquare, Phone,
  CheckCircle2, AlertTriangle, XCircle, ChevronLeft, ChevronRight, Loader2,
  Zap, Eye, Code2, Copy, Check, ChevronDown, ChevronUp,
} from 'lucide-react';

const LOG_PAGE_SIZE = 10;

const formatDateTime = (v) => {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const truncateContent = (text, len = 70) => {
  if (!text) return '—';
  return text.length > len ? `${text.slice(0, len)}...` : text;
};

import { MESSAGE_STATUS_MAP as STATUS_CFG, DEFAULT_STATUS } from '../../constants/statusMaps';

const EVENT_CFG = {
  processed: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle2, iconCls: 'text-emerald-600', iconBg: 'bg-emerald-50' },
  failed: { cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', icon: AlertTriangle, iconCls: 'text-red-600', iconBg: 'bg-red-50' },
  skipped: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: XCircle, iconCls: 'text-amber-600', iconBg: 'bg-amber-50' },
  pending: { cls: 'bg-surface-100 text-surface-600 border-surface-200', dot: 'bg-surface-400', icon: Clock, iconCls: 'text-surface-500', iconBg: 'bg-surface-100' },
};

const TIME_RANGES = [
  { value: 24, label: '24h' },
  { value: 72, label: '3 Days' },
  { value: 168, label: '7 Days' },
];

const getPageNumbers = (current, total) => {
  if (total <= 1) return [1];
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
};

/* ── JSON Payload Viewer ── */
function JsonPayloadViewer({ payload }) {
  const [copied, setCopied] = useState(false);
  const jsonStr = JSON.stringify(payload, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Syntax highlight JSON
  const highlighted = jsonStr
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"([^"]+)"(?=\s*:)/g, '<span class="text-violet-600 font-medium">"$1"</span>')
    .replace(/:\s*"([^"]*?)"/g, ': <span class="text-emerald-600">"$1"</span>')
    .replace(/:\s*(true|false)/g, ': <span class="text-amber-600 font-semibold">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-blue-600 font-semibold">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="text-red-400 italic">$1</span>');

  return (
    <div className="mt-3 rounded-lg border border-surface-200 bg-surface-900 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-surface-800 border-b border-surface-700">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-surface-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Raw Webhook Payload</span>
        </div>
        <button onClick={copyToClipboard} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold text-surface-400 hover:text-white hover:bg-surface-700 transition-all">
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="overflow-auto max-h-[400px] p-3">
        <pre className="text-[11px] leading-relaxed text-surface-300 font-mono whitespace-pre" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </div>
    </div>
  );
}

export default function Activity() {
  const [hours, setHours] = useState(72);
  const [logs, setLogs] = useState(null);
  const [messagesPage, setMessagesPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const [messagesPag, setMessagesPag] = useState({ page: 1, pages: 1, total: 0 });
  const [eventsPag, setEventsPag] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  const [expandedEvents, setExpandedEvents] = useState(new Set());

  const toggleEventExpand = (eventId) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const [repairing, setRepairing] = useState(false);

  const runRepair = async () => {
    setRepairing(true);
    try {
      const { data } = await api.post('/conversations/repair-interactive');
      const r = data?.data || {};
      toast.success(`Repaired ${r.patched} messages, deleted ${r.phantom_deleted} phantoms`);
      fetchLogs(true);
    } catch { toast.error('Repair failed'); }
    finally { setRepairing(false); }
  };

  const fetchLogs = async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await api.get('/logs/whatsapp', {
        params: { hours, webhook_page: eventsPage, outbound_page: messagesPage, limit_events: LOG_PAGE_SIZE, limit_messages: LOG_PAGE_SIZE },
      });
      setLogs(data.data);
      const mp = data.data?.pagination?.outbound_messages || { page: 1, pages: 1, total: 0 };
      const ep = data.data?.pagination?.webhook_events || { page: 1, pages: 1, total: 0 };
      setMessagesPag(mp); setEventsPag(ep);
      setMessagesPage(mp.page || 1); setEventsPage(ep.page || 1);
    } catch { toast.error('Failed to load activity'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchLogs(); }, [hours, messagesPage, eventsPage]);

  const summary = logs?.summary || {};
  const outbound = logs?.outbound_messages || [];
  const events = logs?.webhook_events || [];

  const kpis = [
    { label: 'Messages Sent', value: summary.webhook_events || 0, icon: Send, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: `last ${hours}h` },
    { label: 'Delivered', value: summary.outbound_delivered || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', sub: 'confirmed' },
    { label: 'Read', value: summary.outbound_read || 0, icon: Eye, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', sub: 'opened' },
    { label: 'Failed', value: summary.outbound_failed || 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', sub: 'delivery issues' },
  ];

  const tabs = [
    { key: 'messages', label: 'Messages', count: messagesPag.total },
    { key: 'events', label: 'Webhook Events', count: eventsPag.total },
  ];

  const msgPageNums = getPageNumbers(messagesPag.page, messagesPag.pages);
  const evtPageNums = getPageNumbers(eventsPag.page, eventsPag.pages);

  const Skel = ({ h = 'h-24' }) => <div className={`bg-white rounded-xl border border-surface-200 ${h} animate-pulse`} />;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Activity</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Track messaging activity and delivery status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runRepair} disabled={repairing} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-[12px] font-semibold text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-50" title="Repair broken interactive messages & clean phantom records">
            {repairing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Repair
          </button>
          <button onClick={() => fetchLogs(true)} disabled={refreshing} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skel key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* ── Filter Row: Time Range + View Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-[6px] rounded-md text-[12px] font-semibold transition-all flex items-center gap-2 ${activeTab === tab.key ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-surface-100 text-surface-600' : 'bg-transparent text-surface-400'}`}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
          {TIME_RANGES.map(r => (
            <button key={r.value} onClick={() => { setHours(r.value); setMessagesPage(1); setEventsPage(1); }} className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${hours === r.value ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages Tab ── */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <div className="px-5 py-3.5 border-b border-surface-100">
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-bold text-surface-900">Outbound Messages</h3>
              <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{messagesPag.total}</span>
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-surface-50 rounded-lg animate-pulse" />)}</div>
          ) : outbound.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-[13px] text-surface-500 font-medium">No messages yet</p>
              <p className="text-[11px] text-surface-400 mt-1">No messaging activity in the last {hours} hours</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-100 bg-surface-50/60">
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Time</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Recipient</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Content</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {outbound.map((msg, idx) => {
                      const st = STATUS_CFG[msg.status] || STATUS_CFG.queued;
                      return (
                        <tr key={msg._id || idx} className="hover:bg-surface-50/60 transition-colors">
                          <td className="px-5 py-3 text-[11px] text-surface-500 whitespace-nowrap">{formatDateTime(msg.timestamp)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                                {(msg.contact_name || msg.contact_phone || 'U')[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-surface-900">{msg.contact_name || msg.contact_phone}</p>
                                {msg.contact_name && <p className="text-[11px] text-surface-400">{msg.contact_phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-[12px] text-surface-600 max-w-[280px] truncate">{truncateContent(msg.content, 80)}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {messagesPag.pages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
                  <p className="text-[11px] text-surface-400">Page {messagesPag.page} of {messagesPag.pages} — {messagesPag.total} total</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setMessagesPage(Math.max(1, messagesPag.page - 1))} disabled={messagesPag.page <= 1} className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    {msgPageNums.map((num, idx) => {
                      const prev = msgPageNums[idx - 1];
                      return (
                        <span key={num} className="flex items-center">
                          {prev && num - prev > 1 && <span className="text-[11px] text-surface-400 px-1">...</span>}
                          <button onClick={() => setMessagesPage(num)} className={`w-8 h-8 rounded-lg text-[11px] font-semibold transition-all ${num === messagesPag.page ? 'bg-brand-600 text-white' : 'border border-surface-200 bg-white text-surface-600 hover:bg-surface-50'}`}>{num}</button>
                        </span>
                      );
                    })}
                    <button onClick={() => setMessagesPage(Math.min(messagesPag.pages, messagesPag.page + 1))} disabled={messagesPag.page >= messagesPag.pages} className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Events Tab ── */}
      {activeTab === 'events' && (
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skel key={i} h="h-20" />)}</div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-200 py-16 text-center">
              <Zap className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-[13px] text-surface-500 font-medium">No events yet</p>
              <p className="text-[11px] text-surface-400 mt-1">No webhook events in the last {hours} hours</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {events.map(event => {
                  const cfg = EVENT_CFG[event.processing_status] || EVENT_CFG.pending;
                  const EvtIcon = cfg.icon;
                  const isExpanded = expandedEvents.has(event._id);
                  return (
                    <div key={event._id} className={`bg-white rounded-xl border transition-all ${isExpanded ? 'border-brand-200 shadow-card-hover' : 'border-surface-200 hover:shadow-card-hover'}`}>
                      <button type="button" onClick={() => toggleEventExpand(event._id)} className="w-full text-left p-4">
                        <div className="flex items-start gap-3.5">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
                            <EvtIcon className={`w-[18px] h-[18px] ${cfg.iconCls}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-surface-900">{event.summary}</p>
                                <p className="text-[11px] text-surface-400 mt-1">
                                  {formatDateTime(event.created_at)}
                                  {event.contact_phone && <span> · <Phone className="w-3 h-3 inline -mt-0.5" /> {event.contact_phone}</span>}
                                  {event.event_type && <span> · <span className="font-semibold text-surface-500">{event.event_type}</span></span>}
                                  {event.wa_message_id && <span> · <span className="font-mono text-[10px] text-surface-400">{event.wa_message_id}</span></span>}
                                </p>
                                {event.error_message && (
                                  <div className="mt-2 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">{event.error_message}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                  {event.processing_status}
                                </span>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isExpanded ? 'bg-brand-50 text-brand-600' : 'bg-surface-100 text-surface-400'}`}>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded JSON payload */}
                      {isExpanded && event.payload && (
                        <div className="px-4 pb-4">
                          <JsonPayloadViewer payload={event.payload} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {eventsPag.pages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-surface-200 px-5 py-3">
                  <p className="text-[11px] text-surface-400">Page {eventsPag.page} of {eventsPag.pages} — {eventsPag.total} total</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEventsPage(Math.max(1, eventsPag.page - 1))} disabled={eventsPag.page <= 1} className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    {evtPageNums.map((num, idx) => {
                      const prev = evtPageNums[idx - 1];
                      return (
                        <span key={num} className="flex items-center">
                          {prev && num - prev > 1 && <span className="text-[11px] text-surface-400 px-1">...</span>}
                          <button onClick={() => setEventsPage(num)} className={`w-8 h-8 rounded-lg text-[11px] font-semibold transition-all ${num === eventsPag.page ? 'bg-brand-600 text-white' : 'border border-surface-200 bg-white text-surface-600 hover:bg-surface-50'}`}>{num}</button>
                        </span>
                      );
                    })}
                    <button onClick={() => setEventsPage(Math.min(eventsPag.pages, eventsPag.page + 1))} disabled={eventsPag.page >= eventsPag.pages} className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
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
