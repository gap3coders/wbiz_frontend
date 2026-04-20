import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Globe,
  Briefcase,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldOff,
  ShieldCheck,
  UserCheck,
  UserX,
  KeyRound,
  Unlock,
  Loader2,
  Edit3,
  AlertCircle,
  Save,
  X,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

/* ────────────────────────────── Constants ────────────────────────────── */

const STATUS_BADGES = {
  active: 'bg-green-50 text-green-700 border border-green-200',
  pending_approval: 'bg-amber-50 text-amber-700 border border-amber-200',
  pending_verification: 'bg-blue-50 text-blue-700 border border-blue-200',
  pending_plan: 'bg-purple-50 text-purple-700 border border-purple-200',
  pending_setup: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  suspended: 'bg-red-50 text-red-700 border border-red-200',
};

const STATUS_DOTS = {
  active: 'bg-green-500',
  pending_approval: 'bg-amber-500',
  pending_verification: 'bg-blue-500',
  pending_plan: 'bg-purple-500',
  pending_setup: 'bg-cyan-500',
  suspended: 'bg-red-500',
};

const ROLE_BADGES = {
  owner: 'bg-violet-50 text-violet-700 border border-violet-200',
  admin: 'bg-blue-50 text-blue-700 border border-blue-200',
  agent: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  viewer: 'bg-surface-100 text-surface-600 border border-surface-200',
};

const formatLabel = (str) =>
  str?.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '--';

