import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Calendar, CalendarDays, Check, CheckCircle2,
  ChevronLeft, ChevronRight, Clock, Edit3, Gift, Hash,
  Loader2, Pause, Play, Plus, RefreshCw,
  Repeat, Settings2, TestTube2, Trash2, Users, X, XCircle,
  Timer, CalendarClock, Send, Eye,
} from 'lucide-react';
import api from '../../api/axios';

/* ── Constants ─────────────────────────────────────────── */

const TRIGGER_TYPE_MAP = {
  birthday: { label: 'Birthday', icon: Gift, cls: 'bg-pink-50 text-pink-700 border-pink-200', dot: 'bg-pink-500' },
  anniversary: { label: 'Anniversary', icon: CalendarDays, cls: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  custom_date: { label: 'Custom Date', icon: Calendar, cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  recurring_annual: { label: 'Recurring Annual', icon: Repeat, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  one_time: { label: 'One Time', icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  cron: { label: 'Cron Schedule', icon: Settings2, cls: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500' },
};

const LOG_STATUS_MAP = {
  success: { cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  partial: { cls: 'bg-amber-50 text-amber-700', icon: AlertTriangle },
  failed: { cls: 'bg-red-50 text-red-700', icon: XCircle },
  no_match: { cls: 'bg-slate-50 text-slate-500', icon: Users },
};

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Berlin', 'America/New_York',
  'America/Chicago', 'America/Los_Angeles', 'UTC',
];

const relativeTime = (value) => {
  if (!value) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatNextRun = (value) => {
  if (!value) return 'Not scheduled';
  const d = new Date(value);
  const diffMs = d - Date.now();
  if (diffMs < 0) return 'Overdue';
  if (diffMs < 3600000) return `In ${Math.ceil(diffMs / 60000)}m`;
  if (diffMs < 86400000) return `In ${Math.ceil(diffMs / 3600000)}h`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const EMPTY_FORM = {
  name: '', description: '', trigger_type: 'birthday', contact_field: 'birthday',
  offset_days: 0, send_time: '09:00', timezone: 'Asia/Kolkata', one_time_date: '',
  cron_expression: '', template_name: '', template_language: 'en',
  template_header_type: 'none', template_header_media_url: '',
  variable_mapping: [], target_type: 'all', target_tags: [], target_list_id: '',
  active: true,
};

/* ── Validation ────────────────────────────────────────── */

const ErrorText = ({ text }) =>
  text ? <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3 flex-shrink-0" />{text}</p> : null;

const validateStep1 = (form) => {
  const e = {};
  if (!form.name.trim()) e.name = 'Name is required';
  if (form.name.trim().length > 0 && form.name.trim().length < 3) e.name = 'Name must be at least 3 characters';
  return e;
};

const validateStep2 = (form) => {
  const e = {};
  if (form.trigger_type === 'cron') {
    if (!form.cron_expression.trim()) e.cron_expression = 'Cron expression is required';
  } else {
    if (!form.contact_field) e.contact_field = 'Select a contact date field';
    if (!form.send_time) e.send_time = 'Send time is required';
    if (form.trigger_type === 'one_time' && !form.one_time_date) e.one_time_date = 'Date is required for one-time triggers';
  }
  return e;
};

const validateStep3 = (form) => {
  const e = {};
  if (!form.template_name) e.template_name = 'Select a template';
  return e;
};

const validateStep4 = (form) => {
  const e = {};
  if (form.target_type === 'tags' && form.target_tags.length === 0) e.target_tags = 'Add at least one tag';
  if (form.target_type === 'list' && !form.target_list_id) e.target_list_id = 'Select a contact list';
  return e;
};

/* ── Main Component ──────────────────────────────────────── */

export default function DateTriggers() {
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const [attemptedNext, setAttemptedNext] = useState(false);

  // Supporting data
  const [templates, setTemplates] = useState([]);
  const [contactFields, setContactFields] = useState([]);
  const [allCustomFields, setAllCustomFields] = useState([]);
  const [contactLists, setContactLists] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [supportingLoading, setSupportingLoading] = useState(false);

  // Dry-run
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  // Logs
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Tag input
  const [tagInput, setTagInput] = useState('');

  /* ── Fetch triggers ── */
  const fetchTriggers = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get('/date-triggers');
      setTriggers(data.data?.triggers || []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load date triggers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTriggers(); }, [fetchTriggers]);

  /* ── Fetch supporting data (templates, fields, lists, tags) ── */
  const fetchSupportingData = async () => {
    setSupportingLoading(true);

    // Fetch all in parallel — each with individual error handling
    const jobs = await Promise.allSettled([
      api.get('/meta/templates'),                                     // [0] Meta templates (same endpoint as Templates page)
      api.get('/custom-fields'),                                    // [1] Custom field definitions
      api.get('/contact-lists'),                                    // [2] Contact lists
      api.get('/contacts', { params: { page: 1, limit: 1 } }),     // [3] Tags from contacts
    ]);

    // ── Templates ──
    if (jobs[0].status === 'fulfilled') {
      const raw = jobs[0].value?.data?.data?.templates;
      const all = Array.isArray(raw) ? raw : [];
      // Accept both "APPROVED" and "approved" to be safe
      const approved = all.filter((t) => String(t.status || '').toUpperCase() === 'APPROVED');
      setTemplates(approved);
      if (approved.length === 0) {
        console.warn('[DateTriggers] No approved templates. Total fetched:', all.length, 'Statuses:', [...new Set(all.map((t) => t.status))]);
      }
    } else {
      console.error('[DateTriggers] Templates API failed:', jobs[0].reason?.message || jobs[0].reason);
      toast.error('Failed to load templates — check your Meta connection');
      setTemplates([]);
    }

    // ── Custom Fields (from /custom-fields endpoint, not /date-triggers/contact-fields) ──
    if (jobs[1].status === 'fulfilled') {
      const rawFields = jobs[1].value?.data?.data?.fields;
      const customDefs = Array.isArray(rawFields) ? rawFields : [];

      // Build date field options: built-in + all custom fields that can hold dates
      const dateFields = [
        { value: 'birthday', label: 'Birthday', type: 'built-in' },
        { value: 'created_at', label: 'Contact Created Date', type: 'built-in' },
        { value: 'subscribed_at', label: 'Subscribed Date', type: 'built-in' },
      ];

      // Build full list of ALL custom fields (for variable mapping)
      const allCf = [];

      for (const cf of customDefs) {
        const cfValue = `custom_fields.${cf.field_name}`;
        allCf.push({ value: cfValue, label: cf.field_label, type: cf.field_type });
        // Also add to date fields if it's date type
        if (cf.field_type === 'date') {
          dateFields.push({ value: cfValue, label: cf.field_label, type: 'custom' });
        }
      }

      setContactFields(dateFields);
      setAllCustomFields(allCf);
    } else {
      console.error('[DateTriggers] Custom fields API failed:', jobs[1].reason?.message);
      setContactFields([
        { value: 'birthday', label: 'Birthday', type: 'built-in' },
        { value: 'created_at', label: 'Contact Created Date', type: 'built-in' },
      ]);
      setAllCustomFields([]);
    }

    // ── Contact Lists ──
    if (jobs[2].status === 'fulfilled') {
      const rawLists = jobs[2].value?.data?.data?.lists;
      setContactLists(Array.isArray(rawLists) ? rawLists : []);
    } else {
      console.error('[DateTriggers] Contact lists API failed:', jobs[2].reason?.message);
      setContactLists([]);
    }

    // ── Tags (labels) from contacts endpoint ──
    if (jobs[3].status === 'fulfilled') {
      const labels = jobs[3].value?.data?.data?.labels;
      setAllTags(Array.isArray(labels) ? labels.filter(Boolean) : []);
    } else {
      console.error('[DateTriggers] Contacts/tags API failed:', jobs[3].reason?.message);
      setAllTags([]);
    }

    setSupportingLoading(false);
  };

  /* ── CRUD ── */
  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setStep(1);
    setFieldErrors({});
    setAttemptedNext(false);
    setTestResult(null);
    setShowModal(true);
    fetchSupportingData();
  };

  const openEdit = (trigger) => {
    setEditId(trigger._id);
    setForm({
      name: trigger.name || '',
      description: trigger.description || '',
      trigger_type: trigger.trigger_type || 'birthday',
      contact_field: trigger.contact_field || 'birthday',
      offset_days: trigger.offset_days ?? 0,
      send_time: trigger.send_time || '09:00',
      timezone: trigger.timezone || 'Asia/Kolkata',
      one_time_date: trigger.one_time_date ? new Date(trigger.one_time_date).toISOString().slice(0, 10) : '',
      cron_expression: trigger.cron_expression || '',
      template_name: trigger.template_name || '',
      template_language: trigger.template_language || 'en',
      template_header_type: trigger.template_header_type || 'none',
      template_header_media_url: trigger.template_header_media_url || '',
      variable_mapping: trigger.variable_mapping || [],
      target_type: trigger.target_type || 'all',
      target_tags: trigger.target_tags || [],
      target_list_id: trigger.target_list_id || '',
      active: trigger.active !== false,
    });
    setStep(1);
    setFieldErrors({});
    setAttemptedNext(false);
    setTestResult(null);
    setShowModal(true);
    fetchSupportingData();
  };

  const saveTrigger = async () => {
    // Final validation across all steps
    const allErrors = {
      ...validateStep1(form),
      ...(form.trigger_type === 'cron' ? {} : validateStep2(form)),
      ...(form.trigger_type === 'cron' ? validateStep2(form) : {}),
      ...validateStep3(form),
      ...validateStep4(form),
    };
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      toast.error('Please fix all errors before saving');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/date-triggers/${editId}`, form);
        toast.success('Trigger updated successfully');
      } else {
        await api.post('/date-triggers', form);
        toast.success('Trigger created successfully');
      }
      setShowModal(false);
      fetchTriggers(true);
    } catch (e) {
      const errMsg = e.response?.data?.error || 'Failed to save trigger';
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const deleteTrigger = async (trigger) => {
    if (!window.confirm(`Delete date trigger "${trigger.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/date-triggers/${trigger._id}`);
      toast.success('Trigger deleted');
      fetchTriggers(true);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete');
    }
  };

  const toggleTrigger = async (trigger) => {
    try {
      await api.post(`/date-triggers/${trigger._id}/toggle`);
      toast.success(trigger.active ? 'Trigger paused' : 'Trigger activated');
      fetchTriggers(true);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to toggle');
    }
  };

  /* ── Dry-run ── */
  const runTest = async (triggerId) => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const { data } = await api.post(`/date-triggers/${triggerId}/test`);
      setTestResult(data.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Dry run failed');
    } finally {
      setTestLoading(false);
    }
  };

  /* ── Logs ── */
  const openLogs = async (trigger) => {
    setShowLogs(true);
    setLogsLoading(true);
    try {
      const { data } = await api.get('/date-triggers/logs/history', { params: { trigger_id: trigger._id, limit: 20 } });
      setLogs(data.data?.logs || []);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  };

  /* ── Form helpers ── */
  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const addVariableMapping = () => {
    setForm((prev) => ({
      ...prev,
      variable_mapping: [
        ...prev.variable_mapping,
        { index: prev.variable_mapping.length + 1, source: 'contact_name', field_path: '', static_value: '' },
      ],
    }));
  };

  const updateVariableMapping = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      variable_mapping: prev.variable_mapping.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
    }));
  };

  const removeVariableMapping = (idx) => {
    setForm((prev) => ({
      ...prev,
      variable_mapping: prev.variable_mapping.filter((_, i) => i !== idx).map((m, i) => ({ ...m, index: i + 1 })),
    }));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    setForm((prev) => ({ ...prev, target_tags: [...new Set([...prev.target_tags, tag])] }));
    setTagInput('');
    if (fieldErrors.target_tags) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n.target_tags; return n; });
    }
  };

  const removeTag = (tag) => {
    setForm((prev) => ({ ...prev, target_tags: prev.target_tags.filter((t) => t !== tag) }));
  };

  /* ── Step navigation with validation ── */
  const totalSteps = 4;

  const getStepValidator = (s) => {
    if (s === 1) return validateStep1;
    if (s === 2) return validateStep2;
    if (s === 3) return validateStep3;
    if (s === 4) return validateStep4;
    return () => ({});
  };

  const goNext = () => {
    setAttemptedNext(true);
    const validator = getStepValidator(step);
    const errors = validator(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the errors before continuing');
      return;
    }
    setAttemptedNext(false);
    setStep(step + 1);
  };

  const goBack = () => {
    setFieldErrors({});
    setAttemptedNext(false);
    setStep(step - 1);
  };

  // Selected template info
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.name === form.template_name),
    [templates, form.template_name]
  );

  // Count body variables in selected template
  const templateVarCount = useMemo(() => {
    if (!selectedTemplate) return 0;
    const bodyComp = (selectedTemplate.components || []).find((c) => c.type === 'BODY');
    if (!bodyComp?.text) return 0;
    const matches = bodyComp.text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  }, [selectedTemplate]);

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Date Triggers</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" /> Automated WhatsApp messages on birthdays, anniversaries &amp; custom dates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTriggers(true)}
            disabled={refreshing}
            className="p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Trigger
          </button>
        </div>
      </div>

      {/* Empty State */}
      {triggers.length === 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-50 flex items-center justify-center">
            <CalendarClock className="w-8 h-8 text-brand-600" />
          </div>
          <h2 className="text-lg font-semibold text-surface-900 mb-2">Create your first date trigger</h2>
          <p className="text-sm text-surface-500 max-w-md mx-auto mb-6">
            Automatically send WhatsApp template messages on birthdays, anniversaries, or any custom date field.
          </p>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Create Date Trigger
          </button>
        </div>
      )}

      {/* Trigger Cards */}
      <div className="grid gap-4">
        {triggers.map((trigger) => {
          const typeInfo = TRIGGER_TYPE_MAP[trigger.trigger_type] || TRIGGER_TYPE_MAP.custom_date;
          const TypeIcon = typeInfo.icon;
          return (
            <div key={trigger._id} className={`bg-white rounded-xl border transition-colors ${trigger.active ? 'border-surface-200' : 'border-surface-200 opacity-60'}`}>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${typeInfo.cls}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-surface-900 truncate">{trigger.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${typeInfo.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${typeInfo.dot}`} />
                          {typeInfo.label}
                        </span>
                        {!trigger.active && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-100 text-surface-500 text-[10px] font-semibold">
                            <Pause className="w-3 h-3" /> Paused
                          </span>
                        )}
                      </div>
                      {trigger.description && <p className="text-xs text-surface-500 mt-0.5 truncate">{trigger.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-surface-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {trigger.contact_field || 'birthday'}
                          {trigger.offset_days !== 0 && <span className="text-surface-500">({trigger.offset_days > 0 ? '+' : ''}{trigger.offset_days}d)</span>}
                        </span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {trigger.send_time || '09:00'} {trigger.timezone || ''}</span>
                        <span className="flex items-center gap-1"><Send className="w-3 h-3" /> {trigger.template_name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <button onClick={() => runTest(trigger._id)} title="Dry run" className="p-1.5 rounded-lg text-surface-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><TestTube2 className="w-4 h-4" /></button>
                    <button onClick={() => openLogs(trigger)} title="Logs" className="p-1.5 rounded-lg text-surface-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => toggleTrigger(trigger)} title={trigger.active ? 'Pause' : 'Activate'} className={`p-1.5 rounded-lg transition-colors ${trigger.active ? 'text-surface-400 hover:text-amber-600 hover:bg-amber-50' : 'text-surface-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                      {trigger.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(trigger)} title="Edit" className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => deleteTrigger(trigger)} title="Delete" className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-3 pt-3 border-t border-surface-100 text-xs flex-wrap">
                  <div><span className="text-surface-400">Runs: </span><span className="font-semibold text-surface-700">{trigger.stats?.total_runs || 0}</span></div>
                  <div><span className="text-surface-400">Sent: </span><span className="font-semibold text-emerald-600">{trigger.stats?.total_sent || 0}</span></div>
                  <div><span className="text-surface-400">Failed: </span><span className="font-semibold text-red-600">{trigger.stats?.total_failed || 0}</span></div>
                  <div><span className="text-surface-400">Last: </span><span className="text-surface-600">{relativeTime(trigger.last_run_at)}</span></div>
                  <div><span className="text-surface-400">Next: </span><span className="text-surface-600 font-medium">{formatNextRun(trigger.next_run_at)}</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Test Result Modal ═══ */}
      {(testLoading || testResult) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setTestResult(null); setTestLoading(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h3 className="text-sm font-bold text-surface-900">Dry Run Preview</h3>
              <button onClick={() => { setTestResult(null); setTestLoading(false); }} className="p-1 rounded-lg hover:bg-surface-100"><X className="w-4 h-4 text-surface-500" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {testLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                  <span className="ml-2 text-sm text-surface-500">Running dry run...</span>
                </div>
              ) : testResult ? (
                <div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-surface-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-surface-900">{testResult.matched_count}</p>
                      <p className="text-[10px] text-surface-500 mt-0.5">Contacts matched today</p>
                    </div>
                    <div className="bg-surface-50 rounded-lg p-3 text-center">
                      <p className="text-sm font-semibold text-surface-700">{testResult.target_date}</p>
                      <p className="text-[10px] text-surface-500 mt-0.5">Target date (MM/DD)</p>
                    </div>
                    <div className="bg-surface-50 rounded-lg p-3 text-center">
                      <p className="text-sm font-semibold text-surface-700 truncate">{testResult.template_name}</p>
                      <p className="text-[10px] text-surface-500 mt-0.5">Template</p>
                    </div>
                  </div>

                  {/* Diagnostics */}
                  {testResult.diagnostics && (
                    <div className="mb-3 p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-xs">
                      <p className="font-semibold text-blue-800 mb-1.5">Field Analysis: {testResult.looking_for}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-blue-700">
                        <span>Total contacts in audience:</span><span className="font-semibold">{testResult.diagnostics.total_contacts}</span>
                        <span>With date field filled:</span><span className="font-semibold">{testResult.diagnostics.with_date_field}</span>
                        <span>Valid parseable dates:</span><span className="font-semibold text-emerald-600">{testResult.diagnostics.valid_dates}</span>
                        {testResult.diagnostics.invalid_dates > 0 && (
                          <><span>Invalid/unparseable dates:</span><span className="font-semibold text-red-600">{testResult.diagnostics.invalid_dates}</span></>
                        )}
                        <span>No value in field:</span><span className="font-semibold text-surface-500">{testResult.diagnostics.without_field}</span>
                      </div>
                      {testResult.diagnostics.invalid_dates > 0 && (
                        <p className="mt-1.5 text-amber-700 text-[10px]">
                          Some contacts have dates that can&apos;t be parsed. Check their date format (supported: YYYY-MM-DD, DD/MM/YYYY, DD-MM, timestamps, etc.)
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-surface-500 mb-2">
                    Looking for <strong>{testResult.looking_for}</strong> matching today
                    {testResult.offset_days !== 0 && ` (offset: ${testResult.offset_days}d)`}
                  </p>
                  {testResult.contacts?.length > 0 ? (
                    <div className="space-y-1.5">
                      {testResult.contacts.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-surface-50 text-xs">
                          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-[10px]">
                            {(c.name || '?')[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-surface-900 truncate">{c.name || c.phone}</p>
                            <p className="text-surface-400">{c.phone}</p>
                          </div>
                          <span className="text-surface-400 text-[10px]">{c.field_value || '—'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-surface-500 py-4 text-center">No contacts match for today&apos;s date. The trigger will check daily and auto-send when matches are found.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Logs Modal ═══ */}
      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowLogs(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h3 className="text-sm font-bold text-surface-900">Execution Logs</h3>
              <button onClick={() => setShowLogs(false)} className="p-1 rounded-lg hover:bg-surface-100"><X className="w-4 h-4 text-surface-500" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {logsLoading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-surface-500 py-8 text-center">No execution logs yet. Logs appear after the trigger runs.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => {
                    const statusInfo = LOG_STATUS_MAP[log.status] || LOG_STATUS_MAP.no_match;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div key={log._id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 text-xs">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${statusInfo.cls}`}><StatusIcon className="w-4 h-4" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-surface-900">{new Date(log.run_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="text-surface-400">{new Date(log.run_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-surface-500">
                            <span>Matched: {log.matched_contacts}</span>
                            <span className="text-emerald-600">Sent: {log.sent}</span>
                            {log.failed > 0 && <span className="text-red-600">Failed: {log.failed}</span>}
                            <span>{log.duration_ms}ms</span>
                          </div>
                          {log.error_details?.length > 0 && <p className="text-red-500 mt-0.5 truncate">Error: {log.error_details[0].error}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Create/Edit Modal ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <div>
                <h3 className="text-sm font-bold text-surface-900">{editId ? 'Edit Date Trigger' : 'Create Date Trigger'}</h3>
                <p className="text-[11px] text-surface-400 mt-0.5">
                  Step {step} of {totalSteps} —{' '}
                  {step === 1 ? 'Basic Info' : step === 2 ? 'Schedule' : step === 3 ? 'Template' : 'Target & Review'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-surface-100"><X className="w-4 h-4 text-surface-500" /></button>
            </div>

            {/* Step progress */}
            <div className="px-5 pt-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i + 1 <= step ? 'bg-brand-500' : 'bg-surface-200'}`} />
                ))}
              </div>
            </div>

            {/* Loading overlay for supporting data */}
            {supportingLoading && step > 1 && (
              <div className="px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-surface-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading templates and fields...
                </div>
              </div>
            )}

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">

              {/* ── STEP 1: Basic Info + Type ── */}
              {step === 1 && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">
                      Trigger Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateForm('name', e.target.value)}
                      placeholder="e.g. Birthday Greetings"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none ${fieldErrors.name ? 'border-red-300 bg-red-50/30' : 'border-surface-200'}`}
                    />
                    <ErrorText text={fieldErrors.name} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={form.description}
                      onChange={(e) => updateForm('description', e.target.value)}
                      placeholder="Optional — describe what this trigger does"
                      className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-2">
                      Trigger Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(TRIGGER_TYPE_MAP).map(([key, info]) => {
                        const Icon = info.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              updateForm('trigger_type', key);
                              if (key === 'birthday') updateForm('contact_field', 'birthday');
                            }}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                              form.trigger_type === key ? 'border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-100' : 'border-surface-200 text-surface-600 hover:bg-surface-50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {info.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 2: Schedule Config ── */}
              {step === 2 && (
                <>
                  {form.trigger_type === 'cron' ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">
                          Cron Expression <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.cron_expression}
                          onChange={(e) => updateForm('cron_expression', e.target.value)}
                          placeholder="e.g. 0 9 * * 1 (every Monday at 9am)"
                          className={`w-full px-3 py-2 text-sm font-mono border rounded-lg outline-none ${fieldErrors.cron_expression ? 'border-red-300 bg-red-50/30' : 'border-surface-200'}`}
                        />
                        <ErrorText text={fieldErrors.cron_expression} />
                        <div className="mt-2 p-3 bg-surface-50 rounded-lg text-[11px] text-surface-500 space-y-1">
                          <p className="font-semibold text-surface-600">Format: minute hour dayOfMonth month dayOfWeek</p>
                          <p><code className="bg-surface-200 px-1 rounded">0 9 * * *</code> — Every day at 9:00 AM</p>
                          <p><code className="bg-surface-200 px-1 rounded">0 9 * * 1-5</code> — Weekdays at 9:00 AM</p>
                          <p><code className="bg-surface-200 px-1 rounded">0 9 1 * *</code> — 1st of each month at 9:00 AM</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">Timezone</label>
                        <select value={form.timezone} onChange={(e) => updateForm('timezone', e.target.value)} className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg outline-none">
                          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">
                          Contact Date Field <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={form.contact_field}
                          onChange={(e) => updateForm('contact_field', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg outline-none ${fieldErrors.contact_field ? 'border-red-300' : 'border-surface-200'}`}
                        >
                          <optgroup label="Built-in Fields">
                            <option value="birthday">Birthday</option>
                            <option value="created_at">Contact Created Date</option>
                            <option value="subscribed_at">Subscribed Date</option>
                          </optgroup>
                          {allCustomFields.length > 0 && (
                            <optgroup label="Custom Fields">
                              {allCustomFields.map((cf) => (
                                <option key={cf.value} value={cf.value}>
                                  {cf.label} ({cf.type})
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <ErrorText text={fieldErrors.contact_field} />
                        <p className="text-[10px] text-surface-400 mt-1">
                          Select the contact field that holds the date. Supports any format: YYYY-MM-DD, DD/MM/YYYY, DD-MM, timestamps, etc.
                          {allCustomFields.length === 0 && ' Create custom fields in Settings → Custom Fields to add more options.'}
                        </p>
                        {form.contact_field && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const { data } = await api.post('/date-triggers/validate-field', {
                                  field_path: form.contact_field,
                                  target_type: form.target_type,
                                  target_tags: form.target_tags,
                                  target_list_id: form.target_list_id,
                                });
                                const d = data.data;
                                if (d.total === 0) {
                                  toast.error('No contacts found for the selected audience');
                                } else if (d.with_field === 0) {
                                  toast.error(`0 of ${d.total} contacts have a value in "${form.contact_field}"`);
                                } else if (d.invalid_dates > 0) {
                                  toast(`${d.valid_dates} valid dates, ${d.invalid_dates} invalid out of ${d.with_field} contacts with this field`, { icon: '⚠️' });
                                } else {
                                  toast.success(`${d.valid_dates} contacts have valid dates in "${form.contact_field}"`);
                                }
                              } catch {
                                toast.error('Could not validate field');
                              }
                            }}
                            className="mt-1.5 flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Check contacts with this field
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-surface-700 mb-1">Offset Days</label>
                          <input
                            type="number"
                            value={form.offset_days}
                            onChange={(e) => updateForm('offset_days', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg outline-none"
                          />
                          <p className="text-[10px] text-surface-400 mt-1">
                            <strong>0</strong> = on the day, <strong>-1</strong> = 1 day before, <strong>+7</strong> = 1 week after
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-surface-700 mb-1">
                            Send Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={form.send_time}
                            onChange={(e) => updateForm('send_time', e.target.value)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg outline-none ${fieldErrors.send_time ? 'border-red-300' : 'border-surface-200'}`}
                          />
                          <ErrorText text={fieldErrors.send_time} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">Timezone</label>
                        <select value={form.timezone} onChange={(e) => updateForm('timezone', e.target.value)} className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg outline-none">
                          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                      </div>
                      {form.trigger_type === 'one_time' && (
                        <div>
                          <label className="block text-xs font-semibold text-surface-700 mb-1">
                            One-Time Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={form.one_time_date}
                            onChange={(e) => updateForm('one_time_date', e.target.value)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg outline-none ${fieldErrors.one_time_date ? 'border-red-300 bg-red-50/30' : 'border-surface-200'}`}
                          />
                          <ErrorText text={fieldErrors.one_time_date} />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── STEP 3: Template ── */}
              {step === 3 && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">
                      WhatsApp Template <span className="text-red-500">*</span>
                    </label>
                    {supportingLoading ? (
                      <div className="flex items-center gap-2 py-3 text-sm text-surface-400">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading templates from Meta...
                      </div>
                    ) : templates.length === 0 ? (
                      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                        <p className="font-semibold">No approved templates found</p>
                        <p className="mt-1">Create and get templates approved in your Meta Business Suite first, then come back to set up a trigger.</p>
                      </div>
                    ) : (
                      <>
                        <select
                          value={form.template_name}
                          onChange={(e) => updateForm('template_name', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg outline-none ${fieldErrors.template_name ? 'border-red-300 bg-red-50/30' : 'border-surface-200'}`}
                        >
                          <option value="">— Select a template —</option>
                          {templates.map((t) => (
                            <option key={t.name + t.language} value={t.name}>
                              {t.name} ({t.language}) — {t.category}
                            </option>
                          ))}
                        </select>
                        <ErrorText text={fieldErrors.template_name} />
                      </>
                    )}
                  </div>

                  {/* Template preview */}
                  {selectedTemplate && (
                    <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs">
                      <p className="font-semibold text-emerald-800 mb-1">Template Preview: {selectedTemplate.name}</p>
                      {(selectedTemplate.components || []).map((comp, i) => (
                        <div key={i} className="mt-1">
                          <span className="font-medium text-emerald-600">{comp.type}: </span>
                          <span className="text-emerald-700">{comp.text || comp.format || '(media)'}</span>
                        </div>
                      ))}
                      {templateVarCount > 0 && (
                        <p className="mt-2 text-emerald-600 font-medium">
                          This template has {templateVarCount} variable{templateVarCount > 1 ? 's' : ''} to map
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">Template Language</label>
                    <input
                      type="text"
                      value={form.template_language}
                      onChange={(e) => updateForm('template_language', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg outline-none"
                    />
                  </div>

                  {/* Variable mapping */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-surface-700">
                        Variable Mapping
                        {templateVarCount > 0 && <span className="ml-1 text-surface-400 font-normal">({form.variable_mapping.length}/{templateVarCount} mapped)</span>}
                      </label>
                      <button onClick={addVariableMapping} className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                        <Plus className="w-3 h-3" /> Add Variable
                      </button>
                    </div>
                    {form.variable_mapping.length === 0 && (
                      <p className="text-[11px] text-surface-400 py-2 bg-surface-50 rounded-lg px-3">
                        {templateVarCount > 0
                          ? `Your template uses ${templateVarCount} variable(s). Click "Add Variable" to map them to contact fields.`
                          : 'No variables needed for this template, or add them manually if needed.'
                        }
                      </p>
                    )}
                    {form.variable_mapping.map((mapping, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-surface-500 bg-surface-100 px-1.5 py-0.5 rounded w-10 text-center">{`{{${idx + 1}}}`}</span>
                        <select
                          value={mapping.source}
                          onChange={(e) => updateVariableMapping(idx, 'source', e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs border border-surface-200 rounded-lg outline-none"
                        >
                          <option value="static">Static value</option>
                          <option value="contact_name">Contact name</option>
                          <option value="contact_phone">Contact phone</option>
                          <option value="contact_email">Contact email</option>
                          <option value="contact_field">Contact field</option>
                          <option value="custom_field">Custom field</option>
                        </select>
                        {mapping.source === 'static' && (
                          <input type="text" value={mapping.static_value} onChange={(e) => updateVariableMapping(idx, 'static_value', e.target.value)} placeholder="Enter value" className="flex-1 px-2 py-1.5 text-xs border border-surface-200 rounded-lg outline-none" />
                        )}
                        {(mapping.source === 'contact_field' || mapping.source === 'custom_field') && (
                          <select
                            value={mapping.field_path}
                            onChange={(e) => updateVariableMapping(idx, 'field_path', e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs border border-surface-200 rounded-lg outline-none"
                          >
                            <option value="">— Select field —</option>
                            <option value="name">Name</option>
                            <option value="phone">Phone</option>
                            <option value="email">Email</option>
                            <option value="birthday">Birthday</option>
                            {allCustomFields.map((cf) => (
                              <option key={cf.value} value={cf.value}>{cf.label} ({cf.type})</option>
                            ))}
                          </select>
                        )}
                        <button onClick={() => removeVariableMapping(idx)} className="p-1 rounded text-surface-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── STEP 4: Target + Review ── */}
              {step === 4 && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-2">Target Audience <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      {[
                        { key: 'all', label: 'All Contacts', icon: Users },
                        { key: 'tags', label: 'By Tags', icon: Hash },
                        { key: 'list', label: 'By List', icon: Calendar },
                      ].map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => updateForm('target_type', key)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                            form.target_type === key ? 'border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-100' : 'border-surface-200 text-surface-600 hover:bg-surface-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.target_type === 'tags' && (
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 mb-1">
                        Tags <span className="text-red-500">*</span>
                      </label>
                      {/* Existing tags as clickable chips */}
                      {allTags.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[10px] text-surface-400 mb-1.5">Click to add/remove tags:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {allTags.map((tag) => {
                              const isSelected = form.target_tags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      removeTag(tag);
                                    } else {
                                      setForm((prev) => ({ ...prev, target_tags: [...new Set([...prev.target_tags, tag])] }));
                                      if (fieldErrors.target_tags) setFieldErrors((prev) => { const n = { ...prev }; delete n.target_tags; return n; });
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                    isSelected
                                      ? 'bg-brand-50 text-brand-700 border-brand-300 ring-1 ring-brand-200'
                                      : 'bg-surface-50 text-surface-600 border-surface-200 hover:bg-surface-100'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3" />}
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Manual tag input as fallback */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                          placeholder={allTags.length > 0 ? 'Or type a new tag...' : 'Type tag and press Enter'}
                          className="flex-1 px-3 py-2 text-sm border border-surface-200 rounded-lg outline-none"
                        />
                        <button onClick={addTag} className="px-3 py-2 text-xs font-medium bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors">Add</button>
                      </div>
                      <ErrorText text={fieldErrors.target_tags} />
                      {form.target_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {form.target_tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs border border-blue-200">
                              {tag}
                              <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {form.target_type === 'list' && (
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 mb-1">
                        Contact List <span className="text-red-500">*</span>
                      </label>
                      {contactLists.length === 0 ? (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                          No contact lists found. Create a contact list first.
                        </div>
                      ) : (
                        <select
                          value={form.target_list_id}
                          onChange={(e) => updateForm('target_list_id', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg outline-none ${fieldErrors.target_list_id ? 'border-red-300' : 'border-surface-200'}`}
                        >
                          <option value="">— Select a list —</option>
                          {contactLists.map((l) => (
                            <option key={l._id} value={l._id}>{l.name} ({l.contact_count || l.phones?.length || 0} contacts)</option>
                          ))}
                        </select>
                      )}
                      <ErrorText text={fieldErrors.target_list_id} />
                    </div>
                  )}

                  {/* Review */}
                  <div className="bg-surface-50 rounded-lg p-4 mt-3">
                    <h4 className="text-xs font-bold text-surface-700 mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Review Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div><span className="text-surface-400">Name:</span> <span className="font-medium text-surface-800">{form.name || '—'}</span></div>
                      <div><span className="text-surface-400">Type:</span> <span className="font-medium text-surface-800">{TRIGGER_TYPE_MAP[form.trigger_type]?.label}</span></div>
                      {form.trigger_type !== 'cron' && (
                        <>
                          <div><span className="text-surface-400">Field:</span> <span className="font-medium text-surface-800">{form.contact_field}</span></div>
                          <div><span className="text-surface-400">Offset:</span> <span className="font-medium text-surface-800">{form.offset_days}d</span></div>
                          <div><span className="text-surface-400">Time:</span> <span className="font-medium text-surface-800">{form.send_time} ({form.timezone})</span></div>
                        </>
                      )}
                      {form.trigger_type === 'cron' && (
                        <div className="col-span-2"><span className="text-surface-400">Cron:</span> <code className="font-mono bg-surface-200 px-1.5 py-0.5 rounded text-surface-800">{form.cron_expression || '—'}</code></div>
                      )}
                      <div><span className="text-surface-400">Template:</span> <span className="font-medium text-surface-800">{form.template_name || '—'}</span></div>
                      <div><span className="text-surface-400">Language:</span> <span className="font-medium text-surface-800">{form.template_language}</span></div>
                      <div><span className="text-surface-400">Target:</span> <span className="font-medium text-surface-800">
                        {form.target_type === 'all' ? 'All contacts' : form.target_type === 'tags' ? `Tags: ${form.target_tags.join(', ') || '—'}` : 'Contact list'}
                      </span></div>
                      <div><span className="text-surface-400">Variables:</span> <span className="font-medium text-surface-800">{form.variable_mapping.length}</span></div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-surface-100">
              <div>
                {step > 1 && (
                  <button onClick={goBack} className="flex items-center gap-1 px-4 py-2 text-sm text-surface-600 hover:bg-surface-50 rounded-lg transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-surface-600 hover:bg-surface-50 rounded-lg transition-colors">Cancel</button>
                {step < totalSteps ? (
                  <button onClick={goNext} className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={saveTrigger} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editId ? 'Update Trigger' : 'Create Trigger'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
