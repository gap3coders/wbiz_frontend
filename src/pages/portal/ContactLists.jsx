import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  List, Plus, Search, Trash2, Edit3, RefreshCw, Users,
  ChevronLeft, ChevronRight, Loader2, X, Save,
} from 'lucide-react';
import { getPageNumbers } from '../../utils/pagination';

const LIST_COLORS = ['#25D366', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#6366F1'];

export default function ContactLists() {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#25D366' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true); else setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const { data } = await api.get('/contact-lists', { params });
      const d = data?.data || data;
      setLists(d.lists || []);
      setPagination({ page: d.page || 1, pages: d.pages || 1, total: d.total || 0 });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load contact lists');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setForm({ name: '', description: '', color: '#25D366' }); setEditId(null); setShowCreate(true); };
  const openEdit = (list) => { setForm({ name: list.name, description: list.description || '', color: list.color || '#25D366' }); setEditId(list._id); setShowCreate(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/contact-lists/${editId}`, form);
        toast.success('List updated');
      } else {
        await api.post('/contact-lists', form);
        toast.success('List created');
      }
      setShowCreate(false);
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact list?')) return;
    try {
      await api.delete(`/contact-lists/${id}`);
      toast.success('Deleted');
      fetchData(true);
    } catch { toast.error('Failed to delete'); }
  };

  const totalContacts = lists.reduce((a, l) => a + (l.contact_count || 0), 0);
  const pageNumbers = getPageNumbers(pagination.page, pagination.pages);

  const kpis = [
    { label: 'Total Lists', value: lists.length, icon: List, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100', sub: 'contact groups' },
    { label: 'Total Contacts', value: totalContacts, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: 'across all lists' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Contact Lists</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <List className="w-3.5 h-3.5" /> Group contacts for targeted campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(true)} disabled={refreshing}
            className="p-2 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> New List
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className={`bg-white rounded-xl border ${k.border} p-4 hover:shadow-card-hover transition-shadow animate-fade-in-up stagger-${i + 1}`}>
            <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon className={`w-[18px] h-[18px] ${k.color}`} />
            </div>
            <p className="text-[22px] font-extrabold text-surface-900 leading-none">{k.value}</p>
            <p className="text-[11px] text-surface-400 font-medium mt-1">{k.label}</p>
            <p className="text-[10px] text-surface-300">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Row: Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up">
        <div className="flex-1" />
        <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search lists..."
            className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none" />
        </div>
      </div>

      {/* List table */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-bold text-surface-900">All Lists</h3>
            <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{pagination.total}</span>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-surface-50 rounded-lg animate-pulse" />)}
          </div>
        ) : lists.length === 0 ? (
          <div className="py-16 text-center">
            <List className="w-8 h-8 text-surface-300 mx-auto mb-3" />
            <p className="text-[13px] text-surface-500 font-medium">No contact lists yet</p>
            <p className="text-[11px] text-surface-400 mt-1">Create a list to group contacts for campaigns</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {lists.map((list) => (
              <div key={list._id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50/50 transition-colors group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${list.color || '#25D366'}15` }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: list.color || '#25D366' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-surface-900 truncate">{list.name}</p>
                  {list.description && <p className="text-[11px] text-surface-400 truncate">{list.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-surface-500 bg-surface-100 px-2.5 py-1 rounded-lg">
                    <Users className="w-3 h-3 inline mr-1" />{list.contact_count || 0}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => openEdit(list)} title="Edit"
                    className="p-1.5 rounded-lg text-surface-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(list._id)} title="Delete"
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
            <span className="text-[11px] text-surface-400">Page {pagination.page} of {pagination.pages}</span>
            <div className="flex items-center gap-1">
              <button disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {pageNumbers.map((p, i) =>
                p === '...' ? <span key={`e${i}`} className="px-1 text-surface-300 text-[11px]">...</span> : (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                      p === pagination.page ? 'bg-brand-600 text-white' : 'border border-surface-200 text-surface-600 hover:bg-surface-50'
                    }`}>{p}</button>
                )
              )}
              <button disabled={pagination.page >= pagination.pages} onClick={() => setPage(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h3 className="text-[15px] font-bold text-surface-900">{editId ? 'Edit List' : 'New Contact List'}</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. VIP Customers" maxLength={120}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description..." rows={3} maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Color</label>
                <div className="flex items-center gap-2">
                  {LIST_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-surface-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-50/50 border-t border-surface-100 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg border border-surface-200 text-[13px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold rounded-lg text-[13px] shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
