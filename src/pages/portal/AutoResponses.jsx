import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Edit3,
  FolderOpen,
  Info,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import api from '../../api/axios';
import PortalModal from '../../components/Portal/PortalModal';
import MediaLibraryModal from '../../MediaLibraryModal';

const TRIGGER_OPTIONS = [
  { value: 'keyword', label: 'Keyword Reply', hint: 'Reply when inbound text matches one or more keywords.' },
  { value: 'welcome', label: 'Welcome Reply', hint: 'Reply only to the first inbound message from a contact.' },
  { value: 'away', label: 'Away Message', hint: 'Reply only outside your configured business hours.' },
  { value: 'fallback', label: 'Fallback Reply', hint: 'Reply when no other active auto-response matches.' },
];

const RESPONSE_OPTIONS = [
  { value: 'text', label: 'Text Reply' },
  { value: 'template', label: 'Meta Template' },
];

const MATCH_OPTIONS = [
  { value: 'contains', label: 'Contains keyword' },
  { value: 'exact', label: 'Matches exactly' },
  { value: 'starts_with', label: 'Starts with keyword' },
];

const WEEK_DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const STATUS_STYLES = {
  sent: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
  skipped: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
  failed: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
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

const humanizeTrigger = (trigger) =>
  TRIGGER_OPTIONS.find((item) => item.value === trigger)?.label || trigger;

export default function AutoResponses() {
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateVars, setShowTemplateVars] = useState(true);
  const [showTemplateHeaderLibrary, setShowTemplateHeaderLibrary] = useState(false);

  const approvedTemplates = useMemo(
    () => templates.filter((template) => template.status === 'APPROVED'),
    [templates]
  );

  const selectedTemplate = useMemo(
    () => approvedTemplates.find((template) => template.name === form.template_name) || null,
    [approvedTemplates, form.template_name]
  );

  const templateVariableKeys = useMemo(() => extractVars(selectedTemplate), [selectedTemplate]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auto-responses');
      setRules(data.data?.rules || []);
      setLogs(data.data?.logs || []);
      setSummary(data.data?.summary || null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load auto responses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();
  }, []);

  useEffect(() => {
    if (!showModal || form.response_type !== 'template' || templates.length) return;
    setLoadingTemplates(true);
    api
      .get('/meta/templates')
      .then((response) => setTemplates(response.data?.data?.templates || []))
      .catch((error) => toast.error(error.response?.data?.error || 'Failed to load Meta templates'))
      .finally(() => setLoadingTemplates(false));
  }, [showModal, form.response_type, templates.length]);

  useEffect(() => {
    if (form.response_type !== 'template') return;
    setForm((current) => {
      const nextVariables = {};
      templateVariableKeys.forEach((key) => {
        nextVariables[key] = current.template_variables[key] || { source: 'static', value: '' };
      });
      return {
        ...current,
        template_variables: nextVariables,
      };
    });
  }, [templateVariableKeys.join('|'), form.response_type]);

  const openCreate = () => {
    setEditingRule(null);
    setForm(emptyForm);
    setShowTemplateVars(true);
    setShowModal(true);
  };

  const openEdit = (rule) => {
    const templateVariables = {};
    (rule.template_variables || []).forEach((variable) => {
      templateVariables[variable.key] = {
        source: variable.source || 'static',
        value: variable.value || '',
      };
    });

    setEditingRule(rule);
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
    setShowTemplateVars(true);
    setShowModal(true);
  };

  const saveRule = async () => {
    const payload = {
      ...form,
      keywords: form.keywords_text
        .split('\n')
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      template_variables: Object.entries(form.template_variables || {}).map(([key, value]) => ({
        key,
        source: value.source,
        value: value.value,
      })),
    };

    delete payload.keywords_text;

    setSaving(true);
    try {
      if (editingRule?._id) {
        await api.put(`/auto-responses/${editingRule._id}`, payload);
        toast.success('Auto-response rule updated');
      } else {
        await api.post('/auto-responses', payload);
        toast.success('Auto-response rule created');
      }
      setShowModal(false);
      await fetchPage();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (rule) => {
    if (!window.confirm(`Delete auto-response "${rule.name}"?`)) return;
    try {
      await api.delete(`/auto-responses/${rule._id}`);
      toast.success('Rule deleted');
      await fetchPage();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete rule');
    }
  };

  const toggleActive = async (rule) => {
    try {
      await api.put(`/auto-responses/${rule._id}`, {
        active: !rule.active,
      });
      await fetchPage();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update rule');
    }
  };

  const toggleBusinessDay = (day) => {
    setForm((current) => {
      const exists = current.business_hours.days.includes(day);
      const nextDays = exists
        ? current.business_hours.days.filter((item) => item !== day)
        : [...current.business_hours.days, day].sort((a, b) => a - b);

      return {
        ...current,
        business_hours: {
          ...current.business_hours,
          days: nextDays,
        },
      };
    });
  };

  const renderResponseSummary = (rule) => {
    if (rule.response_type === 'template') {
      return (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">{rule.template_name}</p>
          <p className="text-xs text-gray-500">
            Meta template in {rule.template_language || 'en'} with {(rule.template_variables || []).length} mapped variables
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900">Text reply</p>
        <p className="line-clamp-2 text-xs text-gray-500">{rule.text_body || 'No message body configured'}</p>
      </div>
    );
  };

  const renderTriggerSummary = (rule) => {
    if (rule.trigger_type === 'keyword') {
      return (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900">{humanizeTrigger(rule.trigger_type)}</p>
          <div className="flex flex-wrap gap-2">
            {(rule.keywords || []).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (rule.trigger_type === 'away') {
      return (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">Away reply</p>
          <p className="text-xs text-gray-500">
            Active outside {rule.business_hours?.start_time || '09:00'} - {rule.business_hours?.end_time || '18:00'} ({rule.business_hours?.timezone || 'Asia/Kolkata'})
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900">{humanizeTrigger(rule.trigger_type)}</p>
        <p className="text-xs text-gray-500">
          {rule.trigger_type === 'welcome'
            ? 'Fires only on the first inbound message from a contact.'
            : 'Runs only when no other active rule matches this inbound message.'}
        </p>
      </div>
    );
  };
  return (
    <>
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Auto Responses</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Portal-managed rules that trigger from Meta webhooks and send replies back through the Meta WhatsApp API.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchPage}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4" />
              New Rule
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Rules', value: summary?.total_rules || 0, color: 'text-gray-900' },
            { label: 'Active Rules', value: summary?.active_rules || 0, color: 'text-emerald-700' },
            { label: 'Sent Recently', value: summary?.sent_count || 0, color: 'text-sky-700' },
            { label: 'Failed Recently', value: summary?.failed_count || 0, color: 'text-red-700' },
          ].map((card) => (
            <div key={card.label} className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{card.label}</p>
              <p className={`mt-2 text-3xl font-semibold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-8 rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Meta-compatible architecture</p>
              <p className="mt-1 text-sm text-emerald-700">
                Incoming customer messages arrive from Meta webhooks, this module matches your rules inside our platform,
                and replies are sent back through the official Meta WhatsApp sending APIs.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Rule Library</h2>
                <p className="text-sm text-gray-500">Every rule below runs from live Meta webhook activity for this tenant.</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {rules.length} configured
              </span>
            </div>

            {loading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-28 animate-pulse rounded-3xl bg-gray-100" />
                ))}
              </div>
            ) : rules.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Bot className="mx-auto h-12 w-12 text-gray-200" />
                <p className="mt-4 text-base font-semibold text-gray-800">No auto-response rules yet</p>
                <p className="mt-1 text-sm text-gray-500">
                  Start with a welcome reply, keyword bot, or after-hours rule.
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  <Plus className="h-4 w-4" />
                  Create your first rule
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rules.map((rule) => (
                  <div key={rule._id} className="px-6 py-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="grid flex-1 gap-5 md:grid-cols-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900">{rule.name}</h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                rule.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {rule.active ? 'Active' : 'Paused'}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              Priority {rule.priority}
                            </span>
                          </div>
                          {rule.description ? (
                            <p className="mt-2 text-sm text-gray-500">{rule.description}</p>
                          ) : (
                            <p className="mt-2 text-sm text-gray-400">No internal description added.</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {rule.send_once_per_contact ? (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                Once per contact
                              </span>
                            ) : null}
                            {rule.cooldown_minutes ? (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                Cooldown {rule.cooldown_minutes} min
                              </span>
                            ) : null}
                            {!rule.stop_after_match ? (
                              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                                Allows next rules
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                              Trigger
                            </p>
                            {renderTriggerSummary(rule)}
                          </div>
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                              Reply
                            </p>
                            {renderResponseSummary(rule)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 xl:w-[220px] xl:justify-end">
                        <button
                          type="button"
                          onClick={() => toggleActive(rule)}
                          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium ${
                            rule.active
                              ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {rule.active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(rule)}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRule(rule)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Execution History</h2>
                <p className="text-sm text-gray-500">Latest webhook-triggered runs across all rules.</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {logs.length} recent
              </span>
            </div>

            {loading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-3xl bg-gray-100" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Clock3 className="mx-auto h-12 w-12 text-gray-200" />
                <p className="mt-4 text-base font-semibold text-gray-800">No rule activity yet</p>
                <p className="mt-1 text-sm text-gray-500">
                  As soon as Meta webhooks arrive and a rule fires, the audit trail will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {logs.map((log) => {
                  const style = STATUS_STYLES[log.status] || STATUS_STYLES.skipped;
                  const StatusIcon = style.icon;
                  return (
                    <div key={log._id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${style.bg} ${style.text}`}>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{log.rule_name}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${style.bg} ${style.text}`}>
                              {log.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {log.contact_name || log.contact_phone || 'Unknown contact'}
                            {log.contact_phone ? ` • ${log.contact_phone}` : ''}
                          </p>
                          {log.reason ? <p className="mt-2 text-sm text-gray-600">{log.reason}</p> : null}
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                            <span>{humanizeTrigger(log.trigger_type)}</span>
                            <span>•</span>
                            <span>{log.response_type === 'template' ? 'Meta template' : 'Text reply'}</span>
                            <span>•</span>
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
      <PortalModal
        open={showModal}
        onClose={() => !saving && setShowModal(false)}
        title={editingRule ? 'Edit Auto Response' : 'Create Auto Response'}
        subtitle="Rules execute inside our platform from live Meta webhooks, then reply through Meta WhatsApp APIs."
        size="xl"
      >
        <div className="space-y-8">
          <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Rule name
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="After hours fallback"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Internal description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Explain when this should fire so your team knows why it exists."
                    rows={3}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Priority
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, priority: Number.parseInt(event.target.value, 10) || 1 }))
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Cooldown (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.cooldown_minutes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        cooldown_minutes: Number.parseInt(event.target.value, 10) || 0,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Trigger type
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {TRIGGER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, trigger_type: option.value }))}
                      className={`rounded-3xl border p-4 text-left transition ${
                        form.trigger_type === option.value
                          ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{option.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.trigger_type === 'keyword' ? (
                <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Match rule
                    </label>
                    <select
                      value={form.keyword_match_type}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, keyword_match_type: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                    >
                      {MATCH_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Keywords
                    </label>
                    <textarea
                      value={form.keywords_text}
                      onChange={(event) => setForm((current) => ({ ...current, keywords_text: event.target.value }))}
                      placeholder={'pricing\nprice\nplan'}
                      rows={5}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                    <p className="mt-1 text-xs text-gray-400">One keyword per line.</p>
                  </div>
                </div>
              ) : null}

              {form.trigger_type === 'away' ? (
                <div className="rounded-[28px] border border-gray-200 bg-gray-50 p-5">
                  <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Timezone
                      </label>
                      <input
                        value={form.business_hours.timezone}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            business_hours: { ...current.business_hours, timezone: event.target.value },
                          }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Start
                      </label>
                      <input
                        type="time"
                        value={form.business_hours.start_time}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            business_hours: { ...current.business_hours, start_time: event.target.value },
                          }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        End
                      </label>
                      <input
                        type="time"
                        value={form.business_hours.end_time}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            business_hours: { ...current.business_hours, end_time: event.target.value },
                          }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Active business days
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {WEEK_DAYS.map((day) => {
                        const active = form.business_hours.days.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleBusinessDay(day.value)}
                            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                              active
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Response type
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {RESPONSE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, response_type: option.value }))}
                      className={`rounded-3xl border p-4 text-left transition ${
                        form.response_type === option.value
                          ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {option.value === 'text'
                          ? 'Send a dynamic text reply directly through Meta.'
                          : 'Send an approved Meta template with variable mapping.'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {form.response_type === 'text' ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Reply text
                  </label>
                  <textarea
                    value={form.text_body}
                    onChange={(event) => setForm((current) => ({ ...current, text_body: event.target.value }))}
                    rows={10}
                    placeholder="Hi {{contact_name}}, thanks for your message."
                    className="w-full rounded-[28px] border border-gray-200 bg-gray-50 px-4 py-4 text-sm leading-6 text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                  />
                  <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
                    Available variables: <span className="font-semibold">{'{{contact_name}}'}</span>,{' '}<span className="font-semibold">{'{{contact_phone}}'}</span>,{' '}<span className="font-semibold">{'{{contact_email}}'}</span>,{' '}<span className="font-semibold">{'{{incoming_text}}'}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-[28px] border border-gray-200 bg-gray-50 p-5">
                  <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Approved Meta template
                      </label>
                      <select
                        value={form.template_name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            template_name: event.target.value,
                            template_language:
                              approvedTemplates.find((template) => template.name === event.target.value)?.language || 'en',
                          }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                      >
                        <option value="">{loadingTemplates ? 'Loading templates...' : 'Select approved template'}</option>
                        {approvedTemplates.map((template) => (
                          <option key={`${template.name}-${template.language}`} value={template.name}>
                            {template.name} ({template.language})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Language
                      </label>
                      <input
                        value={form.template_language}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, template_language: event.target.value || 'en' }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Header media
                      </label>
                      <select
                        value={form.template_header_type}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, template_header_type: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                      >
                        <option value="none">None</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="document">Document</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Header media URL
                      </label>
                      <input
                        value={form.template_header_media_url}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, template_header_media_url: event.target.value }))
                        }
                        disabled={form.template_header_type === 'none'}
                        placeholder="https://public-url-to-media-file"
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />
                      {form.template_header_type !== 'none' ? (
                        <button
                          type="button"
                          onClick={() => setShowTemplateHeaderLibrary(true)}
                          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          Choose from gallery
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTemplateVars((current) => !current)}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Template variable mapping</p>
                      <p className="text-xs text-gray-500">
                        Map approved Meta template variables to contact or inbound-message data.
                      </p>
                    </div>
                    {showTemplateVars ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                  </button>

                  {showTemplateVars ? (
                    <div className="space-y-3">
                      {!form.template_name ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                          Select an approved Meta template first to map variables.
                        </div>
                      ) : templateVariableKeys.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                          This template has no variable placeholders.
                        </div>
                      ) : (
                        templateVariableKeys.map((key) => {
                          const value = form.template_variables[key] || { source: 'static', value: '' };
                          return (
                            <div key={key} className="rounded-3xl border border-gray-200 bg-white p-4">
                              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">Variable {key}</p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    Choose whether this comes from the contact profile or a static value.
                                  </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                                  <select
                                    value={value.source}
                                    onChange={(event) =>
                                      setForm((current) => ({
                                        ...current,
                                        template_variables: {
                                          ...current.template_variables,
                                          [key]: {
                                            ...current.template_variables[key],
                                            source: event.target.value,
                                          },
                                        },
                                      }))
                                    }
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                                  >
                                    <option value="static">Static value</option>
                                    <option value="contact_name">Contact name</option>
                                    <option value="contact_phone">Contact phone</option>
                                    <option value="contact_email">Contact email</option>
                                    <option value="incoming_text">Incoming message text</option>
                                  </select>
                                  <input
                                    value={value.value || ''}
                                    onChange={(event) =>
                                      setForm((current) => ({
                                        ...current,
                                        template_variables: {
                                          ...current.template_variables,
                                          [key]: {
                                            ...current.template_variables[key],
                                            value: event.target.value,
                                          },
                                        },
                                      }))
                                    }
                                    disabled={value.source !== 'static'}
                                    placeholder={value.source === 'static' ? 'Enter a fallback static value' : 'Auto-filled from runtime data'}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white disabled:cursor-not-allowed disabled:bg-gray-100"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="rounded-[28px] border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Execution controls</p>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      key: 'active',
                      title: 'Rule is active',
                      subtitle: 'Inactive rules stay saved but will not execute from inbound Meta webhooks.',
                    },
                    {
                      key: 'send_once_per_contact',
                      title: 'Send once per contact',
                      subtitle: 'Prevent repeat replies for the same customer on future inbound messages.',
                    },
                    {
                      key: 'stop_after_match',
                      title: 'Stop after this rule matches',
                      subtitle: 'If disabled, later rules can still run after this one matches.',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(form[item.key])}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, [item.key]: event.target.checked }))
                        }
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.subtitle}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">How this stays Meta-compatible</p>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  The rule logic lives in our portal, but the actual customer reply is still sent through the official
                  Meta WhatsApp API using your connected WABA and phone number. That means delivery, template approval,
                  and webhook receipts stay aligned with Meta.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRule}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                ) : editingRule ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {editingRule ? 'Save Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      </PortalModal>
      <MediaLibraryModal
        open={showTemplateHeaderLibrary}
        onClose={() => setShowTemplateHeaderLibrary(false)}
        title="Select Header Media"
        subtitle="Pick a file for auto-response template header."
        allowedTypes={form.template_header_type !== 'none' ? [form.template_header_type] : ['document']}
        onSelect={(assets) => {
          const first = assets?.[0];
          if (!first?.public_url) {
            toast.error('No valid media selected');
            return;
          }
          setForm((current) => ({ ...current, template_header_media_url: first.public_url }));
          setShowTemplateHeaderLibrary(false);
          toast.success('Header media selected');
        }}
      />
    </>
  );
}

