import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  FileText, Plus, Search, Trash2, Eye, X,
  CheckCircle2, Clock, XCircle, AlertTriangle,
  RefreshCw, Pencil, Globe, Hash, MessageSquare,
  ExternalLink, Phone, ChevronRight, Send, MailCheck,
} from 'lucide-react';
import WhatsAppPhonePreview from '../../components/ui/WhatsAppPhonePreview';

import { TEMPLATE_STATUS_MAP as STATUS_MAP, TEMPLATE_CATEGORY_MAP as CATEGORY_MAP, DEFAULT_STATUS } from '../../constants/statusMaps';

const hasUsefulRejectionReason = (v = '') => {
  const n = String(v || '').trim();
  return Boolean(n && n.toUpperCase() !== 'NONE');
};

const buildPreviewProps = (template) => {
  const components = template?.components || [];
  const header = components.find((c) => c.type === 'HEADER');
  const body = components.find((c) => c.type === 'BODY');
  const footer = components.find((c) => c.type === 'FOOTER');
  const btns = components.find((c) => c.type === 'BUTTONS');
  const p = {};
  if (header) {
    const fmt = String(header.format || '').toUpperCase();
    if (fmt === 'TEXT') p.header = { type: 'text', text: header.text };
    else if (fmt === 'IMAGE') p.header = { type: 'image' };
    else if (fmt === 'VIDEO') p.header = { type: 'video' };
    else if (fmt === 'DOCUMENT') p.header = { type: 'document', filename: 'Document.pdf' };
  }
  if (body?.text) p.body = body.text;
  if (footer?.text) p.footer = footer.text;
  if (btns?.buttons?.length) p.buttons = btns.buttons.map((b) => ({ type: b.type, text: b.text, url: b.url, phone: b.phone_number }));
  return p;
};

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [preview, setPreview] = useState(null);

  const fetch_ = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get('/meta/templates');
      setTemplates(data.data?.templates || []);
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error_source === 'meta' ? `Meta Error: ${err.error}` : 'Failed to load');
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete "${name}" from Meta? This is irreversible.`)) return;
    try {
      await api.delete(`/meta/templates/${name}`);
      toast.success('Deleted from Meta');
      fetch_(true);
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error_source === 'meta' ? `Meta: ${err.error || e.message}` : (err?.error || 'Delete failed'));
    }
  };

  const filtered = useMemo(() => templates.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  }), [templates, search, filterStatus]);

  /* Stats */
  const stats = useMemo(() => ({
    total: templates.length,
    approved: templates.filter((t) => t.status === 'APPROVED').length,
    pending: templates.filter((t) => t.status === 'PENDING').length,
    rejected: templates.filter((t) => t.status === 'REJECTED').length,
  }), [templates]);

  /* KPIs matching Dashboard style */
  const kpis = [
    { label: 'Total Templates', value: stats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: 'synced with Meta' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', sub: 'ready to send' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', sub: 'awaiting review' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', sub: 'needs attention' },
  ];

  const Skel = ({ h = 'h-32' }) => <div className={`bg-white rounded-xl border border-surface-200 ${h} animate-pulse`} />;

  return (
    <div className="space-y-6">

      {/* ── Header (matches Dashboard) ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Templates</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            WhatsApp message templates synced with Meta
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetch_(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Sync'}
          </button>
          <button
            onClick={() => navigate('/portal/templates/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Template
          </button>
        </div>
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

      {/* ── Filter Row: Tabs + Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up">
        <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
          {[
            { key: 'all', label: 'All' },
            { key: 'APPROVED', label: 'Approved' },
            { key: 'PENDING', label: 'Pending' },
            { key: 'REJECTED', label: 'Rejected' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${
                filterStatus === f.key
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..."
            className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none" />
        </div>
      </div>

      {/* ── Templates Table (matches Dashboard campaign table style) ── */}
      <div className="bg-white rounded-xl border border-surface-200 animate-fade-in-up overflow-hidden" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-bold text-surface-900">All Templates</h3>
            <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-surface-50 rounded-lg animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-[13px] text-surface-500 font-medium">
              {search || filterStatus !== 'all' ? 'No templates match your filters' : 'No templates yet'}
            </p>
            <p className="text-[11px] text-surface-400 mt-1">
              {search || filterStatus !== 'all' ? 'Try adjusting your search or status filter' : 'Create your first template to get started'}
            </p>
            {!search && filterStatus === 'all' && (
              <button
                onClick={() => navigate('/portal/templates/new')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Template
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/60">
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Template</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Category</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Language</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Components</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map((t, idx) => {
                  const sm = STATUS_MAP[t.status] || STATUS_MAP.PENDING;
                  const cm = CATEGORY_MAP[t.category] || { cls: 'bg-surface-100 text-surface-600 border-surface-200', label: t.category };
                  const bodyText = t.components?.find((c) => c.type === 'BODY')?.text || '';
                  const buttons = t.components?.find((c) => c.type === 'BUTTONS')?.buttons || [];
                  const headerComp = t.components?.find((c) => c.type === 'HEADER');
                  const varCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length;

                  return (
                    <tr key={t.id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-semibold text-surface-900 truncate max-w-[220px]">{t.name}</p>
                        <p className="text-[11px] text-surface-400 truncate max-w-[220px] mt-0.5">
                          {bodyText.substring(0, 50)}{bodyText.length > 50 ? '...' : ''}
                        </p>
                        {hasUsefulRejectionReason(t.rejected_reason) && (
                          <p className="text-[10px] text-red-600 flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            {t.rejected_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${cm.cls}`}>
                          {cm.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sm.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[12px] text-surface-600 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-surface-400" />
                          {t.language}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {headerComp && headerComp.format && headerComp.format !== 'NONE' && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-semibold border border-blue-100">
                              {headerComp.format}
                            </span>
                          )}
                          {varCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-semibold border border-amber-100 flex items-center gap-0.5">
                              <Hash className="w-2.5 h-2.5" />{varCount}
                            </span>
                          )}
                          {buttons.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-surface-50 text-surface-500 rounded text-[10px] font-semibold border border-surface-200 flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5" />{buttons.length} btn{buttons.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreview(t)}
                            className="p-2 rounded-lg text-surface-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/portal/templates/${t.id}/edit`)}
                            className="p-2 rounded-lg text-surface-400 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.name)}
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

      {/* ── Preview Modal ── */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <button
                onClick={() => setPreview(null)}
                className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-surface-200 flex items-center justify-center text-surface-500 hover:text-surface-700 hover:scale-110 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="bg-white rounded-xl px-4 py-2.5 mb-3 border border-surface-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-surface-900 truncate">{preview.name}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${CATEGORY_MAP[preview.category]?.cls || ''}`}>
                    {CATEGORY_MAP[preview.category]?.label || preview.category}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_MAP[preview.status]?.cls || ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_MAP[preview.status]?.dot || ''}`} />
                    {STATUS_MAP[preview.status]?.label || preview.status}
                  </span>
                </div>
              </div>
              <WhatsAppPhonePreview
                {...buildPreviewProps(preview)}
                contactName="WBIZ.IN"
                emptyMessage="No content"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
