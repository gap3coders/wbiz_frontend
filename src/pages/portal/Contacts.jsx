import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import PortalModal from '../../components/Portal/PortalModal';
import MediaLibraryModal from '../../MediaLibraryModal';
import ContactImportWizard from '../../ContactImportWizard';
import { COUNTRY_PHONE_OPTIONS, detectDefaultCountryOption, formatDisplayPhone, parsePhoneInput, splitCombinedPhone } from '../../utils/phone';
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit3,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageSquare,
  Square,
  CheckSquare2,
  Send,
  FileText,
  FolderOpen,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const WA_BADGE = {
  yes: <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />WhatsApp</span>,
  no: <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600"><XCircle className="h-3 w-3" />No WA</span>,
  unknown: <span className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500"><HelpCircle className="h-3 w-3" />Unknown</span>,
};

const extractVars = (template) => {
  if (!template) return [];
  const vars = [];
  for (const component of template.components || []) {
    if (!['BODY', 'HEADER'].includes(component.type) || !component.text) continue;
    const matches = component.text.match(/\{\{(\d+)\}\}/g) || [];
    matches.forEach((match) => {
      const value = component.type === 'HEADER' ? `header_${match.replace(/[{}]/g, '')}` : match.replace(/[{}]/g, '');
      if (!vars.includes(value)) vars.push(value);
    });
  }
  return vars;
};

