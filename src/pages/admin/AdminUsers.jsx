import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const STATUS_BADGES = {
  active: 'bg-green-50 text-green-700 border border-green-200',
  pending_approval: 'bg-amber-50 text-amber-700 border border-amber-200',
  pending_verification: 'bg-blue-50 text-blue-700 border border-blue-200',
  pending_plan: 'bg-purple-50 text-purple-700 border border-purple-200',
  pending_setup: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  suspended: 'bg-red-50 text-red-700 border border-red-200',
};

const ROLE_BADGES = {
  owner: 'bg-violet-50 text-violet-700 border border-violet-200',
  admin: 'bg-blue-50 text-blue-700 border border-blue-200',
  agent: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  viewer: 'bg-surface-100 text-surface-600 border border-surface-200',
};

const relativeDate = (d) => {
  if (!d) return '--';
  const now = Date.now();
  const diff = now - new Date(d).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

const formatLabel = (str) =>
  str
    ?.split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || '--';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const pageSize = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pageSize,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(roleFilter && { role: roleFilter }),
      });
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data.data?.users || []);
      setPagination(res.data.data?.pagination || { total: 0, page: 1, pages: 1 });
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const kpiData = useMemo(() => {
    const counts = { active: 0, pendingApproval: 0, suspended: 0 };
    users.forEach((u) => {
      if (u.status === 'active') counts.active++;
      else if (u.status === 'pending_approval') counts.pendingApproval++;
      else if (u.status === 'suspended') counts.suspended++;
    });
    return { total: pagination.total, ...counts };
  }, [users, pagination.total]);

  const pendingCount = useMemo(
    () => users.filter((u) => u.status === 'pending_approval').length,
    [users]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Users</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-100 text-[11px] font-bold text-surface-600 border border-surface-200">
            {pagination.total}
          </span>
          {pendingCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[11px] font-bold text-orange-700 border border-orange-200">
              {pendingCount} pending approval
            </span>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-surface-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20">
          <Search className="w-4 h-4 text-surface-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 bg-transparent text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none border-0"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-[13px] font-medium text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="">All Status</option>
          <option value="pending_verification">Pending Verification</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="pending_plan">Pending Plan</option>
          <option value="pending_setup">Pending Setup</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-[13px] font-medium text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="">All Roles</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="agent">Agent</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={Users} label="Total Users" value={kpiData.total} color="blue" />
        <KPICard icon={CheckCircle2} label="Active" value={kpiData.active} color="emerald" />
        <KPICard icon={Clock} label="Pending Approval" value={kpiData.pendingApproval} color="amber" />
        <KPICard icon={ShieldOff} label="Suspended" value={kpiData.suspended} color="red" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Users className="w-8 h-8 text-surface-300" />
            <p className="text-[13px] text-surface-400">No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-surface-100 bg-surface-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {users.map((u) => (
                    <tr
                      key={u._id}
                      onClick={() => navigate(`/admin/users/${u._id}`)}
                      className={`hover:bg-surface-50/60 transition-colors cursor-pointer ${
                        u.status === 'pending_approval' ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Avatar + Name + Email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                            {(u.full_name || '?')[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-surface-900 truncate">
                              {u.full_name}
                            </p>
                            <p className="text-[11px] text-surface-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tenant */}
                      <td className="px-4 py-3 text-[13px] text-surface-600">
                        {u.tenant?.name || '--'}
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ROLE_BADGES[u.role] || ROLE_BADGES.viewer
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          {u.status === 'pending_approval' && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                          )}
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              STATUS_BADGES[u.status] || ''
                            }`}
                          >
                            {formatLabel(u.status)}
                          </span>
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-[12px] text-surface-400">
                        {relativeDate(u.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/users/${u._id}`);
                          }}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
                <span className="text-[11px] text-surface-400">
                  {pagination.total} users total
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-medium text-surface-600">
                    Page {page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page >= pagination.pages}
                    className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────── KPI Card ────────────────────────────── */

function KPICard({ icon: Icon, label, value, color }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-100' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-white rounded-xl border ${c.border} p-4`}>
      <div className="flex items-center gap-3">
        <div className={`${c.bg} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4.5 h-4.5 ${c.icon}`} />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-[20px] font-extrabold text-surface-900 leading-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}
