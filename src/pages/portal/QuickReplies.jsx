import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Zap, Plus, Search, Trash2, Edit3, Copy, RefreshCw,
  MessageSquare, Hash, Star, ChevronLeft, ChevronRight, Loader2,
  Info, X, HelpCircle, MessageCircle, Keyboard,
} from 'lucide-react';
import { getPageNumbers } from '../../utils/pagination';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'general', label: 'General' },
  { key: 'greeting', label: 'Greeting' },
  { key: 'support', label: 'Support' },
  { key: 'sales', label: 'Sales' },
  { key: 'follow_up', label: 'Follow Up' },
  { key: 'closing', label: 'Closing' },
];

const CAT_COLORS = {
  general: 'bg-surface-100 text-surface-600 border-surface-200',
  greeting: 'bg-blue-50 text-blue-700 border-blue-200',
  support: 'bg-amber-50 text-amber-700 border-amber-200',
  sales: 'bg-brand-50 text-brand-700 border-brand-200',
  follow_up: 'bg-violet-50 text-violet-700 border-violet-200',
  closing: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function QuickReplies() {
  const navigate = useNavigate();
  const [showGuide, setShowGuide] = useState(true);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [summary, setSummary] = useState({});

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true); else setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (category !== 'all') params.category = category;
      if (search) params.search = search;
      const { data } = await api.get('/quick-replies', { params });
      const d = data?.data || data;
      setItems(d.quick_replies || []);
      setPagination({ page: d.page || 1, pages: d.pages || 1, total: d.total || 0 });
      setSummary(d.summary || {});
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load quick replies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, category, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quick reply?')) return;
    try {
      await api.delete(`/quick-replies/${id}`);
      toast.success('Deleted');
      fetchData(true);
    } catch { toast.error('Failed to delete'); }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const totalReplies = Object.values(summary).reduce((a, s) => a + s.count, 0);
  const totalUses = Object.values(summary).reduce((a, s) => a + s.total_uses, 0);
  const pageNumbers = getPageNumbers(pagination.page, pagination.pages);

  const kpis = [
    { label: 'Total Replies', value: totalReplies, icon: Zap, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100', sub: 'saved templates' },
    { label: 'Total Uses', value: totalUses, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', sub: 'times used' },
    { label: 'Categories', value: Object.keys(summary).length, icon: Hash, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', sub: 'active categories' },
    { label: 'This Page', value: items.length, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: `of ${pagination.total}` },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Quick Replies</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Saved message templates for fast responses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(true)} disabled={refreshing}
            className="p-2 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => navigate('/portal/quick-replies/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Reply
          </button>
        </div>
      </div>

      {/* ── How It Works Guide ── */}
      {showGuide && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 overflow-hidden animate-fade-in-up">
          <div className="flex items-start justify-between p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-surface-900 mb-2">How Quick Replies Work</p>
                <div className="space-y-2 text-[12px] text-surface-600 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <Keyboard className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p><span className="font-semibold text-surface-800">In Live Chat</span> — When chatting with a customer, type <span className="font-mono bg-surface-100 text-surface-700 px-1 py-0.5 rounded text-[11px]">/shortcut</span> in the message composer to quickly insert a saved reply. For example, typing <span className="font-mono bg-surface-100 text-surface-700 px-1 py-0.5 rounded text-[11px]">/hello</span> inserts your greeting template.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p><span className="font-semibold text-surface-800">Save Time</span> — Create templates for your most common responses: greetings, FAQs, support steps, closing messages. Each use is tracked so you can see which replies are most popular.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p><span className="font-semibold text-surface-800">Categories</span> — Organize replies by type (Greeting, Support, Sales, etc.) to find them quickly when you need them.</p>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => setShowGuide(false)} className="p-1 hover:bg-amber-100 rounded-lg transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5 text-surface-400" />
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {/* ── Filter Row: Tabs + Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up">
        <div className="flex items-center bg-surface-100 rounded-lg p-0.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => { setCategory(c.key); setPage(1); }}
              className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${
                category === c.key ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
              }`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search replies..."
            className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none" />
        </div>
      </div>

      {/* ── Quick Replies Table ── */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-bold text-surface-900">All Quick Replies</h3>
            <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{pagination.total}</span>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-surface-50 rounded-lg animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Zap className="w-8 h-8 text-surface-300 mx-auto mb-3" />
            <p className="text-[13px] text-surface-500 font-medium">No quick replies yet</p>
            <p className="text-[11px] text-surface-400 mt-1">Create your first reply template to speed up conversations</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {items.map((item) => (
              <div key={item._id} className="flex items-start gap-4 px-5 py-4 hover:bg-surface-50/50 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[13px] font-bold text-surface-900 truncate">{item.title}</p>
                    {item.shortcut && (
                      <span className="text-[10px] font-mono bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded">/{item.shortcut}</span>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${CAT_COLORS[item.category] || CAT_COLORS.general}`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[12px] text-surface-500 line-clamp-2 leading-relaxed">{item.message}</p>
                  <p className="text-[10px] text-surface-300 mt-1.5">Used {item.use_count || 0} times</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => handleCopy(item.message)} title="Copy message"
                    className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => navigate(`/portal/quick-replies/${item._id}/edit`)} title="Edit"
                    className="p-1.5 rounded-lg text-surface-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item._id)} title="Delete"
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
            <span className="text-[11px] text-surface-400">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
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
    </div>
  );
}
