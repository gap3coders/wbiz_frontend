import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  LayoutList, Plus, Trash2, Send, Loader2, Search,
  MousePointerClick, ListChecks, ShoppingBag, Layers, BarChart3,
  Copy, Edit3, ToggleRight, ToggleLeft, RefreshCw, Eye, X, Check,
  ChevronDown, Package, MessageSquare,
} from 'lucide-react';

const TYPE_META = {
  button:       { label: 'Reply Buttons',  icon: MousePointerClick, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100',   dot: 'bg-blue-500' },
  list:         { label: 'List Menu',      icon: ListChecks,        color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100', dot: 'bg-violet-500' },
  product:      { label: 'Product',        icon: ShoppingBag,       color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100',  dot: 'bg-amber-500' },
  product_list: { label: 'Carousel',       icon: Layers,            color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',dot: 'bg-emerald-500' },
  poll:         { label: 'Poll',           icon: BarChart3,         color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-100',   dot: 'bg-cyan-500' },
};

const TYPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'button', label: 'Buttons' },
  { key: 'list', label: 'List' },
  { key: 'product_list', label: 'Carousel' },
  { key: 'product', label: 'Product' },
  { key: 'poll', label: 'Poll' },
];

const emptyButton = { id: '', title: '' };
const emptyRow = { id: '', title: '', description: '' };
const emptySection = { title: '', rows: [{ ...emptyRow }] };

export default function InteractiveMessages() {
  const navigate = useNavigate();

  // ── List state ──
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // ── Create/Edit modal state ──
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [saving, setSaving] = useState(false);

  // ── Form state ──
  const [form, setForm] = useState({
    name: '', description: '', type: 'button',
    header: { type: 'none', text: '', media_url: '' },
    body: '', footer: '',
    buttons: [{ ...emptyButton }],
    list_button_text: 'View Options',
    sections: [{ ...emptySection, rows: [{ ...emptyRow }] }],
    catalog_id: '', product_retailer_ids: [],
    product_sections: [{ title: '', product_items: [{ product_retailer_id: '' }] }],
    poll_question: '', poll_options: ['', ''],
  });

  // ── Send modal ──
  const [sendModal, setSendModal] = useState(null);

  // ── Fetch ──
  const fetchTemplates = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get('/interactive-templates');
      setTemplates(data.data?.templates || []);
    } catch {
      if (!silent) toast.error('Failed to load templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── Filtering ──
  const filtered = useMemo(() => {
    let list = typeFilter === 'all' ? templates : templates.filter((t) => t.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    return list;
  }, [templates, typeFilter, search]);

  // ── KPI counts ──
  const counts = useMemo(() => ({
    total: templates.length,
    button: templates.filter((t) => t.type === 'button').length,
    list: templates.filter((t) => t.type === 'list').length,
    product: templates.filter((t) => t.type === 'product').length,
    product_list: templates.filter((t) => t.type === 'product_list').length,
    poll: templates.filter((t) => t.type === 'poll').length,
  }), [templates]);

  const totalSent = templates.reduce((s, t) => s + (t.times_sent || 0), 0);

  const kpis = [
    { label: 'Total Templates', value: counts.total, icon: LayoutList, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: 'all types' },
    { label: 'Reply Buttons', value: counts.button, icon: MousePointerClick, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', sub: 'quick replies' },
    { label: 'List Menus', value: counts.list, icon: ListChecks, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', sub: 'selection menus' },
    { label: 'Carousels', value: counts.product_list, icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', sub: 'multi-product' },
    { label: 'Polls', value: counts.poll, icon: BarChart3, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', sub: 'voting messages' },
    { label: 'Messages Sent', value: totalSent.toLocaleString(), icon: Send, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100', sub: 'total sent' },
  ];

  // ── Modal helpers ──
  const resetForm = () => setForm({
    name: '', description: '', type: 'button',
    header: { type: 'none', text: '', media_url: '' },
    body: '', footer: '',
    buttons: [{ ...emptyButton }],
    list_button_text: 'View Options',
    sections: [{ ...emptySection, rows: [{ ...emptyRow }] }],
    catalog_id: '', product_retailer_ids: [],
    product_sections: [{ title: '', product_items: [{ product_retailer_id: '' }] }],
    poll_question: '', poll_options: ['', ''],
  });

  const openCreate = () => { resetForm(); setEditing(null); setShowModal(true); };
  const openEdit = (tpl) => {
    setForm({
      name: tpl.name || '',
      description: tpl.description || '',
      type: tpl.type || 'button',
      header: tpl.header || { type: 'none', text: '', media_url: '' },
      body: tpl.body || '',
      footer: tpl.footer || '',
      buttons: tpl.buttons?.length ? tpl.buttons : [{ ...emptyButton }],
      list_button_text: tpl.list_button_text || 'View Options',
      sections: tpl.sections?.length ? tpl.sections : [{ ...emptySection, rows: [{ ...emptyRow }] }],
      catalog_id: tpl.catalog_id || '',
      product_retailer_ids: tpl.product_retailer_ids || [],
      product_sections: tpl.product_sections?.length ? tpl.product_sections : [{ title: '', product_items: [{ product_retailer_id: '' }] }],
      poll_question: tpl.poll_question || '',
      poll_options: tpl.poll_options?.length ? tpl.poll_options : ['', ''],
    });
    setEditing(tpl);
    setShowModal(true);
  };

  // ── CRUD ──
  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    if (!form.body.trim() && form.type !== 'product' && form.type !== 'product_list') return toast.error('Body is required');
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/interactive-templates/${editing._id}`, form);
        toast.success('Template updated');
      } else {
        await api.post('/interactive-templates', form);
        toast.success('Template created');
      }
      setShowModal(false);
      fetchTemplates();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try { await api.delete(`/interactive-templates/${id}`); toast.success('Deleted'); fetchTemplates(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleDuplicate = async (id) => {
    try { await api.post(`/interactive-templates/${id}/duplicate`); toast.success('Duplicated'); fetchTemplates(); }
    catch { toast.error('Failed to duplicate'); }
  };

  const handleToggle = async (tpl) => {
    try { await api.patch(`/interactive-templates/${tpl._id}`, { active: !tpl.active }); fetchTemplates(); }
    catch { toast.error('Failed to toggle'); }
  };

  // ── Button/Section helpers ──
  const updateForm = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const addButton = () => form.buttons.length < 3 && updateForm('buttons', [...form.buttons, { ...emptyButton }]);
  const removeButton = (i) => updateForm('buttons', form.buttons.filter((_, idx) => idx !== i));
  const updateButton = (i, f, v) => updateForm('buttons', form.buttons.map((b, idx) => idx === i ? { ...b, [f]: v } : b));

  const addSection = () => updateForm('sections', [...form.sections, { title: '', rows: [{ ...emptyRow }] }]);
  const removeSection = (i) => form.sections.length > 1 && updateForm('sections', form.sections.filter((_, idx) => idx !== i));
  const updateSection = (i, f, v) => updateForm('sections', form.sections.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  const addRow = (si) => {
    const updated = [...form.sections];
    if (updated[si].rows.length < 10) updated[si].rows = [...updated[si].rows, { ...emptyRow }];
    updateForm('sections', updated);
  };
  const removeRow = (si, ri) => {
    const updated = [...form.sections];
    if (updated[si].rows.length > 1) updated[si].rows = updated[si].rows.filter((_, idx) => idx !== ri);
    updateForm('sections', updated);
  };
  const updateRow = (si, ri, f, v) => {
    const updated = [...form.sections];
    updated[si].rows = updated[si].rows.map((r, idx) => idx === ri ? { ...r, [f]: v } : r);
    updateForm('sections', updated);
  };

  const addPollOption = () => form.poll_options.length < 3 && updateForm('poll_options', [...form.poll_options, '']);
  const removePollOption = (i) => form.poll_options.length > 2 && updateForm('poll_options', form.poll_options.filter((_, idx) => idx !== i));
  const updatePollOption = (i, v) => updateForm('poll_options', form.poll_options.map((o, idx) => idx === i ? v : o));

  const Skel = ({ h = 'h-32' }) => <div className={`bg-white rounded-xl border border-surface-200 ${h} animate-pulse`} />;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Interactive Messages</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <LayoutList className="w-3.5 h-3.5" />
            Create reusable interactive templates — buttons, lists, carousels, polls
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchTemplates(true)} disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" />
            New Template
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{[1,2,3,4,5,6].map((i) => <Skel key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((k, idx) => (
            <div key={k.label}
              className={`bg-white rounded-xl border ${k.border} p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up group`}
              style={{ animationDelay: `${idx * 60}ms` }}>
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
          {TYPE_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setTypeFilter(tab.key)}
              className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${
                typeFilter === tab.key ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
              }`}>
              {tab.label}
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

      {/* ── Templates Table ── */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '180ms' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-bold text-surface-900">Templates</h3>
            <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{filtered.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-14 bg-surface-50 rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <LayoutList className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-[13px] text-surface-500 font-medium">
              {typeFilter === 'all' ? 'No interactive templates yet' : `No ${TYPE_META[typeFilter]?.label || typeFilter} templates`}
            </p>
            <p className="text-[11px] text-surface-400 mt-1">Create your first template to start sending interactive messages</p>
            {typeFilter === 'all' && (
              <button onClick={openCreate}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" /> Create Template
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/60">
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Template</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Type</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Body</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Sent</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Created</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map((tpl) => {
                  const tm = TYPE_META[tpl.type] || TYPE_META.button;
                  const TIcon = tm.icon;
                  return (
                    <tr key={tpl._id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-semibold text-surface-900 truncate max-w-[200px]">{tpl.name}</p>
                        {tpl.description && <p className="text-[11px] text-surface-400 truncate max-w-[200px] mt-0.5">{tpl.description}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tm.bg} ${tm.color} ${tm.border}`}>
                          <TIcon className="w-3 h-3" />
                          {tm.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[12px] text-surface-600 truncate max-w-[220px]">{tpl.body || tpl.poll_question || '—'}</p>
                      </td>
                      <td className="px-5 py-3 text-[13px] font-semibold text-surface-900">{(tpl.times_sent || 0).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleToggle(tpl)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            tpl.active !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-surface-100 text-surface-500 border-surface-200 hover:bg-surface-200'
                          }`}>
                          {tpl.active !== false ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                          {tpl.active !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-surface-500 whitespace-nowrap">
                        {tpl.created_at ? new Date(tpl.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSendModal(tpl)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Send">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(tpl)} className="p-1.5 hover:bg-surface-100 text-surface-600 rounded-lg transition-colors" title="Edit">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDuplicate(tpl._id)} className="p-1.5 hover:bg-surface-100 text-surface-600 rounded-lg transition-colors" title="Duplicate">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(tpl._id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ══════════════════════════════════════════════════════
          CREATE / EDIT MODAL
         ══════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-2xl w-full max-w-2xl mx-4 mb-10 animate-fade-in-up">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h2 className="text-[16px] font-extrabold text-surface-900">
                {editing ? 'Edit Template' : 'Create Interactive Template'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
              {/* Name + Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Template Name *</label>
                  <input type="text" value={form.name} onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="e.g. Order Confirmation" className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Description</label>
                  <input type="text" value={form.description} onChange={(e) => updateForm('description', e.target.value)}
                    placeholder="Short description..." className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                </div>
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-2">Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Object.entries(TYPE_META).map(([key, meta]) => (
                    <button key={key} onClick={() => updateForm('type', key)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        form.type === key ? 'border-brand-500 bg-brand-50/30' : 'border-surface-200 bg-white hover:border-surface-300'
                      }`}>
                      <meta.icon className={`w-5 h-5 mx-auto mb-1.5 ${form.type === key ? 'text-brand-600' : 'text-surface-400'}`} />
                      <p className={`text-[11px] font-bold ${form.type === key ? 'text-brand-700' : 'text-surface-700'}`}>{meta.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Body + Header + Footer (for button/list/poll) */}
              {['button', 'list', 'poll'].includes(form.type) && (
                <>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Header (optional)</label>
                    <input type="text" value={form.header?.text || ''} onChange={(e) => updateForm('header', { ...form.header, type: 'text', text: e.target.value })}
                      placeholder="Header text" maxLength={60} className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">
                      {form.type === 'poll' ? 'Poll Question *' : 'Body *'}
                    </label>
                    <textarea value={form.type === 'poll' ? form.poll_question : form.body}
                      onChange={(e) => form.type === 'poll' ? updateForm('poll_question', e.target.value) : updateForm('body', e.target.value)}
                      placeholder={form.type === 'poll' ? 'What would you like to vote on?' : 'Your message text here...'} rows={3} maxLength={1024}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Footer (optional)</label>
                    <input type="text" value={form.footer} onChange={(e) => updateForm('footer', e.target.value)}
                      placeholder="Footer text" maxLength={60} className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                </>
              )}

              {/* ── Button type fields ── */}
              {form.type === 'button' && (
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Reply Buttons (max 3)</label>
                  <p className="text-[10px] text-surface-400 mb-2">When tapped, button text is sent back as a reply</p>
                  <div className="space-y-2">
                    {form.buttons.map((btn, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" value={btn.title} onChange={(e) => updateButton(i, 'title', e.target.value)}
                          placeholder={`Button ${i + 1} text`} maxLength={20}
                          className="flex-1 px-3.5 py-2 rounded-lg border border-surface-200 text-[13px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                        {form.buttons.length > 1 && (
                          <button onClick={() => removeButton(i)} className="p-2 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {form.buttons.length < 3 && (
                      <button onClick={addButton} className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Button
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── List type fields ── */}
              {form.type === 'list' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Menu Button Text</label>
                    <input type="text" value={form.list_button_text} onChange={(e) => updateForm('list_button_text', e.target.value)}
                      placeholder="View Options" maxLength={20}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  {form.sections.map((section, si) => (
                    <div key={si} className="p-4 bg-surface-50/80 rounded-xl border border-surface-100">
                      <div className="flex items-center justify-between mb-3">
                        <input type="text" value={section.title} onChange={(e) => updateSection(si, 'title', e.target.value)}
                          placeholder={`Section ${si + 1} title`} maxLength={24}
                          className="px-3 py-1.5 rounded-lg border border-surface-200 text-[12px] font-semibold focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                        {form.sections.length > 1 && (
                          <button onClick={() => removeSection(si)} className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {section.rows.map((row, ri) => (
                          <div key={ri} className="flex items-start gap-2">
                            <div className="flex-1 space-y-1">
                              <input type="text" value={row.title} onChange={(e) => updateRow(si, ri, 'title', e.target.value)}
                                placeholder="Row title" maxLength={24}
                                className="w-full px-3 py-1.5 rounded-lg border border-surface-200 text-[12px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                              <input type="text" value={row.description} onChange={(e) => updateRow(si, ri, 'description', e.target.value)}
                                placeholder="Description (optional)" maxLength={72}
                                className="w-full px-3 py-1.5 rounded-lg border border-surface-200 text-[11px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                            </div>
                            {section.rows.length > 1 && (
                              <button onClick={() => removeRow(si, ri)} className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors mt-1">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {section.rows.length < 10 && (
                          <button onClick={() => addRow(si)} className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                            <Plus className="w-3 h-3" /> Add Row
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={addSection} className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Section
                  </button>
                </div>
              )}

              {/* ── Product type fields ── */}
              {form.type === 'product' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                    <p className="text-[12px] text-amber-800 flex items-start gap-2">
                      <ShoppingBag className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>Single product message requires a Facebook Catalog connected to your WABA. Enter the catalog ID and product retailer ID below.</span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Catalog ID *</label>
                    <input type="text" value={form.catalog_id} onChange={(e) => updateForm('catalog_id', e.target.value)}
                      placeholder="Your Facebook Catalog ID"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Product Retailer ID *</label>
                    <input type="text" value={form.product_retailer_ids[0] || ''} onChange={(e) => updateForm('product_retailer_ids', [e.target.value])}
                      placeholder="Product SKU / retailer ID"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Body (optional)</label>
                    <textarea value={form.body} onChange={(e) => updateForm('body', e.target.value)}
                      placeholder="Additional message text..." rows={2}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Footer (optional)</label>
                    <input type="text" value={form.footer} onChange={(e) => updateForm('footer', e.target.value)}
                      placeholder="Footer text" maxLength={60}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                </div>
              )}

              {/* ── Carousel (product_list) type fields ── */}
              {form.type === 'product_list' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/50 border border-emerald-200/60 rounded-xl">
                    <p className="text-[12px] text-emerald-800 flex items-start gap-2">
                      <Layers className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>Multi-product carousel message. Add product sections with items from your Facebook Catalog. Customers can browse and select products inline.</span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Catalog ID *</label>
                    <input type="text" value={form.catalog_id} onChange={(e) => updateForm('catalog_id', e.target.value)}
                      placeholder="Your Facebook Catalog ID"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Header *</label>
                    <input type="text" value={form.header?.text || ''} onChange={(e) => updateForm('header', { ...form.header, type: 'text', text: e.target.value })}
                      placeholder="Browse our collection" maxLength={60}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Body *</label>
                    <textarea value={form.body} onChange={(e) => updateForm('body', e.target.value)}
                      placeholder="Check out these products..." rows={2}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none" />
                  </div>
                  {form.product_sections.map((ps, psi) => (
                    <div key={psi} className="p-4 bg-surface-50/80 rounded-xl border border-surface-100">
                      <div className="flex items-center justify-between mb-3">
                        <input type="text" value={ps.title} onChange={(e) => {
                          const updated = [...form.product_sections];
                          updated[psi].title = e.target.value;
                          updateForm('product_sections', updated);
                        }} placeholder={`Section ${psi + 1} title`} maxLength={24}
                          className="px-3 py-1.5 rounded-lg border border-surface-200 text-[12px] font-semibold focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                        {form.product_sections.length > 1 && (
                          <button onClick={() => updateForm('product_sections', form.product_sections.filter((_, i) => i !== psi))}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {ps.product_items.map((item, ii) => (
                          <div key={ii} className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-surface-400 flex-shrink-0" />
                            <input type="text" value={item.product_retailer_id} onChange={(e) => {
                              const updated = [...form.product_sections];
                              updated[psi].product_items[ii].product_retailer_id = e.target.value;
                              updateForm('product_sections', updated);
                            }} placeholder="Product retailer ID (SKU)"
                              className="flex-1 px-3 py-1.5 rounded-lg border border-surface-200 text-[12px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                            {ps.product_items.length > 1 && (
                              <button onClick={() => {
                                const updated = [...form.product_sections];
                                updated[psi].product_items = updated[psi].product_items.filter((_, i) => i !== ii);
                                updateForm('product_sections', updated);
                              }} className="p-1.5 text-surface-400 hover:text-red-600">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => {
                          const updated = [...form.product_sections];
                          updated[psi].product_items = [...updated[psi].product_items, { product_retailer_id: '' }];
                          updateForm('product_sections', updated);
                        }} className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                          <Plus className="w-3 h-3" /> Add Product
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => updateForm('product_sections', [...form.product_sections, { title: '', product_items: [{ product_retailer_id: '' }] }])}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Section
                  </button>
                </div>
              )}

              {/* ── Poll type fields ── */}
              {form.type === 'poll' && (
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Poll Options (2-3)</label>
                  <p className="text-[10px] text-surface-400 mb-2">Sent as reply buttons — customers tap to vote</p>
                  <div className="space-y-2">
                    {form.poll_options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-surface-400 w-5">{i + 1}.</span>
                        <input type="text" value={opt} onChange={(e) => updatePollOption(i, e.target.value)}
                          placeholder={`Option ${i + 1}`} maxLength={20}
                          className="flex-1 px-3.5 py-2 rounded-lg border border-surface-200 text-[13px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                        {form.poll_options.length > 2 && (
                          <button onClick={() => removePollOption(i)} className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {form.poll_options.length < 3 && (
                      <button onClick={addPollOption} className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Option
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-100 bg-surface-50/50">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-[13px] font-semibold text-surface-600 hover:bg-surface-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editing ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SEND MODAL (quick send from list)
         ══════════════════════════════════════════════════════ */}
      {sendModal && (
        <SendTemplateModal
          template={sendModal}
          onClose={() => setSendModal(null)}
          onSent={() => { setSendModal(null); fetchTemplates(); }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   SendTemplateModal — pick contacts & send
   ──────────────────────────────────────────────────────── */
function SendTemplateModal({ template, onClose, onSent }) {
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const buildInteractive = () => {
    const t = template;
    if (t.type === 'poll') {
      // Polls are sent as button messages
      return {
        type: 'button',
        body: { text: t.poll_question || t.body || '' },
        ...(t.header?.text ? { header: { type: 'text', text: t.header.text } } : {}),
        ...(t.footer ? { footer: { text: t.footer } } : {}),
        action: {
          buttons: (t.poll_options || []).filter(Boolean).map((o, i) => ({
            type: 'reply', reply: { id: `poll_${i}`, title: o.slice(0, 20) },
          })),
        },
      };
    }
    if (t.type === 'product') {
      return {
        type: 'product',
        ...(t.body ? { body: { text: t.body } } : {}),
        ...(t.footer ? { footer: { text: t.footer } } : {}),
        action: {
          catalog_id: t.catalog_id,
          product_retailer_id: t.product_retailer_ids?.[0] || '',
        },
      };
    }
    if (t.type === 'product_list') {
      return {
        type: 'product_list',
        header: { type: 'text', text: t.header?.text || '' },
        body: { text: t.body || '' },
        ...(t.footer ? { footer: { text: t.footer } } : {}),
        action: {
          catalog_id: t.catalog_id,
          sections: (t.product_sections || []).map((s) => ({
            title: s.title,
            product_items: s.product_items.filter((i) => i.product_retailer_id).map((i) => ({ product_retailer_id: i.product_retailer_id })),
          })),
        },
      };
    }
    // button / list
    const interactive = { type: t.type };
    if (t.body) interactive.body = { text: t.body };
    if (t.header?.text) interactive.header = { type: 'text', text: t.header.text };
    if (t.footer) interactive.footer = { text: t.footer };
    if (t.type === 'button') {
      interactive.action = {
        buttons: (t.buttons || []).filter((b) => b.title).map((b, i) => ({
          type: 'reply', reply: { id: b.id || `btn_${i}`, title: b.title.slice(0, 20) },
        })),
      };
    } else {
      interactive.action = {
        button: t.list_button_text || 'Options',
        sections: (t.sections || []).map((s, si) => ({
          title: s.title || `Section ${si + 1}`,
          rows: s.rows.filter((r) => r.title).map((r, ri) => ({
            id: r.id || `row_${si}_${ri}`, title: r.title.slice(0, 24), description: (r.description || '').slice(0, 72),
          })),
        })).filter((s) => s.rows.length > 0),
      };
    }
    return interactive;
  };

  const handleSend = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return toast.error('Enter a phone number');
    setSending(true);
    try {
      const interactive = buildInteractive();
      await api.post('/messaging/interactive', { phone: cleanPhone, interactive });
      // Increment sent count
      try { await api.patch(`/interactive-templates/${template._id}`, { times_sent: (template.times_sent || 0) + 1, last_sent_at: new Date() }); } catch {}
      toast.success('Interactive message sent!');
      onSent();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send');
    } finally { setSending(false); }
  };

  const tm = TYPE_META[template.type] || TYPE_META.button;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-surface-200 shadow-2xl w-full max-w-md mx-4 animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div>
            <h2 className="text-[15px] font-extrabold text-surface-900">Send Template</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${tm.bg} ${tm.color} ${tm.border} border`}>
                <tm.icon className="w-3 h-3" /> {tm.label}
              </span>
              <span className="text-[12px] text-surface-500">{template.name}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-surface-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Phone Number *</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 919876543210"
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
            <p className="text-[10px] text-surface-400 mt-1">Include country code without + sign</p>
          </div>
          {/* Preview snippet */}
          <div className="bg-surface-50 rounded-xl border border-surface-100 p-3">
            <p className="text-[11px] font-semibold text-surface-500 mb-1">Message Preview</p>
            <p className="text-[12px] text-surface-700 leading-relaxed whitespace-pre-wrap">{template.body || template.poll_question || 'Product message'}</p>
            {template.type === 'button' && template.buttons?.some((b) => b.title) && (
              <div className="flex items-center gap-1.5 mt-2">
                {template.buttons.filter((b) => b.title).map((b, i) => (
                  <span key={i} className="text-[10px] font-semibold text-[#0088CC] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">{b.title}</span>
                ))}
              </div>
            )}
            {template.type === 'poll' && (
              <div className="flex items-center gap-1.5 mt-2">
                {(template.poll_options || []).filter(Boolean).map((o, i) => (
                  <span key={i} className="text-[10px] font-semibold text-[#0088CC] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">{o}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-100 bg-surface-50/50">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-semibold text-surface-600 hover:bg-surface-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
