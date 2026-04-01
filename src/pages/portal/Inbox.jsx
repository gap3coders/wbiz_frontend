import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import MediaLibraryModal from '../../MediaLibraryModal';
import { detectMediaAssetType, formatFileSize } from '../../mediaLibraryHelpers';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Circle,
  Clock,
  FileText,
  Image,
  MessageSquare,
  Mic,
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
} from 'lucide-react';

const TICKS = {
  sent: <Check className="w-3.5 h-3.5 text-gray-400" />,
  delivered: <CheckCheck className="w-3.5 h-3.5 text-gray-400" />,
  read: <CheckCheck className="w-3.5 h-3.5 text-blue-500" />,
  failed: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
  queued: <Clock className="w-3.5 h-3.5 text-gray-300" />,
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
  return `${Math.floor(seconds / 86400)}d`;
};

const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

const conversationName = (item) => item?.contact_name || item?.wa_name || item?.name || item?.contact_phone || 'Unknown';
const MEDIA_TYPES = new Set(['image', 'document', 'video', 'audio']);
const TEMPLATE_PATTERN = /^\[Template:\s*(.+?)\]$/i;

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

function TemplateBubble({ message }) {
  const templateName = getTemplateName(message);
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Template</p>
      <p className="text-sm font-medium text-gray-900 mt-1 break-words">{templateName || 'WhatsApp template message'}</p>
      <p className="text-xs text-gray-500 mt-1">Sent using a Meta-approved WhatsApp template.</p>
    </div>
  );
}

