import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, FileText, Globe, Hash, Image, Loader2, Mic, Phone,
  Plus, Send, Trash2, Video, X, Zap, ExternalLink, Link2, MessageSquare, Type,
} from 'lucide-react';
import api from '../../api/axios';
import WhatsAppPhonePreview from '../../components/ui/WhatsAppPhonePreview';

/* ── Constants ── */
const CATEGORIES = [
  { value: 'MARKETING', label: 'Marketing', desc: 'Promotions & offers', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'UTILITY', label: 'Utility', desc: 'Order updates, alerts', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'AUTHENTICATION', label: 'Authentication', desc: 'OTP & verification', color: 'bg-amber-50 text-amber-700 border-amber-200' },
];

const HEADER_TYPES = [
  { value: 'NONE', label: 'None', icon: X },
  { value: 'TEXT', label: 'Text', icon: Type },
  { value: 'IMAGE', label: 'Image', icon: Image },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'DOCUMENT', label: 'Document', icon: FileText },
];

const BUTTON_TYPES = [
  { value: 'QUICK_REPLY', label: 'Quick Reply', icon: MessageSquare, desc: 'User taps to reply' },
  { value: 'URL', label: 'URL', icon: ExternalLink, desc: 'Opens a link' },
  { value: 'PHONE_NUMBER', label: 'Call', icon: Phone, desc: 'Opens dialer' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'hi', label: 'Hindi' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'mr', label: 'Marathi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'bn', label: 'Bengali' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'ur', label: 'Urdu' },
  { value: 'ar', label: 'Arabic' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'pt_BR', label: 'Portuguese (BR)' },
];

/* ── Validation helpers ── */
const parsePlaceholders = (val = '') => {
  const found = [];
  const re = /\{\{(\d+)\}\}/g;
  let m;
  while ((m = re.exec(String(val)))) found.push(Number(m[1]));
  return [...new Set(found)].sort((a, b) => a - b);
};

const validatePlaceholders = (val = '', label = 'Text') => {
  const tokens = String(val).match(/\{\{[^}]+\}\}/g) || [];
  for (const t of tokens) {
    if (!/^\{\{\d+\}\}$/.test(t)) throw new Error(`${label}: variables must be numeric like {{1}}`);
  }
  const idx = parsePlaceholders(val);
  for (let i = 0; i < idx.length; i++) {
    if (idx[i] !== i + 1) throw new Error(`${label}: placeholders must be sequential {{1}}, {{2}}, ...`);
  }
};

const normalizeUrl = (val = '') => {
  const raw = String(val).trim();
  if (!raw) return '';
  const withP = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const phs = withP.match(/\{\{\d+\}\}/g) || [];
  if (phs.length > 1 || (phs.length === 1 && (phs[0] !== '{{1}}' || !withP.endsWith('{{1}}')))) {
    throw new Error('URL supports only one {{1}} placeholder at the end');
  }
  const test = phs.length ? withP.replace('{{1}}', 'x') : withP;
  try {
    const u = new URL(test);
    if (!u.hostname || u.hostname === 'localhost' || /^[\d.]+$/.test(u.hostname)) throw 0;
    return withP;
  } catch { throw new Error('Invalid URL - must be a public domain'); }
};

const extractError = (e, fb = 'Failed') => {
  const d = e?.response?.data;
  return d?.error || d?.message || e?.message || fb;
};

