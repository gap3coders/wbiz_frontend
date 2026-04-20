import React, { useState, useEffect } from 'react';
import {
  Server,
  RefreshCw,
  Loader2,
  Cpu,
  HardDrive,
  Database,
  Clock,
  Activity,
  Globe,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function AdminSystemInfo() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInfo = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/system/info');
      setInfo(data.data || data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load system info');
      toast.error('Failed to load system info');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const formatUptime = (seconds) => {
    if (!seconds) return '--';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '--';
    const mb = bytes / 1024 / 1024;
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const bytesToMB = (bytes) => {
    if (!bytes) return 0;
    return bytes / 1024 / 1024;
  };

  const isHealthy = info?.status === 'healthy' || !!info;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">System Health</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-800">{error}</p>
          </div>
          <button onClick={() => fetchInfo()} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[12px] font-semibold transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const mem = info?.memory || {};
  const mongo = info?.mongodb || info?.database || {};
  const heapTotalMB = bytesToMB(mem.heapTotal || mem.heap_total);
  const heapUsedMB = bytesToMB(mem.heapUsed || mem.heap_used);
  const rssMB = bytesToMB(mem.rss);
  const externalMB = bytesToMB(mem.external);
  const maxMem = Math.max(rssMB, heapTotalMB, 1);

  const dbConnected = mongo.status === 'connected' || mongo.state === 'connected' || mongo.connected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">System Health</h1>
          <span
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              isHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {isHealthy ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Healthy
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                Issue Detected
              </>
            )}
          </span>
        </div>
        <button
          onClick={() => fetchInfo(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-200 hover:bg-surface-50 text-surface-700 font-semibold text-[13px] rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status Cards Grid - 2x3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Environment */}
        <StatusCard icon={Globe} title="Environment" color="blue">
          <InfoRow label="Node.js Version" value={info?.node_version || info?.nodeVersion || '--'} />
          <InfoRow label="Environment" value={info?.environment || info?.env || 'production'} />
          <InfoRow label="Platform" value={info?.platform || '--'} />
          <InfoRow
            label="Server Time"
            value={info?.server_time ? new Date(info.server_time).toLocaleString() : new Date().toLocaleString()}
          />
        </StatusCard>

        {/* Uptime */}
        <StatusCard icon={Clock} title="Uptime" color="emerald">
          <InfoRow label="Process Uptime" value={formatUptime(info?.uptime || info?.process_uptime)} />
          <InfoRow label="System Uptime" value={formatUptime(info?.system_uptime)} />
          <InfoRow
            label="Started At"
            value={info?.started_at ? new Date(info.started_at).toLocaleString() : '--'}
          />
        </StatusCard>

        {/* Memory */}
        <StatusCard icon={Cpu} title="Memory Usage" color="violet">
          <MemoryRow label="RSS" value={formatBytes(mem.rss)} pct={(rssMB / maxMem) * 100} color="violet" />
          <MemoryRow
            label="Heap Total"
            value={formatBytes(mem.heapTotal || mem.heap_total)}
            pct={(heapTotalMB / maxMem) * 100}
            color="blue"
          />
          <MemoryRow
            label="Heap Used"
            value={formatBytes(mem.heapUsed || mem.heap_used)}
            pct={heapTotalMB > 0 ? (heapUsedMB / heapTotalMB) * 100 : 0}
            color="amber"
          />
          <MemoryRow
            label="External"
            value={formatBytes(mem.external)}
            pct={(externalMB / maxMem) * 100}
            color="rose"
          />
        </StatusCard>

        {/* Database */}
        <StatusCard icon={Database} title="Database" color="amber">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-[12px] text-surface-500">Status</span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
              />
              <span className={`text-[12px] font-semibold ${dbConnected ? 'text-emerald-700' : 'text-red-700'}`}>
                {mongo.status || mongo.state || (dbConnected ? 'Connected' : 'Disconnected')}
              </span>
            </div>
          </div>
          <InfoRow label="Host" value={mongo.host || '--'} />
          <InfoRow label="Database" value={mongo.name || mongo.database || '--'} />
          <InfoRow label="Collections" value={mongo.collections?.toString() || '--'} />
        </StatusCard>

        {/* Application Stats */}
        <StatusCard icon={HardDrive} title="Application" color="cyan">
          {info?.counts || info?.stats ? (
            Object.entries(info.counts || info.stats || {}).map(([key, val], i) => (
              <InfoRow
                key={i}
                label={key
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
                value={typeof val === 'number' ? val.toLocaleString() : String(val)}
              />
            ))
          ) : (
            <div className="px-5 py-6 text-center">
              <p className="text-[12px] text-surface-400">No application stats available</p>
            </div>
          )}
        </StatusCard>

        {/* API */}
        <StatusCard icon={Activity} title="API" color="rose">
          <InfoRow label="Version" value={info?.version || info?.api_version || '--'} />
          <InfoRow label="Total Routes" value={info?.total_routes?.toString() || info?.routes?.toString() || '--'} />
          <InfoRow label="Uptime" value={formatUptime(info?.uptime || info?.process_uptime)} />
        </StatusCard>
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, title, color, children }) {
  const colorMap = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    violet: { bg: 'bg-violet-100', icon: 'text-violet-600' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
    rose: { bg: 'bg-rose-100', icon: 'text-rose-600' },
    cyan: { bg: 'bg-cyan-100', icon: 'text-cyan-600' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <h3 className="text-[14px] font-bold text-surface-900">{title}</h3>
      </div>
      <div className="divide-y divide-surface-100">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-[12px] text-surface-500">{label}</span>
      <span className="text-[12px] font-semibold text-surface-800 text-right max-w-[60%] truncate">
        {value || '--'}
      </span>
    </div>
  );
}

function MemoryRow({ label, value, pct, color }) {
  const barColors = {
    violet: 'bg-violet-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };
  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-surface-500">{label}</span>
        <span className="text-[12px] font-semibold text-surface-800">{value}</span>
      </div>
      <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
        <div
          className={`${barColors[color] || 'bg-blue-500'} h-full rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(Math.max(pct, 1), 100)}%` }}
        />
      </div>
    </div>
  );
}
