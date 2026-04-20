import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Megaphone, ArrowLeft, ArrowRight, Send, Loader2, CheckCircle2,
  FileText, Users, Tag, Zap, Clock, Calendar, Hash, Search,
  Image, Video, Paperclip, FolderOpen, ChevronDown, ChevronUp,
  Settings, Eye, Check, Circle, List, AlertTriangle,
} from 'lucide-react';
import WhatsAppPreview from '../../components/ui/WhatsAppPreview';
import MediaLibraryModal from '../../MediaLibraryModal';

/* ── Constants ── */
const CONTACT_PAGE_SIZE = 100;

const STEPS = [
  { num: 1, label: 'Details', icon: Settings, desc: 'Name & schedule' },
  { num: 2, label: 'Template', icon: FileText, desc: 'Choose template' },
  { num: 3, label: 'Audience', icon: Users, desc: 'Select recipients' },
  { num: 4, label: 'Variables', icon: Zap, desc: 'Map variables' },
  { num: 5, label: 'Review', icon: Eye, desc: 'Confirm & publish' },
];

const CATEGORY_STYLES = {
  MARKETING: 'bg-violet-50 text-violet-700 border-violet-200',
  UTILITY: 'bg-blue-50 text-blue-700 border-blue-200',
  AUTHENTICATION: 'bg-amber-50 text-amber-700 border-amber-200',
};

/* ── Helpers ── */
const dedupeContactsByPhone = (items = []) => {
  const seen = new Map();
  items.forEach(item => {
    const phone = String(item?.phone || '').trim();
    if (phone) seen.set(phone, item);
  });
  return Array.from(seen.values());
};

const extractVars = (tpl) => {
  if (!tpl) return [];
  const vars = [];
  for (const comp of (tpl.components || [])) {
    const slot = String(comp.type || '').toUpperCase();
    if (!['BODY', 'HEADER'].includes(slot) || !comp.text) continue;
    (comp.text.match(/\{\{(\d+)\}\}/g) || []).forEach(match => {
      const n = match.replace(/[{}]/g, '');
      const token = { key: `${slot.toLowerCase()}_${n}`, slot: slot.toLowerCase(), index: n };
      if (!vars.some(item => item.key === token.key)) vars.push(token);
    });
  }
  return vars;
};