/* ── Build payload for Meta API ── */
const buildPayload = (form) => {
  if (!form.name.trim()) throw new Error('Template name is required');
  if (!form.bodyText.trim()) throw new Error('Body text is required');
  validatePlaceholders(form.bodyText, 'Body');
  if (form.headerType === 'TEXT') validatePlaceholders(form.headerContent, 'Header');

  const components = [];

  // Header
  if (form.headerType !== 'NONE') {
    if (!form.headerContent.trim()) throw new Error('Header content is required');
    if (form.headerType === 'TEXT') {
      components.push({ type: 'HEADER', format: 'TEXT', text: form.headerContent.trim() });
    } else {
      const handle = form.headerContent.trim();
      if (/^https?:\/\//i.test(handle)) throw new Error('Media header needs a Meta handle, not URL. Click "Get Handle" to convert.');
      components.push({ type: 'HEADER', format: form.headerType, example: { header_handle: [handle] } });
    }
  }

  // Body (with example values for placeholders)
  const bodyPlaceholders = parsePlaceholders(form.bodyText);
  const bodyComponent = { type: 'BODY', text: form.bodyText.trim() };
  if (bodyPlaceholders.length > 0) {
    bodyComponent.example = {
      body_text: [bodyPlaceholders.map((_, i) => form.bodyExamples?.[i] || `sample_${i + 1}`)],
    };
  }
  components.push(bodyComponent);

  // Footer
  if (form.footerText.trim()) {
    components.push({ type: 'FOOTER', text: form.footerText.trim() });
  }

  // Buttons
  const activeButtons = form.buttons.filter((b) => b.text.trim());
  if (activeButtons.length > 3) throw new Error('Maximum 3 buttons');
  if (activeButtons.length) {
    const buttons = activeButtons.map((b) => {
      const text = b.text.trim();
      if (b.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text };
      if (b.type === 'URL') {
        const url = normalizeUrl(b.url);
        if (!url) throw new Error(`Button "${text}" needs a valid URL`);
        const btn = { type: 'URL', text, url };
        if (url.includes('{{1}}')) {
          btn.example = [url.replace('{{1}}', 'https://example.com/sample')];
        }
        return btn;
      }
      // PHONE_NUMBER
      const phone = b.phone_number.replace(/[^\d+]/g, '');
      if (!phone) throw new Error(`Button "${text}" needs a phone number`);
      return { type: 'PHONE_NUMBER', text, phone_number: phone };
    });
    components.push({ type: 'BUTTONS', buttons });
  }

  return {
    name: form.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    category: form.category,
    language: form.language,
    components,
  };
};

/* ── Parse existing template to form ── */
const parseToForm = (t) => {
  const c = t?.components || [];
  const header = c.find((x) => x.type === 'HEADER');
  const body = c.find((x) => x.type === 'BODY');
  const footer = c.find((x) => x.type === 'FOOTER');
  const btns = c.find((x) => x.type === 'BUTTONS');
  const ht = String(header?.format || 'NONE').toUpperCase();
  return {
    name: t?.name || '',
    category: t?.category || 'MARKETING',
    language: t?.language || 'en',
    headerType: ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].includes(ht) ? ht : 'NONE',
    headerContent: ht === 'TEXT' ? (header?.text || '') : (header?.example?.header_handle?.[0] || ''),
    bodyText: body?.text || '',
    bodyExamples: body?.example?.body_text?.[0] || [],
    footerText: footer?.text || '',
    buttons: (btns?.buttons || []).map((b) => ({
      type: b.type === 'PHONE_NUMBER' ? 'PHONE_NUMBER' : b.type,
      text: b.text || '',
      url: b.url || '',
      phone_number: b.phone_number || '',
    })),
  };
};

const makeEmpty = () => ({
  name: '', category: 'MARKETING', language: 'en', headerType: 'NONE',
  headerContent: '', bodyText: '', bodyExamples: [], footerText: '', buttons: [],
});

