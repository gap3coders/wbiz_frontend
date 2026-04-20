import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  MessageSquare,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Activity,
  CalendarDays,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import api from '../../api/axios';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/dashboard/stats');
      setStats(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const statsData = stats?.stats || {};
  const chartData = stats?.charts?.messagesByDay || [];
  const recentTenants = stats?.recentTenants || [];
  const recentSignups = stats?.recentSignups || [];
  const tenantsByPlan = stats?.tenantsByPlan || [];

  const maxMessageCount = chartData.length > 0
    ? Math.max(...chartData.map(d => d.count))
    : 1;

  const totalPlanTenants = tenantsByPlan.reduce((sum, p) => sum + (p.count || 0), 0) || 1;

  const planColors = {
    starter: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50' },
    professional: { bg: 'bg-violet-500', text: 'text-violet-700', light: 'bg-violet-50' },
    enterprise: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50' },
    premium: { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50' },
    free: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50' },
  };

  const getPlanColor = (name) =>
    planColors[name?.toLowerCase()] || { bg: 'bg-surface-400', text: 'text-surface-700', light: 'bg-surface-100' };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-800">Failed to load dashboard</p>
            <p className="text-[12px] text-red-600 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchDashboardStats}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[12px] font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-[13px] text-surface-400 mt-1">
            Welcome back, Admin
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-surface-400">
          <CalendarDays className="w-3.5 h-3.5" />
          {todayStr}
        </div>
      </div>

      {/* KPI Cards - 3x2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          icon={Building2}
          label="Total Tenants"
          value={statsData.totalTenants}
          trend={statsData.tenantGrowth}
          color="blue"
          loading={loading}
        />
        <KPICard
          icon={Building2}
          label="Active Tenants"
          value={statsData.activeTenants}
          trend={statsData.activeTenantGrowth}
          color="emerald"
          loading={loading}
        />
        <KPICard
          icon={Users}
          label="Total Users"
          value={statsData.totalUsers}
          trend={statsData.userGrowth}
          color="violet"
          loading={loading}
        />
        <KPICard
          icon={Users}
          label="Active Users"
          value={statsData.activeUsers}
          trend={statsData.activeUserGrowth}
          color="amber"
          loading={loading}
        />
        <KPICard
          icon={MessageSquare}
          label="Total Messages"
          value={statsData.totalMessages}
          trend={statsData.messageGrowth}
          color="rose"
          loading={loading}
        />
        <KPICard
          icon={CreditCard}
          label="Monthly Revenue"
          value={
            statsData.monthlyRevenue != null
              ? `₹${Number(statsData.monthlyRevenue).toLocaleString()}`
              : '₹0'
          }
          trend={statsData.revenueGrowth}
          color="cyan"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Last 7 Days */}
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-100">
            <h2 className="text-[14px] font-bold text-surface-900">
              Messages Last 7 Days
            </h2>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="space-y-3">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-16 h-4 bg-surface-100 rounded animate-pulse" />
                    <div className="flex-1 h-6 bg-surface-100 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : chartData.length > 0 ? (
              <div className="space-y-3">
                {chartData.map((day, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-16 text-[11px] font-medium text-surface-500 flex-shrink-0">
                      {new Date(day._id).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-surface-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max((day.count / maxMessageCount) * 100, 2)}%`,
                            background: 'linear-gradient(90deg, #25D366, #128C7E)',
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-[12px] font-bold text-surface-900 flex-shrink-0">
                        {day.count?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <MessageSquare className="w-8 h-8 text-surface-200 mx-auto mb-2" />
                <p className="text-[13px] text-surface-400">No message data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Tenants by Plan */}
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-100">
            <h2 className="text-[14px] font-bold text-surface-900">
              Tenants by Plan
            </h2>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 bg-surface-100 rounded animate-pulse" />
                    <div className="h-5 bg-surface-100 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : tenantsByPlan.length > 0 ? (
              <div className="space-y-4">
                {tenantsByPlan.map((plan) => {
                  const pct = ((plan.count / totalPlanTenants) * 100).toFixed(1);
                  const colors = getPlanColor(plan._id);
                  return (
                    <div key={plan._id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-semibold text-surface-700 capitalize">
                          {plan._id}
                        </span>
                        <span className="text-[11px] font-bold text-surface-500">
                          {plan.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-surface-100 rounded-full h-5 overflow-hidden">
                        <div
                          className={`${colors.bg} h-full rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${Math.max(parseFloat(pct), 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Activity className="w-8 h-8 text-surface-200 mx-auto mb-2" />
                <p className="text-[13px] text-surface-400">No plan data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-100">
            <h2 className="text-[14px] font-bold text-surface-900">
              Recent Tenants
            </h2>
          </div>
          <div className="divide-y divide-surface-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-100 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-32 bg-surface-100 rounded animate-pulse" />
                      <div className="h-3 w-20 bg-surface-100 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : recentTenants.length > 0 ? (
              recentTenants.slice(0, 5).map((tenant) => (
                <div
                  key={tenant._id}
                  onClick={() => navigate(`/admin/tenants/${tenant._id}`)}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                    {(tenant.name || 'T')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-surface-900 truncate">
                      {tenant.name}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700">
                    {tenant.plan}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      tenant.plan_status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-surface-100 text-surface-500'
                    }`}
                  >
                    {tenant.plan_status}
                  </span>
                  <span className="text-[11px] text-surface-400 flex-shrink-0">
                    {new Date(tenant.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <Building2 className="w-8 h-8 text-surface-200 mx-auto mb-2" />
                <p className="text-[13px] text-surface-400">No tenants yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Signups */}
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-100">
            <h2 className="text-[14px] font-bold text-surface-900">
              Recent Signups
            </h2>
          </div>
          <div className="divide-y divide-surface-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-100 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-28 bg-surface-100 rounded animate-pulse" />
                      <div className="h-3 w-40 bg-surface-100 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : recentSignups.length > 0 ? (
              recentSignups.slice(0, 5).map((user) => (
                <div
                  key={user._id}
                  onClick={() => navigate(`/admin/users/${user._id}`)}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                    {(user.full_name || 'U')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-surface-900 truncate">
                      {user.full_name}
                    </p>
                    <p className="text-[11px] text-surface-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-surface-100 text-surface-500'
                    }`}
                  >
                    {user.status}
                  </span>
                  <span className="text-[11px] text-surface-400 flex-shrink-0">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <Users className="w-8 h-8 text-surface-200 mx-auto mb-2" />
                <p className="text-[13px] text-surface-400">No signups yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, trend, color, loading }) {
  const colorMap = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    violet: { bg: 'bg-violet-100', icon: 'text-violet-600' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
    rose: { bg: 'bg-rose-100', icon: 'text-rose-600' },
    cyan: { bg: 'bg-cyan-100', icon: 'text-cyan-600' },
  };

  const colors = colorMap[color] || colorMap.blue;
  const trendPositive = trend != null && trend >= 0;

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5">
      <div className="flex items-start justify-between">
        <div className={`${colors.bg} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
        {trend != null && !loading && (
          <div
            className={`flex items-center gap-0.5 text-[11px] font-semibold ${
              trendPositive ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {trendPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-7 w-20 bg-surface-100 rounded animate-pulse" />
          <div className="h-3 w-24 bg-surface-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="mt-3 text-[24px] font-extrabold text-surface-900 leading-none">
            {typeof value === 'number' ? value.toLocaleString() : value || '0'}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
            {label}
          </p>
        </>
      )}
    </div>
  );
}
