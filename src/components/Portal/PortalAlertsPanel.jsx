import { AlertTriangle, BellRing, ShieldAlert } from 'lucide-react';
import { formatRelativeTime, toneForSeverity } from '../../utils/portal';

export function PortalWarningsCard({ warnings = [], title = 'Action required', subtitle = 'Important Meta and portal issues' }) {
  return (
    <section className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-sm shadow-gray-100/70">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
        </div>
      </div>

      <div className="space-y-3">
        {warnings.length ? (
          warnings.map((warning) => (
            <div key={warning.id} className={`rounded-3xl border px-5 py-4 ${toneForSeverity(warning.severity)}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{warning.title}</p>
                  <p className="text-sm mt-1">{warning.message}</p>
                  <p className="text-xs mt-2 opacity-80">
                    Source: {warning.source}
                    {warning.code ? ` | Meta code: ${warning.code}` : ''}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
            <p className="text-sm font-semibold text-emerald-800">No active warnings</p>
            <p className="text-sm text-emerald-700 mt-1">Meta connection, webhooks, and recent sends all look healthy right now.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function PortalNoticesCard({ notices = [], title = 'Recent notices', subtitle = 'Latest Meta and portal signals' }) {
  return (
    <section className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-sm shadow-gray-100/70">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <BellRing className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      <div className="space-y-3">
        {notices.length ? (
          notices.map((notice) => (
            <div key={notice.id} className="rounded-3xl border border-gray-100 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{notice.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{notice.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Source: {notice.source}
                    {notice.code ? ` | Meta code: ${notice.code}` : ''}
                  </p>
                </div>
                <p className="text-xs text-gray-400 whitespace-nowrap">{formatRelativeTime(notice.created_at)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
            <p className="text-sm font-semibold text-gray-700">No recent notices</p>
            <p className="text-sm text-gray-500 mt-1">Status updates, template review signals, and campaign warnings will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