const formatDate = (d) => {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (d) => {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/* ────────────────────────────── Main Component ────────────────────────────── */

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/users/${id}`);
      const data = res.data.data;
      setUser(data);
    } catch {
      toast.error('Failed to load user details');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const openEditModal = () => {
    setEditRole(user?.role || 'viewer');
    setEditStatus(user?.status || 'active');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const updates = {};
      if (editRole !== user.role) updates.role = editRole;
      if (editStatus !== user.status) updates.status = editStatus;
      if (Object.keys(updates).length === 0) {
        toast('No changes to save');
        setSaving(false);
        return;
      }
      await api.patch(`/admin/users/${id}`, updates);
      toast.success('User updated successfully');
      setShowEditModal(false);
      fetchUser();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      if (action === 'approve') {
        await api.post(`/admin/users/${id}/approve`);
        toast.success('User approved');
      } else if (action === 'reject') {
        await api.post(`/admin/users/${id}/reject`);
        toast.success('User rejected');
      } else if (action === 'suspend') {
        await api.post(`/admin/users/${id}/suspend`);
        toast.success('Account suspended');
      } else if (action === 'reactivate') {
        await api.post(`/admin/users/${id}/reactivate`);
        toast.success('Account reactivated');
      } else if (action === 'reset') {
        await api.post(`/admin/users/${id}/reset-password`);
        toast.success('Password reset email sent');
      } else if (action === 'unlock') {
        await api.post(`/admin/users/${id}/unlock`);
        toast.success('Account unlocked');
      }
      fetchUser();
    } catch (e) {
      toast.error(e.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Loading / Not Found ── */

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <AlertCircle className="w-10 h-10 text-surface-300" />
        <p className="text-[13px] text-surface-400">User not found</p>
        <button onClick={() => navigate('/admin/users')} className="text-[13px] font-semibold text-brand-500 hover:text-brand-600 transition-colors">
          Back to Users
        </button>
      </div>
    );
  }

  const isPending = user.status === 'pending_approval';
  const isSuspended = user.status === 'suspended';
  const isLocked = !!user.locked_until;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate('/admin/users')} className="inline-flex items-center gap-2 text-[13px] font-semibold text-surface-500 hover:text-brand-600 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </button>

      {/* ═══════ HEADER CARD ═══════ */}
      <div className="bg-white rounded-xl border border-surface-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl font-bold">{(user.full_name || 'U')[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">{user.full_name}</h1>
              <p className="text-[13px] text-surface-400 mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${ROLE_BADGES[user.role] || ROLE_BADGES.viewer}`}>
                  {user.role}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOTS[user.status] || 'bg-surface-400'}`} />
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGES[user.status] || ''}`}>
                    {formatLabel(user.status)}
                  </span>
                </span>
                {isLocked && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-200">
                    Locked
                  </span>
                )}
              </div>
              <p className="text-[12px] text-surface-400 mt-1.5">ID: <span className="font-mono text-[11px]">{user._id}</span></p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {isPending && (
              <>
                <button onClick={() => handleAction('approve')} disabled={actionLoading === 'approve'} className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50">
                  {actionLoading === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />} Approve
                </button>
                <button onClick={() => handleAction('reject')} disabled={actionLoading === 'reject'} className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50">
                  {actionLoading === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />} Reject
                </button>
              </>
            )}
            <button onClick={openEditModal} className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[13px] font-semibold transition-colors">
              <Edit3 className="w-4 h-4" /> Edit User
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ MAIN INFO GRID ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Personal Info */}
        <InfoCard title="Personal Information" icon={User}>
          <InfoRow label="Full Name" value={user.full_name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Phone" value={user.phone} />
          <InfoRow label="WhatsApp Number" value={user.whatsapp_number} />
          <InfoRow label="Company" value={user.company_name} />
          <InfoRow label="Country" value={user.country} />
          <InfoRow label="Industry" value={user.industry} />
          <InfoRow label="Avatar URL" value={user.avatar_url ? <span className="text-brand-500 truncate max-w-[180px] inline-block">{user.avatar_url}</span> : '--'} />
        </InfoCard>

        {/* Account Details */}
        <InfoCard title="Account Details" icon={Shield}>
          <InfoRow label="Status" value={
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOTS[user.status] || 'bg-surface-400'}`} />
              {formatLabel(user.status)}
            </span>
          } />
          <InfoRow label="Role" value={
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ROLE_BADGES[user.role] || ROLE_BADGES.viewer}`}>{user.role}</span>
          } />
          <InfoRow label="Email Verified" value={
            user.email_verified_at
              ? <span className="text-green-600 font-medium">{formatDateTime(user.email_verified_at)}</span>
              : <span className="text-red-500 font-medium">Not verified</span>
          } />
          <InfoRow label="Login Attempts" value={user.login_attempts ?? 0} />
          <InfoRow label="Locked Until" value={
            user.locked_until
              ? <span className="text-red-500 font-medium">{formatDateTime(user.locked_until)}</span>
              : <span className="text-surface-400">Not locked</span>
          } />
          <InfoRow label="Last Login" value={
            user.last_login_at ? formatDateTime(user.last_login_at) : <span className="text-surface-400 italic">Never</span>
          } />
          <InfoRow label="Registered" value={formatDateTime(user.created_at)} />
          <InfoRow label="Updated" value={formatDateTime(user.updated_at)} />
        </InfoCard>

        {/* Tenant Association */}
        <InfoCard title="Tenant Association" icon={Building2} className="lg:col-span-2">
          {user.tenant ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
              <InfoRow label="Tenant Name" value={
                <Link to={`/admin/tenants/${user.tenant._id}`} className="text-brand-500 hover:text-brand-600 font-medium transition-colors">
                  {user.tenant.name}
                </Link>
              } />
              <InfoRow label="Tenant Plan" value={<span className="capitalize">{user.tenant.plan || '--'}</span>} />
              <InfoRow label="Tenant Status" value={<span className="capitalize">{user.tenant.plan_status || '--'}</span>} />
              <InfoRow label="Tenant Created" value={formatDate(user.tenant.created_at)} />
            </div>
          ) : (
            <p className="text-[13px] text-surface-400 py-3 text-center">No tenant associated with this user</p>
          )}
        </InfoCard>
      </div>

      {/* ═══════ QUICK ACTIONS ═══════ */}
      <div className="bg-white rounded-xl border border-surface-200">
        <div className="px-5 py-3.5 border-b border-surface-100">
          <h2 className="text-[14px] font-bold text-surface-900">Quick Actions</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

            {/* Approve */}
            {isPending && (
              <ActionBtn icon={UserCheck} label="Approve User" color="green" loading={actionLoading === 'approve'} onClick={() => handleAction('approve')} />
            )}

            {/* Reject */}
            {isPending && (
              <ActionBtn icon={UserX} label="Reject User" color="red" loading={actionLoading === 'reject'} onClick={() => handleAction('reject')} />
            )}

            {/* Suspend / Reactivate */}
            {isSuspended ? (
              <ActionBtn icon={ShieldCheck} label="Reactivate Account" color="green" loading={actionLoading === 'reactivate'} onClick={() => handleAction('reactivate')} />
            ) : (
              <ActionBtn icon={ShieldOff} label="Suspend Account" color="orange" loading={actionLoading === 'suspend'} onClick={() => handleAction('suspend')} />
            )}

            {/* Reset Password */}
            <ActionBtn icon={KeyRound} label="Send Password Reset" color="blue" loading={actionLoading === 'reset'} onClick={() => handleAction('reset')} />

            {/* Unlock */}
            {isLocked && (
              <ActionBtn icon={Unlock} label="Unlock Account" color="amber" loading={actionLoading === 'unlock'} onClick={() => handleAction('unlock')} />
            )}

            {/* Edit */}
            <ActionBtn icon={Edit3} label="Edit Role & Status" color="brand" onClick={openEditModal} />

          </div>
        </div>
      </div>

      {/* ═══════ EDIT MODAL ═══════ */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl border border-surface-200 shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-surface-900">Edit User</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{(user.full_name || 'U')[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-surface-900">{user.full_name}</p>
                  <p className="text-[12px] text-surface-400">{user.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="pending_verification">Pending Verification</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="pending_plan">Pending Plan</option>
                  <option value="pending_setup">Pending Setup</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-5 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg text-[13px] font-semibold transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────── Shared Components ────────────────────────────── */

function InfoCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-surface-200 ${className}`}>
      <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-surface-500" />
        </div>
        <h2 className="text-[14px] font-bold text-surface-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-surface-50 last:border-0">
      <span className="text-[12px] font-semibold text-surface-500">{label}</span>
      <span className="text-[13px] text-surface-900 text-right">{value || '--'}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, color, onClick, disabled, loading }) {
  const colorMap = {
    violet: 'bg-violet-50 border-violet-100 text-violet-700 hover:bg-violet-100',
    blue: 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 border-green-100 text-green-700 hover:bg-green-100',
    orange: 'bg-orange-50 border-orange-100 text-orange-700 hover:bg-orange-100',
    red: 'bg-red-50 border-red-100 text-red-700 hover:bg-red-100',
    amber: 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100',
    brand: 'bg-brand-50 border-brand-100 text-brand-700 hover:bg-brand-100',
  };
  const iconColorMap = {
    violet: 'text-violet-500',
    blue: 'text-blue-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
    amber: 'text-amber-500',
    brand: 'text-brand-500',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-3 rounded-xl p-3 border text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${colorMap[color] || colorMap.blue}`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
      ) : (
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColorMap[color]}`} />
      )}
      <span className="text-[12px] font-semibold">{label}</span>
    </button>
  );
}
