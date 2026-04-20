import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderOpen,
  Hash,
  Image,
  Link2,
  Loader2,
  MessageSquare,
  Mic,
  Paperclip,
  Search,
  Send,
  User,
  Video,
  X,
  Zap,
  Globe,
  Phone,
  ExternalLink,
  Copy,
  CheckCircle2,
  Check,
  Users,
} from 'lucide-react';
import api from '../../api/axios';
import MediaLibraryModal from '../../MediaLibraryModal';
import { detectMediaAssetType, formatFileSize } from '../../mediaLibraryHelpers';
import WhatsAppPhonePreview from '../../components/ui/WhatsAppPhonePreview';
import QuickReplyPopup from '../../components/QuickReplyPopup';

/* ── Constants ── */
const MODE_TABS = [
  { id: 'template', label: 'Template', icon: FileText, desc: 'Meta-approved templates' },
  { id: 'text', label: 'Free Text', icon: MessageSquare, desc: '24h window required' },
  { id: 'media', label: 'Media', icon: Image, desc: 'Images, videos, files' },
];

const MEDIA_OPTIONS = [
  { key: 'image', label: 'Image', icon: Image, accept: 'JPG, PNG, GIF', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'video', label: 'Video', icon: Video, accept: 'MP4, MOV', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  { key: 'document', label: 'File', icon: Paperclip, accept: 'PDF, DOC', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'audio', label: 'Audio', icon: Mic, accept: 'MP3, OGG', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
];

const CATEGORY_STYLES = {
  MARKETING: 'bg-violet-50 text-violet-700 border-violet-200',
  UTILITY: 'bg-blue-50 text-blue-700 border-blue-200',
  AUTHENTICATION: 'bg-amber-50 text-amber-700 border-amber-200',
};

/* ── Helpers ── */
const extractVars = (template) => {
  if (!template) return [];
  const vars = [];
  for (const component of template.components || []) {
    if (!['BODY', 'HEADER'].includes(component.type) || !component.text) continue;
    const matches = component.text.match(/\{\{(\d+)\}\}/g) || [];
    matches.forEach((match) => {
      const value = component.type === 'HEADER'
        ? `header_${match.replace(/[{}]/g, '')}`
        : match.replace(/[{}]/g, '');
      if (!vars.includes(value)) vars.push(value);
    });
  }
  return vars;
};

const mergeAssets = (current, incoming) => {
  const nextMap = new Map(current.map((a) => [a._id, a]));
  incoming.forEach((a) => nextMap.set(a._id, a));
  return Array.from(nextMap.values());
};

const devLog = (...a) => { if (import.meta.env.DEV) console.info(...a); };
const devError = (...a) => { if (import.meta.env.DEV) console.error(...a); };

/* ── Component ── */
export default function NewMessage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* State */
  const [mode, setMode] = useState('template');
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactList, setShowContactList] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [contactPage, setContactPage] = useState(1);
  const [contactHasMore, setContactHasMore] = useState(true);
  const [contactLoadingMore, setContactLoadingMore] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateVariables, setTemplateVariables] = useState({});
  const [showVariableConfig, setShowVariableConfig] = useState(true);
  const [templateHeaderUrl, setTemplateHeaderUrl] = useState('');
  const [showTemplateHeaderLibrary, setShowTemplateHeaderLibrary] = useState(false);
  const [mediaType, setMediaType] = useState('image');
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [mediaCaption, setMediaCaption] = useState('');
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  const contactsRequestIdRef = useRef(0);
  const contactListRef = useRef(null);
  const freeTextRef = useRef(null);

  /* Fetch custom field definitions */
  useEffect(() => {
    api.get('/custom-fields')
      .then(r => setCustomFieldDefs((r.data?.data?.fields || []).filter(f => f.is_active)))
      .catch(() => {});
  }, []);

  /* Dynamic variable type options (includes custom fields) */
  const varTypeOptions = useMemo(() => [
    { value: 'static', label: 'Custom' },
    { value: 'contact_name', label: 'Contact Name' },
    { value: 'contact_phone', label: 'Contact Phone' },
    { value: 'contact_email', label: 'Contact Email' },
    ...customFieldDefs.map(f => ({ value: `custom_field:${f.field_name}`, label: `\u{1F4CB} ${f.field_label}` })),
  ], [customFieldDefs]);

  /* Prefill from URL */
  useEffect(() => {
    const queryTo = String(searchParams.get('to') || '').replace(/[^\d]/g, '');
    if (queryTo) { setTo(queryTo); setContactSearch(queryTo); }
  }, [searchParams]);

  const CONTACT_LIMIT = 20;

  const fetchContacts = useCallback(async (search, page, append = false) => {
    const id = ++contactsRequestIdRef.current;
    if (page === 1) setContactLoading(true);
    else setContactLoadingMore(true);
    try {
      const { data } = await api.get('/contacts', { params: { search: search || '', limit: CONTACT_LIMIT, page } });
      if (contactsRequestIdRef.current !== id) return;
      const fetched = data.data?.contacts || [];
      const totalPages = data.data?.pagination?.pages || 1;
      if (append) setContacts(prev => [...prev, ...fetched]);
      else setContacts(fetched);
      setContactHasMore(page < totalPages);
    } catch (e) { if (contactsRequestIdRef.current === id) devError('[Contacts]', e); }
    finally {
      if (contactsRequestIdRef.current === id) { setContactLoading(false); setContactLoadingMore(false); }
    }
  }, []);

  /* Load default contacts on mount */
  useEffect(() => { fetchContacts('', 1); }, [fetchContacts]);

  /* Search debounce */
  useEffect(() => {
    const timer = setTimeout(() => {
      setContactPage(1);
      fetchContacts(contactSearch || to, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [contactSearch, to, fetchContacts]);

  /* Infinite scroll handler */
  const handleContactScroll = useCallback((e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60 && contactHasMore && !contactLoadingMore) {
      const next = contactPage + 1;
      setContactPage(next);
      fetchContacts(contactSearch || to, next, true);
    }
  }, [contactHasMore, contactLoadingMore, contactPage, contactSearch, to, fetchContacts]);

  /* Click outside contact list */
  useEffect(() => {
    const handler = (e) => {
      if (contactListRef.current && !contactListRef.current.contains(e.target)) setShowContactList(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleContact = (contact) => {
    setSelectedContacts(prev => {
      const exists = prev.find(c => c._id === contact._id);
      const next = exists ? prev.filter(c => c._id !== contact._id) : [...prev, contact];
      if (next.length === 1) setTo(next[0].phone);
      else if (next.length === 0) setTo('');
      return next;
    });
  };

  const removeContact = (id) => {
    setSelectedContacts(prev => {
      const next = prev.filter(c => c._id !== id);
      if (next.length === 1) setTo(next[0].phone);
      else if (next.length === 0) setTo('');
      return next;
    });
  };

  /* Template fetch */
  useEffect(() => {
    if (mode !== 'template' || templates.length) return;
    setLoadingTemplates(true);
    api.get('/meta/templates')
      .then((r) => setTemplates(r.data?.data?.templates || []))
      .catch(() => toast.error('Failed to load Meta templates'))
      .finally(() => setLoadingTemplates(false));
  }, [mode, templates.length]);

  const approvedTemplates = useMemo(
    () => templates.filter((t) => t.status === 'APPROVED'),
    [templates],
  );

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return approvedTemplates;
    const q = templateSearch.toLowerCase();
    return approvedTemplates.filter((t) =>
      t.name.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q),
    );
  }, [approvedTemplates, templateSearch]);

  const templateVariableKeys = Object.keys(templateVariables);

  /* ── Handlers ── */
  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateHeaderUrl('');
    const vars = extractVars(template);
    const nextMap = {};
    vars.forEach((key) => { nextMap[key] = { type: 'static', value: '' }; });
    setTemplateVariables(nextMap);
    setShowVariableConfig(vars.length > 0);
  };

  const buildTemplateComponents = () => {
    if (!selectedTemplate || !templateVariableKeys.length) return [];
    const matchedContact = contacts.find((c) => c.phone === to.replace(/[^0-9]/g, ''));
    const resolveVar = (key) => {
      const v = templateVariables[key];
      if (v?.type === 'contact_name') return matchedContact?.name || matchedContact?.wa_name || 'Customer';
      if (v?.type === 'contact_phone') return to.replace(/[^0-9]/g, '');
      if (v?.type === 'contact_email') return matchedContact?.email || 'N/A';
      if (v?.type?.startsWith('custom_field:')) return `[${v.type.replace('custom_field:', '')}]`;
      return v?.value || `{{${key.replace('header_', '')}}}`;
    };
    const headerParams = templateVariableKeys
      .filter((k) => k.startsWith('header_'))
      .sort((a, b) => Number(a.replace('header_', '')) - Number(b.replace('header_', '')))
      .map((k) => ({ type: 'text', text: resolveVar(k) }));
    const bodyParams = templateVariableKeys
      .filter((k) => !k.startsWith('header_'))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => ({ type: 'text', text: resolveVar(k) }));

    const components = [];
    if (headerParams.length) components.push({ type: 'header', parameters: headerParams });
    if (bodyParams.length) components.push({ type: 'body', parameters: bodyParams });
    return components;
  };

  const selectedTemplateHeaderFormat = useMemo(() => {
    const header = selectedTemplate?.components?.find((c) => c.type === 'HEADER');
    const format = String(header?.format || '').toUpperCase();
    return ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format) ? format : '';
  }, [selectedTemplate]);

  const previewText = () => {
    if (!selectedTemplate) return '';
    let body = selectedTemplate.components?.find((c) => c.type === 'BODY')?.text || '';
    Object.entries(templateVariables).forEach(([key, v]) => {
      if (!key.startsWith('header_')) body = body.replace(`{{${key}}}`, v.value || `{{${key}}}`);
    });
    return body;
  };

  const queueFilesForLibrary = (files) => {
    const nextFiles = Array.from(files || []).filter((f) => detectMediaAssetType(f) === mediaType);
    if (!nextFiles.length) { toast.error(`Please add ${mediaType} files`); return; }
    setQueuedFiles(nextFiles);
    setShowLibrary(true);
  };

  /* ── Preview props builder ── */
  const previewProps = useMemo(() => {
    if (mode === 'text' && text.trim()) {
      return { body: text };
    }
    if (mode === 'template' && selectedTemplate) {
      const headerComp = selectedTemplate.components?.find((c) => c.type === 'HEADER');
      let header;
      if (headerComp) {
        if (headerComp.format === 'TEXT') header = { type: 'text', text: headerComp.text };
        else if (headerComp.format === 'IMAGE') header = { type: 'image', url: templateHeaderUrl || null };
        else if (headerComp.format === 'VIDEO') header = { type: 'video', url: templateHeaderUrl || null };
        else if (headerComp.format === 'DOCUMENT') header = { type: 'document', filename: 'Document.pdf', url: templateHeaderUrl || null };
      }
      return {
        header,
        body: previewText(),
        footer: selectedTemplate.components?.find((c) => c.type === 'FOOTER')?.text,
        buttons: (selectedTemplate.components?.find((c) => c.type === 'BUTTONS')?.buttons || []).map((b) => ({
          type: b.type,
          text: b.text,
          url: b.url,
          phone: b.phone_number,
        })),
      };
    }
    if (mode === 'media' && selectedAssets.length > 0) {
      const asset = selectedAssets[0];
      return {
        header: {
          type: mediaType === 'audio' ? 'audio' : mediaType === 'document' ? 'document' : mediaType === 'video' ? 'video' : 'image',
          url: asset.public_url,
          filename: asset.original_name,
        },
        body: mediaCaption,
      };
    }
    return null;
  }, [mode, text, selectedTemplate, templateVariables, templateHeaderUrl, mediaType, selectedAssets, mediaCaption]);

  /* ── Send ── */
  const handleSend = async () => {
    const phones = selectedContacts.length > 0
      ? selectedContacts.map(c => String(c.phone).replace(/[^0-9]/g, ''))
      : to.trim() ? [to.replace(/[^0-9]/g, '')] : [];
    if (phones.length === 0) { toast.error('Select at least one recipient'); return; }
    if (phones.some(p => !p)) { toast.error('Enter a valid WhatsApp number'); return; }

    setSending(true);
    try {
      if (mode === 'text') {
        if (!text.trim()) { toast.error('Enter a message'); setSending(false); return; }
        let ok = 0;
        for (const p of phones) {
          try { await api.post('/meta/messages/send', { to: p, text: text.trim() }); ok++; }
          catch (e) { if (phones.length === 1) throw e; devError('[Send Text]', e?.response?.data || e); }
        }
        toast.success(ok > 1 ? `Sent to ${ok} contacts` : 'Message accepted by Meta');
        navigate('/portal/inbox');
        return;
      }
      if (mode === 'template') {
        if (!selectedTemplate) { toast.error('Select a template'); setSending(false); return; }
        if (selectedTemplateHeaderFormat && !templateHeaderUrl.trim()) {
          toast.error(`Template requires ${selectedTemplateHeaderFormat} header`);
          setSending(false);
          return;
        }
        let ok = 0;
        for (const p of phones) {
          try {
            await api.post('/meta/messages/send-template', {
              to: p,
              template_name: selectedTemplate.name,
              language: selectedTemplate.language,
              components: buildTemplateComponents(),
              header_type: selectedTemplateHeaderFormat ? selectedTemplateHeaderFormat.toLowerCase() : undefined,
              header_media_url: selectedTemplateHeaderFormat ? templateHeaderUrl.trim() : undefined,
            });
            ok++;
          } catch (e) { if (phones.length === 1) throw e; devError('[Send Template]', e?.response?.data || e); }
        }
        toast.success(ok > 1 ? `Template sent to ${ok} contacts` : 'Template message accepted by Meta');
        navigate('/portal/inbox');
        return;
      }
      /* Media */
      if (!selectedAssets.length) { toast.error('Choose media to send'); setSending(false); return; }
      let ok = 0;
      for (const p of phones) {
        for (const asset of selectedAssets) {
          try {
            await api.post('/meta/messages/send-media', {
              to: p,
              type: asset.asset_type,
              url: asset.public_url,
              caption: asset.asset_type === 'audio' ? '' : mediaCaption.trim(),
              filename: asset.asset_type === 'document' ? asset.original_name || 'document' : asset.original_name || undefined,
            });
            ok++;
          } catch (e) {
            devError('[Send Media]', e?.response?.data || e);
          }
        }
      }
      if (ok) { toast.success(`${ok} media accepted by Meta`); navigate('/portal/inbox'); }
      else toast.error('Failed to send media');
    } catch (error) {
      const p = error?.response?.data;
      devError('[Send]', p || error);
      toast.error(p?.error_source === 'meta' ? `Meta: ${p.error}` : (p?.error || 'Send failed'));
    } finally {
      setSending(false);
    }
  };

  /* ── Render ── */
  return (
    <>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="animate-fade-in-up">
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">New Message</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Compose and send via WhatsApp
          </p>
        </div>

        {/* ── Main Grid: Form + Preview ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ═══ LEFT: Compose Form ═══ */}
          <div className="lg:col-span-7 space-y-4">

            {/* ─ Mode Tabs ─ */}
            <div className="bg-white rounded-xl border border-surface-200 p-1.5 flex gap-1 animate-fade-in-up" style={{ animationDelay: '40ms' }}>
              {MODE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                    mode === tab.id
                      ? 'bg-surface-900 text-white shadow-sm'
                      : 'text-surface-500 hover:bg-surface-50 hover:text-surface-700'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ─ Recipient Card ─ */}
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '60ms' }} ref={contactListRef}>
              <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-surface-900">Recipients</h3>
                {selectedContacts.length > 0 && (
                  <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{selectedContacts.length} selected</span>
                )}
              </div>
              <div className="p-4 relative z-[50]">
                {/* Selected chips */}
                {selectedContacts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {selectedContacts.map(c => (
                      <span key={c._id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-[11px] font-semibold text-brand-700">
                        {c.name || `+${c.phone}`}
                        <button type="button" onClick={() => removeContact(c._id)} className="hover:bg-brand-100 rounded-full p-0.5 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2.5 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-brand-600" />
                  </div>
                  <input
                    value={contactSearch || (selectedContacts.length === 0 ? to : '')}
                    onChange={(e) => { setContactSearch(e.target.value); if (selectedContacts.length === 0) setTo(e.target.value); setShowContactList(true); }}
                    onFocus={() => setShowContactList(true)}
                    placeholder={selectedContacts.length > 0 ? 'Add more contacts...' : 'Search contacts or enter phone number...'}
                    className="flex-1 border-0 bg-transparent text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none"
                  />
                  {contactLoading && <Loader2 className="w-4 h-4 animate-spin text-brand-500" />}
                  {(to || contactSearch) && selectedContacts.length === 0 && (
                    <button type="button" onClick={() => { setTo(''); setContactSearch(''); }} className="text-surface-400 hover:text-surface-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {showContactList && (
                  <div className="absolute z-[60] mt-1.5 left-4 right-4 max-h-[280px] overflow-y-auto rounded-xl border border-surface-200 bg-white shadow-2xl" onScroll={handleContactScroll}>
                    {contactLoading && contacts.length === 0 ? (
                      <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin text-brand-500 mx-auto" /></div>
                    ) : contacts.length === 0 ? (
                      <div className="py-4 text-center text-[12px] text-surface-400">No contacts found</div>
                    ) : (
                      <>
                        {contacts.map((c) => {
                          const isSelected = selectedContacts.some(sc => sc._id === c._id);
                          return (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => toggleContact(c)}
                              className={`flex w-full items-center gap-3 px-4 py-2.5 hover:bg-brand-50 transition-colors text-left border-b border-surface-100 last:border-0 ${isSelected ? 'bg-brand-50/40' : ''}`}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected ? 'bg-brand-600 border-brand-600' : 'border-surface-300'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                                {(c.name || c.phone || '?')[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-surface-800 truncate">{c.name || c.wa_name || 'Unnamed'}</p>
                                <p className="text-[11px] text-surface-400">+{c.phone}</p>
                              </div>
                            </button>
                          );
                        })}
                        {contactLoadingMore && (
                          <div className="py-3 text-center"><Loader2 className="w-4 h-4 animate-spin text-brand-400 mx-auto" /></div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ TEXT MODE ═══ */}
            {mode === 'text' && (
              <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-surface-900">Message</h3>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span className="text-[10px] text-amber-700 font-bold">24h window required</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="relative">
                    <QuickReplyPopup
                      text={text}
                      inputRef={freeTextRef}
                      position="below"
                      onSelect={(message) => {
                        const cleaned = text.replace(/(?:^|\s)\/\S*$/, '').trimEnd();
                        setText(cleaned ? cleaned + ' ' + message : message);
                        freeTextRef.current?.focus();
                      }}
                    />
                    <textarea
                      ref={freeTextRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Type your message here... (/ for quick replies)"
                      rows={7}
                      className="w-full resize-none rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-end">
                    <span className={`text-[11px] font-medium ${text.length > 3900 ? 'text-red-500' : 'text-surface-400'}`}>
                      {text.length} / 4,096
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TEMPLATE MODE ═══ */}
            {mode === 'template' && (
              <>
                {/* Template picker card */}
                <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                  <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[14px] font-bold text-surface-900">Choose Template</h3>
                      <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
                        {approvedTemplates.length} approved
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Search */}
                    <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                      <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                      <input
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        placeholder="Search templates..."
                        className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none"
                      />
                    </div>

                    {loadingTemplates ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                      </div>
                    ) : filteredTemplates.length === 0 ? (
                      <div className="py-8 text-center">
                        <FileText className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                        <p className="text-[13px] text-surface-500 font-medium">
                          {templateSearch ? 'No templates match your search' : 'No approved templates'}
                        </p>
                        <p className="text-[11px] text-surface-400 mt-1">
                          {templateSearch ? 'Try a different search term' : 'Create templates in the Templates section'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                        {filteredTemplates.map((template) => {
                          const vars = extractVars(template);
                          const isSelected = selectedTemplate?.id === template.id;
                          const bodyComp = template.components?.find((c) => c.type === 'BODY');
                          const bodyPreview = bodyComp?.text?.slice(0, 70) || '';
                          return (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => handleSelectTemplate(template)}
                              className={`w-full rounded-lg px-3 py-2.5 text-left transition-all border ${
                                isSelected
                                  ? 'border-brand-400 bg-brand-50/60 ring-1 ring-brand-200'
                                  : 'border-surface-100 bg-surface-50/50 hover:border-surface-200 hover:bg-surface-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-500'
                                }`}>
                                  {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-bold text-surface-900 truncate">{template.name}</span>
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full border flex-shrink-0 ${CATEGORY_STYLES[template.category] || ''}`}>
                                      {template.category}
                                    </span>
                                    {vars.length > 0 && (
                                      <span className="text-[10px] text-surface-400 flex items-center gap-0.5 flex-shrink-0">
                                        <Hash className="w-2.5 h-2.5" />{vars.length}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-surface-500 truncate mt-0.5">{bodyPreview}{bodyPreview.length >= 70 ? '...' : ''}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Variables card */}
                {selectedTemplate && templateVariableKeys.length > 0 && (
                  <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '180ms' }}>
                    <button
                      type="button"
                      onClick={() => setShowVariableConfig(!showVariableConfig)}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-50/50 transition-colors border-b border-surface-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-amber-600" />
                        </div>
                        <h3 className="text-[14px] font-bold text-surface-900">Variables</h3>
                        <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
                          {templateVariableKeys.length}
                        </span>
                      </div>
                      {showVariableConfig ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
                    </button>

                    {showVariableConfig && (
                      <div className="p-4 space-y-2.5">
                        {templateVariableKeys.map((key) => (
                          <div key={key} className="flex items-center gap-2.5">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md min-w-[48px] text-center flex-shrink-0">
                              {`{{${key}}}`}
                            </span>
                            <select
                              value={templateVariables[key]?.type || 'static'}
                              onChange={(e) => setTemplateVariables((c) => ({
                                ...c, [key]: { ...c[key], type: e.target.value },
                              }))}
                              className="rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-surface-700 focus:ring-2 focus:ring-brand-500/20 focus:outline-none flex-shrink-0"
                            >
                              {varTypeOptions.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            {templateVariables[key]?.type === 'static' ? (
                              <input
                                value={templateVariables[key]?.value || ''}
                                onChange={(e) => setTemplateVariables((c) => ({
                                  ...c, [key]: { ...c[key], value: e.target.value },
                                }))}
                                placeholder="Enter value..."
                                className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 text-[12px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                              />
                            ) : (
                              <span className="flex-1 text-[11px] text-brand-600 font-semibold px-2">
                                {templateVariables[key]?.type?.startsWith('custom_field:') ? `Auto-filled from custom field: ${templateVariables[key].type.replace('custom_field:', '')}` : 'Auto-filled'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Header media card */}
                {selectedTemplate && selectedTemplateHeaderFormat && (
                  <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '240ms' }}>
                    <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        {selectedTemplateHeaderFormat === 'IMAGE' && <Image className="w-4 h-4 text-blue-600" />}
                        {selectedTemplateHeaderFormat === 'VIDEO' && <Video className="w-4 h-4 text-blue-600" />}
                        {selectedTemplateHeaderFormat === 'DOCUMENT' && <FileText className="w-4 h-4 text-blue-600" />}
                      </div>
                      <h3 className="text-[14px] font-bold text-surface-900">
                        Header {selectedTemplateHeaderFormat.charAt(0) + selectedTemplateHeaderFormat.slice(1).toLowerCase()}
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          value={templateHeaderUrl}
                          onChange={(e) => setTemplateHeaderUrl(e.target.value)}
                          placeholder="Paste URL or choose from gallery..."
                          className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[12px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                        />
                        <button
                          onClick={() => setShowTemplateHeaderLibrary(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all flex-shrink-0"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Gallery
                        </button>
                      </div>

                      {templateHeaderUrl && selectedTemplateHeaderFormat === 'IMAGE' && (
                        <div className="rounded-lg overflow-hidden border border-surface-200 bg-surface-50">
                          <img src={templateHeaderUrl} alt="" className="w-full h-28 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ═══ MEDIA MODE ═══ */}
            {mode === 'media' && (
              <>
                {/* Media type selector card */}
                <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                  <div className="px-5 py-3.5 border-b border-surface-100">
                    <h3 className="text-[14px] font-bold text-surface-900">Media Type</h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-2">
                      {MEDIA_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => { setMediaType(opt.key); setSelectedAssets([]); }}
                          className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-all ${
                            mediaType === opt.key
                              ? `${opt.border} ${opt.bg}`
                              : 'border-surface-100 hover:border-surface-200 hover:bg-surface-50'
                          }`}
                        >
                          <opt.icon className={`w-5 h-5 ${mediaType === opt.key ? opt.color : 'text-surface-400'}`} />
                          <span className="text-[11px] font-semibold text-surface-800">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* File selection card */}
                <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '180ms' }}>
                  <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-surface-900">Choose Files</h3>
                    {selectedAssets.length > 0 && (
                      <button type="button" onClick={() => setSelectedAssets([])} className="text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors">
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {selectedAssets.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2.5">
                        {selectedAssets.map((asset) => (
                          <div key={asset._id} className="group relative rounded-lg overflow-hidden border border-surface-200 bg-surface-50">
                            <div className="aspect-square">
                              {asset.asset_type === 'image' ? (
                                <img src={asset.public_url} alt="" className="w-full h-full object-cover" />
                              ) : asset.asset_type === 'video' ? (
                                <video src={asset.public_url} className="w-full h-full object-cover bg-black" muted />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-surface-400">
                                  {asset.asset_type === 'audio' ? <Mic className="w-6 h-6 mb-1" /> : <FileText className="w-6 h-6 mb-1" />}
                                  <span className="text-[9px] font-bold uppercase">{asset.asset_type}</span>
                                </div>
                              )}
                            </div>
                            <div className="px-2 py-1.5">
                              <p className="text-[10px] font-medium text-surface-700 truncate">{asset.original_name}</p>
                              <p className="text-[9px] text-surface-400">{formatFileSize(asset.size_bytes)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedAssets((c) => c.filter((a) => a._id !== asset._id))}
                              className="absolute top-1 right-1 w-5 h-5 rounded-md bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {/* Add more */}
                        <button
                          type="button"
                          onClick={() => setShowLibrary(true)}
                          className="aspect-square rounded-lg border-2 border-dashed border-surface-200 flex flex-col items-center justify-center text-surface-400 hover:border-brand-400 hover:text-brand-500 hover:bg-brand-50/30 transition-all"
                        >
                          <span className="text-[20px] leading-none">+</span>
                          <span className="text-[10px] font-medium mt-1">Add more</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={(e) => { e.preventDefault(); queueFilesForLibrary(e.dataTransfer.files); }}
                        className="rounded-xl border-2 border-dashed border-surface-200 bg-surface-50/50 hover:border-brand-300 hover:bg-brand-50/20 transition-all cursor-pointer py-8 text-center"
                        onClick={() => setShowLibrary(true)}
                      >
                        <FolderOpen className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                        <p className="text-[13px] font-semibold text-surface-700">Click to browse or drop files</p>
                        <p className="text-[11px] text-surface-400 mt-1">Select from your media gallery</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Caption card */}
                {selectedAssets.length > 0 && mediaType !== 'audio' && (
                  <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '240ms' }}>
                    <div className="px-5 py-3.5 border-b border-surface-100">
                      <h3 className="text-[14px] font-bold text-surface-900">Caption</h3>
                    </div>
                    <div className="p-4">
                      <input
                        value={mediaCaption}
                        onChange={(e) => setMediaCaption(e.target.value)}
                        placeholder="Add a caption (optional)..."
                        className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ─ Send Button ─ */}
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-semibold text-[13px] transition-all shadow-sm animate-fade-in-up"
              style={{ animationDelay: '300ms' }}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </div>

          {/* ═══ RIGHT: Preview ═══ */}
          <div className="lg:col-span-5 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <div className="lg:sticky lg:top-6">
              <div className="flex items-center justify-center">
                <WhatsAppPhonePreview
                  {...(previewProps || {})}
                  contactName={(() => {
                    if (!to) return 'Recipient';
                    const matched = contacts.find((c) => c.phone === to.replace(/[^0-9]/g, ''));
                    return matched?.name || matched?.wa_name || `+${to.replace(/[^0-9]/g, '')}`;
                  })()}
                  emptyMessage={
                    mode === 'template'
                      ? 'Select a template to preview'
                      : mode === 'text'
                        ? 'Start typing to see preview'
                        : 'Choose media to preview'
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Media Library ── */}
      {showLibrary && (
        <MediaLibraryModal
          open={showLibrary}
          onClose={() => { setShowLibrary(false); setQueuedFiles([]); }}
          onSelect={(assets) => {
            setSelectedAssets(mergeAssets(selectedAssets, assets));
          }}
          mediaType={mediaType}
          queuedFiles={queuedFiles}
          onQueuedFilesHandled={() => setQueuedFiles([])}
        />
      )}

      {/* ── Template Header Library ── */}
      {showTemplateHeaderLibrary && (
        <MediaLibraryModal
          open={showTemplateHeaderLibrary}
          onClose={() => setShowTemplateHeaderLibrary(false)}
          onSelect={(assets) => {
            if (assets.length > 0) setTemplateHeaderUrl(assets[0].public_url);
          }}
          mediaType={selectedTemplateHeaderFormat?.toLowerCase() || 'image'}
          allowMultiple={false}
        />
      )}
    </>
  );
}
