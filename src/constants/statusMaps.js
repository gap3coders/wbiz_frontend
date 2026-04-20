/**
 * Shared Status Maps — Single source of truth for status badge styling.
 *
 * Each entry: { cls, dot, label? }
 *   - cls: Tailwind classes for the badge container (bg, text, border)
 *   - dot: Tailwind class for the colored dot indicator
 *   - label: Human-readable label (optional, defaults to capitalized key)
 */

/* ─── Campaign / General Status ──────────────────────────────────── */
export const CAMPAIGN_STATUS_MAP = {
  running:   { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Running' },
  scheduled: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Scheduled' },
  completed: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Completed' },
  failed:    { cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Failed' },
  paused:    { cls: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500', label: 'Paused' },
  draft:     { cls: 'bg-surface-100 text-surface-600 border-surface-200', dot: 'bg-surface-400', label: 'Draft' },
  queued:    { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Queued' },
  active:    { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Active' },
};

/* ─── Message Delivery Status ────────────────────────────────────── */
export const MESSAGE_STATUS_MAP = {
  sent:      { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Sent' },
  delivered: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Delivered' },
  read:      { cls: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500', label: 'Read' },
  failed:    { cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Failed' },
  queued:    { cls: 'bg-surface-100 text-surface-600 border-surface-200', dot: 'bg-surface-400', label: 'Queued' },
  accepted:  { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Accepted' },
};

/* ─── Template Status ────────────────────────────────────────────── */
export const TEMPLATE_STATUS_MAP = {
  APPROVED:  { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Approved' },
  PENDING:   { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Pending' },
  REJECTED:  { cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Rejected' },
  PAUSED:    { cls: 'bg-surface-100 text-surface-600 border-surface-200', dot: 'bg-surface-400', label: 'Paused' },
};

/* ─── Template Category ──────────────────────────────────────────── */
export const TEMPLATE_CATEGORY_MAP = {
  MARKETING:       { cls: 'bg-violet-50 text-violet-700 border-violet-100', label: 'Marketing' },
  UTILITY:         { cls: 'bg-blue-50 text-blue-700 border-blue-100', label: 'Utility' },
  AUTHENTICATION:  { cls: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Authentication' },
};

/* ─── WhatsApp Availability ──────────────────────────────────────── */
export const WA_STATUS_MAP = {
  yes:     { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'WhatsApp' },
  no:      { cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'No WA' },
  unknown: { cls: 'bg-surface-100 text-surface-600 border-surface-200', dot: 'bg-surface-400', label: 'Unknown' },
};

/* ─── Severity Styles (logs, alerts) ─────────────────────────────── */
export const SEVERITY_STYLES = {
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  error:   { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  info:    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

/* ─── Default / fallback ─────────────────────────────────────────── */
export const DEFAULT_STATUS = { cls: 'bg-surface-100 text-surface-600 border-surface-200', dot: 'bg-surface-400', label: '—' };

/**
 * Helper: look up a status from any map with fallback.
 */
export const getStatus = (map, key, fallback = DEFAULT_STATUS) => {
  if (!key) return fallback;
  return map[key] || map[String(key).toLowerCase()] || map[String(key).toUpperCase()] || fallback;
};
