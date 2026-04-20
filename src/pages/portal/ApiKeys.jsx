import { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Key, Plus, Search, X, Copy, Eye, EyeOff, Trash2, Pencil,
  Shield, Clock, Activity, AlertTriangle, Check, Loader2,
  ToggleLeft, ToggleRight,
} from 'lucide-react';

const PERMISSIONS = [
  { key: 'messages:read', label: 'Messages Read', desc: 'Read messages and conversations' },
  { key: 'messages:send', label: 'Messages Send', desc: 'Send messages and templates' },
  { key: 'contacts:read', label: 'Contacts Read', desc: 'View contact information' },
  { key: 'contacts:write', label: 'Contacts Write', desc: 'Create and update contacts' },
  { key: 'campaigns:read', label: 'Campaigns Read', desc: 'View campaign data' },
  { key: 'templates:read', label: 'Templates Read', desc: 'View template information' },
];

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  /* Create modal */
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', permissions: [], expiry: '' });
  const [creating, setCreating] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState(null);
  const [copied, setCopied] = useState(false);

  /* Edit modal */
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', permissions: [] });
  const [saving, setSaving] = useState(false);

  /* Delete dialog */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api-keys');
      const list = data.data?.api_keys || data.data?.keys || [];
      setKeys(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const filtered = useMemo(() => {
    if (!search) return keys;
    const q = search.toLowerCase();
    return keys.filter((k) => (k.name || '').toLowerCase().includes(q));
  }, [keys, search]);

  /* Create */
  const handleCreate = async () => {
    if (!createForm.name.trim()) { toast.error('Name is required'); return; }
    if (createForm.permissions.length === 0) { toast.error('Select at least one permission'); return; }
    setCreating(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        permissions: createForm.permissions,
      };
      if (createForm.expiry) payload.expires_at = createForm.expiry;
      const { data } = await api.post('/api-keys', payload);
      const fullKey = data.data?.key || data.key || data.data?.api_key || '';
      setNewKeyValue(fullKey);
      toast.success('API key created');
      await fetchKeys();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const copyKey = async () => {
    if (!newKeyValue) return;
    try {
      await navigator.clipboard.writeText(newKeyValue);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setCreateForm({ name: '', permissions: [], expiry: '' });
    setNewKeyValue(null);
    setCopied(false);
  };

  /* Toggle permission in form */
  const togglePerm = (perms, setPerms, perm) => {
    if (perms.includes(perm)) {
      setPerms(perms.filter((p) => p !== perm));
    } else {
      setPerms([...perms, perm]);
    }
  };

  /* Edit */
  const openEdit = (key) => {
    setEditModal(key);
    setEditForm({ name: key.name || '', permissions: key.permissions || [] });
  };

  const handleEdit = async () => {
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const id = editModal._id || editModal.id;
      await api.put(`/api-keys/${id}`, {
        name: editForm.name.trim(),
        permissions: editForm.permissions,
      });
      toast.success('API key updated');
      setEditModal(null);
      await fetchKeys();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update key');
    } finally {
      setSaving(false);
    }
  };

  /* Delete */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const id = deleteTarget._id || deleteTarget.id;
      await api.delete(`/api-keys/${id}`);
      toast.success('API key deleted');
      setDeleteTarget(null);
      await fetchKeys();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete key');
    } finally {
      setDeleting(false);
    }
  };

  /* Toggle active/inactive */
  const toggleStatus = async (key) => {
    const id = key._id || key.id;
    const newActive = !key.active;
    try {
      await api.patch(`/api-keys/${id}`, { active: newActive });
      toast.success(`Key ${newActive ? 'activated' : 'deactivated'}`);
      await fetchKeys();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update status');
    }
  };

  const Skel = ({ h = 'h-12' }) => <div className={`bg-surface-50 rounded-lg ${h} animate-pulse`} />;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">API Keys</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />
            Manage API keys for external integrations
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Key
        </button>
      </div>

      {/* ── Search ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search API keys..."
            className="w-full bg-white border border-surface-200 rounded-lg pl-9 pr-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-[12px] text-surface-400">
          {filtered.length} key{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Keys Table ── */}
      <div className="bg-white rounded-xl border border-surface-200 animate-fade-in-up overflow-hidden" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-bold text-surface-900">All API Keys</h3>
            <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => <Skel key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Key className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-[13px] text-surface-500 font-medium">
              {search ? 'No keys match your search' : 'No API keys yet'}
            </p>
            <p className="text-[11px] text-surface-400 mt-1">
              {search ? 'Try adjusting your search term' : 'Create one to integrate with external services'}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Key
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/60">
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Name</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Key</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Permissions</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Last Used</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Requests</th>
                  <th className="px-5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map((k) => {
                  const id = k._id || k.id;
                  const isActive = k.active !== false;
                  return (
                    <tr key={id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-semibold text-surface-900">{k.name}</p>
                      </td>
                      <td className="px-5 py-3">
                        <code className="text-[12px] text-surface-500 bg-surface-50 px-2 py-0.5 rounded font-mono">
                          {k.key_prefix || k.key?.substring(0, 8) || '****'}...
                        </code>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(k.permissions || []).slice(0, 3).map((p) => (
                            <span key={p} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-semibold border border-blue-100">
                              {p}
                            </span>
                          ))}
                          {(k.permissions || []).length > 3 && (
                            <span className="px-1.5 py-0.5 bg-surface-50 text-surface-500 rounded text-[10px] font-semibold border border-surface-200">
                              +{k.permissions.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[12px] text-surface-500">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Never'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[12px] text-surface-600 font-medium">{k.request_count || 0}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => toggleStatus(k)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-surface-100 text-surface-500 border-surface-200 hover:bg-surface-200'
                          }`}
                        >
                          {isActive ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(k)}
                            className="p-2 rounded-lg text-surface-400 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(k)}
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

      {/* ── Create Key Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeCreateModal}>
          <div
            className="bg-white rounded-xl border border-surface-200 shadow-2xl w-full max-w-lg animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h3 className="text-[14px] font-bold text-surface-900">
                {newKeyValue ? 'API Key Created' : 'Create API Key'}
              </h3>
              <button onClick={closeCreateModal} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {newKeyValue ? (
              /* Show the generated key */
              <div className="p-5 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-amber-800 font-medium">
                    This key won't be shown again. Copy it now and store it securely.
                  </p>
                </div>
                <div className="relative">
                  <code className="block w-full bg-surface-900 text-emerald-400 rounded-lg p-4 text-[12px] font-mono break-all leading-relaxed">
                    {newKeyValue}
                  </code>
                  <button
                    onClick={copyKey}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Copy"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={closeCreateModal}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Create form */
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Key Name *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., Production API Key"
                    className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-2">Permissions *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PERMISSIONS.map((perm) => {
                      const isSelected = createForm.permissions.includes(perm.key);
                      return (
                        <button
                          key={perm.key}
                          type="button"
                          onClick={() => {
                            const perms = createForm.permissions;
                            setCreateForm((f) => ({
                              ...f,
                              permissions: isSelected
                                ? perms.filter((p) => p !== perm.key)
                                : [...perms, perm.key],
                            }));
                          }}
                          className={`text-left p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-200'
                              : 'bg-white border-surface-200 hover:border-surface-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-brand-600 border-brand-600' : 'border-surface-300'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="text-[12px] font-semibold text-surface-900">{perm.label}</span>
                          </div>
                          <p className="text-[10px] text-surface-400 mt-1 ml-6">{perm.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Expiry Date (optional)</label>
                  <input
                    type="date"
                    value={createForm.expiry}
                    onChange={(e) => setCreateForm((f) => ({ ...f, expiry: e.target.value }))}
                    className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
              </div>
            )}

            {!newKeyValue && (
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-100">
                <button
                  onClick={closeCreateModal}
                  className="px-4 py-2 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  {creating ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditModal(null)}>
          <div
            className="bg-white rounded-xl border border-surface-200 shadow-2xl w-full max-w-lg animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h3 className="text-[14px] font-bold text-surface-900">Edit API Key</h3>
              <button onClick={() => setEditModal(null)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Key Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-2">Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERMISSIONS.map((perm) => {
                    const isSelected = editForm.permissions.includes(perm.key);
                    return (
                      <button
                        key={perm.key}
                        type="button"
                        onClick={() => {
                          setEditForm((f) => ({
                            ...f,
                            permissions: isSelected
                              ? f.permissions.filter((p) => p !== perm.key)
                              : [...f.permissions, perm.key],
                          }));
                        }}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-200'
                            : 'bg-white border-surface-200 hover:border-surface-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-brand-600 border-brand-600' : 'border-surface-300'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="text-[12px] font-semibold text-surface-900">{perm.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-100">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDeleteTarget(null)}>
          <div
            className="bg-white rounded-xl border border-surface-200 shadow-2xl w-full max-w-sm animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-[14px] font-bold text-surface-900 mb-1">Delete API Key</h3>
              <p className="text-[12px] text-surface-500">
                Are you sure you want to delete <span className="font-semibold text-surface-700">"{deleteTarget.name}"</span>? This action cannot be undone. Any integrations using this key will stop working.
              </p>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t border-surface-100">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? 'Deleting...' : 'Delete Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