/* ══════════════════════════════════════════════════════════════ */
export default function TemplateCreate() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);

  const [form, setForm] = useState(makeEmpty());
  const [submitting, setSubmitting] = useState(false);
  const [resolvingHandle, setResolvingHandle] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  /* Load template for edit */
  useEffect(() => {
    if (!editId) return;
    setLoadingTemplate(true);
    api.get('/meta/templates')
      .then(({ data }) => {
        const t = (data.data?.templates || []).find((x) => x.id === editId);
        if (t) setForm(parseToForm(t));
        else toast.error('Template not found');
      })
      .catch(() => toast.error('Failed to load template'))
      .finally(() => setLoadingTemplate(false));
  }, [editId]);

  const upd = (key, val) => setForm((c) => ({ ...c, [key]: val }));
  const updBtn = (idx, key, val) => {
    const btns = [...form.buttons];
    btns[idx] = { ...btns[idx], [key]: val };
    setForm((c) => ({ ...c, buttons: btns }));
  };

  /* Resolve media handle from URL */
  const resolveHandle = async () => {
    const url = form.headerContent.trim();
    if (!url || !/^https?:\/\//i.test(url)) { toast.error('Enter a media URL first'); return; }
    setResolvingHandle(true);
    try {
      const { data } = await api.post('/meta/templates/media-handle', {
        media_url: url, format: form.headerType,
      });
      const handle = data?.data?.handle?.trim();
      if (!handle) throw new Error('No handle returned');
      upd('headerContent', handle);
      toast.success('Media handle resolved!');
    } catch (e) { toast.error(extractError(e, 'Failed to get handle')); }
    finally { setResolvingHandle(false); }
  };

  /* Submit */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = buildPayload(form);
      if (isEdit) {
        await api.post(`/meta/templates/${editId}/edit`, { components: payload.components });
        toast.success('Template edit submitted');
      } else {
        await api.post('/meta/templates', payload);
        toast.success('Template submitted to Meta!');
      }
      navigate('/portal/templates');
    } catch (e) {
      const err = e?.response?.data;
      const msg = extractError(e, 'Submission failed');
      toast.error(err?.error_source === 'meta' ? `Meta: ${msg}` : msg);
    } finally { setSubmitting(false); }
  };

  /* ── Preview props ── */
  const previewProps = useMemo(() => {
    const p = {};
    if (form.headerType === 'TEXT' && form.headerContent) p.header = { type: 'text', text: form.headerContent };
    else if (form.headerType === 'IMAGE') p.header = { type: 'image' };
    else if (form.headerType === 'VIDEO') p.header = { type: 'video' };
    else if (form.headerType === 'DOCUMENT') p.header = { type: 'document', filename: 'Document.pdf' };
    if (form.bodyText) p.body = form.bodyText;
    if (form.footerText) p.footer = form.footerText;
    p.buttons = form.buttons.filter((b) => b.text.trim()).map((b) => ({
      type: b.type === 'PHONE_NUMBER' ? 'PHONE_NUMBER' : b.type,
      text: b.text, url: b.url, phone: b.phone_number,
    }));
    return p;
  }, [form]);

  const bodyVarCount = parsePlaceholders(form.bodyText).length;

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden">
      <div className="h-full px-5 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full items-start">

          {/* ═══ LEFT: Form ═══ */}
          <div className="lg:col-span-7 flex flex-col max-h-full min-h-0">
            <div className="overflow-y-auto space-y-3 pr-1 min-h-0 pb-3">

              {/* Title */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate('/portal/templates')} className="w-8 h-8 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-surface-600 hover:bg-surface-50 transition">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h1 className="text-[17px] font-extrabold text-surface-900">
                    {isEdit ? 'Edit Template' : 'Create Template'}
                  </h1>
                </div>
              </div>

              {/* ── Name + Category + Language ── */}
              <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5 block">Template Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => upd('name', e.target.value)}
                    placeholder="e.g. order_confirmation"
                    disabled={isEdit}
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none disabled:opacity-50"
                  />
                  {!isEdit && form.name && (
                    <p className="text-[10px] text-surface-400 mt-1">
                      Will submit as: <span className="font-mono font-semibold">{form.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5 block">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => upd('category', e.target.value)}
                      disabled={isEdit}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none disabled:opacity-50"
                    >
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label} — {c.desc}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5 block">Language</label>
                    <select
                      value={form.language}
                      onChange={(e) => upd('language', e.target.value)}
                      disabled={isEdit}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none disabled:opacity-50"
                    >
                      {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Header ── */}
              <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-2">
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Header (Optional)</label>
                <div className="flex gap-1.5">
                  {HEADER_TYPES.map((ht) => (
                    <button
                      key={ht.value}
                      onClick={() => { upd('headerType', ht.value); upd('headerContent', ''); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition border ${
                        form.headerType === ht.value
                          ? 'bg-surface-900 text-white border-surface-900'
                          : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
                      }`}
                    >
                      <ht.icon className="w-3.5 h-3.5" />
                      {ht.label}
                    </button>
                  ))}
                </div>

                {form.headerType !== 'NONE' && (
                  <div className="space-y-2">
                    {form.headerType === 'TEXT' ? (
                      <input
                        value={form.headerContent}
                        onChange={(e) => upd('headerContent', e.target.value)}
                        placeholder="Header text (supports {{1}} variables)"
                        className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          value={form.headerContent}
                          onChange={(e) => upd('headerContent', e.target.value)}
                          placeholder="Paste media URL, then click Get Handle..."
                          className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[12px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                        />
                        <button
                          onClick={resolveHandle}
                          disabled={resolvingHandle}
                          className="px-3 py-2 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 disabled:opacity-50 text-[12px] font-semibold whitespace-nowrap transition"
                        >
                          {resolvingHandle ? 'Resolving...' : 'Get Handle'}
                        </button>
                      </div>
                    )}
                    {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(form.headerType) && (
                      <p className="text-[10px] text-surface-400">
                        Paste a public media URL and click "Get Handle" to convert it to a Meta media handle for template submission.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Body ── */}
              <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Body Text</label>
                  {bodyVarCount > 0 && (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      {bodyVarCount} variable{bodyVarCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <textarea
                  value={form.bodyText}
                  onChange={(e) => upd('bodyText', e.target.value)}
                  placeholder="Hello {{1}}, your order #{{2}} is confirmed!"
                  rows={4}
                  className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none resize-none"
                />
                <p className="text-[10px] text-surface-400">Use {'{{1}}'}, {'{{2}}'}, etc. for dynamic variables. Must be sequential.</p>

                {/* Example values for variables (required by Meta) */}
                {bodyVarCount > 0 && (
                  <div className="bg-amber-50/50 rounded-lg p-2.5 space-y-1.5 border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Sample Values (required by Meta)</p>
                    {parsePlaceholders(form.bodyText).map((idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded min-w-[38px] text-center">{`{{${idx}}}`}</span>
                        <input
                          value={form.bodyExamples?.[idx - 1] || ''}
                          onChange={(e) => {
                            const ex = [...(form.bodyExamples || [])];
                            ex[idx - 1] = e.target.value;
                            upd('bodyExamples', ex);
                          }}
                          placeholder={`Sample for {{${idx}}}`}
                          className="flex-1 rounded border border-amber-200 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-300"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-2">
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Footer (Optional)</label>
                <input
                  value={form.footerText}
                  onChange={(e) => upd('footerText', e.target.value)}
                  placeholder="Reply STOP to unsubscribe"
                  className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                />
              </div>

              {/* ── Buttons ── */}
              <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Buttons (Max 3)</label>
                  <span className="text-[10px] text-surface-400">{form.buttons.length}/3</span>
                </div>

                {form.buttons.map((btn, idx) => (
                  <div key={idx} className="rounded-lg border border-surface-200 bg-surface-50 p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={btn.type}
                        onChange={(e) => updBtn(idx, 'type', e.target.value)}
                        className="rounded-lg border border-surface-200 bg-white px-2 py-1.5 text-[11px] font-semibold focus:outline-none"
                      >
                        {BUTTON_TYPES.map((bt) => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                      </select>
                      <input
                        value={btn.text}
                        onChange={(e) => updBtn(idx, 'text', e.target.value)}
                        placeholder="Button label"
                        className="flex-1 rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                      />
                      <button
                        onClick={() => setForm((c) => ({ ...c, buttons: c.buttons.filter((_, i) => i !== idx) }))}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {btn.type === 'URL' && (
                      <input
                        value={btn.url}
                        onChange={(e) => updBtn(idx, 'url', e.target.value)}
                        placeholder="https://example.com/page{{1}}"
                        className="w-full rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                      />
                    )}
                    {btn.type === 'PHONE_NUMBER' && (
                      <input
                        value={btn.phone_number}
                        onChange={(e) => updBtn(idx, 'phone_number', e.target.value)}
                        placeholder="+919876543210"
                        className="w-full rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                      />
                    )}
                  </div>
                ))}

                {form.buttons.length < 3 && (
                  <button
                    onClick={() => setForm((c) => ({ ...c, buttons: [...c.buttons, { type: 'QUICK_REPLY', text: '', url: '', phone_number: '' }] }))}
                    className="w-full py-2 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 text-[12px] font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Button
                  </button>
                )}
              </div>

              {/* ── Submit ── */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-semibold text-[13px] transition-all shadow-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Submitting...' : isEdit ? 'Save Changes' : 'Submit to Meta'}
              </button>

            </div>
          </div>

          {/* ═══ RIGHT: Preview ═══ */}
          <div className="lg:col-span-5 flex items-center justify-center h-[calc(100vh-96px)]">
            <div className="animate-fade-in-up">
              <WhatsAppPhonePreview
                {...previewProps}
                contactName="WBIZ.IN"
                emptyMessage="Fill in the template to see preview"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
