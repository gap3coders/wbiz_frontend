import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  UserPlus, Users, Shield, Eye, Headphones, Trash2, Edit3,
  Loader2, Mail, ChevronDown, Clock, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, X,
} from 'lucide-react';

const ROLE_CONFIG = {
  admin:  { label: 'Admin',  icon: Shield,      color: 'bg-violet-100 text-violet-700 border-violet-200' },
  agent:  { label: 'Agent',  icon: Headphones,  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  viewer: { label: 'Viewer', icon: Eye,          color: 'bg-surface-100 text-surface-600 border-surface-200' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pending',  icon: Clock,        color: 'text-amber-600 bg-amber-50' },
  active:  { label: 'Active',   icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  removed: { label: 'Removed',  icon: XCircle,      color: 'text-red-500 bg-red-50' },
};

export default function TeamMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState('');

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/team');
      setMembers(data?.data?.members || data?.members || []);
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      setInviting(true);
      await api.post('/team/invite', { email: inviteEmail.trim(), role: inviteRole });
      toast.success('Invitation sent');
      setInviteEmail('');
      setInviteRole('agent');
      setShowInvite(false);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (id) => {
    if (!editRole) return;
    try {
      await api.patch(`/team/${id}`, { role: editRole });
      toast.success('Role updated');
      setEditingId(null);
      fetchMembers();
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleRemove = async (id, email) => {
    if (!window.confirm(`Remove ${email} from the team?`)) return;
    try {
      await api.delete(`/team/${id}`);
      toast.success('Member removed');
      fetchMembers();
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const activeMembers = members.filter(m => m.status !== 'removed');
  const removedMembers = members.filter(m => m.status === 'removed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Team Members</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Manage who has access to your workspace
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMembers}
            className="p-2 rounded-xl border border-surface-200 text-surface-500 hover:bg-surface-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowInvite(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900">Invite Team Member</h2>
              <button onClick={() => setShowInvite(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setInviteRole(key)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        inviteRole === key
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-surface-200 text-surface-600 hover:border-surface-300'
                      }`}
                    >
                      <cfg.icon className="w-5 h-5" />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Members List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : activeMembers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-surface-400" />
          </div>
          <h3 className="text-base font-semibold text-surface-900 mb-1">No team members yet</h3>
          <p className="text-sm text-surface-500 mb-4">Invite your colleagues to start collaborating</p>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite First Member
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-100 bg-surface-50/50">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
              {activeMembers.length} member{activeMembers.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-surface-100">
            {activeMembers.map((member) => {
              const roleCfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
              const statusCfg = STATUS_CONFIG[member.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;

              return (
                <div key={member._id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50/50 transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-brand-700">
                      {(member.email || '?')[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900 truncate">{member.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${roleCfg.color}`}>
                        <roleCfg.icon className="w-3 h-3" />
                        {roleCfg.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {editingId === member._id ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="text-xs border border-surface-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-brand-500/20 outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="agent">Agent</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          onClick={() => handleUpdateRole(member._id)}
                          className="px-2.5 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1.5 text-surface-500 hover:text-surface-700 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(member._id); setEditRole(member.role); }}
                          className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
                          title="Edit role"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemove(member._id, member.email)}
                          className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Removed members */}
      {removedMembers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-surface-500 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Removed Members ({removedMembers.length})
          </h3>
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden opacity-60">
            <div className="divide-y divide-surface-100">
              {removedMembers.map((member) => (
                <div key={member._id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-surface-400">
                      {(member.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-500 truncate">{member.email}</p>
                  </div>
                  <span className="text-[10px] text-red-400 font-medium">Removed</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
