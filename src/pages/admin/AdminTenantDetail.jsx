import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  BarChart3,
  MessageSquare,
  Crown,
  CalendarPlus,
  ShieldOff,
  ShieldCheck,
  Mail,
  Trash2,
  Loader2,
  Save,
  X,
  Phone,
  Users,
  HardDrive,
  CheckCircle2,
  Edit3,
  Send,
  Clock,
  Globe,
  Hash,
  Activity,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const PLAN_BADGES = {
  starter: 'bg-blue-50 text-blue-700 border border-blue-200',
  professional: 'bg-violet-50 text-violet-700 border border-violet-200',
  enterprise: 'bg-amber-50 text-amber-700 border border-amber-200',
  custom: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const STATUS_BADGES = {
  trial: 'bg-blue-50 text-blue-700 border border-blue-200',
  active: 'bg-green-50 text-green-700 border border-green-200',
  expired: 'bg-red-50 text-red-700 border border-red-200',
  suspended: 'bg-orange-50 text-orange-700 border border-orange-200',
  cancelled: 'bg-surface-100 text-surface-600 border border-surface-200',
  lifetime: 'bg-violet-50 text-violet-700 border border-violet-200',
};

const STATUS_DOTS = {
  trial: 'bg-blue-500',
  active: 'bg-green-500',
  expired: 'bg-red-500',
  suspended: 'bg-orange-500',
  cancelled: 'bg-surface-400',
  lifetime: 'bg-violet-500',
};

const formatDate = (d) => {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (d) => {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function AdminTenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [owner, setOwner] = useState(null);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [waAccount, setWaAccount] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  // Action state
  const [extendDays, setExtendDays] = useState(7);
  const [actionLoading, setActionLoading] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const fetchTenant = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/tenants/${id}`);
      const data = res.data.data;
      const t = data.tenant || data;
      setTenant(t);
      setOwner(data.owner || null);
      setTenantUsers(data.users || []);
      setWaAccount(data.waAccount || null);
      setStats(data.stats || {});
    } catch {
      toast.error('Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const openEditModal = () => {
    setEditData({
      name: tenant?.name || '',
      plan: tenant?.plan || 'starter',
      plan_status: tenant?.plan_status || 'trial',
      seats_limit: tenant?.seats_limit || 0,
      message_limit_monthly: tenant?.message_limit_monthly || 0,
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/tenants/${id}`, editData);
      toast.success('Tenant updated successfully');
      setShowEditModal(false);
      fetchTenant();
    } catch {
      toast.error('Failed to update tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action, payload) => {
    setActionLoading(action);
    try {
      if (action === 'lifetime') {
        await api.post(`/admin/tenants/${id}/grant-lifetime`);
        toast.success('Lifetime access granted');
      } else if (action === 'extend') {
        await api.post(`/admin/tenants/${id}/extend-trial`, { days: extendDays });
        toast.success(`Trial extended by ${extendDays} days`);
      } else if (action === 'suspend') {
        await api.post(`/admin/tenants/${id}/suspend`);
        toast.success('Account suspended');
      } else if (action === 'reactivate') {
        await api.post(`/admin/tenants/${id}/reactivate`);
        toast.success('Account reactivated');
      } else if (action === 'email') {
        if (!emailSubject.trim() || !emailMessage.trim()) {
          toast.error('Subject and message are required');
          setActionLoading(null);
          return;
        }
        await api.post(`/admin/tenants/${id}/send-notification`, { subject: emailSubject, message: emailMessage });
        toast.success('Notification email sent');
        setEmailSubject('');
        setEmailMessage('');
        setShowEmailForm(false);
      }
      fetchTenant();
    } catch (e) {
      toast.error(e.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !tenant) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Building2 className="w-10 h-10 text-surface-300" />
        <p className="text-[13px] text-surface-400">Tenant not found</p>
        <button onClick={() => navigate('/admin/tenants')} className="text-[13px] font-semibold text-brand-500 hover:text-brand-600 transition-colors">
          Back to Tenants
        </button>
      </div>
    );
  }

  const waba = waAccount || {};
  const isSuspended = tenant.plan_status === 'suspended';
  const isActive = tenant.plan_status === 'active';
  const isLifetime = tenant.lifetime_access;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate('/admin/tenants')} className="inline-flex items-center gap-2 text-[13px] font-semibold text-surface-500 hover:text-brand-600 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Tenants
      </button>

      {/* ═══════ HEADER CARD ═══════ */}
      <div className="bg-white rounded-xl border border-surface-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">{tenant.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${PLAN_BADGES[tenant.plan] || PLAN_BADGES.starter}`}>
                  {tenant.plan}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOTS[tenant.plan_status] || 'bg-surface-400'}`} />
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGES[tenant.plan_status] || STATUS_BADGES.cancelled}`}>
                    {tenant.plan_status}
                  </span>
                </span>
                {isLifetime && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-50 text-violet-700 border border-violet-200">
                    <Crown className="w-3 h-3" /> Lifetime
                  </span>
                )}
              </div>
              <p className="text-[13px] text-surface-500 mt-1">{owner?.full_name || 'Unknown'} &middot; {owner?.email || '--'}</p>
              <p className="text-[12px] text-surface-400 mt-0.5">Created {formatDate(tenant.created_at)} &middot; ID: <span className="font-mono text-[11px]">{tenant._id}</span></p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <button onClick={openEditModal} className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[13px] font-semibold transition-colors">
              <Edit3 className="w-4 h-4" /> Edit Tenant
            </button>
            {isSuspended ? (
              <button onClick={() => handleAction('reactivate')} disabled={actionLoading === 'reactivate'} className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50">
                {actionLoading === 'reactivate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Reactivate
              </button>
            ) : (
              <button onClick={() => handleAction('suspend')} disabled={actionLoading === 'suspend'} className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50">
                {actionLoading === 'suspend' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />} Suspend
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ STAT TILES ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile icon={Users} label="Users" value={stats.users || tenantUsers.length || 0} color="text-blue-500" bg="bg-blue-50" />
        <StatTile icon={MessageSquare} label="Contacts" value={stats.contacts || 0} color="text-emerald-500" bg="bg-emerald-50" />
        <StatTile icon={Send} label="Messages" value={stats.messages || 0} color="text-violet-500" bg="bg-violet-50" />
        <StatTile icon={Activity} label="Campaigns" value={stats.campaigns || 0} color="text-amber-500" bg="bg-amber-50" />
        <StatTile icon={Users} label="Seats Limit" value={tenant.seats_limit ?? '--'} color="text-cyan-500" bg="bg-cyan-50" />
        <StatTile icon={BarChart3} label="Msg Limit/Mo" value={tenant.message_limit_monthly ?? '--'} color="text-rose-500" bg="bg-rose-50" />
      </div>

      {/* ═══════ MAIN GRID ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Tenant Info */}
        <InfoCard title="Tenant Information" icon={Building2}>
          <InfoRow label="Name" value={tenant.name} />
          <InfoRow label="Slug" value={tenant.slug || '--'} />
          <InfoRow label="Owner" value={owner?.full_name || '--'} />
          <InfoRow label="Owner Email" value={owner?.email || '--'} />
          <InfoRow label="Owner Phone" value={owner?.phone || '--'} />
          <InfoRow label="Created" value={formatDateTime(tenant.created_at)} />
          <InfoRow label="Last Updated" value={formatDateTime(tenant.updated_at)} />
        </InfoCard>

        {/* Plan & Billing */}
        <InfoCard title="Plan & Billing" icon={CreditCard}>
          <InfoRow label="Current Plan" value={<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PLAN_BADGES[tenant.plan] || ''}`}>{tenant.plan}</span>} />
          <InfoRow label="Plan Status" value={<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGES[tenant.plan_status] || ''}`}>{tenant.plan_status}</span>} />
          <InfoRow label="Trial Ends" value={formatDate(tenant.trial_ends_at)} />
          <InfoRow label="Subscription Ends" value={formatDate(tenant.subscription_ends_at)} />
          <InfoRow label="Trial Used" value={tenant.trial_used ? 'Yes' : 'No'} />
          <InfoRow label="Lifetime Access" value={
            isLifetime ? <span className="inline-flex items-center gap-1.5 text-violet-600 font-semibold"><Crown className="w-3.5 h-3.5" /> Yes</span> : 'No'
          } />
          <InfoRow label="Razorpay Customer" value={tenant.razorpay_customer_id || '--'} />
        </InfoCard>

        {/* WhatsApp Account */}
        <InfoCard title="WhatsApp Account" icon={Phone}>
          <InfoRow label="WABA ID" value={waba.waba_id || '--'} />
          <InfoRow label="Phone Number" value={waba.phone_number || waba.display_phone_number || '--'} />
          <InfoRow label="Display Name" value={waba.verified_name || waba.display_name || '--'} />
          <InfoRow label="Account Status" value={<span className="capitalize">{waba.account_review_status || waba.status || '--'}</span>} />
          <InfoRow label="Quality Rating" value={<span className="capitalize">{waba.quality_rating || '--'}</span>} />
          <InfoRow label="Messaging Tier" value={waba.messaging_limit_tier || waba.tier || '--'} />
        </InfoCard>

        {/* Users in Tenant */}
        <InfoCard title={`Team Members (${tenantUsers.length})`} icon={Users}>
          {tenantUsers.length === 0 ? (
            <p className="text-[13px] text-surface-400 py-3 text-center">No users found</p>
          ) : (
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
              {tenantUsers.map((u) => (
                <div key={u._id} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-emerald-400 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[11px] font-bold">{(u.full_name || 'U')[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-surface-900 truncate">{u.full_name}</p>
                      <p className="text-[11px] text-surface-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-100 text-surface-600 border border-surface-200">{u.role}</span>
                    <span className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-500' : u.status === 'suspended' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  </div>
                </div>
              ))}
            </div>
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

            {/* Grant Lifetime */}
            <ActionBtn
              icon={Crown}
              label={isLifetime ? 'Lifetime Granted' : 'Grant Lifetime'}
              color="violet"
              disabled={isLifetime || actionLoading === 'lifetime'}
              loading={actionLoading === 'lifetime'}
              onClick={() => handleAction('lifetime')}
              done={isLifetime}
            />

            {/* Extend Trial */}
            <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-3 border border-blue-100">
              <CalendarPlus className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <input
                type="number"
                min="1"
                max="365"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 7)}
                className="w-16 rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="text-[11px] text-blue-600">days</span>
              <button
                onClick={() => handleAction('extend')}
                disabled={actionLoading === 'extend'}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoading === 'extend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
                Extend Trial
              </button>
            </div>

            {/* Suspend / Reactivate */}
            {isSuspended ? (
              <ActionBtn icon={ShieldCheck} label="Reactivate Account" color="green" loading={actionLoading === 'reactivate'} onClick={() => handleAction('reactivate')} />
            ) : (
              <ActionBtn icon={ShieldOff} label="Suspend Account" color="orange" loading={actionLoading === 'suspend'} onClick={() => handleAction('suspend')} />
            )}

            {/* Send Notification */}
            <ActionBtn icon={Mail} label="Send Notification" color="blue" onClick={() => setShowEmailForm(!showEmailForm)} />

            {/* Edit */}
            <ActionBtn icon={Edit3} label="Edit Tenant Details" color="brand" onClick={openEditModal} />

            {/* Delete (disabled) */}
            <div className="flex items-center gap-3 bg-red-50 rounded-xl p-3 border border-red-100 opacity-60">
              <Trash2 className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-red-600">Delete Tenant</p>
                <p className="text-[10px] text-red-400">Super Admin only</p>
              </div>
            </div>
          </div>

          {/* Email form (expandable) */}
          {showEmailForm && (
            <div className="mt-4 bg-surface-50 rounded-xl p-4 border border-surface-200 space-y-3">
              <p className="text-[12px] font-semibold text-surface-700">Send Notification to {owner?.full_name || 'Owner'}</p>
              <input
                type="text"
                placeholder="Subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <textarea
                placeholder="Message body..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction('email')}
                  disabled={actionLoading === 'email'}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Email
                </button>
                <button onClick={() => setShowEmailForm(false)} className="px-4 py-2 bg-surface-200 hover:bg-surface-300 text-surface-700 rounded-lg text-[13px] font-semibold transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ EDIT MODAL ═══════ */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl border border-surface-200 shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-surface-900">Edit Tenant</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Tenant Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Plan</label>
                  <select
                    value={editData.plan}
                    onChange={(e) => setEditData({ ...editData, plan: e.target.value })}
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Plan Status</label>
                  <select
                    value={editData.plan_status}
                    onChange={(e) => setEditData({ ...editData, plan_status: e.target.value })}
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Seats Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={editData.seats_limit}
                    onChange={(e) => setEditData({ ...editData, seats_limit: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Monthly Msg Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={editData.message_limit_monthly}
                    onChange={(e) => setEditData({ ...editData, message_limit_monthly: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-5 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg text-[13px] font-semibold transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50">
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

function StatTile({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
      </div>
      <p className="text-[20px] font-extrabold text-surface-900">{value}</p>
      <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, color, onClick, disabled, loading, done }) {
  const colorMap = {
    violet: 'bg-violet-50 border-violet-100 text-violet-700 hover:bg-violet-100',
    blue: 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 border-green-100 text-green-700 hover:bg-green-100',
    orange: 'bg-orange-50 border-orange-100 text-orange-700 hover:bg-orange-100',
    brand: 'bg-brand-50 border-brand-100 text-brand-700 hover:bg-brand-100',
  };
  const iconColorMap = {
    violet: 'text-violet-500',
    blue: 'text-blue-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
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
      ) : done ? (
        <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${iconColorMap[color]}`} />
      ) : (
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColorMap[color]}`} />
      )}
      <span className="text-[12px] font-semibold">{label}</span>
    </button>
  );
}
