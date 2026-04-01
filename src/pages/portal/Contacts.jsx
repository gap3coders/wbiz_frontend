import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import PortalModal from '../../components/Portal/PortalModal';
import MediaLibraryModal from '../../MediaLibraryModal';
import ContactImportWizard from '../../ContactImportWizard';
import { detectMediaAssetType, formatFileSize } from '../../mediaLibraryHelpers';
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
  Image,
  Paperclip,
  Mic,
  Video,
  FolderOpen,
  Link2,
  AlertTriangle,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const WA_BADGE = {
  yes: <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />WhatsApp</span>,
  no: <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600"><XCircle className="h-3 w-3" />No WA</span>,
  unknown: <span className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500"><HelpCircle className="h-3 w-3" />Unknown</span>,
};

const MEDIA_OPTIONS = [
  { key: 'image', label: 'Image', icon: Image },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'document', label: 'File', icon: Paperclip },
  { key: 'audio', label: 'Audio', icon: Mic },
];

const mergeAssets = (current, incoming) => {
  const map = new Map(current.map((asset) => [asset._id, asset]));
  incoming.forEach((asset) => map.set(asset._id, asset));
  return Array.from(map.values());
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

const renderAssetPreview = (asset) => {
  if (asset.asset_type === 'image') {
    return <img src={asset.public_url} alt={asset.original_name} className="h-24 w-full rounded-2xl object-cover" />;
  }
  if (asset.asset_type === 'video') {
    return <video src={asset.public_url} className="h-24 w-full rounded-2xl bg-black object-cover" muted />;
  }
  const Icon = asset.asset_type === 'audio' ? Mic : FileText;
  return <div className="flex h-24 w-full flex-col items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Icon className="mb-1 h-7 w-7" /><p className="text-[10px] font-semibold uppercase tracking-wide">{asset.asset_type}</p></div>;
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
  const [form, setForm] = useState({ phone: '', name: '', email: '', labels: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sendMode, setSendMode] = useState('text');
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVariables, setTemplateVariables] = useState({});
  const [showVariableConfig, setShowVariableConfig] = useState(false);
  const [mediaType, setMediaType] = useState('image');
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [manualUrlOpen, setManualUrlOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [manualFilename, setManualFilename] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');

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
    if (!showSend || sendMode !== 'template' || templates.length) return;
    setLoadingTemplates(true);
    api
      .get('/meta/templates')
      .then((response) => setTemplates(response.data?.data?.templates || []))
      .catch(() => toast.error('Failed to load Meta templates'))
      .finally(() => setLoadingTemplates(false));
  }, [showSend, sendMode, templates.length]);

  const selectedContacts = useMemo(() => Object.values(selectedMap), [selectedMap]);
  const selectedCount = selectedContacts.length;
  const allPageSelected = contacts.length > 0 && contacts.every((contact) => selectedMap[contact._id]);
  const approvedTemplates = useMemo(() => templates.filter((template) => template.status === 'APPROVED'), [templates]);
  const templateVariableKeys = Object.keys(templateVariables);
  const pageNumbers = getPageNumbers(pagination.page, pagination.pages);

  const resetComposer = () => {
    setSendMode('text');
    setSendText('');
    setSelectedTemplate(null);
    setTemplateVariables({});
    setShowVariableConfig(false);
    setMediaType('image');
    setSelectedAssets([]);
    setQueuedFiles([]);
    setManualUrlOpen(false);
    setMediaUrl('');
    setManualFilename('');
    setMediaCaption('');
    setDragActive(false);
  };

  const openAddModal = () => {
    setEditId(null);
    setForm({ phone: '', name: '', email: '', labels: '', notes: '' });
    setShowAdd(true);
  };

  const openEditModal = (contact) => {
    setEditId(contact._id);
    setForm({
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
    if (!form.phone) {
      toast.error('Phone required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        phone: form.phone,
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
    const bodyParameters = templateVariableKeys
      .filter((key) => !key.startsWith('header_'))
      .sort((left, right) => Number(left) - Number(right))
      .map((key) => {
        const variable = templateVariables[key];
        let value = variable?.value || '';
        if (variable?.type === 'contact_name') value = contact?.name || contact?.wa_name || 'Customer';
        if (variable?.type === 'contact_phone') value = contact?.phone || '';
        if (variable?.type === 'contact_email') value = contact?.email || '';
        return { type: 'text', text: value || `{{${key}}}` };
      });
    return bodyParameters.length ? [{ type: 'body', parameters: bodyParameters }] : [];
  };

  const queueFilesForLibrary = (files) => {
    const nextFiles = Array.from(files || []).filter((file) => detectMediaAssetType(file) === mediaType);
    if (!nextFiles.length) {
      toast.error(`Please add ${mediaType} files for this picker.`);
      return;
    }
    setQueuedFiles(nextFiles);
    setShowLibrary(true);
  };

  const buildAssetsToSend = () => {
    if (selectedAssets.length) return selectedAssets;
    if (!mediaUrl.trim()) return [];
    return [{
      _id: `manual-${mediaType}-${mediaUrl}`,
      asset_type: mediaType,
      public_url: mediaUrl.trim(),
      original_name: manualFilename.trim() || `${mediaType}-asset`,
    }];
  };

  const sendToSelected = async () => {
    if (!selectedContacts.length) {
      toast.error('Select at least one contact');
      return;
    }
    if (sendMode === 'text' && !sendText.trim()) {
      toast.error('Enter a message');
      return;
    }
    if (sendMode === 'template' && !selectedTemplate) {
      toast.error('Select a template');
      return;
    }
    const assetsToSend = sendMode === 'media' ? buildAssetsToSend() : [];
    if (sendMode === 'media' && !assetsToSend.length) {
      toast.error('Choose media from the gallery or add a direct URL');
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
          if (sendMode === 'text') {
            await api.post('/meta/messages/send', { to: normalizedTo, text: sendText.trim() });
            acceptedCount += 1;
            continue;
          }
          if (sendMode === 'template') {
            await api.post('/meta/messages/send-template', {
              to: normalizedTo,
              template_name: selectedTemplate.name,
              language: selectedTemplate.language,
              components: buildTemplateComponents(contact),
            });
            acceptedCount += 1;
            continue;
          }
          for (const asset of assetsToSend) {
            try {
              await api.post('/meta/messages/send-media', {
                to: normalizedTo,
                type: asset.asset_type,
                url: asset.public_url,
                caption: asset.asset_type === 'audio' ? '' : mediaCaption.trim(),
                filename: asset.asset_type === 'document' ? asset.original_name || manualFilename.trim() || 'document' : asset.original_name || undefined,
              });
              acceptedCount += 1;
            } catch (error) {
              failures.push({ error });
            }
          }
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
        {loading ? <div className="space-y-3 p-6">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-gray-100" />)}</div> : contacts.length === 0 ? <div className="py-16 text-center"><Users className="mx-auto mb-3 h-12 w-12 text-gray-200" /><p className="font-medium text-gray-400">No contacts found</p></div> : <><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100"><th className="px-4 py-3 text-left"><button type="button" onClick={toggleSelectPage} className="text-gray-400 hover:text-emerald-600">{allPageSelected ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}</button></th><th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Contact</th><th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Phone</th><th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 md:table-cell">WhatsApp</th><th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 lg:table-cell">Tags</th><th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</th></tr></thead><tbody>{contacts.map((contact) => <tr key={contact._id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-4 py-3.5"><button type="button" onClick={() => toggleSelect(contact)} className="text-gray-400 hover:text-emerald-600">{selectedMap[contact._id] ? <CheckSquare2 className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4" />}</button></td><td className="px-6 py-3.5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-white">{(contact.wa_name || contact.name || contact.phone)[0]?.toUpperCase()}</div><div><p className="text-sm font-semibold text-gray-900">{contact.wa_name || contact.name || 'Unnamed'}</p>{contact.email ? <p className="text-xs text-gray-400">{contact.email}</p> : null}</div></div></td><td className="px-6 py-3.5"><span className="text-sm text-gray-600">+{contact.phone}</span></td><td className="hidden px-6 py-3.5 md:table-cell">{WA_BADGE[contact.wa_exists || 'unknown']}</td><td className="hidden px-6 py-3.5 lg:table-cell"><div className="flex flex-wrap gap-1">{(contact.labels || []).slice(0, 3).map((label) => <span key={label} className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">{label}</span>)}</div></td><td className="px-6 py-3.5"><div className="flex items-center justify-end gap-1"><button onClick={() => openSendModalForContacts(contact)} className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"><MessageSquare className="h-3.5 w-3.5" /></button><button onClick={() => openEditModal(contact)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Edit3 className="h-3.5 w-3.5" /></button><button onClick={() => deleteContact(contact._id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)}</tbody></table></div><div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs text-gray-400">Page {pagination.page} of {pagination.pages} • {pagination.total} total contacts</span><div className="flex items-center gap-1"><button disabled={pagination.page <= 1} onClick={() => fetchContacts(pagination.page - 1)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>{pageNumbers.map((page, index) => <div key={page} className="flex items-center">{index > 0 && pageNumbers[index - 1] !== page - 1 ? <span className="px-2 text-xs text-gray-300"><MoreHorizontal className="h-3.5 w-3.5" /></span> : null}<button type="button" onClick={() => fetchContacts(page)} className={`min-w-[2rem] rounded-lg px-2.5 py-1.5 text-xs font-semibold ${page === pagination.page ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{page}</button></div>)}<button disabled={pagination.page >= pagination.pages} onClick={() => fetchContacts(pagination.page + 1)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button></div></div></>}
      </div>
      <PortalModal open={showAdd} onClose={() => { setShowAdd(false); setEditId(null); }} title={`${editId ? 'Edit' : 'Add'} Contact`} subtitle="Save contact details for future messaging." size="md">
        <div className="space-y-4">
          <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Phone *</label><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="919876543210" disabled={Boolean(editId)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Name</label><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="John Doe" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Email</label><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="john@example.com" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Tags</label><input value={form.labels} onChange={(event) => setForm({ ...form, labels: event.target.value })} placeholder="vip, customer, lead" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</label><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40" /></div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4"><button onClick={() => { setShowAdd(false); setEditId(null); }} className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button><button onClick={saveContact} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}{editId ? 'Update' : 'Add'}</button></div>
        </div>
      </PortalModal>

      <ContactImportWizard open={showImport} onClose={() => setShowImport(false)} onImported={() => fetchContacts(1)} />

      <PortalModal open={showSend} onClose={() => setShowSend(false)} title="Send to Selected Contacts" subtitle="Use text, Meta templates, or gallery media for the contacts you selected." size="xl">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">Message Type</label>
              <div className="flex gap-2">{[{ key: 'text', label: 'Text', icon: Send }, { key: 'template', label: 'Meta Template', icon: FileText }, { key: 'media', label: 'Media Gallery', icon: Image }].map((item) => <button key={item.key} type="button" onClick={() => { setSendMode(item.key); if (item.key !== 'template') setSelectedTemplate(null); }} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${sendMode === item.key ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'}`}><item.icon className="h-4 w-4" />{item.label}</button>)}</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5"><label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">Selected Audience</label><div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">{selectedContacts.map((contact) => <div key={contact._id} className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"><span>{contact.wa_name || contact.name || contact.phone}</span><span className="text-emerald-500">+{contact.phone}</span></div>)}</div></div>

            {sendMode === 'text' ? <div className="rounded-2xl border border-gray-100 bg-white p-5"><label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">Message</label><textarea value={sendText} onChange={(event) => setSendText(event.target.value)} placeholder="Type your message..." rows={6} className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40" /><div className="mt-2 flex items-center justify-between"><span className="text-xs text-gray-400">{sendText.length}/4096</span><div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /><span>Requires 24h window</span></div></div></div> : null}

            {sendMode === 'template' ? <><div className="rounded-2xl border border-gray-100 bg-white p-5"><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Select Meta-Approved Template</label><p className="mb-3 text-xs text-gray-400">Only Meta-approved templates appear here, pulled live from your connected account.</p>{loadingTemplates ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}</div> : approvedTemplates.length === 0 ? <div className="py-8 text-center"><FileText className="mx-auto mb-2 h-10 w-10 text-gray-300" /><p className="text-sm text-gray-400">No approved templates on Meta</p></div> : <div className="max-h-72 space-y-2 overflow-y-auto">{approvedTemplates.map((template) => { const vars = extractVars(template); return <button key={template.id} type="button" onClick={() => handleSelectTemplate(template)} className={`w-full rounded-xl border-2 p-4 text-left transition-all ${selectedTemplate?.id === template.id ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}><div className="mb-1 flex items-center justify-between"><span className="text-sm font-semibold text-gray-900">{template.name}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{template.category}</span></div><p className="text-xs text-gray-500">{template.language} • {vars.length ? `${vars.length} variable(s)` : 'No variables'}</p></button>; })}</div>}</div>{selectedTemplate && templateVariableKeys.length ? <div className="rounded-2xl border border-gray-100 bg-white p-5"><button type="button" onClick={() => setShowVariableConfig((current) => !current)} className="flex w-full items-center justify-between"><div className="text-left"><label className="text-xs font-semibold uppercase tracking-wider text-amber-600">Dynamic Variables ({templateVariableKeys.length})</label><p className="mt-0.5 text-xs text-gray-400">Configure what data to pass into the selected template.</p></div>{showVariableConfig ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}</button>{showVariableConfig ? <div className="mt-4 space-y-3">{templateVariableKeys.map((key) => <div key={key} className="rounded-xl bg-gray-50 p-3"><label className="mb-2 block text-xs font-semibold text-gray-600">{`{{${key}}}`}</label><div className="flex gap-2"><select value={templateVariables[key]?.type || 'static'} onChange={(event) => setTemplateVariables((current) => ({ ...current, [key]: { ...current[key], type: event.target.value } }))} className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><option value="static">Static Value</option><option value="contact_name">Contact Name</option><option value="contact_phone">Contact Phone</option><option value="contact_email">Contact Email</option></select>{templateVariables[key]?.type === 'static' ? <input value={templateVariables[key]?.value || ''} onChange={(event) => setTemplateVariables((current) => ({ ...current, [key]: { ...current[key], value: event.target.value } }))} placeholder="Enter value..." className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" /> : <p className="flex flex-1 items-center px-3 text-xs text-emerald-600">Auto-filled from contact data</p>}</div></div>)}</div> : null}</div> : null}</> : null}

            {sendMode === 'media' ? <div className="rounded-2xl border border-gray-100 bg-white p-5"><label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">Media Gallery</label><div className="mb-4 grid grid-cols-4 gap-2">{MEDIA_OPTIONS.map((option) => <button key={option.key} type="button" onClick={() => { setMediaType(option.key); setSelectedAssets([]); setManualUrlOpen(false); setMediaUrl(''); setManualFilename(''); }} className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${mediaType === option.key ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'}`}><option.icon className="h-5 w-5" /><span className="text-xs font-medium">{option.label}</span></button>)}</div><div onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); queueFilesForLibrary(event.dataTransfer.files); }} className={`rounded-[28px] border-2 border-dashed p-5 transition-all ${dragActive ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-[#f7faf9]'}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm"><FolderOpen className="h-6 w-6" /></div><h3 className="text-lg font-semibold text-gray-900">Choose from gallery</h3><p className="mt-1 text-sm text-gray-500">Upload to your own server library, then reuse those assets anywhere in the portal.</p></div><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => setShowLibrary(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"><FolderOpen className="h-4 w-4" />Open gallery</button><button type="button" onClick={() => setManualUrlOpen((current) => !current)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"><Link2 className="h-4 w-4" />Direct URL</button></div></div></div>{selectedAssets.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{selectedAssets.map((asset) => <div key={asset._id} className="overflow-hidden rounded-[24px] border border-gray-200 bg-white"><div className="relative">{renderAssetPreview(asset)}<button type="button" onClick={() => setSelectedAssets((current) => current.filter((item) => item._id !== asset._id))} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm"><X className="h-4 w-4" /></button></div><div className="p-4"><p className="truncate text-sm font-semibold text-gray-900">{asset.original_name}</p><p className="mt-1 text-xs text-gray-500">{formatFileSize(asset.size_bytes)} • {asset.asset_type}</p></div></div>)}</div> : null}{manualUrlOpen ? <div className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Direct URL Fallback</p><input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="Media URL (https://...)" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm" />{mediaType === 'document' ? <input value={manualFilename} onChange={(event) => setManualFilename(event.target.value)} placeholder="Filename (e.g. report.pdf)" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm" /> : null}</div> : null}{mediaType !== 'audio' ? <input value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} placeholder="Caption (optional)" className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm" /> : null}</div> : null}

            <button type="button" onClick={sendToSelected} disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">{sending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Sending via Meta...</> : <><Send className="h-4 w-4" />Send to Selected Contacts</>}</button>
          </div>
          <div className="space-y-5"><div className="rounded-2xl border border-gray-100 bg-white p-5"><div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold text-gray-900">Selected Contacts</h3></div><div className="max-h-[18rem] space-y-2 overflow-y-auto pr-1">{selectedContacts.map((contact) => <div key={contact._id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"><p className="text-sm font-semibold text-gray-900">{contact.wa_name || contact.name || 'Unnamed'}</p><p className="mt-1 text-xs text-gray-500">+{contact.phone}</p></div>)}</div></div></div>
        </div>
      </PortalModal>

      <MediaLibraryModal open={showLibrary} onClose={() => { setShowLibrary(false); setQueuedFiles([]); }} title="Choose Media" subtitle={`Pick ${mediaType} assets from your server library, or upload new ones without leaving the composer.`} allowedTypes={[mediaType]} allowMultiple queuedFiles={queuedFiles} onQueuedFilesHandled={() => setQueuedFiles([])} onSelect={(assets) => { setSelectedAssets((current) => mergeAssets(current, assets)); setShowLibrary(false); setQueuedFiles([]); toast.success(`${assets.length} asset(s) selected`); }} />
    </div>
  );
}
