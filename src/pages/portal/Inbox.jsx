import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import usePortalSocket from '../../hooks/usePortalSocket';
import MediaLibraryModal from '../../MediaLibraryModal';
import QuickReplyPopup from '../../components/QuickReplyPopup';
import { detectMediaAssetType, fileToDataUrl, formatFileSize } from '../../mediaLibraryHelpers';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Download,
  Eye,
  FileText,
  Image,
  MessageSquare,
  Mic,
  MoreHorizontal,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Smile,
  User,
  Video,
  X,
  XCircle,
  Info,
  Filter,
  Hash,
  Globe,
  Mail,
  Building2,
  Star,
  Archive,
  Pin,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  BarChart3,
  Shield,
  ShieldOff,
  Timer,
  ListOrdered,
  MousePointerClick,
  GitBranch,
} from 'lucide-react';

const TICKS = {
  sent: <Check className="w-4 h-4 text-surface-400" strokeWidth={2.5} />,
  delivered: <CheckCheck className="w-4 h-4 text-surface-400" strokeWidth={2.5} />,
  read: <CheckCheck className="w-4 h-4 text-blue-500" strokeWidth={2.5} />,
  failed: <AlertCircle className="w-4 h-4 text-red-500" strokeWidth={2} />,
  queued: <Clock className="w-4 h-4 text-surface-300" strokeWidth={2} />,
};

const TYPE_ICONS = {
  image: <Image className="w-3.5 h-3.5" />,
  document: <FileText className="w-3.5 h-3.5" />,
  video: <Video className="w-3.5 h-3.5" />,
  audio: <Mic className="w-3.5 h-3.5" />,
};

const relativeTime = (value) => {
  if (!value) return '';
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

const conversationName = (item) => item?.name || item?.contact_name || item?.wa_name || item?.contact_phone || 'N/A';
const displayName = (item = {}) => item?.name || item?.contact_name || item?.wa_name || item?.contact_phone || 'N/A';
const MEDIA_TYPES = new Set(['image', 'document', 'video', 'audio']);

/* ── Message Source Color System ── */
const SOURCE_COLORS = {
  campaign: {
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    bubble: 'bg-violet-50 border-violet-200/60',
    label: 'Campaign',
    dot: 'bg-violet-500',
  },
  auto_response: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    bubble: 'bg-amber-50 border-amber-200/60',
    label: 'Auto Reply',
    dot: 'bg-amber-500',
  },
  interactive: {
    badge: 'bg-teal-100 text-teal-700 border-teal-200',
    bubble: 'bg-teal-50 border-teal-200/60',
    label: 'Interactive',
    dot: 'bg-teal-500',
  },
  date_trigger: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    bubble: 'bg-blue-50 border-blue-200/60',
    label: 'Date Trigger',
    dot: 'bg-blue-500',
  },
};

const getSourceStyle = (message) => {
  if (message.direction !== 'outbound') return null;
  const src = message.message_source || null;
  if (src && SOURCE_COLORS[src]) return SOURCE_COLORS[src];
  // Fallback: detect from campaign_id
  if (message.campaign_id) return SOURCE_COLORS.campaign;
  // Detect interactive from type
  if (message.message_type === 'interactive') return SOURCE_COLORS.interactive;
  return null;
};
const TEMPLATE_PATTERN = /^\[Template:\s*(.+?)\]$/i;
const LIST_PAGE_SIZE = 20;
const THREAD_PAGE_SIZE = 50;

const getPageNumbers = (current, total) => {
  if (total <= 1) return [1];
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return Array.from(pages).filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
};

const conversationSignature = (items = []) =>
  items
    .map((item) => [item._id, item.contact_phone, item.last_message_at, item.last_message, item.last_message_status, item.unread_count].join(':'))
    .join('|');

const messageSignature = (items = []) =>
  items
    .map((item) => [item._id || item.wa_message_id || item.timestamp, item.status, item.content, item.timestamp, item.error_message].join(':'))
    .join('|');

const isNearBottom = (element) => {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < 96;
};

const getTemplateName = (messageLike = {}) => {
  if (messageLike.template_name) return messageLike.template_name;
  const match = String(messageLike.content || '').match(TEMPLATE_PATTERN);
  return match?.[1] || null;
};

const getFriendlyConversationPreview = (conversation = {}) => {
  if (conversation.last_message_type === 'template') {
    return `Template: ${getTemplateName({ template_name: conversation.last_template_name, content: conversation.last_message }) || 'Template message'}`;
  }

  if (conversation.last_message_type === 'image') return 'Image';
  if (conversation.last_message_type === 'video') return 'Video';
  if (conversation.last_message_type === 'audio') return 'Audio';
  if (conversation.last_message_type === 'document') {
    return conversation.last_media_filename || 'Document';
  }
  if (conversation.last_message_type === 'interactive') return 'Interactive message';

  return conversation.last_message || 'No messages yet';
};

const getVisibleMessageText = (message = {}) => {
  const raw = String(message.content || '').trim();
  if (!raw) return '';
  if (message.message_type === 'template' && TEMPLATE_PATTERN.test(raw)) return '';
  if (message.message_type === 'image' && /^\[image\](\s+.+)?$/i.test(raw)) return '';
  if (message.message_type === 'video' && /^\[video\](\s+.+)?$/i.test(raw)) return '';
  if (message.message_type === 'audio' && /^\[audio\](\s+.+)?$/i.test(raw)) return '';
  if (message.message_type === 'document' && /^\[document.*\](\s+.+)?$/i.test(raw)) return '';
  if (message.media_url && raw === message.media_url) return '';
  return raw;
};

const getFileNameFromUrl = (value = '') => {
  const source = String(value || '').trim();
  if (!source) return '';
  try {
    const parsed = new URL(source, window.location.origin);
    const rawName = decodeURIComponent(parsed.pathname.split('/').pop() || '');
    return rawName || '';
  } catch {
    const rawName = decodeURIComponent(source.split('?')[0].split('/').pop() || '');
    return rawName || '';
  }
};

const getFileExtension = (value = '') => {
  const fileName = getFileNameFromUrl(value) || String(value || '').trim();
  if (!fileName.includes('.')) return '';
  return String(fileName.split('.').pop() || '').trim().toUpperCase();
};

const getDocumentLabel = (value = '', fallback = 'Document file') => {
  const extension = getFileExtension(value);
  return extension ? `${extension} document` : fallback;
};

const openAttachmentWindow = (url) => {
  const value = String(url || '').trim();
  if (!value) return;
  window.open(value, '_blank', 'noopener,noreferrer');
};

