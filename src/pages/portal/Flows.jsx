import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  GitBranch, RefreshCw, Search, X, Send, ChevronDown, ChevronUp,
  Activity, CheckCircle2, Clock, AlertTriangle, XCircle, Phone,
  FileText, Hash, ArrowRight, Loader2, Plus, Upload, Globe, Trash2,
  Pencil, Layers, Users, Tag, UserCheck, ArchiveX, MoreVertical, Copy, Code2, Eye,
} from 'lucide-react';

const STATUS_STYLES = {
  DRAFT:      { cls: 'bg-surface-100 text-surface-600 border-surface-200', dot: 'bg-surface-400', label: 'Draft' },
  PUBLISHED:  { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Published' },
  DEPRECATED: { cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   label: 'Deprecated' },
  BLOCKED:    { cls: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500',     label: 'Blocked' },
};

const PAGE_SIZE = 12;

export default function Flows() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [sendModal, setSendModal] = useState(null);
  const [sendForm, setSendForm] = useState({ phone: '', cta: '', header: '', body: '', footer: '', mode: 'single', selectedTags: [], selectedPhones: [] });
  const [sending, setSending] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [contactsForSelect, setContactsForSelect] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [page, setPage] = useState(1);
  const [submissions, setSubmissions] = useState({});
  const [loadingSubs, setLoadingSubs] = useState({});
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', category: '' });
  const [creating, setCreating] = useState(false);
  const [jsonModal, setJsonModal] = useState(null);
  const [flowJSON, setFlowJSON] = useState('');
  const [uploadingJSON, setUploadingJSON] = useState(false);
  const [publishing, setPublishing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deprecating, setDeprecating] = useState(null);

  const fetchFlows = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/flows');
      setFlows(data.data?.flows || data.flows || data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load flows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFlows(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/flows/sync');
      toast.success('Flows synced from Meta');
      await fetchFlows(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleExpand = async (flow) => {
    const id = flow._id || flow.id;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!submissions[id]) {
      setLoadingSubs((p) => ({ ...p, [id]: true }));
      try {
        const { data } = await api.get(`/flows/${id}/submissions`);
        setSubmissions((p) => ({ ...p, [id]: data.data?.submissions || data.submissions || data.data || [] }));
      } catch {
        setSubmissions((p) => ({ ...p, [id]: [] }));
      } finally {
        setLoadingSubs((p) => ({ ...p, [id]: false }));
      }
    }
  };

  /* Load tags & contacts when send modal opens */
  const openSendModal = async (flow) => {
    setSendModal(flow);
    setSendForm({ phone: '', cta: 'Open Flow', header: '', body: '', footer: '', mode: 'single', selectedTags: [], selectedPhones: [] });
    setContactSearch('');
    try {
      const { data } = await api.get('/contacts?limit=1');
      setAvailableTags(data.data?.labels || []);
    } catch { /* ignore */ }
  };

  const searchContacts = async (q) => {
    setContactSearch(q);
    if (!q.trim()) { setContactsForSelect([]); return; }
    setLoadingContacts(true);
    try {
      const { data } = await api.get(`/contacts?search=${encodeURIComponent(q)}&limit=20`);
      setContactsForSelect(data.data?.contacts || []);
    } catch { setContactsForSelect([]); }
    finally { setLoadingContacts(false); }
  };

  const toggleSelectedPhone = (phone, name) => {
    setSendForm((f) => {
      const exists = f.selectedPhones.find((p) => p.phone === phone);
      if (exists) return { ...f, selectedPhones: f.selectedPhones.filter((p) => p.phone !== phone) };
      return { ...f, selectedPhones: [...f.selectedPhones, { phone, name }] };
    });
  };

  const toggleTag = (tag) => {
    setSendForm((f) => {
      const has = f.selectedTags.includes(tag);
      return { ...f, selectedTags: has ? f.selectedTags.filter((t) => t !== tag) : [...f.selectedTags, tag] };
    });
  };

  const handleSend = async () => {
    if (!sendForm.body.trim()) { toast.error('Body text is required'); return; }

    const { mode } = sendForm;
    if (mode === 'single' && !sendForm.phone.trim()) { toast.error('Phone number is required'); return; }
    if (mode === 'tags' && sendForm.selectedTags.length === 0) { toast.error('Select at least one tag'); return; }
    if (mode === 'selected' && sendForm.selectedPhones.length === 0) { toast.error('Select at least one contact'); return; }

    setSending(true);
    try {
      const id = sendModal._id || sendModal.id;
      const common = {
        flow_cta: sendForm.cta.trim() || 'Open Flow',
        header_text: sendForm.header.trim() || undefined,
        body_text: sendForm.body.trim(),
        footer_text: sendForm.footer.trim() || undefined,
      };

      if (mode === 'single') {
        await api.post(`/flows/${id}/send`, { phone: sendForm.phone.trim(), ...common });
        toast.success('Flow sent successfully');
      } else {
        const bulkPayload = { ...common };
        if (mode === 'all') bulkPayload.send_all = true;
        if (mode === 'tags') bulkPayload.tags = sendForm.selectedTags;
        if (mode === 'selected') bulkPayload.phones = sendForm.selectedPhones.map((p) => p.phone);
        const { data } = await api.post(`/flows/${id}/send-bulk`, bulkPayload);
        const r = data.data || data;
        toast.success(`Sent to ${r.sent || 0} contacts${r.failed ? `, ${r.failed} failed` : ''}`);
      }

      setSendModal(null);
      setSendForm({ phone: '', cta: '', header: '', body: '', footer: '', mode: 'single', selectedTags: [], selectedPhones: [] });
      await fetchFlows(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send flow');
    } finally {
      setSending(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) { toast.error('Flow name is required'); return; }
    setCreating(true);
    try {
      const categories = createForm.category ? [createForm.category] : [];
      await api.post('/flows', { name: createForm.name.trim(), categories });
      toast.success('Flow created successfully');
      setCreateModal(false);
      setCreateForm({ name: '', category: '' });
      await fetchFlows(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create flow');
    } finally {
      setCreating(false);
    }
  };

  const handleUploadJSON = async () => {
    if (!flowJSON.trim()) { toast.error('Flow JSON is required'); return; }
    setUploadingJSON(true);
    try {
      const parsed = JSON.parse(flowJSON);
      const id = jsonModal._id || jsonModal.id;
      await api.post(`/flows/${id}/json`, { flow_json: parsed });
      toast.success('Flow JSON uploaded successfully');
      setJsonModal(null);
      setFlowJSON('');
      await fetchFlows(false);
    } catch (e) {
      if (e instanceof SyntaxError) {
        toast.error('Invalid JSON format');
      } else {
        toast.error(e.response?.data?.error || 'Failed to upload flow JSON');
      }
    } finally {
      setUploadingJSON(false);
    }
  };

  const handlePublish = async (flow) => {
    const id = flow._id || flow.id;
    setPublishing(id);
    try {
      await api.post(`/flows/${id}/publish`);
      toast.success(`Flow "${flow.name}" published`);
      await fetchFlows(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to publish flow');
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (flow) => {
    const id = flow._id || flow.id;
    if (!window.confirm(`Delete flow "${flow.name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/flows/${id}`);
      toast.success('Flow deleted');
      await fetchFlows(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete flow');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeprecate = async (flow) => {
    const id = flow._id || flow.id;
    if (!window.confirm(`Deprecate flow "${flow.name}"? This cannot be undone.`)) return;
    setDeprecating(id);
    try {
      await api.post(`/flows/${id}/deprecate`);
      toast.success('Flow deprecated');
      await fetchFlows(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to deprecate flow');
    } finally {
      setDeprecating(null);
    }
  };

  const [cloning, setCloning] = useState(null);
  const handleClone = async (flow) => {
    const id = flow._id || flow.id;
    setCloning(id);
    try {
      // Create new flow with same categories
      const { data } = await api.post('/flows', {
        name: `${flow.name} (Copy)`,
        categories: flow.categories || ['OTHER'],
      });
      const newFlow = data.data?.flow;
      if (!newFlow) throw new Error('Failed to create flow');

      // Try to copy the JSON from the old flow
      try {
        const assetsRes = await api.get(`/flows/${id}/assets`);
        const assets = assetsRes.data?.data?.assets;
        const jsonAsset = assets?.data?.find((a) => a.name === 'flow.json');
        if (jsonAsset?.asset) {
          const flowJson = typeof jsonAsset.asset === 'string' ? JSON.parse(jsonAsset.asset) : jsonAsset.asset;
          await api.post(`/flows/${newFlow._id}/json`, { flow_json: flowJson });
        }
      } catch (e) {
        console.warn('Could not copy flow JSON:', e.message);
      }

      toast.success('Flow cloned! Opening in builder...');
      navigate(`/portal/flows/${newFlow._id}/builder`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to clone flow');
    } finally {
      setCloning(null);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return flows;
    const q = search.toLowerCase();
    return flows.filter((f) => (f.name || '').toLowerCase().includes(q));
  }, [flows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  /* Analytics summary */
  const stats = useMemo(() => {
    const total = flows.length;
    const totalSent = flows.reduce((s, f) => s + (f.sent_count || 0), 0);
    const totalCompleted = flows.reduce((s, f) => s + (f.completed_count || 0), 0);
    const rate = totalSent > 0 ? ((totalCompleted / totalSent) * 100).toFixed(1) : '0.0';
    return { total, totalSent, totalCompleted, rate };
  }, [flows]);

  const kpis = [
    { label: 'Total Flows', value: stats.total, icon: GitBranch, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: 'synced from Meta' },
    { label: 'Total Sent', value: stats.totalSent, icon: Send, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', sub: 'flow messages sent' },
    { label: 'Completed', value: stats.totalCompleted, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', sub: 'submissions received' },
    { label: 'Completion Rate', value: `${stats.rate}%`, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', sub: 'overall completion' },
  ];

  const Skel = ({ h = 'h-32' }) => <div className={`bg-white rounded-xl border border-surface-200 ${h} animate-pulse`} />;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">WhatsApp Flows</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            Manage and send interactive WhatsApp Flows
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/portal/flows/new/builder')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Build New Flow
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Meta'}
          </button>
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
              <p className="text-[22px] font-extrabold text-surface-900 tracking-tight leading-none">{k.value}</p>
              <p className="text-[11px] text-surface-400 mt-1.5 font-medium">{k.label}</p>
              <p className="text-[10px] text-surface-300 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter Row: Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up">
        <div className="flex-1" />
        <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search flows..."
            className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none" />
        </div>
      </div>

      {/* ── Flow Cards Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skel key={i} h="h-48" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 py-16 text-center animate-fade-in-up">
          <GitBranch className="w-8 h-8 text-surface-300 mx-auto mb-2" />
          <p className="text-[13px] text-surface-500 font-medium">
            {search ? 'No flows match your search' : 'No flows synced yet'}
          </p>
          <p className="text-[11px] text-surface-400 mt-1">
            {search ? 'Try adjusting your search term' : 'Click Sync from Meta to fetch your WhatsApp Flows'}
          </p>
          {!search && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync from Meta
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map((flow, idx) => {
              const id = flow._id || flow.id;
              const status = STATUS_STYLES[flow.status] || STATUS_STYLES.DRAFT;
              const isExpanded = expandedId === id;
              const subs = submissions[id] || [];
              const isLoadingSubs = loadingSubs[id];

              return (
                <div
                  key={id}
                  className={`bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-card-hover transition-all duration-200 animate-fade-in-up ${isExpanded ? 'md:col-span-2 xl:col-span-3' : ''}`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {/* Card header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-surface-50/60 transition-colors"
                    onClick={() => handleExpand(flow)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="text-[13px] font-semibold text-surface-900 truncate">{flow.name}</h3>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${status.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </div>
                        {/* Categories */}
                        {flow.categories && flow.categories.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap mb-2">
                            {flow.categories.map((cat, ci) => (
                              <span key={ci} className="px-1.5 py-0.5 bg-surface-50 text-surface-500 rounded text-[10px] font-semibold border border-surface-200">
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-[11px] text-surface-400">
                          {flow.last_synced_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Synced {new Date(flow.last_synced_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            {flow.sent_count || 0} sent
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {flow.completed_count || 0} completed
                          </span>
                        </div>
                      </div>
                      <button className="p-1 text-surface-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* ── Quick Action Buttons (always visible) ── */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-100" onClick={(e) => e.stopPropagation()}>
                      {/* DRAFT actions */}
                      {flow.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => navigate(`/portal/flows/${id}/builder`)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold rounded-lg transition-colors"
                          >
                            <Layers className="w-3 h-3" />
                            Edit Flow
                          </button>
                          <button
                            onClick={() => handlePublish(flow)}
                            disabled={publishing === id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {publishing === id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                            Publish
                          </button>
                          <div className="flex-1" />
                          <button
                            onClick={() => handleDelete(flow)}
                            disabled={deleting === id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-red-500 hover:bg-red-50 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deleting === id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            Delete
                          </button>
                        </>
                      )}
                      {/* PUBLISHED actions */}
                      {flow.status === 'PUBLISHED' && (
                        <>
                          <button
                            onClick={() => openSendModal(flow)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-semibold rounded-lg transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            Send
                          </button>
                          <button
                            onClick={() => handleClone(flow)}
                            disabled={cloning === id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {cloning === id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                            Clone & Edit
                          </button>
                          <div className="flex-1" />
                          <button
                            onClick={() => handleDeprecate(flow)}
                            disabled={deprecating === id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-amber-600 hover:bg-amber-50 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deprecating === id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArchiveX className="w-3 h-3" />}
                            Deprecate
                          </button>
                        </>
                      )}
                      {/* DEPRECATED — no actions */}
                      {flow.status === 'DEPRECATED' && (
                        <span className="text-[11px] text-surface-400 italic">Deprecated — no actions available</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-surface-100 p-4 bg-surface-50/30 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="text-[13px] font-bold text-surface-900">Flow Details</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {flow.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/portal/flows/${id}/builder`);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
                              >
                                <Layers className="w-3 h-3" />
                                Visual Builder
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setJsonModal(flow);
                                  setFlowJSON('');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
                              >
                                <Upload className="w-3 h-3" />
                                Upload JSON
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePublish(flow); }}
                                disabled={publishing === id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                              >
                                {publishing === id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                                Publish
                              </button>
                            </>
                          )}
                          {flow.status === 'PUBLISHED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openSendModal(flow);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              Send Flow
                            </button>
                          )}
                          {flow.status === 'DRAFT' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(flow); }}
                              disabled={deleting === id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                              {deleting === id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Detail info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: 'Flow ID', value: flow.flow_id || flow.meta_id || id },
                          { label: 'Status', value: flow.status || 'DRAFT' },
                          { label: 'Created', value: flow.created_at ? new Date(flow.created_at).toLocaleDateString() : '-' },
                          { label: 'Updated', value: flow.updated_at ? new Date(flow.updated_at).toLocaleDateString() : '-' },
                        ].map((d) => (
                          <div key={d.label} className="bg-white rounded-lg border border-surface-200 p-3">
                            <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">{d.label}</p>
                            <p className="text-[12px] font-semibold text-surface-900 mt-1 truncate">{d.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Submissions */}
                      <div>
                        <h4 className="text-[12px] font-bold text-surface-700 mb-2">Submissions</h4>
                        {isLoadingSubs ? (
                          <div className="flex items-center gap-2 py-4 justify-center text-surface-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-[12px]">Loading submissions...</span>
                          </div>
                        ) : subs.length === 0 ? (
                          <p className="text-[12px] text-surface-400 py-3 text-center">No submissions yet</p>
                        ) : (
                          <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-surface-100 bg-surface-50/60">
                                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Phone</th>
                                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-100">
                                {subs.slice(0, 10).map((sub, si) => (
                                  <tr key={si} className="hover:bg-surface-50/60 transition-colors">
                                    <td className="px-3 py-2 text-[12px] text-surface-900 font-medium">{sub.phone || sub.wa_id || '-'}</td>
                                    <td className="px-3 py-2 text-[12px] text-surface-600">{sub.status || 'completed'}</td>
                                    <td className="px-3 py-2 text-[12px] text-surface-400">{sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-surface-200 px-5 py-3">
              <p className="text-[12px] text-surface-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`dot-${i}`} className="px-2 text-[12px] text-surface-400">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition-colors ${
                          page === p
                            ? 'bg-brand-600 text-white'
                            : 'text-surface-600 hover:bg-surface-50 border border-surface-200'
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Create Flow Modal ── */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCreateModal(false)}>
          <div className="bg-white rounded-xl border border-surface-200 shadow-2xl w-full max-w-md animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <div>
                <h3 className="text-[14px] font-bold text-surface-900">Create New Flow</h3>
                <p className="text-[11px] text-surface-400 mt-0.5">Create a WhatsApp Flow on Meta</p>
              </div>
              <button onClick={() => setCreateModal(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Flow Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Customer Feedback Survey"
                  className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                >
                  <option value="">Select a category (optional)</option>
                  <option value="SIGN_UP">Sign Up</option>
                  <option value="SIGN_IN">Sign In</option>
                  <option value="APPOINTMENT_BOOKING">Appointment Booking</option>
                  <option value="LEAD_GENERATION">Lead Generation</option>
                  <option value="CONTACT_US">Contact Us</option>
                  <option value="CUSTOMER_SUPPORT">Customer Support</option>
                  <option value="SURVEY">Survey</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-[11px] text-blue-700 font-medium">After creating, use the Visual Builder to design screens and form fields, or upload raw JSON. Publish when ready.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-100">
              <button onClick={() => setCreateModal(false)} className="px-4 py-2 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {creating ? 'Creating...' : 'Create Flow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload JSON Modal ── */}
      {jsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setJsonModal(null)}>
          <div className="bg-white rounded-xl border border-surface-200 shadow-2xl w-full max-w-lg animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <div>
                <h3 className="text-[14px] font-bold text-surface-900">Upload Flow JSON</h3>
                <p className="text-[11px] text-surface-400 mt-0.5">{jsonModal.name}</p>
              </div>
              <button onClick={() => setJsonModal(null)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Flow JSON *</label>
                <textarea
                  value={flowJSON}
                  onChange={(e) => setFlowJSON(e.target.value)}
                  placeholder='{"version":"3.0","screens":[...]}'
                  rows={12}
                  className="w-full bg-surface-900 text-emerald-400 border border-surface-700 rounded-lg px-3 py-2 text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all resize-none"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-[11px] text-amber-700 font-medium">Paste the WhatsApp Flow JSON that defines your screens, components, and actions. Refer to Meta's Flow Builder documentation for the schema.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-100">
              <button onClick={() => setJsonModal(null)} className="px-4 py-2 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors">Cancel</button>
              <button onClick={handleUploadJSON} disabled={uploadingJSON} className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                {uploadingJSON ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploadingJSON ? 'Uploading...' : 'Upload JSON'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Flow Modal ── */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSendModal(null)}>
          <div
            className="bg-white rounded-xl border border-surface-200 shadow-2xl w-full max-w-lg animate-fade-in-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-[14px] font-bold text-surface-900">Send Flow</h3>
                <p className="text-[11px] text-surface-400 mt-0.5">{sendModal.name}</p>
              </div>
              <button onClick={() => setSendModal(null)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">

              {/* ── Audience Mode Tabs ── */}
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-2">Send To</label>
                <div className="bg-surface-100 rounded-lg p-0.5 flex gap-0.5">
                  {[
                    { key: 'single', label: 'Single', icon: Phone },
                    { key: 'tags', label: 'By Tags', icon: Tag },
                    { key: 'selected', label: 'Selected', icon: UserCheck },
                    { key: 'all', label: 'All Contacts', icon: Users },
                  ].map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setSendForm((f) => ({ ...f, mode: m.key }))}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold transition-all ${
                        sendForm.mode === m.key
                          ? 'bg-white text-surface-900 shadow-sm'
                          : 'text-surface-500 hover:text-surface-700'
                      }`}
                    >
                      <m.icon className="w-3 h-3" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Single phone input ── */}
              {sendForm.mode === 'single' && (
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
                    <input
                      type="text"
                      value={sendForm.phone}
                      onChange={(e) => setSendForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="919876543210"
                      className="w-full bg-white border border-surface-200 rounded-lg pl-9 pr-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* ── Tags selection ── */}
              {sendForm.mode === 'tags' && (
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Select Tags *</label>
                  {availableTags.length === 0 ? (
                    <p className="text-[12px] text-surface-400 py-3 text-center bg-surface-50 rounded-lg">No tags found. Tag your contacts first.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-surface-50 rounded-lg border border-surface-200">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                            sendForm.selectedTags.includes(tag)
                              ? 'bg-brand-50 text-brand-700 border-brand-200'
                              : 'bg-white text-surface-600 border-surface-200 hover:border-brand-200'
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                  {sendForm.selectedTags.length > 0 && (
                    <p className="text-[11px] text-brand-600 mt-1.5 font-medium">{sendForm.selectedTags.length} tag{sendForm.selectedTags.length > 1 ? 's' : ''} selected</p>
                  )}
                </div>
              )}

              {/* ── Selected contacts ── */}
              {sendForm.mode === 'selected' && (
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Search & Select Contacts *</label>
                  <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all mb-2">
                    <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                    <input
                      value={contactSearch}
                      onChange={(e) => searchContacts(e.target.value)}
                      placeholder="Search by name or phone..."
                      className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none"
                    />
                  </div>
                  {/* Search results */}
                  {contactSearch && (
                    <div className="bg-surface-50 border border-surface-200 rounded-lg max-h-36 overflow-y-auto">
                      {loadingContacts ? (
                        <div className="flex items-center gap-2 py-3 justify-center text-surface-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[11px]">Searching...</span>
                        </div>
                      ) : contactsForSelect.length === 0 ? (
                        <p className="text-[11px] text-surface-400 py-3 text-center">No contacts found</p>
                      ) : (
                        contactsForSelect.map((c) => {
                          const isSelected = sendForm.selectedPhones.some((p) => p.phone === c.phone);
                          return (
                            <button
                              key={c._id}
                              onClick={() => toggleSelectedPhone(c.phone, c.name || c.wa_name || c.phone)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white transition-colors border-b border-surface-100 last:border-0 ${isSelected ? 'bg-brand-50' : ''}`}
                            >
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-surface-900 truncate">{c.name || c.wa_name || c.phone}</p>
                                <p className="text-[11px] text-surface-400">{c.phone}</p>
                              </div>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                  {/* Selected chips */}
                  {sendForm.selectedPhones.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {sendForm.selectedPhones.map((p) => (
                        <span
                          key={p.phone}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-[11px] font-semibold"
                        >
                          {p.name || p.phone}
                          <button onClick={() => toggleSelectedPhone(p.phone)} className="hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── All contacts warning ── */}
              {sendForm.mode === 'all' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-[11px] text-amber-700 font-medium">This will send the flow to all contacts with an active 24-hour conversation window. Opted-out contacts are automatically excluded.</p>
                </div>
              )}

              {/* ── Message fields ── */}
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Body Text *</label>
                <textarea
                  value={sendForm.body}
                  onChange={(e) => setSendForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Message body shown with the flow..."
                  rows={3}
                  className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">CTA Button Text</label>
                  <input
                    type="text"
                    value={sendForm.cta}
                    onChange={(e) => setSendForm((f) => ({ ...f, cta: e.target.value }))}
                    placeholder="Open Flow"
                    className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Footer Text</label>
                  <input
                    type="text"
                    value={sendForm.footer}
                    onChange={(e) => setSendForm((f) => ({ ...f, footer: e.target.value }))}
                    placeholder="Optional footer"
                    className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Header Text</label>
                <input
                  type="text"
                  value={sendForm.header}
                  onChange={(e) => setSendForm((f) => ({ ...f, header: e.target.value }))}
                  placeholder="Optional header"
                  className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-surface-100 sticky bottom-0 bg-white">
              <p className="text-[11px] text-surface-400">
                {sendForm.mode === 'single' && 'Sending to 1 contact'}
                {sendForm.mode === 'tags' && `${sendForm.selectedTags.length} tag${sendForm.selectedTags.length !== 1 ? 's' : ''} selected`}
                {sendForm.mode === 'selected' && `${sendForm.selectedPhones.length} contact${sendForm.selectedPhones.length !== 1 ? 's' : ''} selected`}
                {sendForm.mode === 'all' && 'Sending to all contacts'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSendModal(null)}
                  className="px-4 py-2 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sending ? 'Sending...' : `Send Flow`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
