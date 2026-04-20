const STATUS_TONE_STYLES = {
  success: {
    badge: 'border border-emerald-100 bg-emerald-50 text-emerald-700',
    soft: 'bg-emerald-50 text-emerald-700',
  },
  warning: {
    badge: 'border border-amber-100 bg-amber-50 text-amber-700',
    soft: 'bg-amber-50 text-amber-700',
  },
  danger: {
    badge: 'border border-red-100 bg-red-50 text-red-700',
    soft: 'bg-red-50 text-red-700',
  },
  neutral: {
    badge: 'border border-slate-200 bg-slate-100 text-slate-600',
    soft: 'bg-slate-100 text-slate-600',
  },
  info: {
    badge: 'border border-blue-100 bg-blue-50 text-blue-700',
    soft: 'bg-blue-50 text-blue-700',
  },
};

const STATUS_TONES = {
  active: 'success',
  approved: 'success',
  complete: 'success',
  completed: 'success',
  connected: 'success',
  delivered: 'success',
  linked: 'success',
  live: 'success',
  open: 'success',
  processed: 'success',
  read: 'success',
  sent: 'success',
  subscribed: 'success',
  success: 'success',
  verified: 'success',
  running: 'warning',
  in_progress: 'warning',
  paused: 'warning',
  processing: 'warning',
  retrying: 'warning',
  scheduled: 'warning',
  skipped: 'warning',
  updating: 'warning',
  warning: 'warning',
  draft: 'neutral',
  inactive: 'neutral',
  pending: 'neutral',
  queued: 'neutral',
  unknown: 'neutral',
  blocked: 'danger',
  error: 'danger',
  failed: 'danger',
  invalid: 'danger',
  missing: 'danger',
  not_linked: 'danger',
  not_public: 'danger',
  rejected: 'danger',
};

const SIZE_STYLES = {
  xs: 'px-2 py-0.5 text-[10px]',
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

const normalizeStatusKey = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const toTitleCase = (value = '') =>
  String(value || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const formatStatusLabel = (value = '') => {
  const normalized = normalizeStatusKey(value);
  if (!normalized) return '';
  if (normalized === 'public_https') return 'Public HTTPS';
  if (normalized === 'not_public') return 'Not Public';
  if (normalized === 'not_linked') return 'Not Linked';
  return toTitleCase(normalized.replace(/_/g, ' '));
};

export const getStatusTone = (status, fallback = 'neutral') =>
  STATUS_TONES[normalizeStatusKey(status)] || fallback;

export const getStatusToneStyles = (tone = 'neutral') =>
  STATUS_TONE_STYLES[tone] || STATUS_TONE_STYLES.neutral;

export default function StatusBadge({
  status = '',
  label,
  tone,
  size = 'sm',
  uppercase = false,
  icon: Icon,
  className = '',
}) {
  const resolvedTone = tone || getStatusTone(status);
  const styles = getStatusToneStyles(resolvedTone);
  const sizeStyles = SIZE_STYLES[size] || SIZE_STYLES.sm;
  const text = label || formatStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${styles.badge} ${sizeStyles} ${uppercase ? 'uppercase tracking-wide' : ''} ${className}`.trim()}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
      <span>{text}</span>
    </span>
  );
}