const downloadAttachment = (url, fileName = '') => {
  const value = String(url || '').trim();
  if (!value) return;
  const link = document.createElement('a');
  link.href = value;
  if (fileName) link.download = fileName;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/* ── Interactive Message Builder Modal ──────────────────────── */
function InteractiveMessageModal({ open, onClose, onSend, sending }) {
  const [interactiveType, setInteractiveType] = useState('button');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttonText, setButtonText] = useState('View Options');
  const [buttons, setButtons] = useState([{ id: 'btn_0', title: '' }, { id: 'btn_1', title: '' }]);
  const [sections, setSections] = useState([{ title: '', rows: [{ id: 'row_0', title: '', description: '' }] }]);

  const reset = () => {
    setInteractiveType('button');
    setHeaderText('');
    setBodyText('');
    setFooterText('');
    setButtonText('View Options');
    setButtons([{ id: 'btn_0', title: '' }, { id: 'btn_1', title: '' }]);
    setSections([{ title: '', rows: [{ id: 'row_0', title: '', description: '' }] }]);
  };

  const handleSend = () => {
    if (!bodyText.trim()) return;
    const payload = {
      interactive_type: interactiveType,
      body_text: bodyText.trim(),
      ...(headerText.trim() ? { header_text: headerText.trim() } : {}),
      ...(footerText.trim() ? { footer_text: footerText.trim() } : {}),
    };
    if (interactiveType === 'button') {
      payload.buttons = buttons.filter((b) => b.title.trim()).map((b, i) => ({ id: b.id || `btn_${i}`, title: b.title.trim() }));
      if (payload.buttons.length === 0) return;
    } else {
      payload.button_text = buttonText.trim() || 'View Options';
      payload.sections = sections
        .filter((s) => s.rows.some((r) => r.title.trim()))
        .map((s) => ({
          title: s.title.trim(),
          rows: s.rows.filter((r) => r.title.trim()).map((r, ri) => ({ id: r.id || `row_${ri}`, title: r.title.trim(), ...(r.description?.trim() ? { description: r.description.trim() } : {}) })),
        }));
      if (payload.sections.length === 0 || payload.sections.every((s) => s.rows.length === 0)) return;
    }
    onSend(payload);
    reset();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { onClose(); reset(); } }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-surface-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-200 bg-surface-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center"><MousePointerClick className="w-4 h-4 text-white" /></div>
            <div>
              <h3 className="text-[14px] font-bold text-surface-900">Interactive Message</h3>
              <p className="text-[11px] text-surface-500">Send buttons or list options</p>
            </div>
          </div>
          <button onClick={() => { onClose(); reset(); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-200 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Type Selector */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex gap-2">
            {[
              { value: 'button', label: 'Reply Buttons', desc: 'Up to 3 buttons', icon: MousePointerClick },
              { value: 'list', label: 'List Message', desc: 'Sections with items', icon: ListOrdered },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setInteractiveType(opt.value)}
                className={`flex-1 rounded-xl border-2 p-3 text-left transition-all ${
                  interactiveType === opt.value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-surface-200 hover:border-surface-300'
                }`}
              >
                <opt.icon className={`w-5 h-5 mb-1.5 ${interactiveType === opt.value ? 'text-brand-600' : 'text-surface-400'}`} />
                <p className="text-[12px] font-bold text-surface-900">{opt.label}</p>
                <p className="text-[10px] text-surface-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {/* Header */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1 block">Header (optional)</label>
            <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} maxLength={60} placeholder="Header text" className="w-full rounded-lg border border-surface-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
          </div>
          {/* Body */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1 block">Body <span className="text-red-500">*</span></label>
            <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} maxLength={1024} rows={3} placeholder="Message body text" className="w-full rounded-lg border border-surface-200 px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
          </div>
          {/* Footer */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1 block">Footer (optional)</label>
            <input value={footerText} onChange={(e) => setFooterText(e.target.value)} maxLength={60} placeholder="Footer text" className="w-full rounded-lg border border-surface-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
          </div>

          {/* ── Reply Buttons ── */}
          {interactiveType === 'button' && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2 block">Buttons (max 3)</label>
              <div className="space-y-2">
                {buttons.map((btn, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-surface-100 flex items-center justify-center text-[10px] font-bold text-surface-500 flex-shrink-0">{i + 1}</span>
                    <input
                      value={btn.title}
                      onChange={(e) => { const next = [...buttons]; next[i] = { ...btn, title: e.target.value }; setButtons(next); }}
                      maxLength={20}
                      placeholder={`Button ${i + 1} label`}
                      className="flex-1 rounded-lg border border-surface-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    />
                    {buttons.length > 1 && (
                      <button type="button" onClick={() => setButtons(buttons.filter((_, j) => j !== i))} className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
                {buttons.length < 3 && (
                  <button type="button" onClick={() => setButtons([...buttons, { id: `btn_${buttons.length}`, title: '' }])} className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add button
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── List Sections ── */}
          {interactiveType === 'list' && (
            <div>
              <div className="mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1 block">Menu Button Label</label>
                <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} maxLength={20} placeholder="View Options" className="w-full rounded-lg border border-surface-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
              </div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2 block">Sections</label>
              <div className="space-y-3">
                {sections.map((sec, si) => (
                  <div key={si} className="rounded-xl border border-surface-200 p-3 bg-surface-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        value={sec.title}
                        onChange={(e) => { const next = [...sections]; next[si] = { ...sec, title: e.target.value }; setSections(next); }}
                        maxLength={24}
                        placeholder={`Section ${si + 1} title`}
                        className="flex-1 rounded-lg border border-surface-200 px-3 py-1.5 text-[12px] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      />
                      {sections.length > 1 && (
                        <button type="button" onClick={() => setSections(sections.filter((_, j) => j !== si))} className="w-6 h-6 rounded-md flex items-center justify-center text-surface-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                      )}
                    </div>
                    <div className="space-y-2 pl-2">
                      {sec.rows.map((row, ri) => (
                        <div key={ri} className="flex items-start gap-2">
                          <span className="w-4 h-4 mt-2 rounded-full bg-brand-100 flex items-center justify-center text-[9px] font-bold text-brand-600 flex-shrink-0">{ri + 1}</span>
                          <div className="flex-1 space-y-1">
                            <input
                              value={row.title}
                              onChange={(e) => { const next = [...sections]; next[si].rows[ri] = { ...row, title: e.target.value }; setSections([...next]); }}
                              maxLength={24}
                              placeholder="Row title"
                              className="w-full rounded-lg border border-surface-200 px-2.5 py-1.5 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                            />
                            <input
                              value={row.description || ''}
                              onChange={(e) => { const next = [...sections]; next[si].rows[ri] = { ...row, description: e.target.value }; setSections([...next]); }}
                              maxLength={72}
                              placeholder="Description (optional)"
                              className="w-full rounded-lg border border-surface-200 px-2.5 py-1.5 text-[11px] text-surface-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                            />
                          </div>
                          {sec.rows.length > 1 && (
                            <button type="button" onClick={() => { const next = [...sections]; next[si].rows = sec.rows.filter((_, j) => j !== ri); setSections(next); }} className="w-6 h-6 mt-1 rounded-md flex items-center justify-center text-surface-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                          )}
                        </div>
                      ))}
                      {sec.rows.length < 10 && (
                        <button type="button" onClick={() => { const next = [...sections]; next[si].rows = [...sec.rows, { id: `row_${sec.rows.length}`, title: '', description: '' }]; setSections(next); }} className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 pl-6">
                          <Plus className="w-3 h-3" /> Add row
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {sections.length < 10 && (
                  <button type="button" onClick={() => setSections([...sections, { title: '', rows: [{ id: `row_0`, title: '', description: '' }] }])} className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-700">
                    <Plus className="w-3.5 h-3.5" /> Add section
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-surface-200 bg-surface-50">
          <button onClick={() => { onClose(); reset(); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-surface-600 hover:bg-surface-200 transition-colors">Cancel</button>
          <button
            onClick={handleSend}
            disabled={sending || !bodyText.trim() || (interactiveType === 'button' && buttons.every((b) => !b.title.trim())) || (interactiveType === 'list' && sections.every((s) => s.rows.every((r) => !r.title.trim())))}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-500 text-white text-[13px] font-semibold hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function AttachmentMetaPill({ message, isOutbound }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[10px] text-surface-600 shadow-sm">
      <span>{formatTime(message.timestamp)}</span>
      {isOutbound ? TICKS[message.status] || null : null}
    </div>
  );
}

function AttachmentActionMenu({ fileUrl, onView, onDownload, className = '' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        className="flex h-7 w-7 items-center justify-center rounded-full text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors"
        aria-label="Attachment actions"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {menuOpen ? (
        <div className="absolute right-0 top-9 z-20 min-w-[130px] rounded-xl border border-surface-200 bg-white p-1 shadow-xl animate-slide-down">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onView?.();
            }}
            disabled={!fileUrl}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-40 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onDownload?.();
            }}
            disabled={!fileUrl}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-40 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DocumentAttachmentCard({ fileName, fileUrl, onView, onDownload, footer = null }) {
  const title = fileName || 'Attachment';
  const metaLabel = getDocumentLabel(fileName);

  return (
    <div className="relative overflow-visible rounded-xl border border-surface-200/80 bg-white shadow-sm">
      <div className="flex items-start gap-3 px-3 py-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500 flex-shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 pr-1">
          <p className="truncate text-[13px] font-semibold text-surface-900">{title}</p>
          <p className="text-[11px] text-surface-500">{metaLabel}</p>
        </div>
        <AttachmentActionMenu fileUrl={fileUrl} onView={onView} onDownload={onDownload} />
      </div>
      {footer ? <div className="border-t border-surface-100 px-3 py-1.5">{footer}</div> : null}
    </div>
  );
}

function AudioAttachmentCard({ fileName, fileUrl, onView, onDownload, footer = null, isOutbound = false }) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformBars] = useState(() => Array.from({ length: 32 }, () => 0.15 + Math.random() * 0.85));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => { if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration); };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [fileUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(() => {}); }
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const formatDur = (sec) => {
    if (!sec || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="relative overflow-visible rounded-xl border border-surface-200/80 bg-white shadow-sm min-w-[240px]">
      <audio ref={audioRef} src={fileUrl} preload="metadata" />
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Play/Pause button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
            isOutbound
              ? 'bg-brand-500 text-white hover:bg-brand-600'
              : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
          }`}
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        {/* Waveform + progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-[2px] h-[28px] cursor-pointer" onClick={seek}>
            {waveformBars.map((h, i) => {
              const barProgress = i / waveformBars.length;
              const isActive = barProgress < progress;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    isActive
                      ? (isOutbound ? 'bg-brand-500' : 'bg-brand-400')
                      : 'bg-surface-300'
                  }`}
                  style={{ height: `${Math.max(4, h * 28)}px`, minWidth: '2px' }}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-surface-500 tabular-nums">{formatDur(currentTime || 0)}</span>
            <span className="text-[10px] text-surface-400 tabular-nums">{formatDur(duration)}</span>
          </div>
        </div>
      </div>
      {footer ? <div className="border-t border-surface-100 px-3 py-1.5">{footer}</div> : null}
    </div>
  );
}

function VisualAttachmentActions({ fileUrl, onView, onDownload }) {
  return (
    <div className="absolute right-2 top-2">
      <AttachmentActionMenu
        fileUrl={fileUrl}
        onView={onView}
        onDownload={onDownload}
        className="rounded-full bg-white/90 backdrop-blur-sm shadow-sm"
      />
    </div>
  );
}

function VisualAttachmentMeta({ message, isOutbound }) {
  return (
    <div className="absolute bottom-2 right-2">
      <AttachmentMetaPill message={message} isOutbound={isOutbound} />
    </div>
  );
}

function MessageMetaRow({ message, isOutbound, className = '' }) {
  return (
    <div className={`mt-0.5 flex items-center gap-1 ${isOutbound ? 'justify-end' : 'justify-start'} ${className}`}>
      <span className="text-[10px] text-surface-400">{formatTime(message.timestamp)}</span>
      {isOutbound ? TICKS[message.status] || null : null}
    </div>
  );
}

function AttachmentPreviewModal({ open, onClose, url, type, fileName, title }) {
  if (!open) return null;

  const normalizedType = String(type || '').toLowerCase();
  const displayTitle = fileName || title || 'Attachment';
  const isPdf = getFileExtension(fileName || url) === 'PDF';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl animate-fade-in-up" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-surface-100 pb-3">
          <p className="min-w-0 truncate text-[14px] font-bold text-surface-900">{displayTitle}</p>
          <div className="flex items-center gap-2">
            {url ? (
              <>
                <button type="button" onClick={() => openAttachmentWindow(url)} className="rounded-lg border border-surface-200 px-3 py-1.5 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors">
                  Open
                </button>
                <button type="button" onClick={() => downloadAttachment(url, fileName)} className="rounded-lg border border-surface-200 px-3 py-1.5 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors">
                  Download
                </button>
              </>
            ) : null}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {normalizedType === 'image' && url ? <img src={url} alt={displayTitle} className="max-h-[72vh] w-full rounded-xl object-contain" /> : null}
        {normalizedType === 'video' && url ? <video src={url} controls className="max-h-[72vh] w-full rounded-xl bg-black" /> : null}
        {normalizedType === 'audio' && url ? <audio src={url} controls className="w-full" /> : null}
        {normalizedType === 'document' ? (
          <div className="space-y-4">
            {isPdf && url ? <iframe src={url} title={displayTitle} className="h-[72vh] w-full rounded-xl border border-surface-200 bg-white" /> : null}
            {!isPdf ? (
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-surface-500 shadow-sm"><FileText className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[13px] font-semibold text-surface-900">{displayTitle}</p>
                    <p className="text-[11px] text-surface-500">{getDocumentLabel(fileName)}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Interactive Message Bubble (outbound buttons/list + inbound replies) ── */
function InteractiveBubble({ message, isOutbound }) {
  // Try to extract interactive data from the stored payload
  const interactive = message.interactive_payload || message.payload?.interactive || {};
  const iType = interactive?.type || '';

  // Inbound interactive response (button_reply / list_reply)
  if (!isOutbound) {
    const ir = message.interactive_payload || {};
    let replyType = 'Reply';
    let replyTitle = '';
    let listDesc = null;

    // ALWAYS prefer interactive_payload data — it has the actual button/list title
    if (ir?.type === 'button_reply') {
      replyTitle = ir.button_reply?.title || '';
      replyType = 'Button Reply';
    } else if (ir?.type === 'list_reply') {
      replyTitle = ir.list_reply?.title || '';
      listDesc = ir.list_reply?.description || null;
      replyType = 'List Reply';
    }

    // Fallback to content only if interactive_payload didn't give us a title
    if (!replyTitle) {
      const raw = String(message.content || '').trim();
      // Don't use generic fallback text as display
      const isGeneric = !raw || /^\[.+\]$/.test(raw) || raw.toLowerCase() === 'interactive message';
      replyTitle = isGeneric ? 'Interactive Reply' : raw;
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 mb-1">
          <MousePointerClick className="w-3.5 h-3.5 text-teal-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">{replyType}</span>
        </div>
        <div className="rounded-lg bg-teal-50/60 border border-teal-100 px-2.5 py-1.5">
          <p className="text-[13px] text-surface-900 font-semibold">{replyTitle}</p>
          {listDesc && <p className="text-[11px] text-surface-500 mt-0.5">{listDesc}</p>}
        </div>
        <MessageMetaRow message={message} isOutbound={false} />
      </div>
    );
  }

  // Outbound interactive — render styled WhatsApp-like card
  const headerText = interactive?.header?.text || '';
  const bodyText = interactive?.body?.text || message.content || '';
  const footerTextVal = interactive?.footer?.text || '';

  return (
    <div className="min-w-[220px] max-w-[280px]">
      {/* Type badge */}
      <div className="flex items-center gap-1.5 mb-2">
        {iType === 'button' ? <MousePointerClick className="w-3.5 h-3.5 text-teal-600" /> : <ListOrdered className="w-3.5 h-3.5 text-teal-600" />}
        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
          {iType === 'button' ? 'Reply Buttons' : iType === 'list' ? 'List Message' : 'Interactive'}
        </span>
      </div>

      {/* Header */}
      {headerText && <p className="text-[14px] font-bold text-surface-900 mb-1">{headerText}</p>}

      {/* Body */}
      <p className="whitespace-pre-wrap break-words text-[13px] text-surface-800 leading-relaxed">{bodyText}</p>

      {/* Footer */}
      {footerTextVal && <p className="text-[11px] text-surface-400 italic mt-1">{footerTextVal}</p>}

      {/* Buttons — WhatsApp style: separated by thin lines */}
      {iType === 'button' && interactive?.action?.buttons?.length > 0 && (
        <div className="border-t border-teal-200/80 mt-2.5 pt-0.5">
          {interactive.action.buttons.map((btn, i) => (
            <div key={i} className={`flex items-center justify-center py-2 ${i > 0 ? 'border-t border-teal-100/60' : ''}`}>
              <span className="text-[13px] font-semibold text-teal-600">{btn.reply?.title || btn.title || `Button ${i + 1}`}</span>
            </div>
          ))}
        </div>
      )}

      {/* List — WhatsApp style: single menu button */}
      {iType === 'list' && interactive?.action?.sections?.length > 0 && (
        <div className="border-t border-teal-200/80 mt-2.5 pt-2">
          <div className="flex items-center justify-center rounded-lg bg-teal-600/10 px-3 py-2">
            <ListOrdered className="w-4 h-4 text-teal-600 mr-2" />
            <span className="text-[13px] font-semibold text-teal-600">{interactive.action.button || 'View Options'}</span>
          </div>
          {/* Show sections preview below */}
          <div className="mt-2 space-y-1">
            {interactive.action.sections.map((sec, si) => (
              <div key={si}>
                {sec.title && <p className="text-[10px] font-bold uppercase text-surface-400 mt-1 mb-0.5">{sec.title}</p>}
                {(sec.rows || []).map((row, ri) => (
                  <div key={ri} className="rounded-md bg-white/60 border border-teal-100/50 px-2.5 py-1.5 mb-1">
                    <p className="text-[12px] font-medium text-surface-800">{row.title}</p>
                    {row.description && <p className="text-[10px] text-surface-500 leading-tight">{row.description}</p>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <MessageMetaRow message={message} isOutbound={isOutbound} />
    </div>
  );
}

function TemplateBubble({ message, isOutbound }) {
  const [showPreview, setShowPreview] = useState(false);
  const templateName = getTemplateName(message) || 'Template';
  const headerLink = message.header?.link || '';
  const headerType = String(message.header?.type || '').toLowerCase();
  const headerFileName = message.header?.filename || '';
  const hasCaption = Boolean(message.body);
  const bodyText = getVisibleMessageText(message);

  const normalizedHeaderType = ['image', 'video', 'document'].includes(headerType) ? headerType : null;

  const bubbleTone = isOutbound ? 'bg-brand-50/80 border border-brand-100' : 'bg-white border border-surface-200/60 shadow-sm';

  const attachmentPreview = normalizedHeaderType ? (
    normalizedHeaderType === 'image' ? (
      <div className="relative overflow-hidden rounded-t-xl border-b border-surface-100 bg-black">
        <img src={headerLink} alt={headerFileName || templateName || 'image'} className="max-h-64 w-full object-cover" />
        <VisualAttachmentActions
          fileUrl={headerLink}
          onView={() => setShowPreview(true)}
          onDownload={() => downloadAttachment(headerLink, headerFileName || templateName || 'image')}
        />
        {!hasCaption ? <VisualAttachmentMeta message={message} isOutbound={isOutbound} /> : null}
      </div>
    ) : normalizedHeaderType === 'video' ? (
      <div className="relative overflow-hidden rounded-t-xl border-b border-surface-100 bg-black">
        <video src={headerLink} controls className="max-h-64 w-full bg-black" />
        <VisualAttachmentActions
          fileUrl={headerLink}
          onView={() => setShowPreview(true)}
          onDownload={() => downloadAttachment(headerLink, headerFileName || templateName || 'video')}
        />
        {!hasCaption ? <VisualAttachmentMeta message={message} isOutbound={isOutbound} /> : null}
      </div>
    ) : normalizedHeaderType === 'document' ? (
      <DocumentAttachmentCard
        fileName={headerFileName || templateName || 'document'}
        fileUrl={headerLink}
        onView={() => setShowPreview(true)}
        onDownload={() => downloadAttachment(headerLink, headerFileName || templateName || 'document')}
        footer={!hasCaption ? <AttachmentMetaPill message={message} isOutbound={isOutbound} /> : null}
      />
    ) : null
  ) : null;

  return (
    <>
      <div className={`rounded-xl overflow-hidden ${bubbleTone}`}>
        {attachmentPreview}
        {hasCaption ? (
          <div className="px-3 py-2">
            <p className="text-[13px] text-surface-900 whitespace-pre-wrap break-words leading-relaxed">{bodyText}</p>
            <MessageMetaRow message={message} isOutbound={isOutbound} />
          </div>
        ) : null}
      </div>
      <AttachmentPreviewModal open={showPreview} onClose={() => setShowPreview(false)} url={headerLink} type={normalizedHeaderType} fileName={headerFileName} title={templateName || 'Template'} />
    </>
  );
}

function MediaBubble({ message, isOutbound }) {
  const [resolvedUrl, setResolvedUrl] = useState(message.media_url || '');
  const [loading, setLoading] = useState(Boolean(!message.media_url && message.media_id));
  const [loadError, setLoadError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (message.media_url || !message.media_id) return;

    const resolveMediaUrl = async () => {
      try {
        const { data } = await api.get(`/conversations/${message.contact_phone}/messages/${message._id}/media`);
        const url = data?.data?.url || '';
        if (!url) throw new Error('No URL in response');
        setResolvedUrl(url);
        setLoadError('');
      } catch (error) {
        devError('[Inbox] Failed to resolve media URL', error?.response?.data || error);
        setLoadError('Failed to load media');
      } finally {
        setLoading(false);
      }
    };

    resolveMediaUrl();
  }, [message.media_url, message.media_id, message.contact_phone, message._id]);

  const mediaType = String(message.message_type || '').toLowerCase();
  const mediaUrl = resolvedUrl || message.media_url || '';
  const fileName = message.media_filename || getFileNameFromUrl(mediaUrl);
  const fileLabel = getDocumentLabel(fileName || mediaUrl, `${mediaType} media`);

  if (loading) {
    return (
      <div className={`rounded-xl border border-surface-200/60 bg-surface-50 p-4 animate-pulse ${isOutbound ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
        <div className="h-40 bg-surface-200 rounded-lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`rounded-xl border border-red-200 bg-red-50 p-3 ${isOutbound ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
        <p className="text-[11px] text-red-600 font-medium">{loadError}</p>
      </div>
    );
  }

  if (mediaType === 'image') {
    return (
      <>
        <button type="button" onClick={() => setShowPreview(true)} className="relative block w-full overflow-hidden rounded-xl text-left shadow-sm group">
          <img src={mediaUrl} alt={fileName || 'Image'} className="max-h-64 w-full rounded-xl object-cover border border-surface-200/60 group-hover:brightness-95 transition-all" />
          <VisualAttachmentActions
            fileUrl={mediaUrl}
            onView={() => setShowPreview(true)}
            onDownload={() => downloadAttachment(mediaUrl, fileName)}
          />
          <VisualAttachmentMeta message={message} isOutbound={isOutbound} />
        </button>
        <AttachmentPreviewModal open={showPreview} onClose={() => setShowPreview(false)} url={mediaUrl} type="image" fileName={fileName} />
      </>
    );
  }

  if (mediaType === 'video') {
    return (
      <>
        <div className="relative block overflow-hidden rounded-xl text-left shadow-sm">
          <video src={mediaUrl} controls className="max-h-64 w-full rounded-xl bg-black border border-surface-200/60" />
          <VisualAttachmentActions
            fileUrl={mediaUrl}
            onView={() => setShowPreview(true)}
            onDownload={() => downloadAttachment(mediaUrl, fileName)}
          />
          <VisualAttachmentMeta message={message} isOutbound={isOutbound} />
        </div>
        <AttachmentPreviewModal open={showPreview} onClose={() => setShowPreview(false)} url={mediaUrl} type="video" fileName={fileName} />
      </>
    );
  }

  if (mediaType === 'document') {
    return (
      <>
        <DocumentAttachmentCard
          fileName={fileName}
          fileUrl={mediaUrl}
          onView={() => setShowPreview(true)}
          onDownload={() => downloadAttachment(mediaUrl, fileName)}
          footer={<AttachmentMetaPill message={message} isOutbound={isOutbound} />}
        />
        <AttachmentPreviewModal open={showPreview} onClose={() => setShowPreview(false)} url={mediaUrl} type="document" fileName={fileName} />
      </>
    );
  }

  if (mediaType === 'audio') {
    return (
      <>
        <AudioAttachmentCard
          fileName={fileName}
          fileUrl={mediaUrl}
          onView={() => setShowPreview(true)}
          onDownload={() => downloadAttachment(mediaUrl, fileName)}
          isOutbound={isOutbound}
          footer={<AttachmentMetaPill message={message} isOutbound={isOutbound} />}
        />
        <AttachmentPreviewModal open={showPreview} onClose={() => setShowPreview(false)} url={mediaUrl} type="audio" fileName={fileName} />
      </>
    );
  }

  return null;
}

const AVATAR_THEMES = [
  { shell: 'from-emerald-400 to-teal-600', accent: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { shell: 'from-sky-400 to-blue-600', accent: 'bg-sky-50 text-sky-700 border-sky-100' },
  { shell: 'from-orange-400 to-amber-500', accent: 'bg-orange-50 text-orange-700 border-orange-100' },
  { shell: 'from-fuchsia-400 to-pink-600', accent: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100' },
  { shell: 'from-violet-400 to-purple-600', accent: 'bg-violet-50 text-violet-700 border-violet-100' },
  { shell: 'from-cyan-400 to-indigo-500', accent: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  { shell: 'from-rose-400 to-red-500', accent: 'bg-rose-50 text-rose-700 border-rose-100' },
  { shell: 'from-lime-400 to-green-600', accent: 'bg-lime-50 text-lime-700 border-lime-100' },
];

const getAvatarTheme = (value) => {
  const source = String(value || '?').trim().toLowerCase();
  const hash = Array.from(source).reduce((accumulator, char) => accumulator + char.charCodeAt(0), 0);
  return AVATAR_THEMES[hash % AVATAR_THEMES.length];
};

const EMOJI_GROUPS = [
  { label: 'Smileys', items: ['😀', '😁', '😂', '😊', '😍', '😘', '🤗', '😎'] },
  { label: 'Gestures', items: ['👍', '🙌', '👏', '🙏', '🤝', '👌', '🔥', '💯'] },
  { label: 'Mood', items: ['❤️', '💚', '✨', '🎉', '🌟', '🤍', '😢', '😮'] },
];

const CHAT_BACKGROUND_STYLE = {
  backgroundColor: '#efeae2',
  backgroundImage:
    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'220\' height=\'220\' viewBox=\'0 0 220 220\'%3E%3Cg fill=\'none\' stroke=\'rgba(0,0,0,0.035)\' stroke-width=\'1\' stroke-linecap=\'round\'%3E%3Cpath d=\'M30 35c8-6 15-6 23 0\'/%3E%3Cpath d=\'M140 30c7 3 13 9 16 17\'/%3E%3Cpath d=\'M78 82c8 0 14 6 14 14s-6 14-14 14-14-6-14-14 6-14 14-14Z\'/%3E%3Cpath d=\'M150 85c11 0 20 9 20 20s-9 20-20 20-20-9-20-20 9-20 20-20Z\'/%3E%3Cpath d=\'M33 145h26\'/%3E%3Cpath d=\'M45 132v26\'/%3E%3Cpath d=\'M112 150c14-10 29-10 43 0\'/%3E%3Cpath d=\'M168 170c0 7-6 13-13 13s-13-6-13-13 6-13 13-13 13 6 13 13Z\'/%3E%3Cpath d=\'M78 175c6-5 12-5 18 0\'/%3E%3Cpath d=\'M185 48l8 8m0-8-8 8\'/%3E%3C/g%3E%3C/svg%3E")',
  backgroundSize: '220px 220px',
};

const CHAT_FOOTER_BACKGROUND_STYLE = {
  ...CHAT_BACKGROUND_STYLE,
  backgroundColor: 'rgba(239, 234, 226, 0.78)',
  backgroundPosition: 'center bottom',
};

const devInfo = (...args) => {
  if (import.meta.env.DEV) console.info(...args);
};

const devError = (...args) => {
  if (import.meta.env.DEV) console.error(...args);
};

const renderAssetPickerPreview = (asset) => {
  if (asset.asset_type === 'image') {
    return <img src={asset.public_url} alt={asset.original_name} className="h-14 w-14 rounded-xl object-cover" />;
  }

  if (asset.asset_type === 'video') {
    return <video src={asset.public_url} className="h-14 w-14 rounded-xl bg-black object-cover" muted />;
  }

  const Icon = asset.asset_type === 'audio' ? Mic : FileText;
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-100 text-surface-500">
      <Icon className="h-5 w-5" />
    </div>
  );
};

/* ───────────────────────────────────────────────────────────────── */
/*  MAIN INBOX COMPONENT                                            */
/* ───────────────────────────────────────────────────────────────── */

export default function Inbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contact, setContact] = useState(null);
  const [text, setText] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [listPagination, setListPagination] = useState({ page: 1, pages: 1, total: 0, limit: LIST_PAGE_SIZE });
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadRefreshing, setThreadRefreshing] = useState(false);
  const [threadPagination, setThreadPagination] = useState({ page: 1, pages: 1, total: 0, limit: THREAD_PAGE_SIZE, newer_page: null, older_page: null });
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [tab, setTab] = useState('all');
  const [mediaMode, setMediaMode] = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [composerDragActive, setComposerDragActive] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [threadUnreadAnchorId, setThreadUnreadAnchorId] = useState(null);

  // 24-hour window state
  const [windowInfo, setWindowInfo] = useState({ window_status: 'none', window_expires_at: null, last_customer_message_at: null });
  const [windowTimeLeft, setWindowTimeLeft] = useState('');

  // Delete mode state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
  const [deletingMessages, setDeletingMessages] = useState(false);

  // Contact stats state
  const [contactStats, setContactStats] = useState(null);
  const [showEditContact, setShowEditContact] = useState(false);
  const [editContactData, setEditContactData] = useState({});
  const [savingContact, setSavingContact] = useState(false);

  // Interactive message builder state
  const [showInteractiveBuilder, setShowInteractiveBuilder] = useState(false);

  // Send Flow from chat state
  const [showFlowSend, setShowFlowSend] = useState(false);
  const [publishedFlows, setPublishedFlows] = useState([]);
  const [flowSendLoading, setFlowSendLoading] = useState(false);
  const [flowSendData, setFlowSendData] = useState({ flowId: '', body: '', cta: 'Open Flow', header: '', footer: '' });
  const [flowSending, setFlowSending] = useState(false);

  // Update window countdown every second
  useEffect(() => {
    if (!windowInfo.window_expires_at) {
      setWindowTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const expires = new Date(windowInfo.window_expires_at).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setWindowTimeLeft('Expired');
        setWindowInfo(prev => ({ ...prev, window_status: 'expired' }));
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setWindowTimeLeft(`${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`);
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [windowInfo.window_expires_at]);

  const listSignatureRef = useRef('');
  const msgSignatureRef = useRef('');
  const msgMetaRef = useRef({ count: 0, lastKey: null });
  const forceScrollRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const scrollPlanRef = useRef(null);
  const locateUnreadOnNextLoadRef = useRef(false);
  const listRequestIdRef = useRef(0);
  const threadRequestIdRef = useRef(0);
  const viewportRef = useRef(null);
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const composerToolsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);

  const selectedConversation = conversations.find((item) => item.contact_phone === selectedPhone) || null;
  const currentDisplayName =
    contact?.name || contact?.wa_name || selectedConversation?.name || selectedConversation?.contact_name || selectedConversation?.contact_phone || selectedPhone || 'N/A';
  const currentAvatarTheme = getAvatarTheme(currentDisplayName);
  const requestedPhone = String(searchParams.get('phone') || '').replace(/[^\d]/g, '');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    setListPagination((current) => ({ ...current, page: 1 }));
  }, [searchQuery, tab]);

  useEffect(() => {
    if (!requestedPhone) return;
    if (selectedPhone !== requestedPhone) {
      locateUnreadOnNextLoadRef.current = true;
      setSelectedPhone(requestedPhone);
      setThreadPagination((current) => ({ ...current, page: 1 }));
      setThreadUnreadAnchorId(null);
    }
  }, [requestedPhone, selectedPhone]);

  const openConversation = useCallback((phone) => {
    const normalizedPhone = String(phone || '').replace(/[^\d]/g, '');
    if (!normalizedPhone) return;
    locateUnreadOnNextLoadRef.current = true;
    setSelectedPhone(normalizedPhone);
    setThreadPagination((current) => ({ ...current, page: 1 }));
    setThreadUnreadAnchorId(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('phone', normalizedPhone);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const closeConversation = useCallback(() => {
    locateUnreadOnNextLoadRef.current = false;
    setSelectedPhone(null);
    setThreadPagination((current) => ({ ...current, page: 1 }));
    setThreadUnreadAnchorId(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('phone');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const fetchConversations = useCallback(async ({ silent = false, page = listPagination.page } = {}) => {
    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;
    if (silent) setListRefreshing(true);
    else setListLoading(true);

    try {
      const { data } = await api.get('/conversations', {
        params: {
          page,
          limit: LIST_PAGE_SIZE,
          unread_only: tab === 'unread' ? 'true' : undefined,
          search: searchQuery || undefined,
        },
      });
      if (listRequestIdRef.current !== requestId) return;
      const nextItems = data?.data?.conversations || [];
      const nextPagination = data?.data?.pagination || { page: 1, pages: 1, total: 0, limit: LIST_PAGE_SIZE };
      const nextSignature = conversationSignature(nextItems);
      if (nextSignature !== listSignatureRef.current) {
        listSignatureRef.current = nextSignature;
        setConversations(nextItems);
      }
      setListPagination(nextPagination);
    } catch (error) {
      if (listRequestIdRef.current !== requestId) return;
      devError('[Inbox] Failed to load conversations', error?.response?.data || error);
      if (!silent) toast.error('Failed to load conversations');
    } finally {
      if (listRequestIdRef.current !== requestId) return;
      if (silent) setListRefreshing(false);
      else setListLoading(false);
    }
  }, [listPagination.page, searchQuery, tab]);

  const fetchThread = useCallback(async (phone, { silent = false, page = threadPagination.page, locateUnread = false } = {}) => {
    if (!phone) return;
    const requestId = threadRequestIdRef.current + 1;
    threadRequestIdRef.current = requestId;
    if (silent) setThreadRefreshing(true);
    else setThreadLoading(true);

    try {
      const viewport = viewportRef.current;
      const shouldStick = isNearBottom(viewport);
      const previousBottomOffset = viewport ? viewport.scrollHeight - viewport.scrollTop : null;
      const { data } = await api.get(`/conversations/${phone}`, {
        params: {
          page,
          limit: THREAD_PAGE_SIZE,
          locate_unread: locateUnread ? 'true' : undefined,
        },
      });
      if (threadRequestIdRef.current !== requestId) return;
      const nextMessages = data?.data?.messages || [];
      const nextContact = data?.data?.contact || null;
      const nextPagination = data?.data?.pagination || { page: 1, pages: 1, total: 0, limit: THREAD_PAGE_SIZE, newer_page: null, older_page: null };
      const nextSignature = messageSignature(nextMessages);
      const lastKey = nextMessages.at(-1)?._id || nextMessages.at(-1)?.wa_message_id || nextMessages.at(-1)?.timestamp || null;
      const hasTailChange = nextMessages.length !== msgMetaRef.current.count || lastKey !== msgMetaRef.current.lastKey;
      const firstUnread = nextMessages.find((message) => message.direction === 'inbound' && message.status !== 'read');

      if (nextSignature !== msgSignatureRef.current) {
        msgSignatureRef.current = nextSignature;
        msgMetaRef.current = { count: nextMessages.length, lastKey };
        if (scrollPlanRef.current?.mode === 'top') {
          // Preserve explicit page-navigation intent.
        } else if (forceScrollRef.current || shouldStick) {
          scrollPlanRef.current = { mode: 'bottom', behavior: hasTailChange ? 'smooth' : 'auto' };
        } else if (previousBottomOffset !== null) {
          scrollPlanRef.current = { mode: 'preserve', bottomOffset: previousBottomOffset };
        }
        setMessages(nextMessages);
      }
      if (firstUnread) {
        setThreadUnreadAnchorId(firstUnread._id || firstUnread.wa_message_id || firstUnread.timestamp);
      } else if (!silent && page === 1) {
        setThreadUnreadAnchorId(null);
      }
      setThreadPagination(nextPagination);
      setContact(nextContact);
      // Set window info from response
      const nextWindow = data?.data?.window || { window_status: 'none', window_expires_at: null, last_customer_message_at: null };
      setWindowInfo(nextWindow);
      return nextPagination;
    } catch (error) {
      devError('[Inbox] Failed to load thread', error?.response?.data || error);
      if (!silent) toast.error('Failed to load conversation');
      return null;
    } finally {
      if (threadRequestIdRef.current !== requestId) return;
      if (silent) setThreadRefreshing(false);
      else setThreadLoading(false);
    }
  }, [threadPagination.page]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetchConversations({ silent: true });
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [fetchConversations]);

  const markConversationRead = useCallback(async (phone, { silent = false } = {}) => {
    if (!phone) return 0;

    const normalizedPhone = String(phone).replace(/[^\d]/g, '');
    if (!normalizedPhone) return 0;

    let optimisticUpdatedCount = 0;

    setMessages((current) =>
      current.map((message) => {
        if (message.direction === 'inbound' && message.status !== 'read') {
          optimisticUpdatedCount += 1;
          return { ...message, status: 'read' };
        }
        return message;
      })
    );

    setConversations((current) => {
      const nextItems = current.map((conversation) =>
        conversation.contact_phone === normalizedPhone
          ? { ...conversation, unread_count: 0 }
          : conversation
      );
      listSignatureRef.current = conversationSignature(nextItems);
      return nextItems;
    });

    try {
      const { data } = await api.post(`/conversations/${normalizedPhone}/read`);
      const updatedCount = Number(data?.data?.updated_count || optimisticUpdatedCount || 0);

      if (updatedCount > 0 && !silent) {
        devInfo('[Inbox][Marked Read]', {
          contact_phone: normalizedPhone,
          updated_count: updatedCount,
        });
      }

      return updatedCount;
    } catch (error) {
      devError('[Inbox] Failed to mark conversation read', error?.response?.data || error);
      return optimisticUpdatedCount;
    }
  }, []);

  useEffect(() => {
    if (!selectedPhone) return;
    if (locateUnreadOnNextLoadRef.current) {
      locateUnreadOnNextLoadRef.current = false;
      fetchThread(selectedPhone, { locateUnread: true });
      markConversationRead(selectedPhone, { silent: true });
    } else {
      fetchThread(selectedPhone);
    }
  }, [selectedPhone, fetchThread, markConversationRead]);

  // Fetch contact stats when conversation selected
  useEffect(() => {
    if (!selectedPhone) {
      setContactStats(null);
      return;
    }

    const fetchStats = async () => {
      try {
        const { data } = await api.get(`/conversations/contact-stats/${selectedPhone}`);
        setContactStats(data?.data || null);
      } catch (error) {
        devError('[Inbox] Failed to load contact stats', error);
      }
    };

    fetchStats();
  }, [selectedPhone]);

  // ── Real-time: WebSocket listeners ──────────────────────────
  const selectedPhoneRef = useRef(selectedPhone);
  selectedPhoneRef.current = selectedPhone;

  const fetchConversationsRef = useRef(fetchConversations);
  fetchConversationsRef.current = fetchConversations;

  const fetchThreadRef = useRef(fetchThread);
  fetchThreadRef.current = fetchThread;

  const handleConversationUpdated = useCallback((payload) => {
    devInfo('[Inbox][Socket] conversation:updated', payload?.conversation?.contact_phone);

    // Refresh conversation list immediately
    fetchConversationsRef.current({ silent: true });

    // If this update is for the currently open thread, refresh it
    const updatedPhone = payload?.conversation?.contact_phone;
    const currentPhone = selectedPhoneRef.current;
    if (updatedPhone && currentPhone && String(updatedPhone).replace(/[^\d]/g, '') === String(currentPhone).replace(/[^\d]/g, '')) {
      forceScrollRef.current = true;
      fetchThreadRef.current(currentPhone, { silent: true, page: 1 });
    }
  }, []);

  const handleMessageStatus = useCallback((payload) => {
    devInfo('[Inbox][Socket] message:status', payload);
    // Update message status in current thread optimistically
    if (payload?.message_id) {
      setMessages((current) =>
        current.map((msg) =>
          (msg._id === payload.message_id || msg._id === String(payload.message_id))
            ? { ...msg, status: payload.status }
            : msg
        )
      );
    }
  }, []);

  usePortalSocket({
    enabled: true,
    onConversationUpdated: handleConversationUpdated,
    onMessageStatus: handleMessageStatus,
  });

  // ── Real-time: Thread auto-poll (fast fallback) ─────────────
  useEffect(() => {
    if (!selectedPhone) return;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetchThread(selectedPhone, { silent: true, page: 1 });
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [selectedPhone, fetchThread]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const plan = scrollPlanRef.current;
    if (!plan) return;

    scrollPlanRef.current = null;

    if (plan.mode === 'bottom') {
      viewport.scrollTop = viewport.scrollHeight;
    } else if (plan.mode === 'preserve' && plan.bottomOffset !== null) {
      viewport.scrollTop = viewport.scrollHeight - plan.bottomOffset;
    } else if (plan.mode === 'top') {
      viewport.scrollTop = 0;
    }
  });

  const handleViewportScroll = useCallback(() => {
    if (!viewportRef.current) return;
    stickToBottomRef.current = isNearBottom(viewportRef.current);
  }, []);

  const upsertConversationPreview = useCallback((phone, updater) => {
    const normalizedPhone = String(phone).replace(/[^\d]/g, '');
    setConversations((current) => {
      const nextItems = current.map((conversation) =>
        conversation.contact_phone === normalizedPhone
          ? updater(conversation)
          : conversation
      );
      listSignatureRef.current = conversationSignature(nextItems);
      return nextItems;
    });
  }, []);

  const sendMessage = useCallback(async () => {
    if (!selectedPhone || sending) return;
    const normalizedPhone = String(selectedPhone).replace(/[^\d]/g, '');
    if (!normalizedPhone || (!text.trim() && !selectedAssets.length && !mediaUrl.trim())) return;

    setSending(true);
    forceScrollRef.current = true;

    try {
      if (selectedAssets.length || mediaUrl.trim()) {
        let acceptedCount = 0;
        let failedCount = 0;

        for (const asset of selectedAssets) {
          const optimisticId = `temp-${Date.now()}-${Math.random()}`;
          const optimisticMessage = {
            _id: optimisticId,
            direction: 'outbound',
            message_type: asset.asset_type,
            content: mediaCaption.trim(),
            media_url: asset.public_url,
            media_filename: asset.original_name,
            timestamp: new Date().toISOString(),
            status: 'queued',
          };

          setMessages((current) => [...current, optimisticMessage]);

          try {
            await api.post('/meta/messages/send', {
              to: normalizedPhone,
              type: asset.asset_type,
              url: asset.public_url,
              caption: asset.asset_type === 'audio' ? '' : mediaCaption.trim(),
              filename: asset.asset_type === 'document' ? asset.original_name || 'document' : asset.original_name || undefined,
            });
            acceptedCount += 1;
          } catch (error) {
            failedCount += 1;
            const payload = error?.response?.data || {};
            const source = payload?.error_source === 'meta' || payload?.meta?.source === 'meta' ? 'Meta' : 'Platform';
            devError('[Inbox] Failed to send media', payload || error);
            setMessages((current) =>
              current.map((item) =>
                item._id === optimisticId
                  ? {
                      ...item,
                      status: 'failed',
                      error_source: source.toLowerCase(),
                      error_message: payload?.error || 'Failed to send media',
                    }
                  : item
              )
            );
          }
        }

        if (acceptedCount > 0) {
          resetMediaComposer();
          forceScrollRef.current = true;
          setThreadPagination((current) => ({ ...current, page: 1 }));
          setListPagination((current) => ({ ...current, page: 1 }));
          await Promise.all([
            fetchThread(normalizedPhone, { silent: true, page: 1 }),
            fetchConversations({ silent: true, page: 1 }),
          ]);
        }

        if (acceptedCount && failedCount) {
          toast.success(`${acceptedCount} attachment(s) accepted by Meta, ${failedCount} failed.`);
          return;
        }

        if (acceptedCount) {
          toast.success(`${acceptedCount} attachment(s) accepted by Meta.`);
          return;
        }

        upsertConversationPreview(normalizedPhone, (conversation) => ({
          ...conversation,
          last_message_status: 'failed',
        }));
        toast.error('All selected attachments failed to send.');
        return;
      } else {
        await api.post('/meta/messages/send', { to: normalizedPhone, text: text.trim() });
        setText('');
      }

      forceScrollRef.current = true;
      setThreadPagination((current) => ({ ...current, page: 1 }));
      setListPagination((current) => ({ ...current, page: 1 }));
      await Promise.all([
        fetchThread(normalizedPhone, { silent: true, page: 1 }),
        fetchConversations({ silent: true, page: 1 }),
      ]);
    } catch (error) {
      const payload = error?.response?.data || {};
      const source = payload?.error_source === 'meta' || payload?.meta?.source === 'meta' ? 'Meta' : 'Platform';
      devError('[Inbox] Failed to send message', payload || error);
      toast.error(`${source} Error: ${payload?.error || 'Failed to send message'}`);
    } finally {
      setSending(false);
    }
  }, [selectedPhone, sending, text, selectedAssets, mediaUrl, mediaCaption, fetchThread, fetchConversations, upsertConversationPreview]);

  // Send interactive message (buttons / list)
  const sendInteractiveMessage = useCallback(async (payload) => {
    if (!selectedPhone || sending) return;
    const normalizedPhone = String(selectedPhone).replace(/[^\d]/g, '');
    if (!normalizedPhone) return;
    setSending(true);
    forceScrollRef.current = true;
    try {
      await api.post('/messaging/interactive', { phone: normalizedPhone, ...payload });
      setShowInteractiveBuilder(false);
      toast.success('Interactive message sent');
      forceScrollRef.current = true;
      setThreadPagination((c) => ({ ...c, page: 1 }));
      setListPagination((c) => ({ ...c, page: 1 }));
      await Promise.all([
        fetchThread(normalizedPhone, { silent: true, page: 1 }),
        fetchConversations({ silent: true, page: 1 }),
      ]);
    } catch (error) {
      const payload = error?.response?.data || {};
      toast.error(payload?.error || 'Failed to send interactive message');
    } finally {
      setSending(false);
    }
  }, [selectedPhone, sending, fetchThread, fetchConversations]);

  // Open Send Flow picker in chat
  const openFlowSendFromChat = useCallback(async () => {
    setShowFlowSend(true);
    setFlowSendData({ flowId: '', body: '', cta: 'Open Flow', header: '', footer: '' });
    setFlowSendLoading(true);
    try {
      const { data } = await api.get('/flows');
      const allFlows = data.data?.flows || data.flows || data.data || [];
      setPublishedFlows(allFlows.filter((f) => f.status === 'PUBLISHED'));
    } catch { setPublishedFlows([]); }
    finally { setFlowSendLoading(false); }
  }, []);

  const handleFlowSendFromChat = useCallback(async () => {
    if (!flowSendData.flowId) { toast.error('Select a flow'); return; }
    if (!flowSendData.body.trim()) { toast.error('Body text is required'); return; }
    if (!selectedPhone) return;
    const normalizedPhone = String(selectedPhone).replace(/[^\d]/g, '');
    setFlowSending(true);
    try {
      await api.post(`/flows/${flowSendData.flowId}/send`, {
        phone: normalizedPhone,
        body_text: flowSendData.body.trim(),
        flow_cta: flowSendData.cta.trim() || 'Open Flow',
        header_text: flowSendData.header.trim() || undefined,
        footer_text: flowSendData.footer.trim() || undefined,
      });
      toast.success('Flow sent');
      setShowFlowSend(false);
      forceScrollRef.current = true;
      setThreadPagination((c) => ({ ...c, page: 1 }));
      setListPagination((c) => ({ ...c, page: 1 }));
      await Promise.all([
        fetchThread(normalizedPhone, { silent: true, page: 1 }),
        fetchConversations({ silent: true, page: 1 }),
      ]);
    } catch (error) {
      const payload = error?.response?.data || {};
      toast.error(payload?.error || 'Failed to send flow');
    } finally {
      setFlowSending(false);
    }
  }, [flowSendData, selectedPhone, fetchThread, fetchConversations]);

  // Toggle message selection for delete
  const toggleMessageSelect = useCallback((messageId) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  const selectAllMessages = useCallback(() => {
    setSelectedMessageIds(new Set(messages.map(m => m._id).filter(Boolean)));
  }, [messages]);

  const deselectAllMessages = useCallback(() => {
    setSelectedMessageIds(new Set());
  }, []);

  const deleteSelectedMessages = useCallback(async () => {
    if (selectedMessageIds.size === 0) return;
    setDeletingMessages(true);
    try {
      await api.post('/conversations/messages/bulk-delete', {
        message_ids: Array.from(selectedMessageIds),
      });
      toast.success(`${selectedMessageIds.size} message(s) deleted`);
      setSelectedMessageIds(new Set());
      setSelectMode(false);
      // Refresh thread
      await fetchThread(selectedPhone, { silent: true, page: 1 });
    } catch (error) {
      toast.error('Failed to delete messages');
    } finally {
      setDeletingMessages(false);
    }
  }, [selectedMessageIds, selectedPhone, fetchThread]);

  const deleteSingleMessage = useCallback(async (messageId) => {
    try {
      await api.delete(`/conversations/message/${messageId}`);
      toast.success('Message deleted');
      await fetchThread(selectedPhone, { silent: true, page: 1 });
    } catch (error) {
      toast.error('Failed to delete message');
    }
  }, [selectedPhone, fetchThread]);

  const archiveConversation = useCallback(async () => {
    if (!selectedPhone) return;
    if (!confirm('Archive this conversation? It will be removed from your inbox.')) return;
    try {
      await api.delete(`/conversations/conversation/${selectedPhone}`);
      toast.success('Conversation archived');
      closeConversation();
      fetchConversations({ silent: true });
    } catch (error) {
      toast.error('Failed to archive conversation');
    }
  }, [selectedPhone, closeConversation, fetchConversations]);

  // Edit contact handlers
  const openEditContact = useCallback(() => {
    setEditContactData({
      name: contact?.name || '',
      email: contact?.email || '',
      notes: contact?.notes || '',
      tags: (contact?.tags || []).join(', '),
    });
    setShowEditContact(true);
  }, [contact]);

  const saveEditContact = useCallback(async () => {
    if (!selectedPhone || savingContact) return;
    setSavingContact(true);
    try {
      const tags = editContactData.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      await api.patch(`/contacts/${contact?._id}`, {
        name: editContactData.name,
        email: editContactData.email,
        notes: editContactData.notes,
        tags,
      });
      toast.success('Contact updated');
      setShowEditContact(false);
      // Refresh thread to get updated contact
      await fetchThread(selectedPhone, { silent: true });
    } catch (error) {
      toast.error('Failed to update contact');
    } finally {
      setSavingContact(false);
    }
  }, [selectedPhone, savingContact, editContactData, contact, fetchThread]);

  const resetMediaComposer = useCallback(() => {
    setMediaMode(null);
    setMediaUrl('');
    setMediaCaption('');
    setSelectedAssets([]);
    setQueuedFiles([]);
  }, []);

  const openLibraryForType = useCallback((type) => {
    setMediaMode(type);
    setShowLibrary(true);
    setAttachMenuOpen(false);
  }, []);

  const queueFilesForLibrary = useCallback((files) => {
    const validFiles = Array.from(files || []).filter((file) => file.size <= 100 * 1024 * 1024);
    if (validFiles.length === 0) {
      toast.error('Files must be less than 100 MB');
      return;
    }
    setQueuedFiles(validFiles);
    setShowLibrary(true);
  }, []);

  const removeSelectedAsset = useCallback((assetId) => {
    setSelectedAssets((current) => current.filter((asset) => asset._id !== assetId));
  }, []);

  /* ── Audio Recording ── */
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef(null);

  const startAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm',
      });
      recordingChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recordingTimerRef.current);
        setRecordingDuration(0);

        const blob = new Blob(recordingChunksRef.current, { type: mediaRecorder.mimeType });
        if (blob.size < 100) {
          toast.error('Recording too short');
          setIsRecordingAudio(false);
          return;
        }

        // Convert to base64 data URL
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result;
          const ext = mediaRecorder.mimeType.includes('mp4') ? 'm4a' : 'ogg';
          const fileName = `voice_${Date.now()}.${ext}`;
          const mimeType = mediaRecorder.mimeType.split(';')[0];

          try {
            setSending(true);
            // Upload to media assets
            const uploadRes = await api.post('/media/assets/upload', {
              data_url: dataUrl,
              original_name: fileName,
              mime_type: mimeType,
            });
            const asset = uploadRes.data?.data?.asset || uploadRes.data?.data;
            if (asset?.public_url) {
              // Send voice message directly
              const normalizedPhone = String(selectedPhone).replace(/[^\d]/g, '');
              const optimisticId = `temp-${Date.now()}-${Math.random()}`;
              setMessages((current) => [...current, {
                _id: optimisticId,
                direction: 'outbound',
                message_type: 'audio',
                content: '',
                media_url: asset.public_url,
                media_filename: fileName,
                timestamp: new Date().toISOString(),
                status: 'queued',
              }]);
              try {
                await api.post('/meta/messages/send', {
                  to: normalizedPhone,
                  type: 'audio',
                  url: asset.public_url,
                });
                forceScrollRef.current = true;
                fetchThread(selectedPhone);
                fetchConversations();
              } catch (sendErr) {
                devError('[Inbox] Failed to send voice message', sendErr);
                setMessages((current) =>
                  current.map((m) =>
                    m._id === optimisticId ? { ...m, status: 'failed', error_message: 'Failed to send voice message' } : m
                  )
                );
                toast.error('Failed to send voice message');
              }
            } else {
              toast.error('Failed to upload voice recording');
            }
          } catch (uploadErr) {
            devError('[Inbox] Failed to upload audio', uploadErr);
            toast.error('Failed to upload voice recording');
          } finally {
            setSending(false);
            setIsRecordingAudio(false);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecordingAudio(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      devError('[Inbox] Microphone access error', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        toast.error('Could not start recording. Check microphone access.');
      }
    }
  }, [selectedPhone, fetchThread, fetchConversations]);

  const stopAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setRecordingDuration(0);
    setIsRecordingAudio(false);
    recordingChunksRef.current = [];
  }, []);

  const formatRecordingTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const insertEmoji = useCallback((emoji) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const nextText = before + emoji + after;
    setText(nextText);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
      textarea.focus();
    }, 0);
  }, [text]);

  const visibleConversations = conversations;
  const listPageNumbers = getPageNumbers(listPagination.page, listPagination.pages);

  /* ═══════════════════════════════════════════════════════════ */
  /*  JSX                                                       */
  /* ═══════════════════════════════════════════════════════════ */

  return (
    <div className="flex h-[calc(100vh-56px)] -m-4 lg:-m-6 bg-surface-50">

      {/* ──────────────────────────────────────────────────── */}
      {/*  LEFT PANEL — Conversation List                      */}
      {/* ──────────────────────────────────────────────────── */}
      <div className={`${selectedPhone ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] lg:w-[340px] flex-col border-r border-surface-200 bg-white flex-shrink-0`}>

        {/* Panel Header */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold text-surface-900">Messages</h1>
              {listPagination.total > 0 && (
                <span className="bg-surface-100 text-surface-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {listPagination.total}
                </span>
              )}
            </div>
            <button
              onClick={() => fetchConversations({ silent: true })}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              aria-label="Refresh conversations"
            >
              <RefreshCw className={`h-4 w-4 ${listRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search contacts..."
              className="w-full rounded-lg border border-surface-200 bg-surface-50/80 py-[7px] pl-9 pr-3 text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-surface-100 rounded-lg p-0.5">
            {[
              { key: 'all', label: 'All Chats' },
              { key: 'unread', label: 'Unread' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex-1 rounded-md px-3 py-[5px] text-[12px] font-semibold transition-all ${
                  tab === item.key
                    ? 'bg-white text-surface-900 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="space-y-1 p-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-surface-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-surface-200 rounded w-3/4" />
                    <div className="h-2.5 bg-surface-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-surface-300" />
              </div>
              <p className="text-[13px] font-semibold text-surface-700">No conversations</p>
              <p className="mt-1 text-[12px] text-surface-400">Messages will appear here</p>
            </div>
          ) : (
            <div>
              {visibleConversations.map((conversation) => {
                const isSelected = selectedPhone === conversation.contact_phone;
                const preview = getFriendlyConversationPreview(conversation);
                const theme = getAvatarTheme(conversationName(conversation));
                const hasUnread = conversation.unread_count > 0;

                return (
                  <button
                    key={conversation._id}
                    onClick={() => openConversation(conversation.contact_phone)}
                    className={`w-full px-3 py-2.5 text-left transition-all group ${
                      isSelected
                        ? 'bg-brand-50/70 border-l-[3px] border-l-brand-500'
                        : 'hover:bg-surface-50 border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${theme.shell} text-[13px] font-bold text-white shadow-sm`}>
                          {conversationName(conversation)[0]?.toUpperCase()}
                        </div>
                        {hasUnread && (
                          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white ring-2 ring-white px-1">
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <p className={`truncate text-[13px] text-surface-900 ${hasUnread ? 'font-bold' : 'font-semibold'}`}>
                            {conversationName(conversation)}
                          </p>
                          <span className={`flex-shrink-0 text-[11px] ${hasUnread ? 'text-brand-600 font-semibold' : 'text-surface-400'}`}>
                            {relativeTime(conversation.last_message_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {conversation.last_message_direction === 'outbound' && (
                            <span className="flex-shrink-0">{TICKS[conversation.last_message_status]}</span>
                          )}
                          {TYPE_ICONS[conversation.last_message_type] && (
                            <span className="flex-shrink-0 text-surface-400">{TYPE_ICONS[conversation.last_message_type]}</span>
                          )}
                          {conversation.last_message_source && SOURCE_COLORS[conversation.last_message_source] && (
                            <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${SOURCE_COLORS[conversation.last_message_source].dot}`} title={SOURCE_COLORS[conversation.last_message_source].label} />
                          )}
                          <p className={`truncate text-[12px] leading-relaxed ${hasUnread ? 'font-medium text-surface-800' : 'text-surface-500'}`}>
                            {preview}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {listPagination.pages > 1 && (
          <div className="border-t border-surface-200 bg-surface-50/50 px-3 py-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-surface-400">
                {listPagination.page}/{listPagination.pages}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  disabled={listPagination.page <= 1}
                  onClick={() => setListPagination((c) => ({ ...c, page: c.page - 1 }))}
                  className="p-1 rounded text-surface-400 hover:bg-surface-200 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {listPageNumbers.map((page) => (
                  <button
                    key={page}
                    onClick={() => setListPagination((c) => ({ ...c, page }))}
                    className={`min-w-[24px] h-6 rounded text-[11px] font-semibold transition-colors ${
                      page === listPagination.page
                        ? 'bg-brand-500 text-white'
                        : 'text-surface-500 hover:bg-surface-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={listPagination.page >= listPagination.pages}
                  onClick={() => setListPagination((c) => ({ ...c, page: c.page + 1 }))}
                  className="p-1 rounded text-surface-400 hover:bg-surface-200 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────── */}
      {/*  CENTER PANEL — Chat Area                            */}
      {/* ──────────────────────────────────────────────────── */}
      {selectedPhone ? (
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Chat Header */}
          <div className="flex h-[56px] items-center justify-between border-b border-surface-200 bg-white px-4 flex-shrink-0">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={closeConversation} className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 md:hidden transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${currentAvatarTheme.shell} text-[13px] font-bold text-white shadow-sm`}>
                {String(currentDisplayName || '?')[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-surface-900 leading-tight">{currentDisplayName}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-surface-400 leading-tight">+{selectedPhone}</p>
                  {windowInfo.window_status === 'open' && windowTimeLeft && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                      <Timer className="w-3 h-3" />
                      {windowTimeLeft}
                    </span>
                  )}
                  {windowInfo.window_status === 'expired' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 border border-red-200 text-[10px] font-semibold text-red-600">
                      <ShieldOff className="w-3 h-3" />
                      Template only
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Select mode toggle */}
              <button
                onClick={() => {
                  setSelectMode(!selectMode);
                  setSelectedMessageIds(new Set());
                }}
                className={`p-2 rounded-lg transition-colors ${selectMode ? 'text-brand-600 bg-brand-50' : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100'}`}
                title={selectMode ? 'Exit select mode' : 'Select messages'}
              >
                <CheckSquare className="h-4 w-4" />
              </button>
              {/* Archive conversation */}
              <button
                onClick={archiveConversation}
                className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Archive conversation"
              >
                <Archive className="h-4 w-4" />
              </button>
              <button
                onClick={() => fetchThread(selectedPhone, { silent: true })}
                className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${threadRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className={`p-2 rounded-lg transition-colors ${showInfo ? 'text-brand-600 bg-brand-50' : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100'}`}
                title="Contact info"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Viewport */}
          <div
            ref={viewportRef}
            onScroll={handleViewportScroll}
            className="flex-1 overflow-y-auto px-4 lg:px-6 py-4"
            style={CHAT_BACKGROUND_STYLE}
          >
            {threadLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-[3px] border-surface-200 border-t-brand-500" />
                  <p className="text-[12px] text-surface-500">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl px-8 py-10 shadow-sm border border-white/40">
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6 text-brand-400" />
                  </div>
                  <p className="text-[13px] font-semibold text-surface-700">No messages yet</p>
                  <p className="mt-1 text-[12px] text-surface-400">Send a message to start the conversation</p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-1.5">

                {/* Load older */}
                {threadPagination.older_page && (
                  <div className="flex justify-center py-3">
                    <button
                      type="button"
                      disabled={!threadPagination.older_page}
                      onClick={() => {
                        scrollPlanRef.current = { mode: 'top' };
                        setThreadPagination((c) => ({ ...c, page: c.page + 1 }));
                      }}
                      className="rounded-full bg-white/80 backdrop-blur-sm border border-surface-200/60 px-4 py-1.5 text-[12px] font-semibold text-surface-600 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40"
                    >
                      Load older messages
                    </button>
                  </div>
                )}

                {/* Message bubbles */}
                {messages.map((message, index) => {
                  const isOutbound = message.direction === 'outbound';
                  const previousMessage = messages[index - 1];
                  const showDateDivider = index === 0 || new Date(message.timestamp).toDateString() !== new Date(previousMessage?.timestamp).toDateString();
                  const messageKey = message._id || message.wa_message_id || message.timestamp;
                  const usesCustomBubble = message.message_type === 'template' || MEDIA_TYPES.has(message.message_type) || message.message_type === 'interactive';
                  const skipBubbleBg = message.message_type === 'template' || MEDIA_TYPES.has(message.message_type); // interactive keeps bubble bg

                  return (
                    <div key={messageKey}>
                      {/* Date divider */}
                      {showDateDivider && (
                        <div className="flex justify-center py-3">
                          <span className="rounded-lg bg-white/80 backdrop-blur-sm border border-surface-200/40 px-3 py-1 text-[11px] font-semibold text-surface-500 shadow-sm">
                            {new Date(message.timestamp).toLocaleDateString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: new Date(message.timestamp).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                            })}
                          </span>
                        </div>
                      )}

                      {/* Bubble */}
                      <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-0.5 group/msg`}>
                        {selectMode && (
                          <button
                            type="button"
                            onClick={() => toggleMessageSelect(message._id)}
                            className="flex-shrink-0 mr-2 mt-1"
                          >
                            {selectedMessageIds.has(message._id) ? (
                              <CheckSquare className="w-4 h-4 text-brand-500" />
                            ) : (
                              <Square className="w-4 h-4 text-surface-300 hover:text-surface-500" />
                            )}
                          </button>
                        )}
                        <div className={`max-w-[75%] lg:max-w-[65%] ${
                          skipBubbleBg
                            ? ''
                            : (() => {
                                const srcStyle = getSourceStyle(message);
                                if (srcStyle) return `rounded-xl rounded-br-sm px-3 py-2 ${srcStyle.bubble} shadow-sm`;
                                return `rounded-xl px-3 py-2 ${
                                  isOutbound
                                    ? 'rounded-br-sm bg-[#d9fdd3] border border-[#d1f4cb] shadow-sm'
                                    : 'rounded-bl-sm bg-white border border-surface-200/60 shadow-sm'
                                }`;
                              })()
                        }`}>
                          {/* Source badge for non-manual outbound messages */}
                          {(() => {
                            const srcStyle = getSourceStyle(message);
                            if (!srcStyle) return null;
                            return (
                              <div className="mb-1 flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${srcStyle.dot}`} />
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${srcStyle.badge.split(' ').find(c => c.startsWith('text-'))}`}>{srcStyle.label}</span>
                              </div>
                            );
                          })()}
                          {message.message_type === 'template' && <TemplateBubble message={message} isOutbound={isOutbound} />}
                          {MEDIA_TYPES.has(message.message_type) && <MediaBubble message={message} isOutbound={isOutbound} />}
                          {message.message_type === 'interactive' && <InteractiveBubble message={message} isOutbound={isOutbound} />}
                          {!usesCustomBubble && (
                            <>
                              <p className="whitespace-pre-wrap break-words text-[13px] text-surface-900 leading-relaxed">{getVisibleMessageText(message)}</p>
                              <MessageMetaRow message={message} isOutbound={isOutbound} />
                            </>
                          )}
                          {message.status === 'failed' && (
                            <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-red-50 border border-red-100 px-2 py-1">
                              <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                              <span className="text-[11px] text-red-600 font-medium">Failed to send</span>
                            </div>
                          )}
                        </div>
                        {!selectMode && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Delete this message?')) deleteSingleMessage(message._id);
                            }}
                            className="flex-shrink-0 ml-1 mt-1 opacity-0 group-hover/msg:opacity-100 p-1 rounded text-surface-300 hover:text-red-500 transition-all"
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div ref={endRef} />
              </div>
            )}
          </div>

          {/* ═══ Selected Assets Preview ═══ */}
          {selectedAssets.length > 0 && (
            <div className="bg-white border-t border-surface-200 px-5 py-3 flex-shrink-0">
              <div className="mx-auto max-w-3xl">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5 text-surface-400" />
                    <span className="text-[12px] font-semibold text-surface-600">
                      {selectedAssets.length} file{selectedAssets.length > 1 ? 's' : ''} attached
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={resetMediaComposer}
                    className="text-[11px] font-semibold text-red-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition-all"
                  >
                    Remove all
                  </button>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {selectedAssets.map((asset) => (
                    <div key={asset._id} className="relative flex-shrink-0 group">
                      <div className="rounded-lg overflow-hidden border border-surface-200 bg-surface-50">
                        {renderAssetPickerPreview(asset)}
                      </div>
                      <p className="text-[10px] text-surface-500 mt-1 max-w-[56px] truncate text-center font-medium">{asset.original_name || asset.asset_type}</p>
                      <button
                        type="button"
                        onClick={() => removeSelectedAsset(asset._id)}
                        className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-500 text-white shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="h-2.5 w-2.5" strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowLibrary(true)}
                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-surface-200 text-surface-400 hover:border-brand-400 hover:text-brand-500 hover:bg-brand-50/30 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Select Mode Toolbar ═══ */}
          {selectMode && (
            <div className="flex items-center justify-between bg-brand-50 border-t border-brand-100 px-4 py-2.5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-semibold text-brand-700">
                  {selectedMessageIds.size} selected
                </span>
                <button
                  type="button"
                  onClick={selectAllMessages}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 underline"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={deselectAllMessages}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 underline"
                >
                  Deselect all
                </button>
              </div>
              <button
                type="button"
                onClick={deleteSelectedMessages}
                disabled={selectedMessageIds.size === 0 || deletingMessages}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-[12px] font-semibold hover:bg-red-600 disabled:opacity-40 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedMessageIds.size})
              </button>
            </div>
          )}

          {/* ═══ Compose Bar — Full White Box ═══ */}
          {windowInfo.window_status === 'expired' ? (
            <div className="flex-shrink-0 bg-amber-50 border-t border-amber-200 px-4 lg:px-5 py-3">
              <div className="mx-auto max-w-3xl text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ShieldOff className="w-4 h-4 text-amber-600" />
                  <p className="text-[13px] font-semibold text-amber-700">24-hour window expired</p>
                </div>
                <p className="text-[11px] text-amber-600 mb-3">The customer hasn't replied in 24 hours. You can only send template messages now.</p>
                <a
                  href={`/portal/messages/new?phone=${selectedPhone}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-[12px] font-semibold hover:bg-brand-600 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Template Message
                </a>
              </div>
            </div>
          ) : (
          <div className="flex-shrink-0 bg-white border-t border-surface-200 px-4 lg:px-5 py-3">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-3 bg-surface-50 rounded-xl border border-surface-200 px-3 py-2">

                {/* Emoji button */}
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setAttachMenuOpen(false);
                    }}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      showEmojiPicker
                        ? 'bg-brand-500 text-white'
                        : 'text-surface-500 hover:text-surface-700 hover:bg-white'
                    }`}
                    aria-label="Insert emoji"
                    title="Emoji"
                  >
                    <Smile className="w-[20px] h-[20px]" strokeWidth={1.7} />
                  </button>

                  {/* Emoji Popup */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 z-30 w-[320px] rounded-xl bg-white border border-surface-200 shadow-2xl overflow-hidden animate-slide-down">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-100">
                        <span className="text-[12px] font-bold text-surface-800">Emoji</span>
                        <button type="button" onClick={() => setShowEmojiPicker(false)} className="w-6 h-6 rounded-md flex items-center justify-center text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-3 max-h-[280px] overflow-y-auto">
                        {EMOJI_GROUPS.map((group) => (
                          <div key={group.label} className="mb-3 last:mb-0">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-surface-400 px-1">{group.label}</p>
                            <div className="grid grid-cols-8 gap-1">
                              {group.items.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    insertEmoji(emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                  className="w-8 h-8 rounded-lg text-[18px] hover:bg-surface-100 active:scale-90 flex items-center justify-center transition-all"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Attach button */}
                <div className="relative flex-shrink-0" ref={composerToolsRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachMenuOpen(!attachMenuOpen);
                      setShowEmojiPicker(false);
                    }}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      attachMenuOpen
                        ? 'bg-brand-500 text-white'
                        : 'text-surface-500 hover:text-surface-700 hover:bg-white'
                    }`}
                    aria-label="Attach media"
                    title="Attach file"
                  >
                    <Paperclip className="w-[20px] h-[20px]" strokeWidth={1.7} />
                  </button>

                  {/* Attach Popup */}
                  {attachMenuOpen && (
                    <div className="absolute bottom-12 left-0 z-30 w-[220px] rounded-xl bg-white border border-surface-200 shadow-2xl overflow-hidden animate-slide-down">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-100">
                        <span className="text-[12px] font-bold text-surface-800">Attach</span>
                        <button type="button" onClick={() => setAttachMenuOpen(false)} className="w-6 h-6 rounded-md flex items-center justify-center text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2">
                        {[
                          { type: 'image', icon: Image, label: 'Photo', desc: 'JPG, PNG, GIF', color: 'bg-blue-500' },
                          { type: 'video', icon: Video, label: 'Video', desc: 'MP4, MOV', color: 'bg-violet-500' },
                          { type: 'document', icon: FileText, label: 'Document', desc: 'PDF, DOC, XLS', color: 'bg-amber-500' },
                          { type: 'audio', icon: Mic, label: 'Audio', desc: 'MP3, OGG', color: 'bg-rose-500' },
                        ].map((item) => (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => {
                              openLibraryForType(item.type);
                              setAttachMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-50 transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                              <item.icon className="h-4 w-4 text-white" strokeWidth={2} />
                            </div>
                            <div className="text-left">
                              <p className="text-[12px] font-semibold text-surface-800 leading-tight">{item.label}</p>
                              <p className="text-[10px] text-surface-400 leading-tight">{item.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive message button */}
                <button
                  type="button"
                  onClick={() => setShowInteractiveBuilder(true)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-surface-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex-shrink-0"
                  aria-label="Send interactive message"
                  title="Interactive message (buttons / list)"
                >
                  <MousePointerClick className="w-[20px] h-[20px]" strokeWidth={1.7} />
                </button>

                {/* Send Flow button */}
                <button
                  type="button"
                  onClick={openFlowSendFromChat}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-surface-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex-shrink-0"
                  aria-label="Send WhatsApp Flow"
                  title="Send WhatsApp Flow"
                >
                  <GitBranch className="w-[20px] h-[20px]" strokeWidth={1.7} />
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-surface-200 flex-shrink-0" />

                {/* Text input with Quick Reply popup */}
                <div className="flex-1 min-w-0 relative">
                  <QuickReplyPopup
                    text={text}
                    inputRef={textareaRef}
                    position="above"
                    onSelect={(message) => {
                      // Replace the "/shortcut" at the end with the quick reply message
                      const cleaned = text.replace(/(?:^|\s)\/\S*$/, '').trimEnd();
                      setText(cleaned ? cleaned + ' ' + message : message);
                      textareaRef.current?.focus();
                    }}
                  />
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        // Don't send if quick reply popup might be handling this
                        const hasSlash = text.match(/(?:^|\s)\/\S*$/);
                        if (hasSlash) return; // popup handles Enter
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    onPaste={(e) => {
                      const files = Array.from(e.clipboardData?.files || []);
                      if (files.length > 0) {
                        e.preventDefault();
                        queueFilesForLibrary(files);
                      }
                    }}
                    placeholder="Type a message... (/ for quick replies)"
                    className="w-full max-h-[100px] resize-none border-0 bg-transparent py-1.5 text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-0"
                    rows="1"
                  />
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-surface-200 flex-shrink-0" />

                {/* Mic / Recording button */}
                {isRecordingAudio ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Cancel recording */}
                    <button
                      type="button"
                      onClick={cancelAudioRecording}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-all"
                      title="Cancel recording"
                    >
                      <XCircle className="w-[20px] h-[20px]" strokeWidth={1.7} />
                    </button>
                    {/* Recording indicator */}
                    <div className="flex items-center gap-2 px-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[12px] font-semibold text-red-600 tabular-nums">{formatRecordingTime(recordingDuration)}</span>
                    </div>
                    {/* Send recording */}
                    <button
                      type="button"
                      onClick={stopAudioRecording}
                      className="w-9 h-9 rounded-lg flex items-center justify-center bg-brand-500 text-white hover:bg-brand-600 active:scale-95 transition-all"
                      title="Send voice message"
                    >
                      <Send className="w-[20px] h-[20px]" strokeWidth={1.7} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startAudioRecording}
                    disabled={sending}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-surface-500 hover:text-surface-700 hover:bg-white transition-all disabled:opacity-40 flex-shrink-0"
                    aria-label="Record audio"
                    title="Voice message"
                  >
                    <Mic className="w-[20px] h-[20px]" strokeWidth={1.7} />
                  </button>
                )}

                {/* Send button */}
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sending || (!text.trim() && !selectedAssets.length && !mediaUrl.trim())}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                    text.trim() || selectedAssets.length || mediaUrl.trim()
                      ? 'bg-brand-500 text-white hover:bg-brand-600 active:scale-95'
                      : 'text-surface-400 hover:text-surface-600 hover:bg-white'
                  }`}
                  aria-label="Send message"
                  title="Send"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                  ) : (
                    <Send className="w-[20px] h-[20px]" strokeWidth={1.7} />
                  )}
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      ) : (
        /* Empty state when no conversation selected */
        <div className="hidden md:flex flex-1 items-center justify-center bg-surface-50">
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-50 to-emerald-50 border border-brand-100/50 flex items-center justify-center mx-auto mb-5 shadow-sm">
              <MessageSquare className="w-8 h-8 text-brand-400" />
            </div>
            <h3 className="text-[15px] font-bold text-surface-800 mb-1">Select a conversation</h3>
            <p className="text-[13px] text-surface-400 max-w-[240px]">Choose a chat from the sidebar to start messaging</p>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────── */}
      {/*  RIGHT PANEL — Contact Info                          */}
      {/* ──────────────────────────────────────────────────── */}
      {selectedPhone && showInfo && (
        <div className="hidden lg:flex w-[320px] flex-col border-l border-surface-200 bg-white flex-shrink-0">

          {/* Info Header */}
          <div className="h-[56px] flex items-center justify-between px-4 border-b border-surface-200 flex-shrink-0">
            <h3 className="text-[13px] font-bold text-surface-900">Contact Info</h3>
            <div className="flex items-center gap-1">
              <button onClick={openEditContact} className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-brand-600 transition-colors" title="Edit contact">
                <Edit3 className="h-4 w-4" />
              </button>
              <button onClick={() => setShowInfo(false)} className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Contact Card */}
          <div className="px-4 py-5 border-b border-surface-100">
            <div className="text-center">
              <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${currentAvatarTheme.shell} text-xl font-bold text-white shadow-md`}>
                {String(currentDisplayName || '?')[0]?.toUpperCase()}
              </div>
              <p className="text-[14px] font-bold text-surface-900">{currentDisplayName}</p>
              <p className="mt-0.5 text-[12px] text-surface-500">+{selectedPhone}</p>
              {/* Subscription badge */}
              {contactStats && (
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  {contactStats.opt_in ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                      <Shield className="w-3 h-3" /> Subscribed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-[10px] font-semibold text-red-600">
                      <ShieldOff className="w-3 h-3" /> Unsubscribed
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* Message Stats */}
            {contactStats && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2">Message Stats</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface-50 rounded-lg p-2.5 border border-surface-100">
                    <p className="text-[18px] font-bold text-surface-900">{contactStats.sent_count}</p>
                    <p className="text-[10px] text-surface-500 font-medium">Sent</p>
                  </div>
                  <div className="bg-surface-50 rounded-lg p-2.5 border border-surface-100">
                    <p className="text-[18px] font-bold text-surface-900">{contactStats.received_count}</p>
                    <p className="text-[10px] text-surface-500 font-medium">Received</p>
                  </div>
                  <div className="bg-surface-50 rounded-lg p-2.5 border border-surface-100">
                    <p className="text-[18px] font-bold text-brand-600">{contactStats.retention_ratio}%</p>
                    <p className="text-[10px] text-surface-500 font-medium">Reply Rate</p>
                  </div>
                  <div className="bg-surface-50 rounded-lg p-2.5 border border-surface-100">
                    <p className="text-[18px] font-bold text-surface-900">{contactStats.total_messages}</p>
                    <p className="text-[10px] text-surface-500 font-medium">Total</p>
                  </div>
                </div>
                {contactStats.first_message_at && (
                  <p className="mt-2 text-[10px] text-surface-400">
                    First contact: {new Date(contactStats.first_message_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {/* 24h Window Status */}
            {windowInfo.window_status !== 'none' && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2">Conversation Window</p>
                <div className={`rounded-lg px-3 py-2.5 border ${
                  windowInfo.window_status === 'open'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {windowInfo.window_status === 'open' ? (
                      <>
                        <Timer className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-[12px] font-semibold text-emerald-700">Window Open</p>
                          <p className="text-[10px] text-emerald-600">{windowTimeLeft} remaining</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <ShieldOff className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="text-[12px] font-semibold text-red-700">Window Expired</p>
                          <p className="text-[10px] text-red-600">Template messages only</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp status */}
            {contact?.wa_exists && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2">WhatsApp</p>
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  contact.wa_exists === 'yes'
                    ? 'bg-emerald-50 border border-emerald-100'
                    : 'bg-red-50 border border-red-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${contact.wa_exists === 'yes' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className={`text-[12px] font-semibold ${contact.wa_exists === 'yes' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {contact.wa_exists === 'yes' ? 'Active on WhatsApp' : 'Not on WhatsApp'}
                  </span>
                </div>
              </div>
            )}

            {/* Contact Details */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2">Details</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-[12px] text-surface-700">
                  <Phone className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                  <span>+{selectedPhone}</span>
                </div>
                {contact?.name && (
                  <div className="flex items-center gap-2 text-[12px] text-surface-700">
                    <User className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                    <span>{contact.name}</span>
                  </div>
                )}
                {contact?.email && (
                  <div className="flex items-center gap-2 text-[12px] text-surface-700">
                    <Mail className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact?.birthday && (
                  <div className="flex items-center gap-2 text-[12px] text-surface-700">
                    <Star className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                    <span>Birthday: {contact.birthday}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {contact?.tags?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((tag, i) => (
                    <span key={i} className="bg-surface-100 text-surface-600 text-[11px] font-medium px-2 py-0.5 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Fields */}
            {contact?.custom_fields && Object.keys(contact.custom_fields).length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2">Custom Fields</p>
                <div className="space-y-1.5">
                  {Object.entries(contact.custom_fields).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-[12px]">
                      <span className="text-surface-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-surface-700 font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {contact?.notes && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2">Notes</p>
                <p className="text-[12px] text-surface-600 leading-relaxed bg-surface-50 rounded-lg p-2.5 border border-surface-100">
                  {contact.notes}
                </p>
              </div>
            )}
          </div>

          {/* Edit Contact Modal */}
          {showEditContact && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowEditContact(false)}>
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[15px] font-bold text-surface-900">Edit Contact</h3>
                  <button onClick={() => setShowEditContact(false)} className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={editContactData.name}
                      onChange={e => setEditContactData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-lg border border-surface-200 px-3 py-2 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={editContactData.email}
                      onChange={e => setEditContactData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full rounded-lg border border-surface-200 px-3 py-2 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-600 mb-1">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={editContactData.tags}
                      onChange={e => setEditContactData(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full rounded-lg border border-surface-200 px-3 py-2 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                      placeholder="vip, active, premium"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-600 mb-1">Notes</label>
                    <textarea
                      value={editContactData.notes}
                      onChange={e => setEditContactData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full rounded-lg border border-surface-200 px-3 py-2 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 resize-none"
                      rows="3"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditContact(false)}
                    className="px-4 py-2 rounded-lg border border-surface-200 text-[13px] font-semibold text-surface-600 hover:bg-surface-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEditContact}
                    disabled={savingContact}
                    className="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px] font-semibold hover:bg-brand-600 disabled:opacity-50"
                  >
                    {savingContact ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Media Library Modal */}
      <MediaLibraryModal
        open={showLibrary}
        onClose={() => { setShowLibrary(false); setMediaMode(null); }}
        mediaType={mediaMode}
        allowMultiple={true}
        onSelect={(assets) => {
          setSelectedAssets((prev) => {
            const existingIds = new Set(prev.map((a) => a._id));
            const newAssets = assets.filter((a) => !existingIds.has(a._id));
            return [...prev, ...newAssets];
          });
        }}
      />

      {/* Interactive Message Builder Modal */}
      <InteractiveMessageModal
        open={showInteractiveBuilder}
        onClose={() => setShowInteractiveBuilder(false)}
        onSend={sendInteractiveMessage}
        sending={sending}
      />

      {/* ── Send Flow from Chat Modal ── */}
      {showFlowSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowFlowSend(false)}>
          <div
            className="bg-white rounded-xl border border-surface-200 shadow-2xl w-full max-w-md animate-fade-in-up max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-[14px] font-bold text-surface-900">Send WhatsApp Flow</h3>
                <p className="text-[11px] text-surface-400 mt-0.5">
                  To: {contact?.name || contact?.wa_name || selectedPhone}
                </p>
              </div>
              <button onClick={() => setShowFlowSend(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Flow selector */}
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Select Flow *</label>
                {flowSendLoading ? (
                  <div className="flex items-center gap-2 py-4 justify-center text-surface-400">
                    <div className="w-4 h-4 border-2 border-surface-200 border-t-brand-500 rounded-full animate-spin" />
                    <span className="text-[12px]">Loading flows...</span>
                  </div>
                ) : publishedFlows.length === 0 ? (
                  <div className="bg-surface-50 rounded-lg border border-surface-200 p-4 text-center">
                    <GitBranch className="w-5 h-5 text-surface-300 mx-auto mb-1" />
                    <p className="text-[12px] text-surface-500">No published flows found</p>
                    <p className="text-[11px] text-surface-400 mt-0.5">Create and publish a flow first</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {publishedFlows.map((f) => {
                      const fId = f._id || f.id;
                      const isSelected = flowSendData.flowId === fId;
                      return (
                        <button
                          key={fId}
                          onClick={() => setFlowSendData((d) => ({ ...d, flowId: fId }))}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                            isSelected
                              ? 'bg-brand-50 border-brand-200 ring-2 ring-brand-500/20'
                              : 'bg-white border-surface-200 hover:border-brand-200 hover:bg-surface-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-brand-100' : 'bg-surface-100'}`}>
                            <GitBranch className={`w-4 h-4 ${isSelected ? 'text-brand-600' : 'text-surface-500'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[12px] font-semibold truncate ${isSelected ? 'text-brand-700' : 'text-surface-900'}`}>{f.name}</p>
                            {f.categories && f.categories.length > 0 && (
                              <p className="text-[10px] text-surface-400 truncate">{f.categories.join(', ')}</p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Body text (required) */}
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Body Text *</label>
                <textarea
                  value={flowSendData.body}
                  onChange={(e) => setFlowSendData((d) => ({ ...d, body: e.target.value }))}
                  placeholder="Message body shown with the flow..."
                  rows={3}
                  className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all resize-none"
                />
              </div>

              {/* CTA + Footer side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">CTA Button</label>
                  <input
                    type="text"
                    value={flowSendData.cta}
                    onChange={(e) => setFlowSendData((d) => ({ ...d, cta: e.target.value }))}
                    placeholder="Open Flow"
                    className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Footer</label>
                  <input
                    type="text"
                    value={flowSendData.footer}
                    onChange={(e) => setFlowSendData((d) => ({ ...d, footer: e.target.value }))}
                    placeholder="Optional"
                    className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Header</label>
                <input
                  type="text"
                  value={flowSendData.header}
                  onChange={(e) => setFlowSendData((d) => ({ ...d, header: e.target.value }))}
                  placeholder="Optional header"
                  className="w-full bg-white border border-surface-200 rounded-lg px-3 py-[7px] text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                />
              </div>

              {/* 24h window info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-[11px] text-blue-700 font-medium">Flows can only be sent within the 24-hour conversation window. The contact must have messaged you recently.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-100 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowFlowSend(false)}
                className="px-4 py-2 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFlowSendFromChat}
                disabled={flowSending || !flowSendData.flowId || !flowSendData.body.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {flowSending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {flowSending ? 'Sending...' : 'Send Flow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