const getPageNumbers = (current, total) => {
  if (total <= 1) return [1];
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return Array.from(pages).filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
};

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 30 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [filterWa, setFilterWa] = useState('');
  const [allLabels, setAllLabels] = useState([]);
  const [selectedMap, setSelectedMap] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [form, setForm] = useState({ country_code: '91', phone_number: '', phone: '', name: '', email: '', labels: '', notes: '' });
  const [defaultCountryOption, setDefaultCountryOption] = useState(COUNTRY_PHONE_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sendMode, setSendMode] = useState('template');
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVariables, setTemplateVariables] = useState({});
  const [showVariableConfig, setShowVariableConfig] = useState(false);
  const [templateHeaderUrl, setTemplateHeaderUrl] = useState('');
  const [showTemplateHeaderLibrary, setShowTemplateHeaderLibrary] = useState(false);

  const devError = (...args) => {
    if (import.meta.env.DEV) console.error(...args);
  };

  const fetchContacts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/contacts', {
        params: { search, label: filterLabel, wa_status: filterWa, page, limit: 30 },
      });
      const nextContacts = data.data.contacts || [];
      setContacts(nextContacts);
      setPagination(data.data.pagination || { page: 1, pages: 1, total: 0, limit: 30 });
      setAllLabels(data.data.labels || []);
      setSelectedMap((current) => {
        const next = { ...current };
        nextContacts.forEach((contact) => {
          if (next[contact._id]) next[contact._id] = contact;
        });
        return next;
      });
    } catch (error) {
      devError('[Contacts UI][List Failed]', error.response?.data || error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [search, filterLabel, filterWa]);

  useEffect(() => {
    fetchContacts(1);
  }, [fetchContacts]);

  useEffect(() => {
    let mounted = true;
    detectDefaultCountryOption().then((option) => {
      if (!mounted || !option) return;
      setDefaultCountryOption(option);
      setForm((current) => {
        if (current.country_code) return current;
        return { ...current, country_code: option.dialCode };
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showSend || templates.length) return;
    setLoadingTemplates(true);
    api
      .get('/meta/templates')
      .then((response) => setTemplates(response.data?.data?.templates || []))
      .catch(() => toast.error('Failed to load Meta templates'))
      .finally(() => setLoadingTemplates(false));
  }, [showSend, templates.length]);

  const selectedContacts = useMemo(() => Object.values(selectedMap), [selectedMap]);
  const selectedCount = selectedContacts.length;
  const allPageSelected = contacts.length > 0 && contacts.every((contact) => selectedMap[contact._id]);
  const approvedTemplates = useMemo(() => templates.filter((template) => template.status === 'APPROVED'), [templates]);
  const templateVariableKeys = Object.keys(templateVariables);
  const selectedTemplateHeaderFormat = useMemo(() => {
    const header = selectedTemplate?.components?.find((component) => component.type === 'HEADER');
    const format = String(header?.format || '').toUpperCase();
    if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) return '';
    return format;
  }, [selectedTemplate]);
  const pageNumbers = getPageNumbers(pagination.page, pagination.pages);

  const resetComposer = () => {
    setSendMode('template');
    setSelectedTemplate(null);
    setTemplateVariables({});
    setShowVariableConfig(false);
    setTemplateHeaderUrl('');
    setShowTemplateHeaderLibrary(false);
  };

  const openAddModal = () => {
    setEditId(null);
    setForm({
      country_code: defaultCountryOption?.dialCode || '91',
      phone_number: '',
      phone: '',
      name: '',
      email: '',
      labels: '',
      notes: '',
    });
    setShowAdd(true);
  };

  const openEditModal = (contact) => {
    const split = splitCombinedPhone(contact.phone || '', defaultCountryOption?.dialCode || '91');
    setEditId(contact._id);
    setForm({
      country_code: contact.country_code || split.country_code || defaultCountryOption?.dialCode || '91',
      phone_number: contact.phone_number || split.phone_number || '',
      phone: contact.phone,
      name: contact.name || '',
      email: contact.email || '',
      labels: (contact.labels || []).join(', '),
      notes: contact.notes || '',
    });
    setShowAdd(true);
  };

  const openSendModalForContacts = (contactsToOpen) => {
    const nextContacts = Array.isArray(contactsToOpen) ? contactsToOpen : [contactsToOpen];
    setSelectedMap((current) => {
      const next = { ...current };
      nextContacts.forEach((contact) => {
        if (contact?._id) next[contact._id] = contact;
      });
      return next;
    });
    resetComposer();
    setShowSend(true);
  };

  const saveContact = async () => {
    const parsedPhone = parsePhoneInput({
      phone: form.phone,
      country_code: form.country_code,
      phone_number: form.phone_number,
      default_country_code: defaultCountryOption?.dialCode || '91',
    });

    if (!parsedPhone.ok) {
      toast.error(parsedPhone.error);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        phone: parsedPhone.phone,
        country_code: parsedPhone.country_code,
        phone_number: parsedPhone.phone_number,
        name: form.name,
        email: form.email,
        labels: form.labels ? form.labels.split(',').map((label) => label.trim()).filter(Boolean) : [],
        notes: form.notes,
      };
      if (editId) await api.put(`/contacts/${editId}`, payload);
      else await api.post('/contacts', payload);
      toast.success(editId ? 'Updated' : 'Added');
      setShowAdd(false);
      fetchContacts(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };
  const deleteContact = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await api.delete(`/contacts/${id}`);
      toast.success('Deleted');
      setSelectedMap((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      fetchContacts(pagination.page);
    } catch {
      toast.error('Failed');
    }
  };

  const deleteSelected = async () => {
    if (!selectedCount) return;
    if (!window.confirm(`Delete ${selectedCount} selected contacts?`)) return;
    try {
      const { data } = await api.post('/contacts/bulk-delete', {
        contact_ids: selectedContacts.map((contact) => contact._id),
      });
      toast.success(`Deleted ${data.data.deleted_count || 0} contacts`);
      setSelectedMap({});
      fetchContacts(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete selected contacts');
    }
  };

  const toggleSelect = (contact) => {
    setSelectedMap((current) => {
      const next = { ...current };
      if (next[contact._id]) delete next[contact._id];
      else next[contact._id] = contact;
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelectedMap((current) => {
      const next = { ...current };
      if (allPageSelected) {
        contacts.forEach((contact) => delete next[contact._id]);
      } else {
        contacts.forEach((contact) => {
          next[contact._id] = contact;
        });
      }
      return next;
    });
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateHeaderUrl('');
    const vars = extractVars(template);
    const nextMap = {};
    vars.forEach((key) => {
      nextMap[key] = { type: 'static', value: '' };
    });
    setTemplateVariables(nextMap);
    setShowVariableConfig(vars.length > 0);
  };

  const buildTemplateComponents = (contact) => {
    if (!selectedTemplate || !templateVariableKeys.length) return [];
    const headerParameters = templateVariableKeys
      .filter((key) => key.startsWith('header_'))
      .sort((left, right) => Number(left.replace('header_', '')) - Number(right.replace('header_', '')))
      .map((key) => {
        const variable = templateVariables[key];
        let value = variable?.value || '';
        if (variable?.type === 'contact_name') value = contact?.name || contact?.wa_name || 'Customer';
        if (variable?.type === 'contact_phone') value = contact?.phone || '';
        if (variable?.type === 'contact_email') value = contact?.email || 'N/A';
        return { type: 'text', text: value || `{{${key.replace('header_', '')}}}` };
      });
    const bodyParameters = templateVariableKeys
      .filter((key) => !key.startsWith('header_'))
      .sort((left, right) => Number(left) - Number(right))
      .map((key) => {
        const variable = templateVariables[key];
        let value = variable?.value || '';
        if (variable?.type === 'contact_name') value = contact?.name || contact?.wa_name || 'Customer';
        if (variable?.type === 'contact_phone') value = contact?.phone || '';
        if (variable?.type === 'contact_email') value = contact?.email || 'N/A';
        return { type: 'text', text: value || `{{${key}}}` };
      });
    const components = [];
    if (headerParameters.length) components.push({ type: 'header', parameters: headerParameters });
    if (bodyParameters.length) components.push({ type: 'body', parameters: bodyParameters });
    return components;
  };

  const sendToSelected = async () => {
    if (!selectedContacts.length) {
      toast.error('Select at least one contact');
      return;
    }
    if (!selectedTemplate) {
      toast.error('Select a template');
      return;
    }
    if (selectedTemplateHeaderFormat && !templateHeaderUrl.trim()) {
      toast.error(`Template requires ${selectedTemplateHeaderFormat} header URL`);
      return;
    }

    setSending(true);
    try {
      let acceptedCount = 0;
      const failures = [];
      for (const contact of selectedContacts) {
        const normalizedTo = String(contact.phone || '').replace(/[^0-9]/g, '');
        if (!normalizedTo) {
          failures.push({ error: { response: { data: { error: 'Invalid contact phone', error_source: 'platform' } } } });
          continue;
        }
        try {
          await api.post('/meta/messages/send-template', {
            to: normalizedTo,
            template_name: selectedTemplate.name,
            language: selectedTemplate.language,
            components: buildTemplateComponents(contact),
            header_type: selectedTemplateHeaderFormat ? selectedTemplateHeaderFormat.toLowerCase() : undefined,
            header_media_url: selectedTemplateHeaderFormat ? templateHeaderUrl.trim() : undefined,
          });
          acceptedCount += 1;
        } catch (error) {
          failures.push({ error });
        }
      }

      if (!acceptedCount) {
        const firstFailure = failures[0]?.error?.response?.data;
        if (firstFailure?.error_source === 'meta') toast.error(`Meta Error: ${firstFailure.error}`);
        else toast.error(`Platform Error: ${firstFailure?.error || 'Send failed'}`);
        return;
      }

      if (failures.length) toast.success(`${acceptedCount} send action(s) accepted by Meta, ${failures.length} failed.`);
      else toast.success(`${acceptedCount} send action(s) accepted by Meta.`);
      setShowSend(false);
      resetComposer();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-0.5 text-sm text-gray-500">{pagination.total} contacts — select across pages and send directly to the chosen audience.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"><Upload className="h-4 w-4" />Import</button>
          <button onClick={openAddModal} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"><Plus className="h-4 w-4" />Add Contact</button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5"><Search className="h-4 w-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, email..." className="w-full border-none bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-0" /></div>
        <select value={filterLabel} onChange={(event) => setFilterLabel(event.target.value)} className="w-44 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600"><option value="">All Tags</option>{allLabels.map((label) => <option key={label} value={label}>{label}</option>)}</select>
        <select value={filterWa} onChange={(event) => setFilterWa(event.target.value)} className="w-44 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600"><option value="">All WA Status</option><option value="yes">On WhatsApp</option><option value="no">Not on WA</option><option value="unknown">Unknown</option></select>
      </div>

      {selectedCount ? <div className="mb-6 flex flex-col gap-3 rounded-[28px] border border-emerald-100 bg-emerald-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white"><CheckSquare2 className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-emerald-900">{selectedCount} contact(s) selected</p><p className="text-xs text-emerald-700">Selection stays active across pages and filters until you clear it.</p></div></div><div className="flex flex-wrap gap-2"><button onClick={() => openSendModalForContacts(selectedContacts)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"><Send className="h-4 w-4" />Send Message</button><button onClick={deleteSelected} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />Delete Selected</button><button onClick={() => setSelectedMap({})} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"><X className="h-4 w-4" />Clear</button></div></div> : null}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {loading ? <div className="space-y-3 p-6">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-gray-100" />)}</div> : contacts.length === 0 ? <div className="py-16 text-center"><Users className="mx-auto mb-3 h-12 w-12 text-gray-200" /><p className="font-medium text-gray-400">No contacts found</p></div> : <><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100"><th className="px-4 py-3 text-left"><button type="button" onClick={toggleSelectPage} className="text-gray-400 hover:text-emerald-600">{allPageSelected ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}</button></th><th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Contact</th><th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Phone</th><th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 md:table-cell">WhatsApp</th><th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 lg:table-cell">Tags</th><th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</th></tr></thead><tbody>{contacts.map((contact) => <tr key={contact._id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-4 py-3.5"><button type="button" onClick={() => toggleSelect(contact)} className="text-gray-400 hover:text-emerald-600">{selectedMap[contact._id] ? <CheckSquare2 className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4" />}</button></td><td className="px-6 py-3.5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-white">{(contact.wa_name || contact.name || contact.phone)[0]?.toUpperCase()}</div><div><p className="text-sm font-semibold text-gray-900">{contact.wa_name || contact.name || 'Unnamed'}</p>{contact.email ? <p className="text-xs text-gray-400">{contact.email}</p> : null}</div></div></td><td className="px-6 py-3.5"><span className="text-sm text-gray-600">{formatDisplayPhone(contact.phone, contact.country_code)}</span></td><td className="hidden px-6 py-3.5 md:table-cell">{WA_BADGE[contact.wa_exists || 'unknown']}</td><td className="hidden px-6 py-3.5 lg:table-cell"><div className="flex flex-wrap gap-1">{(contact.labels || []).slice(0, 3).map((label) => <span key={label} className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">{label}</span>)}</div></td><td className="px-6 py-3.5"><div className="flex items-center justify-end gap-1"><button onClick={() => openSendModalForContacts(contact)} className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"><MessageSquare className="h-3.5 w-3.5" /></button><button onClick={() => openEditModal(contact)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Edit3 className="h-3.5 w-3.5" /></button><button onClick={() => deleteContact(contact._id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)}</tbody></table></div><div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs text-gray-400">Page {pagination.page} of {pagination.pages} • {pagination.total} total contacts</span><div className="flex items-center gap-1"><button disabled={pagination.page <= 1} onClick={() => fetchContacts(pagination.page - 1)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>{pageNumbers.map((page, index) => <div key={page} className="flex items-center">{index > 0 && pageNumbers[index - 1] !== page - 1 ? <span className="px-2 text-xs text-gray-300"><MoreHorizontal className="h-3.5 w-3.5" /></span> : null}<button type="button" onClick={() => fetchContacts(page)} className={`min-w-[2rem] rounded-lg px-2.5 py-1.5 text-xs font-semibold ${page === pagination.page ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{page}</button></div>)}<button disabled={pagination.page >= pagination.pages} onClick={() => fetchContacts(pagination.page + 1)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button></div></div></>}
      </div>
      <PortalModal open={showAdd} onClose={() => { setShowAdd(false); setEditId(null); }} title={`${editId ? 'Edit' : 'Add'} Contact`} subtitle="Save contact details for future messaging." size="md">
        <div className="space-y-4">
          <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Phone *</label><div className="grid grid-cols-[140px,1fr] gap-2"><select value={form.country_code} onChange={(event) => setForm({ ...form, country_code: event.target.value, phone: `${event.target.value}${form.phone_number}` })} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40">{COUNTRY_PHONE_OPTIONS.map((option) => <option key={`${option.iso2}-${option.dialCode}`} value={option.dialCode}>{option.country} (+{option.dialCode})</option>)}</select><input value={form.phone_number} onChange={(event) => setForm({ ...form, phone_number: event.target.value.replace(/[^\d]/g, ''), phone: `${form.country_code}${event.target.value.replace(/[^\d]/g, '')}` })} placeholder="9876543210" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40" /></div></div>
          <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Name</label><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="John Doe" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Email</label><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="john@example.com" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Tags</label><input value={form.labels} onChange={(event) => setForm({ ...form, labels: event.target.value })} placeholder="vip, customer, lead" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</label><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40" /></div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4"><button onClick={() => { setShowAdd(false); setEditId(null); }} className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button><button onClick={saveContact} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}{editId ? 'Update' : 'Add'}</button></div>
        </div>
      </PortalModal>

      <ContactImportWizard open={showImport} onClose={() => setShowImport(false)} onImported={() => fetchContacts(1)} defaultCountryCode={defaultCountryOption?.dialCode || '91'} />

      <PortalModal open={showSend} onClose={() => setShowSend(false)} title="Send to Selected Contacts" subtitle="Send Meta-approved templates to the contacts you selected." size="xl">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Meta Template mode enabled
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">Selected Audience</label>
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
                {selectedContacts.map((contact) => (
                  <div key={contact._id} className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                    <span>{contact.wa_name || contact.name || contact.phone}</span>
                    <span className="text-emerald-500">{formatDisplayPhone(contact.phone, contact.country_code)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Select Meta-Approved Template</label>
              <p className="mb-3 text-xs text-gray-400">Only Meta-approved templates appear here, pulled live from your connected account.</p>
              {loadingTemplates ? (
                <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}</div>
              ) : approvedTemplates.length === 0 ? (
                <div className="py-8 text-center"><FileText className="mx-auto mb-2 h-10 w-10 text-gray-300" /><p className="text-sm text-gray-400">No approved templates on Meta</p></div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {approvedTemplates.map((template) => {
                    const vars = extractVars(template);
                    return (
                      <button key={template.id} type="button" onClick={() => handleSelectTemplate(template)} className={`w-full rounded-xl border-2 p-4 text-left transition-all ${selectedTemplate?.id === template.id ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                        <div className="mb-1 flex items-center justify-between"><span className="text-sm font-semibold text-gray-900">{template.name}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{template.category}</span></div>
                        <p className="text-xs text-gray-500">{template.language} • {vars.length ? `${vars.length} variable(s)` : 'No variables'}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedTemplate && templateVariableKeys.length ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <button type="button" onClick={() => setShowVariableConfig((current) => !current)} className="flex w-full items-center justify-between">
                  <div className="text-left">
                    <label className="text-xs font-semibold uppercase tracking-wider text-amber-600">Dynamic Variables ({templateVariableKeys.length})</label>
                    <p className="mt-0.5 text-xs text-gray-400">Configure what data to pass into the selected template.</p>
                  </div>
                  {showVariableConfig ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
                {showVariableConfig ? (
                  <div className="mt-4 space-y-3">
                    {templateVariableKeys.map((key) => (
                      <div key={key} className="rounded-xl bg-gray-50 p-3">
                        <label className="mb-2 block text-xs font-semibold text-gray-600">{`{{${key}}}`}</label>
                        <div className="flex gap-2">
                          <select value={templateVariables[key]?.type || 'static'} onChange={(event) => setTemplateVariables((current) => ({ ...current, [key]: { ...current[key], type: event.target.value } }))} className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                            <option value="static">Static Value</option><option value="contact_name">Contact Name</option><option value="contact_phone">Contact Phone</option><option value="contact_email">Contact Email</option>
                          </select>
                          {templateVariables[key]?.type === 'static' ? (
                            <input value={templateVariables[key]?.value || ''} onChange={(event) => setTemplateVariables((current) => ({ ...current, [key]: { ...current[key], value: event.target.value } }))} placeholder="Enter value..." className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
                          ) : <p className="flex flex-1 items-center px-3 text-xs text-emerald-600">Auto-filled from contact data</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {selectedTemplate && selectedTemplateHeaderFormat ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-blue-600">Header Media ({selectedTemplateHeaderFormat})</label>
                <p className="mb-3 text-xs text-gray-400">This template needs a {selectedTemplateHeaderFormat.toLowerCase()} header file URL.</p>
                <input value={templateHeaderUrl} onChange={(event) => setTemplateHeaderUrl(event.target.value)} placeholder="https://public-url-to-media-file" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40" />
                <button type="button" onClick={() => setShowTemplateHeaderLibrary(true)} className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"><FolderOpen className="h-3.5 w-3.5" />Choose from gallery</button>
              </div>
            ) : null}

            <button type="button" onClick={sendToSelected} disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
              {sending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Sending via Meta...</> : <><Send className="h-4 w-4" />Send to Selected Contacts</>}
            </button>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold text-gray-900">Selected Contacts</h3></div>
              <div className="max-h-[18rem] space-y-2 overflow-y-auto pr-1">{selectedContacts.map((contact) => <div key={contact._id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"><p className="text-sm font-semibold text-gray-900">{contact.wa_name || contact.name || 'Unnamed'}</p><p className="mt-1 text-xs text-gray-500">{formatDisplayPhone(contact.phone, contact.country_code)}</p></div>)}</div>
            </div>
          </div>
        </div>
      </PortalModal>

      <MediaLibraryModal open={showTemplateHeaderLibrary} onClose={() => setShowTemplateHeaderLibrary(false)} title="Select Header Media" subtitle="Pick a media file for the selected template header." allowedTypes={selectedTemplateHeaderFormat ? [selectedTemplateHeaderFormat.toLowerCase()] : ['document']} onSelect={(assets) => { const first = assets?.[0]; if (!first?.public_url) { toast.error('No valid media selected'); return; } setTemplateHeaderUrl(first.public_url); setShowTemplateHeaderLibrary(false); toast.success('Header media selected'); }} />
    </div>
  );
}
