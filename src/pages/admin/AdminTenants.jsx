import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
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

export default function AdminTenants() {
  const [tenants, setTenants] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const pageSize = 20;

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pageSize,
        ...(search && { search }),
        ...(planFilter && { plan: planFilter }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await api.get(`/admin/tenants?${params}`);
      setTenants(res.data.data?.tenants || []);
      setPagination(res.data.data?.pagination || { total: 0, page: 1, pages: 1 });
    } catch {
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [search, planFilter, statusFilter, page]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // KPI counts derived from pagination total + tenant array for status breakdown
  const kpiData = React.useMemo(() => {
    const counts = { active: 0, trial: 0, expired: 0 };
    tenants.forEach((t) => {
      if (t.plan_status === 'active' || t.plan_status === 'lifetime') counts.active++;
      else if (t.plan_status === 'trial') counts.trial++;
      else if (t.plan_status === 'expired') counts.expired++;
    });
    return { total: pagination.total, ...counts };
  }, [tenants, pagination.total]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Tenants</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-100 text-[11px] font-bold text-surface-600 border border-surface-200">
            {pagination.total}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-[240px] max-w-sm rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20">
          <Search className="w-4 h-4 text-surface-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 bg-transparent text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none border-0"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-[13px] font-medium text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="">All Plans</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
          <option value="custom">Custom</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-[13px] font-medium text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="">All Status</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
          <option value="lifetime">Lifetime</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={Building2} label="Total Tenants" value={kpiData.total} color="blue" />
        <KPICard icon={CheckCircle2} label="Active" value={kpiData.active} color="emerald" />
        <KPICard icon={Clock} label="Trial" value={kpiData.trial} color="violet" />
        <KPICard icon={AlertTriangle} label="Expired" value={kpiData.expired} color="red" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Building2 className="w-8 h-8 text-surface-300" />
            <p className="text-[13px] text-surface-400">No tenants found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-surface-100 bg-surface-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">Tenant Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">Owner Email</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-surface-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {tenants.map((tenant) => (
                    <tr
                      key={tenant._id}
                      onClick={() => navigate(`/admin/tenants/${tenant._id}`)}
                      className="hover:bg-surface-50/60 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-semibold text-surface-900 hover:text-brand-600 transition-colors">
                          {tenant.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-surface-600">
                        {tenant.owner?.email || '--'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PLAN_BADGES[tenant.plan] || PLAN_BADGES.starter}`}>
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGES[tenant.plan_status] || STATUS_BADGES.cancelled}`}>
                          {tenant.plan_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-surface-500">
                        {relativeDate(tenant.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/tenants/${tenant._id}`); }}
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
              <p className="text-[12px] text-surface-500">
                Showing {Math.min((pagination.page - 1) * pageSize + 1, pagination.total)} to{' '}
                {Math.min(pagination.page * pageSize, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg border border-surface-200 text-surface-600 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-2 text-[12px] font-semibold text-surface-700">
                  {pagination.page} / {pagination.pages || 1}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages}
                  className="p-2 rounded-lg border border-surface-200 text-surface-600 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100' },
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
          <p className="text-[11px] text-surface-400 font-bold uppercase tracking-wider">{label}</p>
          <p className="text-[20px] font-extrabold text-surface-900 leading-tight">{value ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
