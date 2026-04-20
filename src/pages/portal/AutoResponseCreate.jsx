import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Bot, Clock, HelpCircle, Loader2, MessageSquare,
  Hand, Plus, Save, Trash2, X, BellOff, BellRing,
} from 'lucide-react';
import api from '../../api/axios';
import WhatsAppPhonePreview from '../../components/ui/WhatsAppPhonePreview';

/* ── Constants ── */
const TRIGGER_OPTIONS = [
  { value: 'keyword', label: 'Keyword Reply', icon: MessageSquare, hint: 'Reply when inbound text matches keywords.', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'welcome', label: 'Welcome Reply', icon: Hand, hint: 'Reply to the first message from a contact.', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'away', label: 'Away Message', icon: Clock, hint: 'Reply outside business hours.', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'fallback', label: 'Fallback Reply', icon: HelpCircle, hint: 'Reply when no other rule matches.', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'unsubscribe', label: 'Unsubscribe', icon: BellOff, hint: 'Opt-out contact when they send STOP, UNSUBSCRIBE.', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'resubscribe', label: 'Resubscribe', icon: BellRing, hint: 'Opt-in contact when they send START, SUBSCRIBE.', color: 'bg-teal-50 text-teal-700 border-teal-200' },
];

const MATCH_OPTIONS = [
  { value: 'contains', label: 'Contains keyword' },
  { value: 'exact', label: 'Matches exactly' },
  { value: 'starts_with', label: 'Starts with keyword' },
];

const WEEK_DAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 0, label: 'Sun' },
];

const emptyForm = {
  name: '',
  description: '',
  active: true,
  trigger_type: 'keyword',
  keyword_match_type: 'contains',
  keywords_text: '',
  response_type: 'text',
  text_body: 'Hi {{contact_name}}, thanks for your message. Our team will get back to you shortly.',
  template_name: '',
  template_language: 'en',
  template_header_type: 'none',
  template_header_media_url: '',
  template_variables: {},
  business_hours: {
    timezone: 'Asia/Kolkata',
    days: [1, 2, 3, 4, 5],
    start_time: '09:00',
    end_time: '18:00',
  },
  send_once_per_contact: false,
  cooldown_minutes: 0,
  priority: 100,
  stop_after_match: true,
};

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