function MediaBubble({ message }) {
  const [resolvedUrl, setResolvedUrl] = useState(message.media_url || '');
  const [loading, setLoading] = useState(Boolean(!message.media_url && message.media_id));
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    if (message.media_url) {
      setResolvedUrl(message.media_url);
      setLoading(false);
      setLoadError('');
      return undefined;
    }

    if (!message.media_id) {
      setResolvedUrl('');
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setLoadError('');

    api
      .get(`/meta/media/${message.media_id}`, {
        responseType: 'blob',
        params: message.media_filename ? { filename: message.media_filename } : undefined,
      })
      .then((response) => {
        if (!active) return;
        objectUrl = window.URL.createObjectURL(response.data);
        setResolvedUrl(objectUrl);
      })
      .catch((error) => {
        if (!active) return;
        devError('[Inbox][Media Load Failed]', error?.response?.data || error);
        setLoadError('Could not load media preview');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [message.media_filename, message.media_id, message.media_url]);

  const text = getVisibleMessageText(message);
  const fileLabel = message.media_filename || `${message.message_type || 'file'}`;

  return (
    <div className="space-y-2">
      {loading ? <div className="h-40 rounded-xl bg-gray-100 animate-pulse" /> : null}

      {!loading && message.message_type === 'image' && resolvedUrl ? (
        <a href={resolvedUrl} target="_blank" rel="noreferrer" className="block">
          <img src={resolvedUrl} alt={text || 'Shared image'} className="max-h-72 w-full rounded-xl object-cover border border-black/5" />
        </a>
      ) : null}

      {!loading && message.message_type === 'video' && resolvedUrl ? (
        <video src={resolvedUrl} controls className="max-h-72 w-full rounded-xl bg-black" />
      ) : null}

      {!loading && message.message_type === 'audio' && resolvedUrl ? (
        <audio src={resolvedUrl} controls className="w-full" />
      ) : null}

      {!loading && message.message_type === 'document' ? (
        <a
          href={resolvedUrl || message.media_url || '#'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white/70 px-3 py-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{fileLabel}</p>
            <p className="text-xs text-gray-500">Open document</p>
          </div>
        </a>
      ) : null}

      {loadError ? <p className="text-xs text-red-500">{loadError}</p> : null}
      {text ? <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{text}</p> : null}
      {!loading && !resolvedUrl && !loadError && message.message_type !== 'document' ? (
        <p className="text-xs text-gray-500 capitalize">{message.message_type} attached</p>
      ) : null}
    </div>
  );
}

const mergeAssets = (current, incoming) => {
  const nextMap = new Map(current.map((asset) => [asset._id, asset]));
  incoming.forEach((asset) => nextMap.set(asset._id, asset));
  return Array.from(nextMap.values());
};

const renderAssetPickerPreview = (asset) => {
  if (asset.asset_type === 'image') {
    return <img src={asset.public_url} alt={asset.original_name} className="h-16 w-16 rounded-2xl object-cover" />;
  }

  if (asset.asset_type === 'video') {
    return <video src={asset.public_url} className="h-16 w-16 rounded-2xl bg-black object-cover" muted />;
  }

  const Icon = asset.asset_type === 'audio' ? Mic : FileText;
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
      <Icon className="h-5 w-5" />
    </div>
  );
};

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
    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'220\' height=\'220\' viewBox=\'0 0 220 220\'%3E%3Cg fill=\'none\' stroke=\'rgba(0,0,0,0.045)\' stroke-width=\'1.2\' stroke-linecap=\'round\'%3E%3Cpath d=\'M30 35c8-6 15-6 23 0\'/%3E%3Cpath d=\'M140 30c7 3 13 9 16 17\'/%3E%3Cpath d=\'M78 82c8 0 14 6 14 14s-6 14-14 14-14-6-14-14 6-14 14-14Z\'/%3E%3Cpath d=\'M150 85c11 0 20 9 20 20s-9 20-20 20-20-9-20-20 9-20 20-20Z\'/%3E%3Cpath d=\'M33 145h26\'/%3E%3Cpath d=\'M45 132v26\'/%3E%3Cpath d=\'M112 150c14-10 29-10 43 0\'/%3E%3Cpath d=\'M168 170c0 7-6 13-13 13s-13-6-13-13 6-13 13-13 13 6 13 13Z\'/%3E%3Cpath d=\'M78 175c6-5 12-5 18 0\'/%3E%3Cpath d=\'M185 48l8 8m0-8-8 8\'/%3E%3C/g%3E%3C/svg%3E")',
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
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadRefreshing, setThreadRefreshing] = useState(false);
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

  const listSignatureRef = useRef('');
  const msgSignatureRef = useRef('');
  const msgMetaRef = useRef({ count: 0, lastKey: null });
  const forceScrollRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const scrollPlanRef = useRef(null);
  const listRequestInFlightRef = useRef(false);
  const threadRequestIdRef = useRef(0);
  const viewportRef = useRef(null);
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const composerToolsRef = useRef(null);

  const selectedConversation = conversations.find((item) => item.contact_phone === selectedPhone) || null;
  const currentDisplayName =
    contact?.wa_name || contact?.name || selectedConversation?.contact_name || selectedConversation?.contact_phone || selectedPhone;
  const currentAvatarTheme = getAvatarTheme(currentDisplayName);
  const requestedPhone = String(searchParams.get('phone') || '').replace(/[^\d]/g, '');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!requestedPhone) return;
    if (selectedPhone !== requestedPhone) {
      setSelectedPhone(requestedPhone);
    }
  }, [requestedPhone, selectedPhone]);

  const openConversation = useCallback((phone) => {
    const normalizedPhone = String(phone || '').replace(/[^\d]/g, '');
    if (!normalizedPhone) return;
    setSelectedPhone(normalizedPhone);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('phone', normalizedPhone);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const closeConversation = useCallback(() => {
    setSelectedPhone(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('phone');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const fetchConversations = useCallback(async ({ silent = false } = {}) => {
    if (listRequestInFlightRef.current) return;
    listRequestInFlightRef.current = true;
    if (silent) setListRefreshing(true);
    else setListLoading(true);

    try {
      const { data } = await api.get('/conversations', { params: searchQuery ? { search: searchQuery } : {} });
      const nextItems = data?.data?.conversations || [];
      const nextSignature = conversationSignature(nextItems);
      if (nextSignature !== listSignatureRef.current) {
        listSignatureRef.current = nextSignature;
        setConversations(nextItems);
      }
    } catch (error) {
      devError('[Inbox] Failed to load conversations', error?.response?.data || error);
      if (!silent) toast.error('Failed to load conversations');
    } finally {
      listRequestInFlightRef.current = false;
      if (silent) setListRefreshing(false);
      else setListLoading(false);
    }
  }, [searchQuery]);

  const fetchThread = useCallback(async (phone, { silent = false } = {}) => {
    if (!phone) return;
    const requestId = threadRequestIdRef.current + 1;
    threadRequestIdRef.current = requestId;
    if (silent) setThreadRefreshing(true);
    else setThreadLoading(true);

    try {
      const viewport = viewportRef.current;
      const shouldStick = isNearBottom(viewport);
      const previousBottomOffset = viewport ? viewport.scrollHeight - viewport.scrollTop : null;
      const { data } = await api.get(`/conversations/${phone}`);
      if (threadRequestIdRef.current !== requestId) return;
      const nextMessages = data?.data?.messages || [];
      const nextContact = data?.data?.contact || null;
      const nextSignature = messageSignature(nextMessages);
      const lastKey = nextMessages.at(-1)?._id || nextMessages.at(-1)?.wa_message_id || nextMessages.at(-1)?.timestamp || null;
      const hasTailChange = nextMessages.length !== msgMetaRef.current.count || lastKey !== msgMetaRef.current.lastKey;

      if (nextSignature !== msgSignatureRef.current) {
        msgSignatureRef.current = nextSignature;
        msgMetaRef.current = { count: nextMessages.length, lastKey };
        if (forceScrollRef.current || shouldStick) {
          scrollPlanRef.current = { mode: 'bottom', behavior: hasTailChange ? 'smooth' : 'auto' };
        } else if (previousBottomOffset !== null) {
          scrollPlanRef.current = { mode: 'preserve', bottomOffset: previousBottomOffset };
        }
        setMessages(nextMessages);
      }
      setContact(nextContact);
    } catch (error) {
      devError('[Inbox] Failed to load thread', error?.response?.data || error);
      if (!silent) toast.error('Failed to load conversation');
    } finally {
      if (threadRequestIdRef.current !== requestId) return;
      if (silent) setThreadRefreshing(false);
      else setThreadLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetchConversations({ silent: true });
    }, 20000);
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
      devError('[Inbox] Failed to mark conversation as read', error?.response?.data || error);
      return 0;
    }
  }, []);

  useEffect(() => {
    if (!selectedPhone) {
      setMessages([]);
      setContact(null);
      msgSignatureRef.current = '';
      msgMetaRef.current = { count: 0, lastKey: null };
      return undefined;
    }

    forceScrollRef.current = true;
    (async () => {
      await fetchThread(selectedPhone);
      await markConversationRead(selectedPhone, { silent: true });
      await fetchConversations({ silent: true });
    })();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      (async () => {
        await fetchThread(selectedPhone, { silent: true });
        await markConversationRead(selectedPhone, { silent: true });
        await fetchConversations({ silent: true });
      })();
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [fetchConversations, fetchThread, markConversationRead, selectedPhone]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const plan = scrollPlanRef.current;
    if (!viewport || !plan) return;

    if (plan.mode === 'bottom') {
      endRef.current?.scrollIntoView({ behavior: plan.behavior || 'auto', block: 'end' });
      stickToBottomRef.current = true;
    } else if (plan.mode === 'preserve' && typeof plan.bottomOffset === 'number') {
      viewport.scrollTop = Math.max(0, viewport.scrollHeight - plan.bottomOffset);
    }

    scrollPlanRef.current = null;
    forceScrollRef.current = false;
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [text]);

  useEffect(() => {
    const handler = (event) => {
      if (composerToolsRef.current && !composerToolsRef.current.contains(event.target)) {
        setAttachMenuOpen(false);
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleViewportScroll = () => {
    stickToBottomRef.current = isNearBottom(viewportRef.current);
  };

  const queueFilesForLibrary = (files, forcedType = null) => {
    const list = Array.from(files || []);
    if (!list.length) return;

    const targetType = forcedType || detectMediaAssetType(list[0]);
    const compatibleFiles = list.filter((file) => detectMediaAssetType(file) === targetType);

    if (!compatibleFiles.length) {
      toast.error('No compatible files found for the selected media type.');
      return;
    }

    setMediaMode(targetType);
    setQueuedFiles(compatibleFiles);
    setShowLibrary(true);
    setAttachMenuOpen(false);
  };

  const openLibraryForType = (type) => {
    setMediaMode(type);
    setShowLibrary(true);
    setAttachMenuOpen(false);
  };

  const resetMediaComposer = () => {
    setMediaMode(null);
    setMediaUrl('');
    setMediaCaption('');
    setSelectedAssets([]);
    setQueuedFiles([]);
    setAttachMenuOpen(false);
    setShowEmojiPicker(false);
  };

  const removeSelectedAsset = (assetId) => {
    setSelectedAssets((current) => current.filter((asset) => asset._id !== assetId));
  };

  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current;
    const currentText = text || '';

    if (!textarea) {
      setText(`${currentText}${emoji}`);
      return;
    }

    const start = textarea.selectionStart ?? currentText.length;
    const end = textarea.selectionEnd ?? currentText.length;
    const nextValue = `${currentText.slice(0, start)}${emoji}${currentText.slice(end)}`;
    setText(nextValue);
    setShowEmojiPicker(false);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + emoji.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const upsertConversationPreview = useCallback((phone, updater) => {
    setConversations((current) => {
      const nextItems = [...current];
      const index = nextItems.findIndex((item) => item.contact_phone === phone);
      if (index === -1) return current;
      nextItems[index] = updater(nextItems[index]);
      nextItems.sort((left, right) => new Date(right.last_message_at || 0) - new Date(left.last_message_at || 0));
      listSignatureRef.current = conversationSignature(nextItems);
      return nextItems;
    });
  }, []);

  const sendMessage = async () => {
    if (!selectedPhone) return;
    const normalizedPhone = String(selectedPhone).replace(/[^\d]/g, '');

    if (!normalizedPhone) {
      toast.error('Select a valid conversation first');
      return;
    }

    if (!mediaMode && !text.trim()) return;

    const mediaPayloads = mediaMode
      ? (
          selectedAssets.length
            ? selectedAssets
            : mediaUrl.trim()
              ? [{
                  asset_type: mediaMode,
                  public_url: mediaUrl.trim(),
                  original_name: mediaMode === 'document' ? 'document' : `${mediaMode}-asset`,
                }]
              : []
        )
      : [];

    if (mediaMode && !mediaPayloads.length) {
      toast.error('Choose media from the gallery or enter a direct URL');
      return;
    }

    setSending(true);
    const optimisticTimestamp = new Date().toISOString();
    const optimisticMessages = mediaMode
      ? mediaPayloads.map((asset, index) => ({
          _id: `temp-${Date.now()}-${index}`,
          direction: 'outbound',
          message_type: asset.asset_type,
          content: asset.asset_type === 'audio' ? '' : mediaCaption.trim() || `[${asset.asset_type}] ${asset.original_name}`,
          status: 'queued',
          timestamp: optimisticTimestamp,
          error_message: null,
          error_source: null,
          media_url: asset.public_url,
          media_filename: asset.original_name || null,
        }))
      : [{
          _id: `temp-${Date.now()}`,
          direction: 'outbound',
          message_type: 'text',
          content: text.trim(),
          status: 'queued',
          timestamp: optimisticTimestamp,
          error_message: null,
          error_source: null,
        }];
    const lastOptimisticMessage = optimisticMessages[optimisticMessages.length - 1];

    scrollPlanRef.current = { mode: 'bottom', behavior: 'smooth' };
    forceScrollRef.current = true;
    setMessages((current) => [...current, ...optimisticMessages]);
    msgMetaRef.current = {
      count: msgMetaRef.current.count + optimisticMessages.length,
      lastKey: lastOptimisticMessage?._id || null,
    };
    upsertConversationPreview(normalizedPhone, (conversation) => ({
      ...conversation,
      last_message: lastOptimisticMessage?.content || '',
      last_message_type: lastOptimisticMessage?.message_type || 'text',
      last_message_direction: 'outbound',
      last_message_status: 'queued',
      last_message_at: optimisticTimestamp,
      last_media_filename: lastOptimisticMessage?.media_filename || conversation.last_media_filename,
      total_messages: Number(conversation.total_messages || 0) + optimisticMessages.length,
    }));

    try {
      if (mediaMode) {
        let acceptedCount = 0;
        let failedCount = 0;

        for (let index = 0; index < mediaPayloads.length; index += 1) {
          const asset = mediaPayloads[index];
          const optimisticId = optimisticMessages[index]._id;

          try {
            await api.post('/meta/messages/send-media', {
              to: normalizedPhone,
              type: asset.asset_type,
              url: asset.public_url,
              caption: asset.asset_type === 'audio' ? '' : mediaCaption.trim(),
              filename:
                asset.asset_type === 'document'
                  ? asset.original_name || 'document'
                  : asset.original_name || undefined,
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
          await Promise.all([
            fetchThread(normalizedPhone, { silent: true }),
            fetchConversations({ silent: true }),
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
      await Promise.all([
        fetchThread(normalizedPhone, { silent: true }),
        fetchConversations({ silent: true }),
      ]);
    } catch (error) {
      const payload = error?.response?.data || {};
      const source = payload?.error_source === 'meta' || payload?.meta?.source === 'meta' ? 'Meta' : 'Platform';
      devError('[Inbox] Failed to send message', payload || error);
      setMessages((current) =>
        current.map((item) =>
          item._id === optimisticMessages[0]._id
            ? {
                ...item,
                status: 'failed',
                error_source: source.toLowerCase() === 'meta' ? 'meta' : 'platform',
                error_message: payload?.error || 'Failed to send message',
              }
            : item
        )
      );
      upsertConversationPreview(normalizedPhone, (conversation) => ({
        ...conversation,
        last_message_status: 'failed',
      }));
      toast.error(`${source} Error: ${payload?.error || 'Failed to send message'}`);
    } finally {
      setSending(false);
    }
  };

  const visibleConversations = conversations.filter((item) => (tab === 'unread' ? item.unread_count > 0 : true));

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      <div className={`${selectedPhone ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[340px] lg:w-[380px] bg-white border-r border-gray-100 flex-shrink-0`}>
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display text-lg font-bold text-gray-900">Inbox</h2>
              <p className="text-xs text-gray-400 mt-0.5">{listRefreshing ? 'Refreshing conversations...' : 'Live conversation history'}</p>
            </div>
            <button onClick={() => fetchConversations({ silent: true })} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" aria-label="Refresh conversations">
              <RefreshCw className={`w-4 h-4 ${listRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search conversations..."
              className="bg-transparent border-none text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full focus:ring-0"
            />
          </div>

          <div className="flex gap-1 mt-3">
            {['all', 'unread'].map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${tab === item ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : visibleConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm text-gray-500 font-medium">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Incoming chats and sent messages will appear here.</p>
            </div>
          ) : (
            visibleConversations.map((conversation) => {
              const isSelected = selectedPhone === conversation.contact_phone;
              const preview = getFriendlyConversationPreview(conversation);
              const avatarTheme = getAvatarTheme(conversationName(conversation));

              return (
                <button
                  key={conversation._id}
                  onClick={() => openConversation(conversation.contact_phone)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-50 transition-all ${isSelected ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : 'hover:bg-gray-50'}`}
                >
                  <div className="relative">
                    <div className={`w-11 h-11 bg-gradient-to-br ${avatarTheme.shell} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                      {conversationName(conversation)[0]?.toUpperCase()}
                    </div>
                    {conversation.unread_count > 0 ? (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {conversation.unread_count}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {conversationName(conversation)}
                      </p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{relativeTime(conversation.last_message_at)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      {conversation.last_message_direction === 'outbound' ? TICKS[conversation.last_message_status] : null}
                      {TYPE_ICONS[conversation.last_message_type] || null}
                      <p className={`text-xs truncate ${conversation.unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                        {preview}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {selectedPhone ? (
        <div className="flex-1 flex min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="h-16 px-4 flex items-center justify-between bg-white border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={closeConversation} className="md:hidden p-1 text-gray-500">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className={`w-10 h-10 bg-gradient-to-br ${currentAvatarTheme.shell} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {String(currentDisplayName || '?')[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{currentDisplayName}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-gray-400">+{selectedPhone}</p>
                    {contact?.wa_exists === 'yes' ? <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded">WhatsApp Yes</span> : null}
                    {contact?.wa_exists === 'no' ? <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-600 rounded">No WA</span> : null}
                    {threadRefreshing ? <span className="text-[10px] text-emerald-600 font-medium">Refreshing thread...</span> : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => fetchThread(selectedPhone, { silent: true })} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" aria-label="Refresh thread">
                  <RefreshCw className={`w-4 h-4 ${threadRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setShowInfo((current) => !current)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <User className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={viewportRef}
              onScroll={handleViewportScroll}
              className="flex-1 overflow-y-auto px-4 py-4"
              style={CHAT_BACKGROUND_STYLE}
            >
              {threadLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading conversation...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No messages yet</p>
                    <p className="text-xs text-gray-400 mt-1">Send the first WhatsApp message from the composer below.</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-1">
                  {messages.map((message, index) => {
                    const isOutbound = message.direction === 'outbound';
                    const previousMessage = messages[index - 1];
                    const showDateDivider = index === 0 || new Date(message.timestamp).toDateString() !== new Date(previousMessage?.timestamp).toDateString();

                    return (
                      <div key={message._id || `${message.timestamp}-${index}`}>
                        {showDateDivider ? (
                          <div className="flex justify-center my-3">
                            <span className="bg-white/90 text-xs text-gray-500 px-3 py-1 rounded-full shadow-sm">
                              {new Date(message.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        ) : null}

                        <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-0.5`}>
                          <div className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm ${isOutbound ? 'bg-[#d9fdd3] rounded-tr-md' : 'bg-white rounded-tl-md'}`}>
                            {message.message_type === 'template' ? <TemplateBubble message={message} /> : null}
                            {MEDIA_TYPES.has(message.message_type) ? <MediaBubble message={message} /> : null}
                            {!MEDIA_TYPES.has(message.message_type) && message.message_type !== 'template' ? (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                {TYPE_ICONS[message.message_type] || null}
                                <span className="capitalize">{message.message_type}</span>
                              </div>
                            ) : null}
                            {!MEDIA_TYPES.has(message.message_type) && message.message_type !== 'template' ? (
                              <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{getVisibleMessageText(message) || 'WhatsApp message'}</p>
                            ) : null}
                            {message.status === 'failed' ? (
                              <div className={`mt-2 px-2 py-1 rounded text-[10px] font-medium ${message.error_source === 'meta' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                {message.error_source === 'meta' ? 'Meta Error' : 'Platform Error'}: {message.error_message}
                              </div>
                            ) : null}
                            <div className={`flex items-center gap-1 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[10px] text-gray-500">{formatTime(message.timestamp)}</span>
                              {isOutbound ? TICKS[message.status] || null : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <div className="border-t border-[#e7ddd2] px-4 py-3 flex-shrink-0" style={CHAT_FOOTER_BACKGROUND_STYLE}>
              <div
                className={`mx-auto max-w-3xl transition-all ${composerDragActive ? 'scale-[1.01]' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setComposerDragActive(true);
                }}
                onDragLeave={() => setComposerDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setComposerDragActive(false);
                  queueFilesForLibrary(event.dataTransfer.files);
                }}
              >
                {mediaMode ? (
                  <div className={`rounded-[30px] border p-4 shadow-lg shadow-slate-900/5 transition-all ${composerDragActive ? 'border-emerald-300 bg-emerald-50/70' : 'border-gray-200 bg-white'}`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
                        {TYPE_ICONS[mediaMode] || null}
                        Send {mediaMode}
                      </span>
                      <button type="button" onClick={resetMediaComposer} className="text-xs font-medium text-red-500 hover:underline">
                        Cancel
                      </button>
                    </div>

                    <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => openLibraryForType(mediaMode)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
                      >
                        <Paperclip className="h-4 w-4" />
                        {selectedAssets.length ? 'Add from gallery' : 'Choose from gallery'}
                      </button>
                      <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600">
                        <FileText className="h-4 w-4" />
                        Direct URL fallback
                      </div>
                    </div>

                    {selectedAssets.length ? (
                      <div className="mb-3 flex gap-3 overflow-x-auto pb-1">
                        {selectedAssets.map((asset) => (
                          <div key={asset._id} className="min-w-[220px] rounded-[24px] border border-gray-200 bg-[#fdfefe] p-3 shadow-sm">
                            <div className="flex items-start gap-3">
                              {renderAssetPickerPreview(asset)}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-gray-900">{asset.original_name}</p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {formatFileSize(asset.size_bytes)} • {asset.asset_type}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSelectedAsset(asset._id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-3 rounded-2xl border border-dashed border-gray-200 bg-[#f9fbfa] px-4 py-4 text-sm text-gray-500">
                        No files selected yet.
                      </div>
                    )}

                    <input
                      value={mediaUrl}
                      onChange={(event) => setMediaUrl(event.target.value)}
                      placeholder="Optional direct URL (https://...)"
                      className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                    />
                    {mediaMode !== 'audio' ? (
                      <div className="flex gap-2">
                        <input
                          value={mediaCaption}
                          onChange={(event) => setMediaCaption(event.target.value)}
                          placeholder="Caption (optional)"
                          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                        />
                        <button
                          type="button"
                          onClick={sendMessage}
                          disabled={sending || (!selectedAssets.length && !mediaUrl.trim())}
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {sending ? 'Sending...' : `Send ${selectedAssets.length || (mediaUrl.trim() ? 1 : 0) || ''}`.trim()}
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={sendMessage}
                          disabled={sending || (!selectedAssets.length && !mediaUrl.trim())}
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {sending ? 'Sending...' : `Send ${selectedAssets.length || (mediaUrl.trim() ? 1 : 0) || ''}`.trim()}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    ref={composerToolsRef}
                    className={`rounded-full border px-2 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all ${composerDragActive ? 'border-emerald-300 bg-emerald-50/80 ring-4 ring-emerald-100/80' : 'border-[#e7ddd2] bg-white/88'}`}
                  >
                    <div className="flex items-center gap-1">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setAttachMenuOpen((current) => !current);
                          setShowEmojiPicker(false);
                        }}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${attachMenuOpen ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}
                        aria-label="Open attachment options"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                      {attachMenuOpen ? (
                        <div className="absolute bottom-14 left-0 z-10 w-52 rounded-[24px] border border-gray-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
                          {[{ type: 'image', icon: Image, label: 'Image' }, { type: 'video', icon: Video, label: 'Video' }, { type: 'document', icon: FileText, label: 'Document' }, { type: 'audio', icon: Mic, label: 'Audio' }].map((item) => (
                            <button
                              key={item.type}
                              type="button"
                              onClick={() => openLibraryForType(item.type)}
                              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                <item.icon className="h-4 w-4" />
                              </span>
                              {item.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEmojiPicker((current) => !current);
                          setAttachMenuOpen(false);
                        }}
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${showEmojiPicker ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                        aria-label="Open emoji picker"
                      >
                        <Smile className="h-[18px] w-[18px]" />
                      </button>
                      {showEmojiPicker ? (
                        <div className="absolute bottom-14 left-0 z-10 w-[280px] rounded-[24px] border border-gray-200 bg-white p-3 shadow-2xl shadow-slate-900/10">
                          {EMOJI_GROUPS.map((group) => (
                            <div key={group.label} className="mb-3 last:mb-0">
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
                              <div className="grid grid-cols-8 gap-1.5">
                                {group.items.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => insertEmoji(emoji)}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl text-lg hover:bg-gray-100"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className={`flex min-h-[40px] flex-1 items-center rounded-full px-4 py-1.5 transition-all ${composerDragActive ? 'bg-emerald-50 ring-2 ring-emerald-200/70' : 'bg-[#f4f5f7]/96'}`}>
                      <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        onPaste={(event) => {
                          const files = Array.from(event.clipboardData.files || []);
                          if (!files.length) return;
                          event.preventDefault();
                          queueFilesForLibrary(files);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        rows={1}
                        className="block w-full resize-none overflow-y-auto border-none bg-transparent py-0 text-[15px] leading-6 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-0"
                        style={{ minHeight: '24px', maxHeight: '120px' }}
                      />
                    </div>

                    <button
                      onClick={text.trim() ? sendMessage : () => openLibraryForType('audio')}
                      disabled={sending}
                      aria-label={text.trim() ? 'Send message' : 'Choose audio'}
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all ${text.trim() ? 'bg-[#1faa61] text-white shadow-lg shadow-emerald-500/25 hover:bg-[#189c55]' : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}
                    >
                      {sending ? <div className={`h-4 w-4 animate-spin rounded-full border-2 ${text.trim() ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'}`} /> : text.trim() ? <Send className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showInfo ? (
            <div className="hidden lg:flex flex-col w-[300px] bg-white border-l border-gray-100 flex-shrink-0">
              <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-gray-900">Contact Info</h3>
                <button onClick={() => setShowInfo(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col items-center mb-6">
                  <div className={`w-20 h-20 bg-gradient-to-br ${currentAvatarTheme.shell} rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3`}>
                    {String(currentDisplayName || '?')[0]?.toUpperCase()}
                  </div>
                  <p className="text-base font-semibold text-gray-900">{contact?.wa_name || contact?.name || 'Unknown'}</p>
                  {contact?.wa_name && contact?.name && contact.wa_name !== contact.name ? <p className="text-xs text-gray-400">Saved as: {contact.name}</p> : null}
                  <p className="text-sm text-gray-500">+{selectedPhone}</p>
                  {contact?.wa_exists === 'yes' ? <span className={`mt-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${currentAvatarTheme.accent}`}>Available on WhatsApp</span> : null}
                  {contact?.wa_exists === 'no' ? <span className="mt-1 px-2.5 py-1 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">Not on WhatsApp</span> : null}
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-gray-400" /><div><p className="text-xs text-gray-400">Phone</p><p className="text-sm font-medium text-gray-700">+{selectedPhone}</p></div></div>
                    {contact?.email ? <div className="flex items-center gap-3"><Circle className="w-4 h-4 text-gray-400" /><div><p className="text-xs text-gray-400">Email</p><p className="text-sm font-medium text-gray-700">{contact.email}</p></div></div> : null}
                    <div className="flex items-center gap-3"><MessageSquare className="w-4 h-4 text-gray-400" /><div><p className="text-xs text-gray-400">Messages</p><p className="text-sm font-medium text-gray-700">{selectedConversation?.total_messages || 0}</p></div></div>
                  </div>

                  {contact?.labels?.length ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">{contact.labels.map((label) => <span key={label} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">{label}</span>)}</div>
                    </div>
                  ) : null}

                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Opt-in</span>
                      <span className={`font-semibold ${contact?.opt_in !== false ? 'text-emerald-600' : 'text-red-500'}`}>{contact?.opt_in !== false ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><MessageSquare className="w-10 h-10 text-gray-300" /></div>
            <h3 className="text-lg font-semibold text-gray-500 mb-1">Select a conversation</h3>
            <p className="text-sm text-gray-400">Open a thread from the left to reply without refreshing the whole screen.</p>
          </div>
        </div>
      )}

      <MediaLibraryModal
        open={showLibrary}
        onClose={() => {
          setShowLibrary(false);
          setQueuedFiles([]);
        }}
        title="Chat Media Library"
        subtitle={mediaMode ? `Choose ${mediaMode} assets from your server gallery or upload new ones for this conversation.` : 'Choose and manage chat media from your server gallery.'}
        allowedTypes={mediaMode ? [mediaMode] : ['image', 'video', 'document', 'audio']}
        allowMultiple
        queuedFiles={queuedFiles}
        onQueuedFilesHandled={() => setQueuedFiles([])}
        onSelect={(assets) => {
          setSelectedAssets((current) => mergeAssets(current, assets));
          if (assets[0]?.asset_type) setMediaMode(assets[0].asset_type);
          setShowLibrary(false);
          setQueuedFiles([]);
          toast.success(`${assets.length} asset(s) selected for this chat`);
        }}
      />
    </div>
  );
}
