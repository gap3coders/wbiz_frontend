import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Zap, ArrowLeft, Save, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'greeting', label: 'Greeting' },
  { value: 'support', label: 'Support' },
  { value: 'sales', label: 'Sales' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'closing', label: 'Closing' },
];

const emptyForm = {
  title: '',
  shortcut: '',
  message: '',
  category: 'general',
  is_global: true,
};

export default function QuickReplyCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/quick-replies/${id}`)
      .then(({ data }) => {
        const qr = data?.data?.quick_reply || data?.data || {};
        setForm({
          title: qr.title || '',
          shortcut: qr.shortcut || '',
          message: qr.message || '',
          category: qr.category || 'general',
          is_global: qr.is_global !== false,
        });
      })
      .catch(() => toast.error('Failed to load quick reply'))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      return toast.error('Title and message are required');
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/quick-replies/${id}`, form);
        toast.success('Quick reply updated');
      } else {
        await api.post('/quick-replies', form);
        toast.success('Quick reply created');
      }
      navigate('/portal/quick-replies');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/portal/quick-replies')}
          className="flex items-center gap-2 text-[13px] text-surface-400 hover:text-surface-600 font-medium transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Quick Replies
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[20px] font-extrabold text-surface-900 tracking-tight">
              {isEdit ? 'Edit Quick Reply' : 'New Quick Reply'}
            </h1>
            <p className="text-[12px] text-surface-400">Save a reusable message template</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Welcome message" maxLength={120}
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
          </div>

          {/* Shortcut */}
          <div>
            <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Shortcut (optional)</label>
            <div className="flex items-center">
              <span className="px-3 py-2.5 bg-surface-50 border border-r-0 border-surface-200 rounded-l-lg text-[13px] text-surface-400 font-mono">/</span>
              <input type="text" value={form.shortcut} onChange={(e) => update('shortcut', e.target.value.replace(/\s/g, '_').toLowerCase())}
                placeholder="welcome" maxLength={30}
                className="flex-1 px-3.5 py-2.5 rounded-r-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 font-mono bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
            </div>
            <p className="text-[11px] text-surface-400 mt-1">Type /{form.shortcut || 'shortcut'} in chat to quickly insert this reply</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" onClick={() => update('category', cat.value)}
                  className={`px-3 py-[6px] rounded-lg text-[12px] font-semibold border transition-all ${
                    form.category === cat.value
                      ? 'bg-brand-50 text-brand-700 border-brand-200'
                      : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Message *</label>
            <textarea value={form.message} onChange={(e) => update('message', e.target.value)}
              placeholder="Type your quick reply message here..."
              rows={6} maxLength={4096}
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none" />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[11px] text-surface-400">
                Variables: {'{{contact_name}}'}, {'{{business_name}}'}
              </p>
              <p className="text-[11px] text-surface-400">{form.message.length}/4096</p>
            </div>
          </div>

          {/* Global toggle */}
          <label className="flex items-center gap-3 p-3.5 bg-surface-50/80 rounded-xl border border-surface-100 cursor-pointer">
            <input type="checkbox" checked={form.is_global} onChange={(e) => update('is_global', e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-surface-300" />
            <div>
              <p className="text-[13px] font-semibold text-surface-900">Available to all team members</p>
              <p className="text-[11px] text-surface-400">When off, only you can use this quick reply</p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-50/50 border-t border-surface-100 flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/portal/quick-replies')}
            className="px-4 py-2 rounded-lg border border-surface-200 text-[13px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold rounded-lg text-[13px] shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
