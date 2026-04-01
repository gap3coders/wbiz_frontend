export const formatDateTime = (value) => {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const formatRelativeTime = (value) => {
  if (!value) return 'No activity yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity yet';

  const diffSeconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return formatDateTime(value);
};

export const formatConversationName = (item) => {
  const contact = item?.contact || item?.contact_id || item;

  return (
    contact?.name ||
    contact?.profile_name ||
    contact?.phone ||
    contact?.phone_number ||
    contact?.whatsapp_id ||
    'Unknown contact'
  );
};

export const formatContactSubtitle = (item) => {
  const contact = item?.contact || item?.contact_id || item;
  return contact?.phone || contact?.phone_number || contact?.whatsapp_id || contact?.email || 'No phone number';
};

export const formatMessagePreview = (messageLike) => {
  if (!messageLike) return 'No messages yet';

  return (
    messageLike.text_body ||
    messageLike.last_message_preview ||
    messageLike.payload?.text?.body ||
    messageLike.payload?.interactive?.body?.text ||
    messageLike.payload?.template?.name ||
    'WhatsApp message'
  );
};

export const buildVolumeSeries = (items = []) => {
  const today = new Date();
  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    return {
      key,
      label: day.toLocaleDateString('en-IN', { weekday: 'short' }),
      inbound: 0,
      outbound: 0,
    };
  });

  const lookup = new Map(dayKeys.map((day) => [day.key, day]));

  items.forEach((item) => {
    const day = lookup.get(item?._id?.day);
    if (!day) return;

    if (item?._id?.direction === 'inbound') {
      day.inbound = item.count || 0;
    }

    if (item?._id?.direction === 'outbound') {
      day.outbound = item.count || 0;
    }
  });

  return dayKeys;
};

export const percentageLabel = (value) => `${Number(value || 0)}%`;

export const toneForQuality = (rating) => {
  switch (String(rating || '').toLowerCase()) {
    case 'green':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'yellow':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'red':
      return 'bg-red-50 text-red-700 border-red-100';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

export const toneForConversationStatus = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'open':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'resolved':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

export const toneForMessageDirection = (direction) =>
  direction === 'outbound'
    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
    : 'bg-white border border-gray-200 text-gray-900';

export const toneForSeverity = (severity) => {
  switch (String(severity || '').toLowerCase()) {
    case 'critical':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'info':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
};

export const toneForTemplateStatus = (status) => {
  switch (String(status || '').toUpperCase()) {
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'PENDING':
    case 'IN_REVIEW':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'REJECTED':
    case 'PAUSED':
    case 'DISABLED':
      return 'bg-rose-50 text-rose-700 border-rose-100';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};
