import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Loader2,
  Edit,
  X,
  Check,
  UserX,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const ROLE_STYLES = {
  super_admin: 'bg-violet-50 text-violet-700',
  admin: 'bg-blue-50 text-blue-700',
  support: 'bg-emerald-50 text-emerald-700',
};

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700',
  suspended: 'bg-red-50 text-red-700',
};

const emptyForm = { email: '', password: '', full_name: '', role: 'admin', status: 'active' };

export default function AdminAdminUsers() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/admin-users');
      setAdmins(data.data?.admins || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin users');
      toast.error('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (admin) => {
    setEditingId(admin._id);
    setForm({
      full_name: admin.full_name || '',
      email: admin.email || '',
      password: '',
      role: admin.role || 'admin',
      status: admin.status || 'active',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) {
      toast.error('Name and email are required');
      return;
    }
    if (!editingId && !form.password) {
      toast.error('Password is required for new admin');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        const payload = { full_name: form.full_name, email: form.email, role: form.role, status: form.status };
        await api.patch(`/admin/admin-users/${editingId}`, payload);
        toast.success('Admin user updated');
      } else {
        await api.post('/admin/admin-users', form);
        toast.success('Admin user created');
      }
      closeModal();
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save admin');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/admin/admin-users/${id}`, { status: newStatus });
      toast.success(`Admin ${newStatus === 'active' ? 'activated' : 'suspended'}`);
      fetchAdmins();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const relativeDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (error && admins.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-800">{error}</p>
          </div>
          <button onClick={fetchAdmins} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[12px] font-semibold transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Admin Users</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-100 text-[12px] font-bold text-surface-600">
            {admins.length}
          </span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[13px] rounded-lg px-4 py-2.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Admin
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto" />
          </div>
        ) : admins.length === 0 ? (
          <div className="py-20 text-center">
            <Shield className="w-10 h-10 text-surface-200 mx-auto mb-3" />
            <p className="text-[13px] text-surface-400">No admin users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/60">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-surface-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {admins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                          {(admin.full_name || 'A')[0]?.toUpperCase()}
                        </div>
                        <span className="text-[13px] font-semibold text-surface-900">
                          {admin.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-surface-500">{admin.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ROLE_STYLES[admin.role] || 'bg-surface-100 text-surface-600'}`}>
                        {admin.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[admin.status] || 'bg-surface-100 text-surface-600'}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-surface-400">
                      {relativeDate(admin.last_login_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(admin)}
                          className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-700 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(admin._id, admin.status)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                            admin.status === 'active'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {admin.status === 'active' ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Activate
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-surface-200 shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h3 className="text-[15px] font-bold text-surface-900">
                {editingId ? 'Edit Admin User' : 'New Admin User'}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-colors"
                  >
                    <option value="admin">Admin</option>
                    <option value="support">Support</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                {editingId && (
                  <div>
                    <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-colors"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-surface-100 hover:bg-surface-200 text-surface-700 px-4 py-2.5 rounded-lg font-semibold text-[13px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-semibold text-[13px] transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