export default function AutoResponseCreate() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingRule, setLoadingRule] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const approvedTemplates = useMemo(
    () => templates.filter((t) => t.status === 'APPROVED'),
    [templates]
  );

  const selectedTemplate = useMemo(
    () => approvedTemplates.find((t) => t.name === form.template_name) || null,
    [approvedTemplates, form.template_name]
  );

  const templateVariableKeys = useMemo(() => extractVars(selectedTemplate), [selectedTemplate]);

  /* Load rule for edit */
  useEffect(() => {
    if (!editId) return;
    setLoadingRule(true);
    api.get('/auto-responses')
      .then(({ data }) => {
        const rule = (data.data?.rules || []).find((r) => r._id === editId);
        if (rule) {
          const templateVariables = {};
          (rule.template_variables || []).forEach((v) => {
            templateVariables[v.key] = { source: v.source || 'static', value: v.value || '' };
          });
          setForm({
            name: rule.name || '',
            description: rule.description || '',
            active: Boolean(rule.active),
            trigger_type: rule.trigger_type || 'keyword',
            keyword_match_type: rule.keyword_match_type || 'contains',
            keywords_text: (rule.keywords || []).join('\n'),
            response_type: rule.response_type || 'text',
            text_body: rule.text_body || '',
            template_name: rule.template_name || '',
            template_language: rule.template_language || 'en',
            template_header_type: String(rule.template_header_type || 'none'),
            template_header_media_url: String(rule.template_header_media_url || ''),
            template_variables: templateVariables,
            business_hours: {
              timezone: rule.business_hours?.timezone || 'Asia/Kolkata',
              days: Array.isArray(rule.business_hours?.days) ? rule.business_hours.days : [1, 2, 3, 4, 5],
              start_time: rule.business_hours?.start_time || '09:00',
              end_time: rule.business_hours?.end_time || '18:00',
            },
            send_once_per_contact: Boolean(rule.send_once_per_contact),
            cooldown_minutes: rule.cooldown_minutes || 0,
            priority: rule.priority || 100,
            stop_after_match: rule.stop_after_match !== false,
          });
        } else {
          toast.error('Auto-response rule not found');
        }
      })
      .catch(() => toast.error('Failed to load rule'))
      .finally(() => setLoadingRule(false));
  }, [editId]);

  /* Load templates when response_type = template */
  useEffect(() => {
    if (form.response_type !== 'template' || templates.length) return;
    setLoadingTemplates(true);
    api.get('/meta/templates')
      .then(({ data }) => setTemplates(data.data?.templates || []))
      .catch(() => toast.error('Failed to load Meta templates'))
      .finally(() => setLoadingTemplates(false));
  }, [form.response_type, templates.length]);

  /* Sync template variables when template changes */
  useEffect(() => {
    if (form.response_type !== 'template') return;
    setForm((current) => {
      const nextVars = {};
      templateVariableKeys.forEach((key) => {
        nextVars[key] = current.template_variables[key] || { source: 'static', value: '' };
      });
      return { ...current, template_variables: nextVars };
    });
  }, [templateVariableKeys.join('|'), form.response_type]);

  const upd = (key, val) => setForm((c) => ({ ...c, [key]: val }));

  const toggleBusinessDay = (day) => {
    setForm((current) => {
      const exists = current.business_hours.days.includes(day);
      const nextDays = exists
        ? current.business_hours.days.filter((d) => d !== day)
        : [...current.business_hours.days, day].sort((a, b) => a - b);
      return { ...current, business_hours: { ...current.business_hours, days: nextDays } };
    });
  };

  /* Save / Update */
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Rule name is required'); return; }
    const payload = {
      ...form,
      keywords: form.keywords_text.split('\n').map((k) => k.trim()).filter(Boolean),
      template_variables: Object.entries(form.template_variables || {}).map(([key, val]) => ({
        key, source: val.source, value: val.value,
      })),
    };
    delete payload.keywords_text;

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/auto-responses/${editId}`, payload);
        toast.success('Auto-response rule updated');
      } else {
        await api.post('/auto-responses', payload);
        toast.success('Auto-response rule created');
      }
      navigate('/portal/auto-responses');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save rule');
    } finally { setSaving(false); }
  };

  /* ── Preview props ── */
  const previewProps = useMemo(() => {
    const p = {};
    if (form.response_type === 'text') {
      // Show the text body as the preview body
      p.body = form.text_body || 'Your reply message will appear here...';
    } else if (form.response_type === 'template' && selectedTemplate) {
      const components = selectedTemplate.components || [];
      const header = components.find((c) => c.type === 'HEADER');
      const body = components.find((c) => c.type === 'BODY');
      const footer = components.find((c) => c.type === 'FOOTER');
      const btns = components.find((c) => c.type === 'BUTTONS');
      if (header) {
        const fmt = String(header.format || '').toUpperCase();
        if (fmt === 'TEXT') p.header = { type: 'text', text: header.text };
        else if (fmt === 'IMAGE') p.header = { type: 'image' };
        else if (fmt === 'VIDEO') p.header = { type: 'video' };
        else if (fmt === 'DOCUMENT') p.header = { type: 'document', filename: 'Document.pdf' };
      }
      if (body?.text) p.body = body.text;
      if (footer?.text) p.footer = footer.text;
      if (btns?.buttons?.length) {
        p.buttons = btns.buttons.map((b) => ({ type: b.type, text: b.text, url: b.url, phone: b.phone_number }));
      }
    } else {
      p.body = 'Select a response type to see preview...';
    }
    return p;
  }, [form.response_type, form.text_body, selectedTemplate]);

  if (loadingRule) {
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
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/portal/auto-responses')} className="w-8 h-8 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-surface-600 hover:bg-surface-50 transition">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="text-[17px] font-extrabold text-surface-900">
                  {isEdit ? 'Edit Auto Response' : 'Create Auto Response'}
                </h1>
              </div>

              {/* ── Basic Info ── */}
              <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5 block">Rule Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => upd('name', e.target.value)}
                    placeholder="e.g. After hours fallback"
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5 block">Description (Optional)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => upd('description', e.target.value)}
                    placeholder="Explain when this should fire"
                    rows={2}
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* ── Trigger Type ── */}
              <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-2">
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Trigger Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {TRIGGER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        upd('trigger_type', opt.value);
                        if (opt.value === 'unsubscribe' && !form.keywords_text?.trim()) {
                          upd('keywords_text', 'STOP\nUNSUBSCRIBE\nOPT OUT');
                          upd('keyword_match_type', 'exact');
                        }
                        if (opt.value === 'resubscribe' && !form.keywords_text?.trim()) {
                          upd('keywords_text', 'START\nSUBSCRIBE\nOPT IN');
                          upd('keyword_match_type', 'exact');
                        }
                      }}
                      className={`p-2.5 rounded-lg border-2 text-left transition ${
                        form.trigger_type === opt.value
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-surface-200 bg-white hover:border-surface-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <opt.icon className="w-3.5 h-3.5" />
                        <span className="text-[12px] font-bold text-surface-900">{opt.label}</span>
                      </div>
                      <p className="text-[10px] text-surface-500">{opt.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Keyword Config (also used for subscribe/unsubscribe) ── */}
              {['keyword', 'unsubscribe', 'resubscribe'].includes(form.trigger_type) && (
                <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-2">
                  <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Keyword Settings</label>
                  <div>
                    <label className="text-[10px] font-semibold text-surface-500 block mb-1">Match Rule</label>
                    <select
                      value={form.keyword_match_type}
                      onChange={(e) => upd('keyword_match_type', e.target.value)}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                    >
                      {MATCH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-surface-500 block mb-1">Keywords (one per line)</label>
                    <textarea
                      value={form.keywords_text}
                      onChange={(e) => upd('keywords_text', e.target.value)}
                      placeholder="pricing&#10;price&#10;plan"
                      rows={4}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ── Business Hours (Away) ── */}
              {form.trigger_type === 'away' && (
                <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-3">
                  <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Business Hours</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-surface-500 block mb-1">Timezone</label>
                      <input
                        value={form.business_hours.timezone}
                        onChange={(e) => setForm((c) => ({ ...c, business_hours: { ...c.business_hours, timezone: e.target.value } }))}
                        className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[12px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-surface-500 block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={form.business_hours.start_time}
                        onChange={(e) => setForm((c) => ({ ...c, business_hours: { ...c.business_hours, start_time: e.target.value } }))}
                        className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[12px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-surface-500 block mb-1">End Time</label>
                      <input
                        type="time"
                        value={form.business_hours.end_time}
                        onChange={(e) => setForm((c) => ({ ...c, business_hours: { ...c.business_hours, end_time: e.target.value } }))}
                        className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[12px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-surface-500 block mb-1.5">Business Days</label>
                    <div className="flex gap-1.5">
                      {WEEK_DAYS.map((day) => (
                        <button
                          key={day.value}
                          onClick={() => toggleBusinessDay(day.value)}
                          className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition border ${
                            form.business_hours.days.includes(day.value)
                              ? 'bg-brand-500 text-white border-brand-500'
                              : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Response Type ── */}
              <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-2">
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Response Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => upd('response_type', 'text')}
                    className={`p-2.5 rounded-lg border-2 text-left transition ${
                      form.response_type === 'text' ? 'border-brand-500 bg-brand-50' : 'border-surface-200 bg-white hover:border-surface-300'
                    }`}
                  >
                    <span className="text-[12px] font-bold text-surface-900">Text Reply</span>
                    <p className="text-[10px] text-surface-500 mt-0.5">Send a plain text message</p>
                  </button>
                  <button
                    onClick={() => upd('response_type', 'template')}
                    className={`p-2.5 rounded-lg border-2 text-left transition ${
                      form.response_type === 'template' ? 'border-brand-500 bg-brand-50' : 'border-surface-200 bg-white hover:border-surface-300'
                    }`}
                  >
                    <span className="text-[12px] font-bold text-surface-900">Meta Template</span>
                    <p className="text-[10px] text-surface-500 mt-0.5">Use an approved template</p>
                  </button>
                </div>
              </div>

              {/* ── Text Response ── */}
              {form.response_type === 'text' && (
                <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-2">
                  <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Reply Text</label>
                  <textarea
                    value={form.text_body}
                    onChange={(e) => upd('text_body', e.target.value)}
                    rows={4}
                    placeholder="Hi {{contact_name}}, thanks for your message."
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none resize-none"
                  />
                  <div className="text-[10px] text-blue-700 bg-blue-50 p-2 rounded-lg">
                    Available: <span className="font-mono">{'{{contact_name}}'}</span>, <span className="font-mono">{'{{contact_phone}}'}</span>, <span className="font-mono">{'{{contact_email}}'}</span>, <span className="font-mono">{'{{incoming_text}}'}</span>
                  </div>
                </div>
              )}

              {/* ── Template Response ── */}
              {form.response_type === 'template' && (
                <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-3">
                  <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Template Settings</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-surface-500 block mb-1">Meta Template</label>
                      <select
                        value={form.template_name}
                        onChange={(e) => {
                          const name = e.target.value;
                          const lang = approvedTemplates.find((t) => t.name === name)?.language || 'en';
                          setForm((c) => ({ ...c, template_name: name, template_language: lang }));
                        }}
                        className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[12px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                      >
                        <option value="">{loadingTemplates ? 'Loading...' : 'Select template'}</option>
                        {approvedTemplates.map((t) => (
                          <option key={t.name} value={t.name}>{t.name} ({t.language})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-surface-500 block mb-1">Language</label>
                      <input
                        value={form.template_language}
                        onChange={(e) => upd('template_language', e.target.value)}
                        className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[12px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Template Variables */}
                  {templateVariableKeys.length > 0 && (
                    <div className="bg-amber-50/50 rounded-lg p-2.5 space-y-1.5 border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Template Variables</p>
                      {templateVariableKeys.map((key) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded min-w-[42px] text-center">{`{{${key}}}`}</span>
                          <select
                            value={form.template_variables[key]?.source || 'static'}
                            onChange={(e) => setForm((c) => ({
                              ...c,
                              template_variables: { ...c.template_variables, [key]: { ...c.template_variables[key], source: e.target.value } }
                            }))}
                            className="rounded border border-amber-200 bg-white px-2 py-1 text-[10px] focus:outline-none"
                          >
                            <option value="static">Static</option>
                            <option value="contact_name">Contact Name</option>
                            <option value="contact_phone">Contact Phone</option>
                            <option value="contact_email">Contact Email</option>
                            <option value="incoming_text">Incoming Text</option>
                          </select>
                          {(form.template_variables[key]?.source || 'static') === 'static' && (
                            <input
                              value={form.template_variables[key]?.value || ''}
                              onChange={(e) => setForm((c) => ({
                                ...c,
                                template_variables: { ...c.template_variables, [key]: { ...c.template_variables[key], value: e.target.value } }
                              }))}
                              placeholder="Static value"
                              className="flex-1 rounded border border-amber-200 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-300"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Priority & Options ── */}
              <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-3">
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Options</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-surface-500 block mb-1">Priority</label>
                    <input
                      type="number"
                      min="1"
                      value={form.priority}
                      onChange={(e) => upd('priority', parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-surface-500 block mb-1">Cooldown (min)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.cooldown_minutes}
                      onChange={(e) => upd('cooldown_minutes', parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.send_once_per_contact}
                      onChange={(e) => upd('send_once_per_contact', e.target.checked)}
                      className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500/20"
                    />
                    <span className="text-[12px] text-surface-700">Send once per contact</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.stop_after_match}
                      onChange={(e) => upd('stop_after_match', e.target.checked)}
                      className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500/20"
                    />
                    <span className="text-[12px] text-surface-700">Stop after match</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => upd('active', e.target.checked)}
                      className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500/20"
                    />
                    <span className="text-[12px] text-surface-700">Active</span>
                  </label>
                </div>
              </div>

              {/* ── Submit ── */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-semibold text-[13px] transition-all shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
              </button>

            </div>
          </div>

          {/* ═══ RIGHT: Preview ═══ */}
          <div className="lg:col-span-5 flex items-center justify-center h-[calc(100vh-96px)]">
            <div className="animate-fade-in-up">
              <WhatsAppPhonePreview
                {...previewProps}
                contactName="Auto Response"
                emptyMessage="Configure your auto-response to see preview"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
