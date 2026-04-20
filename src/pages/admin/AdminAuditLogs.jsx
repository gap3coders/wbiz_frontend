import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Filter,
  Calendar,
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const ACTION_STYLES = {
  login: 'bg-emerald-50 text-emerald-700',
  logout: 'bg-surface-100 text-surface-600',
  create: 'bg-blue-50 text-blue-700',
  update: 'bg-amber-50 text-amber-700',
  delete: 'bg-red-50 text-red-700',
};

const ACTIONS = ['login', 'logout', 'create', 'update', 'delete'];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 30 };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      const { data } = await api.get('/admin/audit-logs', { params });
      setLogs(data.data?.logs || []);
      setPagination(data.data?.pagination || { total: 0, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const getActionStyle = (action) => {
    const key = Object.keys(ACTION_STYLES).find((k) => action?.toLowerCase().includes(k));
    return ACTION_STYLES[key] || 'bg-surface-100 text-surface-600';
  };

  const formatTime = (ts) => {
    if (!ts) return '--';
    const d = new Date(ts);
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );
  };

  if (error && logs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Audit Logs</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-800">{error}</p>
          </div>
          <button onClick={fetchLogs} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[12px] font-semibold transition-colors">
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
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Audit Logs</h1>
          {pagination.total > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-surface-100 text-[12px] font-bold text-surface-600">
              {pagination.total.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-surface-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-colors">
          <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, action, or details..."
            className="flex-1 bg-transparent text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-surface-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] font-medium text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          >
            <option value="">All Actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-surface-400 ml-auto">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="w-10 h-10 text-surface-200 mx-auto mb-3" />
            <p className="text-[13px] text-surface-400">No audit logs found</p>
            {(search || actionFilter) && (
              <p className="text-[12px] text-surface-400 mt-1">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/60">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                    Entity Type
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                    Entity ID
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {logs.map((log, i) => (
                  <tr key={log._id || i} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3 text-[12px] text-surface-500 whitespace-nowrap">
                      {formatTime(log.created_at || log.timestamp)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                          {(log.admin_name || log.performed_by || 'S')[0]?.toUpperCase()}
                        </div>
                        <span className="text-[12px] font-medium text-surface-700 truncate max-w-[130px]">
                          {log.admin_name || log.performed_by || 'System'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getActionStyle(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-surface-600 font-medium">
                      {log.resource || log.entity_type || '--'}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-surface-500 font-mono">
                      {log.entity_id || log.resource_id || '--'}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-surface-500 max-w-[220px] truncate" title={log.details || log.description || ''}>
                      {log.details || log.description || '--'}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-surface-400 font-mono">
                      {log.ip_address || log.ip || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100 bg-surface-50/30">
            <span className="text-[12px] text-surface-400">
              Showing {(page - 1) * 30 + 1}--{Math.min(page * 30, pagination.total)} of{' '}
              {pagination.total.toLocaleString()} logs
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <span className="px-3 py-1.5 text-[12px] font-semibold text-surface-700">
                {page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