/* ── Component ── */
export default function CampaignCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [allLabels, setAllLabels] = useState([]);
  const [contactLists, setContactLists] = useState([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [showHeaderLibrary, setShowHeaderLibrary] = useState(false);
  const [activeHeaderRecipient, setActiveHeaderRecipient] = useState('');
  const [customFieldDefs, setCustomFieldDefs] = useState([]);

  const [form, setForm] = useState({
    name: '',
    template_name: '',
    template_language: 'en',
    target_type: 'selected',
    target_tags: [],
    target_lists: [],
    recipients: [],
    scheduled_at: '',
    variable_mapping: {},
    template_components: [],
    header_media_url: '',
    header_media_mode: 'global',
    header_media_by_contact: {},
    target_custom_field: '',
    target_custom_value: '',
    send_completion_report: true,
    report_recipients: '',
    auto_resend_failed: false,
    auto_resend_delay_hours: 2,
    tag_by_status: false,
    tag_prefix: '',
    auto_unsubscribe_failures: false,
    auto_unsubscribe_threshold: 3,
  });

  /* Load templates + contacts */
  useEffect(() => {
    (async () => {
      setDataLoading(true);
      try {
        const fetchAllContacts = async () => {
          let page = 1, pages = 1, labels = [];
          const bundle = [];
          while (page <= pages) {
            const { data } = await api.get('/contacts', { params: { page, limit: CONTACT_PAGE_SIZE } });
            bundle.push(...(data.data.contacts || []));
            labels = data.data.labels || labels;
            pages = data.data.pagination?.pages || 1;
            page += 1;
          }
          return { contacts: dedupeContactsByPhone(bundle), labels };
        };
        const [t, c, cl] = await Promise.all([
          api.get('/meta/templates'),
          fetchAllContacts(),
          api.get('/contact-lists', { params: { limit: 100 } }).catch(() => ({ data: { data: { lists: [] } } })),
        ]);
        setTemplates((t.data.data.templates || []).filter(t => t.status === 'APPROVED'));
        setContacts(c.contacts || []);
        setAllLabels(c.labels || []);
        setContactLists(cl.data.data.lists || cl.data.data.contactLists || []);
      } catch { toast.error('Failed to load data'); }
      finally { setDataLoading(false); }
    })();
  }, []);

  /* Fetch custom field definitions */
  useEffect(() => {
    api.get('/custom-fields')
      .then(r => setCustomFieldDefs((r.data?.data?.fields || []).filter(f => f.is_active)))
      .catch(() => {});
  }, []);

  /* Dynamic variable source options (includes custom fields) */
  const varSourceOptions = useMemo(() => [
    { value: 'custom', label: 'Custom Value' },
    { value: 'contact_name', label: 'Contact Name' },
    { value: 'contact_phone', label: 'Contact Phone' },
    { value: 'contact_email', label: 'Contact Email' },
    ...customFieldDefs.map(f => ({ value: `custom_field:${f.field_name}`, label: `\u{1F4CB} ${f.field_label}` })),
  ], [customFieldDefs]);

  /* Derived state */
  const selectedTemplate = templates.find(t => t.name === form.template_name) || null;
  const templateVars = useMemo(() => extractVars(selectedTemplate), [selectedTemplate]);

  const headerMediaFormat = useMemo(() => {
    const header = (selectedTemplate?.components || []).find(c => String(c.type || '').toUpperCase() === 'HEADER');
    const fmt = String(header?.format || '').toUpperCase();
    return ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(fmt) ? fmt.toLowerCase() : '';
  }, [selectedTemplate]);

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter(t => t.name.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q));
  }, [templates, templateSearch]);

  const optedInContacts = useMemo(() => contacts.filter(c => c.opt_in !== false), [contacts]);

  const listContactIds = useMemo(() => {
    if (form.target_type !== 'lists' || form.target_lists.length === 0) return new Set();
    const ids = new Set();
    contactLists.filter(l => form.target_lists.includes(l._id)).forEach(l => (l.contacts || []).forEach(id => ids.add(String(id))));
    return ids;
  }, [contactLists, form.target_type, form.target_lists]);

  const filteredContacts = useMemo(() => {
    let list = form.target_type === 'tags'
      ? optedInContacts.filter(c => c.labels?.some(l => form.target_tags.includes(l)))
      : form.target_type === 'lists'
        ? optedInContacts.filter(c => listContactIds.has(String(c._id)))
        : optedInContacts;
    if (contactSearch.trim()) {
      const q = contactSearch.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q));
    }
    return list;
  }, [optedInContacts, form.target_type, form.target_tags, contactSearch, listContactIds]);

  const audienceContacts = useMemo(() => {
    if (form.target_type === 'all') return optedInContacts;
    if (form.target_type === 'tags') return optedInContacts.filter(c => c.labels?.some(l => form.target_tags.includes(l)));
    if (form.target_type === 'lists') return optedInContacts.filter(c => listContactIds.has(String(c._id)));
    return optedInContacts.filter(c => form.recipients.includes(c.phone));
  }, [optedInContacts, form.target_type, form.target_tags, form.recipients, listContactIds]);

  const audiencePhones = audienceContacts.map(c => c.phone).filter(Boolean);

  const missingHeaderContacts = headerMediaFormat && form.header_media_mode === 'individual'
    ? audienceContacts.filter(c => !String(form.header_media_by_contact?.[c.phone] || '').trim())
    : [];

  /* Variable config helpers */
  const getVarConfig = (key) => {
    const c = form.variable_mapping?.[key];
    if (!c) return { source: 'custom', value: '' };
    if (typeof c === 'string') return { source: c === 'static' ? 'custom' : c, value: '' };
    return { source: c.source || 'custom', value: c.value || '' };
  };
  const setVarConfig = (key, patch) => {
    setForm(prev => {
      const cur = prev.variable_mapping?.[key];
      const norm = typeof cur === 'string' ? { source: cur === 'static' ? 'custom' : cur, value: '' } : { source: 'custom', value: '', ...(cur || {}) };
      return { ...prev, variable_mapping: { ...prev.variable_mapping, [key]: { ...norm, ...patch } } };
    });
  };

  /* Toggle helpers */
  const toggleRecipient = (phone) => setForm(f => ({ ...f, recipients: f.recipients.includes(phone) ? f.recipients.filter(p => p !== phone) : [...f.recipients, phone] }));
  const toggleTag = (tag) => setForm(f => ({ ...f, target_tags: f.target_tags.includes(tag) ? f.target_tags.filter(t => t !== tag) : [...f.target_tags, tag] }));
  const toggleList = (id) => setForm(f => ({ ...f, target_lists: f.target_lists.includes(id) ? f.target_lists.filter(l => l !== id) : [...f.target_lists, id] }));
  const selectAll = () => setForm(f => ({ ...f, recipients: optedInContacts.map(c => c.phone) }));
  const deselectAll = () => setForm(f => ({ ...f, recipients: [] }));

  /* Step validation */
  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (!form.name.trim()) { toast.error('Campaign name is required'); return false; }
    }
    if (currentStep === 2) {
      if (!form.template_name) { toast.error('Please select a template'); return false; }
      if (headerMediaFormat && form.header_media_mode === 'global' && !form.header_media_url.trim()) {
        toast.error(`Template requires ${headerMediaFormat.toUpperCase()} header media — add a URL or choose from gallery`);
        return false;
      }
    }
    if (currentStep === 3) {
      if (form.target_type === 'selected' && form.recipients.length === 0) { toast.error('Select at least one recipient'); return false; }
      if (form.target_type === 'tags' && form.target_tags.length === 0) { toast.error('Select at least one tag'); return false; }
      if (form.target_type === 'lists' && form.target_lists.length === 0) { toast.error('Select at least one contact list'); return false; }
      if (form.target_type === 'custom_field' && !form.target_custom_field) { toast.error('Select a custom field to filter by'); return false; }
      if (form.target_type === 'custom_field' && !form.target_custom_value.trim()) { toast.error('Enter a value for the custom field filter'); return false; }
      if (headerMediaFormat && form.header_media_mode === 'individual' && missingHeaderContacts.length > 0) {
        toast.error(`${missingHeaderContacts.length} contact(s) still need header media — add URLs for all contacts`);
        return false;
      }
    }
    if (currentStep === 4) {
      for (const token of templateVars) {
        const cfg = getVarConfig(token.key);
        if (cfg.source === 'custom' && !String(cfg.value || '').trim()) {
          toast.error(`Add a value for ${token.slot.toUpperCase()} variable {{${token.index}}}`);
          return false;
        }
      }
    }
    return true;
  };

  const goNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  /* Submit */
  const handleCreate = async () => {
    if (!form.name || !form.template_name) { toast.error('Name & template are required'); return; }
    if (form.target_type === 'selected' && form.recipients.length === 0) { toast.error('Select at least one recipient'); return; }
    if (form.target_type === 'tags' && form.target_tags.length === 0) { toast.error('Select at least one tag'); return; }
    if (form.target_type === 'lists' && form.target_lists.length === 0) { toast.error('Select at least one contact list'); return; }
    if (form.target_type === 'custom_field' && (!form.target_custom_field || !form.target_custom_value.trim())) { toast.error('Custom field and value are required'); return; }
    for (const token of templateVars) {
      const cfg = getVarConfig(token.key);
      if (cfg.source === 'custom' && !cfg.value.trim()) { toast.error(`Add value for ${token.slot.toUpperCase()} variable {{${token.index}}}`); return; }
    }
    if (headerMediaFormat) {
      if (form.header_media_mode === 'individual' && missingHeaderContacts.length) { toast.error(`Add header for ${missingHeaderContacts.length} contact(s)`); return; }
      if (form.header_media_mode === 'global' && !form.header_media_url.trim()) { toast.error(`Template requires ${headerMediaFormat.toUpperCase()} header media`); return; }
    }

    setCreating(true);
    try {
      const variableMapping = { ...(form.variable_mapping || {}) };
      if (headerMediaFormat) {
        variableMapping.__header_media_mode = form.header_media_mode || 'global';
        variableMapping.__header_media_type = headerMediaFormat;
        variableMapping.__header_media_global = form.header_media_url.trim();
        variableMapping.__header_media_by_contact = { ...(form.header_media_by_contact || {}) };
      }
      const defaultLink = form.header_media_mode === 'individual'
        ? String(audiencePhones.map(p => form.header_media_by_contact?.[p]).find(Boolean) || '')
        : form.header_media_url.trim();
      const payload = {
        ...form,
        variable_mapping: variableMapping,
        template_components: headerMediaFormat && defaultLink ? [{ type: 'header', parameters: [{ type: headerMediaFormat, [headerMediaFormat]: { link: defaultLink } }] }] : [],
      };
      const { data } = await api.post('/campaigns', payload);
      toast.success(data?.data?.launch === 'started' ? 'Campaign published and started!' : 'Campaign scheduled successfully!');
      navigate('/portal/campaigns');
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : (err?.error || 'Failed to create campaign'));
    } finally { setCreating(false); }
  };

  /* ── Render ── */
  return (
    <>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="animate-fade-in-up">
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Create Campaign</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5" />
            Set up and publish a bulk message campaign
          </p>
        </div>

        {/* ── Step Indicator ── */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-2">
            {STEPS.map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <button
                  onClick={() => s.num < step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex items-center gap-2.5 flex-1 px-3 py-2.5 rounded-lg transition-all ${
                    s.num === step
                      ? 'bg-brand-50 border border-brand-200'
                      : s.num < step
                        ? 'bg-emerald-50 border border-emerald-200 cursor-pointer hover:bg-emerald-100'
                        : 'bg-surface-50 border border-surface-100 opacity-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    s.num === step
                      ? 'bg-brand-500 text-white'
                      : s.num < step
                        ? 'bg-emerald-500 text-white'
                        : 'bg-surface-200 text-surface-400'
                  }`}>
                    {s.num < step ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 hidden lg:block">
                    <p className={`text-[12px] font-bold truncate ${s.num === step ? 'text-brand-700' : s.num < step ? 'text-emerald-700' : 'text-surface-400'}`}>{s.label}</p>
                    <p className="text-[10px] text-surface-400 truncate">{s.desc}</p>
                  </div>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`w-6 h-0.5 mx-1 flex-shrink-0 rounded ${s.num < step ? 'bg-emerald-300' : 'bg-surface-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Loading ── */}
        {dataLoading && (
          <div className="bg-white rounded-xl border border-surface-200 py-16 text-center animate-fade-in-up">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto mb-3" />
            <p className="text-[13px] text-surface-500 font-medium">Loading templates & contacts...</p>
          </div>
        )}

        {!dataLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ═══ LEFT: Step Content ═══ */}
            <div className="lg:col-span-8 space-y-4">

              {/* ── Step 1: Details ── */}
              {step === 1 && (
                <>
                  <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                    <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Settings className="w-4 h-4 text-blue-600" /></div>
                      <h3 className="text-[14px] font-bold text-surface-900">Campaign Details</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 block">Campaign Name</label>
                        <input
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          placeholder="e.g., Summer Sale Announcement"
                          className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 block">Schedule (Optional)</label>
                        <input
                          type="datetime-local"
                          value={form.scheduled_at}
                          onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                          className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all"
                        />
                        <p className="text-[11px] text-surface-400 mt-1.5">Leave empty to send immediately upon publish</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-start gap-3 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0"><Send className="w-4 h-4 text-blue-600" /></div>
                    <div>
                      <p className="text-[12px] font-bold text-blue-900">WhatsApp Business API</p>
                      <p className="text-[11px] text-blue-700 mt-0.5">Messages are sent via Meta's official WhatsApp Business API using your approved templates.</p>
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 2: Template ── */}
              {step === 2 && (
                <>
                  <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                    <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><FileText className="w-4 h-4 text-violet-600" /></div>
                        <h3 className="text-[14px] font-bold text-surface-900">Select Template</h3>
                        <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{templates.length} approved</span>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                        <input value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} placeholder="Search templates..." className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none" />
                      </div>

                      {templates.length === 0 ? (
                        <div className="py-10 text-center">
                          <FileText className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                          <p className="text-[13px] text-surface-500 font-medium">No approved templates</p>
                          <p className="text-[11px] text-surface-400 mt-1">Create templates in the Templates section first</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                          {filteredTemplates.map(tpl => {
                            const isSelected = form.template_name === tpl.name;
                            const vars = extractVars(tpl);
                            const body = tpl.components?.find(c => c.type === 'BODY')?.text || '';
                            return (
                              <button
                                key={tpl.id}
                                onClick={() => setForm({ ...form, template_name: tpl.name, template_language: tpl.language, variable_mapping: {}, template_components: [], header_media_url: '', header_media_mode: 'global', header_media_by_contact: {} })}
                                className={`w-full rounded-lg px-3 py-2.5 text-left transition-all border ${isSelected ? 'border-brand-400 bg-brand-50/60 ring-1 ring-brand-200' : 'border-surface-100 bg-surface-50/50 hover:border-surface-200 hover:bg-surface-50'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-500'}`}>
                                    {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[12px] font-bold text-surface-900 truncate">{tpl.name}</span>
                                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full border flex-shrink-0 ${CATEGORY_STYLES[tpl.category] || ''}`}>{tpl.category}</span>
                                      <span className="text-[10px] text-surface-400 flex-shrink-0">{tpl.language}</span>
                                      {vars.length > 0 && <span className="text-[10px] text-surface-400 flex items-center gap-0.5 flex-shrink-0"><Hash className="w-2.5 h-2.5" />{vars.length}</span>}
                                    </div>
                                    <p className="text-[11px] text-surface-500 truncate mt-0.5">{body.slice(0, 80)}{body.length > 80 ? '...' : ''}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Header media config */}
                  {headerMediaFormat && (
                    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '180ms' }}>
                      <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          {headerMediaFormat === 'image' ? <Image className="w-4 h-4 text-blue-600" /> : headerMediaFormat === 'video' ? <Video className="w-4 h-4 text-blue-600" /> : <Paperclip className="w-4 h-4 text-blue-600" />}
                        </div>
                        <h3 className="text-[14px] font-bold text-surface-900">Header Media ({headerMediaFormat.toUpperCase()})</h3>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
                          <button onClick={() => setForm(f => ({ ...f, header_media_mode: 'global' }))} className={`flex-1 px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${form.header_media_mode === 'global' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500'}`}>Same for all</button>
                          <button onClick={() => setForm(f => ({ ...f, header_media_mode: 'individual' }))} className={`flex-1 px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${form.header_media_mode === 'individual' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500'}`}>Per contact</button>
                        </div>
                        {form.header_media_mode === 'global' && (
                          <div className="flex items-center gap-2">
                            <input value={form.header_media_url} onChange={e => setForm(f => ({ ...f, header_media_url: e.target.value }))} placeholder={`Public ${headerMediaFormat} URL`} className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[12px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
                            <button onClick={() => { setActiveHeaderRecipient(''); setShowHeaderLibrary(true); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all flex-shrink-0"><FolderOpen className="w-3.5 h-3.5" />Gallery</button>
                          </div>
                        )}
                        {form.header_media_mode === 'individual' && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-[11px] text-blue-700 font-medium">Per-contact media can be configured in Step 3 (Audience).</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Step 3: Audience ── */}
              {step === 3 && (
                <>
                  <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                    <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Users className="w-4 h-4 text-emerald-600" /></div>
                      <h3 className="text-[14px] font-bold text-surface-900">Target Audience</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      {/* Audience type selector */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { key: 'all', label: 'All Contacts', icon: Users, desc: `${optedInContacts.length} opted-in`, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                          { key: 'tags', label: 'By Tags', icon: Tag, desc: `${allLabels.length} available`, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
                          { key: 'lists', label: 'By List', icon: List, desc: `${contactLists.length} lists`, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                          { key: 'custom_field', label: 'By Custom Field', icon: Hash, desc: `${customFieldDefs.length} fields`, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
                          { key: 'selected', label: 'Manual Select', icon: CheckCircle2, desc: 'Pick individually', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                        ].map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => setForm(f => ({ ...f, target_type: opt.key, recipients: [], target_tags: [], target_lists: [], target_custom_field: '', target_custom_value: '' }))}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                              form.target_type === opt.key ? `${opt.border} ${opt.bg}` : 'border-surface-100 hover:border-surface-200 hover:bg-surface-50'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${form.target_type === opt.key ? opt.bg : 'bg-surface-100'}`}>
                              <opt.icon className={`w-[18px] h-[18px] ${form.target_type === opt.key ? opt.color : 'text-surface-400'}`} />
                            </div>
                            <span className="text-[12px] font-bold text-surface-900">{opt.label}</span>
                            <span className="text-[10px] text-surface-400">{opt.desc}</span>
                          </button>
                        ))}
                      </div>

                      {/* All contacts info */}
                      {form.target_type === 'all' && (
                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><Users className="w-[18px] h-[18px] text-emerald-600" /></div>
                          <div>
                            <p className="text-[13px] font-bold text-emerald-900">{optedInContacts.length} opted-in contacts</p>
                            <p className="text-[11px] text-emerald-700">All contacts who have opted in will receive this campaign</p>
                          </div>
                        </div>
                      )}

                      {/* Tags selector */}
                      {form.target_type === 'tags' && (
                        <div className="space-y-3">
                          <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Select Tags</label>
                          <div className="flex flex-wrap gap-2">
                            {allLabels.map(label => (
                              <button
                                key={label}
                                onClick={() => toggleTag(label)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                                  form.target_tags.includes(label) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-surface-700 border-surface-200 hover:border-surface-300'
                                }`}
                              >
                                {form.target_tags.includes(label) && <Check className="w-3 h-3" />}
                                {label}
                              </button>
                            ))}
                          </div>
                          {form.target_tags.length > 0 && (
                            <p className="text-[11px] text-emerald-600 font-bold">{filteredContacts.length} contacts match selected tags</p>
                          )}
                        </div>
                      )}

                      {/* Lists selector */}
                      {form.target_type === 'lists' && (
                        <div className="space-y-3">
                          <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Select Contact Lists</label>
                          {contactLists.length === 0 ? (
                            <div className="py-8 text-center border border-surface-200 rounded-lg bg-surface-50/50">
                              <List className="w-7 h-7 text-surface-300 mx-auto mb-2" />
                              <p className="text-[12px] text-surface-500 font-medium">No contact lists yet</p>
                              <p className="text-[11px] text-surface-400 mt-1">Create lists in the Contacts section first</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {contactLists.map(list => {
                                const isSelected = form.target_lists.includes(list._id);
                                return (
                                  <button
                                    key={list._id}
                                    onClick={() => toggleList(list._id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                                      isSelected ? 'border-orange-300 bg-orange-50/60' : 'border-surface-100 hover:border-surface-200 hover:bg-surface-50'
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                      isSelected ? 'bg-orange-500 border-orange-500' : 'border-surface-300'
                                    }`}>
                                      {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: list.color || '#6B7280' }} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[12px] font-bold text-surface-900">{list.name}</p>
                                      {list.description && <p className="text-[11px] text-surface-400 truncate">{list.description}</p>}
                                    </div>
                                    <span className="text-[11px] font-semibold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                      {list.contact_count || list.contacts?.length || 0}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {form.target_lists.length > 0 && (
                            <p className="text-[11px] text-emerald-600 font-bold">
                              {audienceContacts.length} contacts in {form.target_lists.length} selected list{form.target_lists.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Custom field filter */}
                      {form.target_type === 'custom_field' && (
                        <div className="space-y-3">
                          <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Filter by Custom Field</label>
                          <select
                            value={form.target_custom_field}
                            onChange={e => setForm(f => ({ ...f, target_custom_field: e.target.value }))}
                            className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all"
                          >
                            <option value="">Select a custom field...</option>
                            {customFieldDefs.map(f => (
                              <option key={f.field_name} value={f.field_name}>{f.field_label}</option>
                            ))}
                          </select>
                          {form.target_custom_field && (
                            <div>
                              <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 block">Field Value to Match</label>
                              <input
                                value={form.target_custom_value}
                                onChange={e => setForm(f => ({ ...f, target_custom_value: e.target.value }))}
                                placeholder="Enter value to filter contacts by..."
                                className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all"
                              />
                            </div>
                          )}
                          {form.target_custom_field && form.target_custom_value && (
                            <p className="text-[11px] text-emerald-600 font-bold">
                              Contacts with {customFieldDefs.find(f => f.field_name === form.target_custom_field)?.field_label || form.target_custom_field} = "{form.target_custom_value}" will be targeted
                            </p>
                          )}
                        </div>
                      )}

                      {/* Manual selector */}
                      {form.target_type === 'selected' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-surface-500">{form.recipients.length} selected</span>
                            <div className="flex items-center gap-2">
                              <button onClick={selectAll} className="text-[11px] text-brand-600 hover:text-brand-700 font-bold">Select All</button>
                              {form.recipients.length > 0 && <button onClick={deselectAll} className="text-[11px] text-red-500 hover:text-red-600 font-bold">Clear</button>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                            <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                            <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts..." className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none" />
                          </div>
                          <div className="divide-y divide-surface-100 border border-surface-200 rounded-lg max-h-[280px] overflow-y-auto">
                            {filteredContacts.map(contact => (
                              <button
                                key={contact._id}
                                onClick={() => toggleRecipient(contact.phone)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-50 ${form.recipients.includes(contact.phone) ? 'bg-brand-50/40' : ''}`}
                              >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${form.recipients.includes(contact.phone) ? 'bg-brand-600 border-brand-600' : 'border-surface-300'}`}>
                                  {form.recipients.includes(contact.phone) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                                  {(contact.name || contact.phone || '?')[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-semibold text-surface-800 truncate">{contact.name || 'Unnamed'}</p>
                                  <p className="text-[11px] text-surface-400">+{contact.phone}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Per-contact header media */}
                      {headerMediaFormat && form.header_media_mode === 'individual' && audienceContacts.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-surface-100">
                          <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Per-Contact Header Media</label>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {audienceContacts.map(contact => (
                              <div key={contact.phone} className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-surface-700 w-24 truncate flex-shrink-0">{contact.name || contact.phone}</span>
                                <input
                                  value={form.header_media_by_contact?.[contact.phone] || ''}
                                  onChange={e => setForm(f => ({ ...f, header_media_by_contact: { ...f.header_media_by_contact, [contact.phone]: e.target.value } }))}
                                  placeholder="URL"
                                  className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-2.5 py-1.5 text-[11px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                                />
                                <button onClick={() => { setActiveHeaderRecipient(contact.phone); setShowHeaderLibrary(true); }} className="px-2 py-1.5 rounded-lg border border-surface-200 bg-white text-[11px] font-semibold text-surface-600 hover:bg-surface-50 flex-shrink-0">Gallery</button>
                              </div>
                            ))}
                          </div>
                          {missingHeaderContacts.length > 0 && <p className="text-[10px] text-amber-600 font-bold">{missingHeaderContacts.length} contact(s) still need header media</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 4: Variables ── */}
              {step === 4 && (
                <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                  <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><Zap className="w-4 h-4 text-amber-600" /></div>
                    <h3 className="text-[14px] font-bold text-surface-900">Message Variables</h3>
                    {templateVars.length > 0 && <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{templateVars.length}</span>}
                  </div>
                  <div className="p-5">
                    {templateVars.length === 0 ? (
                      <div className="py-10 text-center">
                        <Zap className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                        <p className="text-[13px] text-surface-500 font-medium">No variables to configure</p>
                        <p className="text-[11px] text-surface-400 mt-1">This template doesn't use dynamic variables</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {templateVars.map(token => {
                          const cfg = getVarConfig(token.key);
                          return (
                            <div key={token.key} className="p-3 rounded-lg border border-surface-200 bg-surface-50/50 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">{`${token.slot.toUpperCase()} {{${token.index}}}`}</span>
                              </div>
                              <select value={cfg.source} onChange={e => setVarConfig(token.key, { source: e.target.value })} className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-[12px] font-medium text-surface-700 focus:ring-2 focus:ring-brand-500/20 focus:outline-none">
                                {varSourceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              {cfg.source === 'custom' ? (
                                <input value={cfg.value} onChange={e => setVarConfig(token.key, { value: e.target.value })} placeholder={`Value for {{${token.index}}}...`} className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-[12px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
                              ) : (
                                <p className="text-[11px] text-brand-600 font-semibold px-1">
                                  {cfg.source.startsWith('custom_field:') ? `Auto-filled from custom field: ${cfg.source.replace('custom_field:', '')}` : 'Auto-filled from contact data'}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Template preview */}
                    {selectedTemplate && (
                      <div className="mt-5 pt-5 border-t border-surface-100">
                        <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-3">Template Preview</p>
                        <WhatsAppPreview template={selectedTemplate} variableMapping={form.variable_mapping} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 5: Review ── */}
              {step === 5 && (
                <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                  <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center"><Eye className="w-4 h-4 text-brand-600" /></div>
                    <h3 className="text-[14px] font-bold text-surface-900">Review & Publish</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Summary rows */}
                    <div className="divide-y divide-surface-100 rounded-lg border border-surface-200 overflow-hidden">
                      {[
                        { label: 'Campaign Name', value: form.name || '—', icon: Megaphone },
                        { label: 'Template', value: form.template_name || '—', icon: FileText },
                        { label: 'Targeting', value: form.target_type === 'all' ? 'All Contacts' : form.target_type === 'tags' ? `Tags: ${form.target_tags.join(', ')}` : form.target_type === 'lists' ? `Lists: ${contactLists.filter(l => form.target_lists.includes(l._id)).map(l => l.name).join(', ')}` : form.target_type === 'custom_field' ? `Custom Field: ${form.target_custom_field} = ${form.target_custom_value}` : 'Manual Selection', icon: Users },
                        { label: 'Recipients', value: audienceContacts.length.toString(), icon: Send },
                        { label: 'Schedule', value: form.scheduled_at ? new Date(form.scheduled_at).toLocaleString() : 'Send immediately', icon: Calendar },
                      ].map(row => (
                        <div key={row.label} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-7 h-7 rounded-md bg-surface-50 flex items-center justify-center flex-shrink-0"><row.icon className="w-3.5 h-3.5 text-surface-400" /></div>
                          <span className="text-[12px] text-surface-500 font-medium flex-1">{row.label}</span>
                          <span className="text-[13px] font-semibold text-surface-900">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Advanced Campaign Settings */}
                    <div className="rounded-lg border border-surface-200 overflow-hidden">
                      <div className="px-4 py-3 bg-surface-50 border-b border-surface-100">
                        <h4 className="text-[12px] font-bold text-surface-700">Advanced Settings</h4>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Auto-resend failed */}
                        <div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.auto_resend_failed}
                              onChange={(e) => setForm((p) => ({ ...p, auto_resend_failed: e.target.checked }))}
                              className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-200"
                            />
                            <div>
                              <span className="text-[13px] font-medium text-surface-800">Auto-resend failed messages</span>
                              <p className="text-[10px] text-surface-400 mt-0.5">Automatically retry sending to contacts that failed</p>
                            </div>
                          </label>
                          {form.auto_resend_failed && (
                            <div className="mt-2 ml-7 flex items-center gap-3">
                              <div>
                                <label className="block text-[10px] font-medium text-surface-500 mb-1">Retry after (hours)</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={48}
                                  value={form.auto_resend_delay_hours}
                                  onChange={(e) => setForm((p) => ({ ...p, auto_resend_delay_hours: parseInt(e.target.value, 10) || 2 }))}
                                  className="w-20 px-2 py-1.5 text-[12px] border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tag by delivery status */}
                        <div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.tag_by_status}
                              onChange={(e) => setForm((p) => ({ ...p, tag_by_status: e.target.checked }))}
                              className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-200"
                            />
                            <div>
                              <span className="text-[13px] font-medium text-surface-800">Tag contacts by delivery status</span>
                              <p className="text-[10px] text-surface-400 mt-0.5">Auto-tag contacts as delivered, read, or failed after campaign ends</p>
                            </div>
                          </label>
                          {form.tag_by_status && (
                            <div className="mt-2 ml-7">
                              <label className="block text-[10px] font-medium text-surface-500 mb-1">Tag prefix (optional)</label>
                              <input
                                type="text"
                                value={form.tag_prefix}
                                onChange={(e) => setForm((p) => ({ ...p, tag_prefix: e.target.value }))}
                                placeholder={form.name ? form.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() : 'campaign_name'}
                                className="w-48 px-2 py-1.5 text-[12px] border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300"
                              />
                              <p className="text-[10px] text-surface-400 mt-0.5">Tags: {form.tag_prefix || form.name?.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'prefix'}_delivered, _read, _failed</p>
                            </div>
                          )}
                        </div>

                        {/* Auto-unsubscribe on failures */}
                        <div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.auto_unsubscribe_failures}
                              onChange={(e) => setForm((p) => ({ ...p, auto_unsubscribe_failures: e.target.checked }))}
                              className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-200"
                            />
                            <div>
                              <span className="text-[13px] font-medium text-surface-800">Auto-unsubscribe on repeated failures</span>
                              <p className="text-[10px] text-surface-400 mt-0.5">Automatically opt-out contacts after consecutive campaign failures</p>
                            </div>
                          </label>
                          {form.auto_unsubscribe_failures && (
                            <div className="mt-2 ml-7 flex items-center gap-3">
                              <div>
                                <label className="block text-[10px] font-medium text-surface-500 mb-1">Failure threshold</label>
                                <input
                                  type="number"
                                  min={2}
                                  max={10}
                                  value={form.auto_unsubscribe_threshold}
                                  onChange={(e) => setForm((p) => ({ ...p, auto_unsubscribe_threshold: parseInt(e.target.value, 10) || 3 }))}
                                  className="w-20 px-2 py-1.5 text-[12px] border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300"
                                />
                              </div>
                              <p className="text-[10px] text-surface-400 mt-4">consecutive failures before unsubscribing</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Email Report Settings */}
                    <div className="rounded-lg border border-surface-200 overflow-hidden">
                      <div className="px-4 py-3 bg-surface-50 border-b border-surface-100">
                        <h4 className="text-[12px] font-bold text-surface-700">Email Report Settings</h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.send_completion_report}
                            onChange={(e) => setForm((p) => ({ ...p, send_completion_report: e.target.checked }))}
                            className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-200"
                          />
                          <div>
                            <span className="text-[13px] font-medium text-surface-800">Send email report on completion</span>
                            <p className="text-[10px] text-surface-400 mt-0.5">Get a summary with stats, delivery breakdown, and CSV of failed numbers</p>
                          </div>
                        </label>
                        {form.send_completion_report && (
                          <div>
                            <label className="block text-[11px] font-medium text-surface-500 mb-1">Additional recipients (optional)</label>
                            <input
                              type="text"
                              value={form.report_recipients}
                              onChange={(e) => setForm((p) => ({ ...p, report_recipients: e.target.value }))}
                              placeholder="e.g. team@company.com, manager@company.com"
                              className="w-full px-3 py-2 text-[12px] border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300"
                            />
                            <p className="text-[10px] text-surface-400 mt-1">Report will always be sent to the account owner. Add comma-separated emails for additional recipients.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 text-amber-600" /></div>
                      <div>
                        <p className="text-[12px] font-bold text-amber-900">Confirm before publishing</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">Messages will be sent via Meta WhatsApp API and cannot be recalled once delivered.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Navigation Buttons ── */}
              <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
                {step > 1 && (
                  <button onClick={() => setStep(step - 1)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                )}
                <button onClick={() => navigate('/portal/campaigns')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">
                  Cancel
                </button>
                <div className="flex-1" />
                {step < 5 ? (
                  <button onClick={goNext} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold rounded-lg transition-colors">
                    Next
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button onClick={handleCreate} disabled={creating} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {creating ? 'Publishing...' : 'Publish Campaign'}
                  </button>
                )}
              </div>
            </div>

            {/* ═══ RIGHT: Sidebar Summary ═══ */}
            <div className="lg:col-span-4 space-y-4">
              <div className="lg:sticky lg:top-6 space-y-4">
                {/* Campaign summary card */}
                <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '180ms' }}>
                  <div className="px-5 py-3.5 border-b border-surface-100">
                    <h3 className="text-[14px] font-bold text-surface-900">Campaign Summary</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-surface-400">Name</span>
                      <span className="text-[12px] font-semibold text-surface-900 truncate max-w-[140px]">{form.name || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-surface-400">Template</span>
                      <span className="text-[12px] font-semibold text-surface-900 truncate max-w-[140px]">{form.template_name || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-surface-400">Audience</span>
                      <span className="text-[12px] font-semibold text-surface-900">{audienceContacts.length} contacts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-surface-400">Schedule</span>
                      <span className="text-[12px] font-semibold text-surface-900">{form.scheduled_at ? 'Scheduled' : 'Immediate'}</span>
                    </div>
                    {templateVars.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-surface-400">Variables</span>
                        <span className="text-[12px] font-semibold text-surface-900">{templateVars.length}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step progress */}
                <div className="bg-white rounded-xl border border-surface-200 p-4 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
                  <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-3">Progress</p>
                  <div className="space-y-2">
                    {STEPS.map(s => (
                      <div key={s.num} className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          s.num < step ? 'bg-emerald-500' : s.num === step ? 'bg-brand-500' : 'bg-surface-200'
                        }`}>
                          {s.num < step ? <Check className="w-3 h-3 text-white" /> : <span className="text-[9px] font-bold text-white">{s.num}</span>}
                        </div>
                        <span className={`text-[12px] font-medium ${s.num <= step ? 'text-surface-900' : 'text-surface-400'}`}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Media Library Modal */}
      <MediaLibraryModal
        open={showHeaderLibrary}
        onClose={() => setShowHeaderLibrary(false)}
        title="Select Header Media"
        subtitle="Pick a file for the campaign template header"
        allowedTypes={headerMediaFormat ? [headerMediaFormat] : ['document']}
        onSelect={(assets) => {
          const first = assets?.[0];
          if (!first?.public_url) { toast.error('No valid media selected'); return; }
          setForm(current => {
            if (activeHeaderRecipient) return { ...current, header_media_by_contact: { ...current.header_media_by_contact, [activeHeaderRecipient]: first.public_url } };
            return { ...current, header_media_url: first.public_url };
          });
          setShowHeaderLibrary(false);
          setActiveHeaderRecipient('');
          toast.success('Header media selected');
        }}
      />
    </>
  );
}
