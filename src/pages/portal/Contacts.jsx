import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import ContactImportWizard from '../../ContactImportWizard';
import {
  Users, Plus, Upload, Download, Send, Edit3, Trash2, MessageSquare,
  CheckCircle2, XCircle, HelpCircle, FileText, FolderOpen, Search,
  X, Loader2, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle,
  Phone, Mail, Tag, StickyNote, Hash, Eye, List, Save, UserPlus, UserMinus,
  Info,
} from 'lucide-react';
import { COUNTRY_PHONE_OPTIONS, detectDefaultCountryOption, formatDisplayPhone, parsePhoneInput, splitCombinedPhone } from '../../utils/phone';

import { WA_STATUS_MAP as WA_MAP, DEFAULT_STATUS } from '../../constants/statusMaps';

const WA_FILTER_TABS = [
  { key: '', label: 'All' },
  { key: 'yes', label: 'WhatsApp' },
  { key: 'no', label: 'No WA' },
  { key: 'unknown', label: 'Unknown' },
];

const MAIN_TABS = [
  { key: 'contacts', label: 'All Contacts', icon: Users },
  { key: 'lists', label: 'Contact Lists', icon: List },
];

const LIST_COLORS = ['#25D366', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#6366F1'];

const extractVars = (template) => {
  if (!template) return [];
  const vars = [];
  for (const component of template.components || []) {
    if (!['BODY', 'HEADER'].includes(component.type) || !component.text) continue;
    (component.text.match(/\{\{(\d+)\}\}/g) || []).forEach((match) => {
      const value = component.type === 'HEADER' ? `header_${match.replace(/[{}]/g, '')}` : match.replace(/[{}]/g, '');
      if (!vars.includes(value)) vars.push(value);
    });
  }
  return vars;
};

const getPageNumbers = (current, total) => {
  if (total <= 1) return [1];
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
};

export default function Contacts() {
  const [mainTab, setMainTab] = useState('contacts');
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 30 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [filterWa, setFilterWa] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [allLabels, setAllLabels] = useState([]);
  const [selectedMap, setSelectedMap] = useState({});

  /* Modals */
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState(null);

  /* Form state */
  const [form, setForm] = useState({ country_code: '91', phone_number: '', phone: '', name: '', email: '', labels: '', notes: '', custom_fields: {} });
  const [defaultCountryOption, setDefaultCountryOption] = useState(COUNTRY_PHONE_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formSelectedLists, setFormSelectedLists] = useState({}); // { listId: true }
  const [formOriginalLists, setFormOriginalLists] = useState({}); // track original to compute diff
  const [formListsLoading, setFormListsLoading] = useState(false);
  const [showInlineNewList, setShowInlineNewList] = useState(false);
  const [inlineListName, setInlineListName] = useState('');

  /* Send modal state */
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVariables, setTemplateVariables] = useState({});
  const [showVariableConfig, setShowVariableConfig] = useState(false);
  const [templateHeaderUrl, setTemplateHeaderUrl] = useState('');

  /* ── Contact Lists state ── */
  const [lists, setLists] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [listsSearch, setListsSearch] = useState('');
  const [showListModal, setShowListModal] = useState(false);
  const [listForm, setListForm] = useState({ name: '', description: '', color: '#25D366' });
  const [listEditId, setListEditId] = useState(null);
  const [listSaving, setListSaving] = useState(false);
  const [activeList, setActiveList] = useState(null); // selected list to view/manage contacts
  const [listContacts, setListContacts] = useState([]);
  const [listContactsLoading, setListContactsLoading] = useState(false);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [addToListSearch, setAddToListSearch] = useState('');
  const [addToListResults, setAddToListResults] = useState([]);
  const [addToListLoading, setAddToListLoading] = useState(false);
  const [addToListSelected, setAddToListSelected] = useState({});

  /* Custom field definitions */
  const [customFieldDefs, setCustomFieldDefs] = useState([]);

  const contactsRequestIdRef = useRef(0);

  /* ── Data fetching ── */
  const fetchContacts = useCallback(async (page = 1, silent = false) => {
    const requestId = ++contactsRequestIdRef.current;
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get('/contacts', { params: { search, label: filterLabel, wa_status: filterWa, subscription: filterSub, page, limit: 30 } });
      if (contactsRequestIdRef.current !== requestId) return;
      setContacts(data.data.contacts || []);
      setPagination(data.data.pagination || { page: 1, pages: 1, total: 0, limit: 30 });
      setAllLabels(data.data.labels || []);
      setSelectedMap(cur => {
        const next = { ...cur };
        (data.data.contacts || []).forEach(c => { if (next[c._id]) next[c._id] = c; });
        return next;
      });
    } catch {
      if (contactsRequestIdRef.current === requestId) toast.error('Failed to load contacts');
    } finally {
      if (contactsRequestIdRef.current === requestId) { setLoading(false); setRefreshing(false); }
    }
  }, [search, filterLabel, filterWa, filterSub]);

  useEffect(() => { if (mainTab === 'contacts') fetchContacts(1); }, [fetchContacts, mainTab]);

  /* Fetch custom field definitions */
  useEffect(() => {
    api.get('/custom-fields').then(r => setCustomFieldDefs((r.data?.data?.fields || []).filter(f => f.is_active))).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    detectDefaultCountryOption().then(opt => {
      if (!mounted || !opt) return;
      setDefaultCountryOption(opt);
      setForm(c => c.country_code ? c : { ...c, country_code: opt.dialCode });
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!showSendModal || templates.length) return;
    setLoadingTemplates(true);
    api.get('/meta/templates')
      .then(r => setTemplates(r.data?.data?.templates || []))
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoadingTemplates(false));
  }, [showSendModal, templates.length]);

  /* ── Contact Lists fetching ── */
  const fetchLists = useCallback(async () => {
    setListsLoading(true);
    try {
      const params = { limit: 50 };
      if (listsSearch) params.search = listsSearch;
      const { data } = await api.get('/contact-lists', { params });
      const d = data?.data || data;
      setLists(d.lists || []);
    } catch {
      toast.error('Failed to load contact lists');
    } finally {
      setListsLoading(false);
    }
  }, [listsSearch]);

  useEffect(() => { if (mainTab === 'lists') fetchLists(); }, [fetchLists, mainTab]);

  const fetchListContacts = useCallback(async (listId) => {
    setListContactsLoading(true);
    try {
      const { data } = await api.get(`/contact-lists/${listId}`, { params: { limit: 100 } });
      const d = data?.data || data;
      setListContacts(d.contacts || []);
    } catch {
      toast.error('Failed to load list contacts');
    } finally {
      setListContactsLoading(false);
    }
  }, []);

  useEffect(() => { if (activeList) fetchListContacts(activeList._id); }, [activeList, fetchListContacts]);

  /* ── Fetch contacts for add-to-list (all by default, searchable) ── */
  const fetchContactsForList = useCallback(async (q = '') => {
    setAddToListLoading(true);
    try {
      const params = { limit: 50 };
      if (q.trim()) params.search = q;
      const { data } = await api.get('/contacts', { params });
      setAddToListResults(data.data.contacts || []);
    } catch {
      toast.error('Search failed');
    } finally {
      setAddToListLoading(false);
    }
  }, []);

  // Load all contacts when modal opens, then search as user types
  useEffect(() => {
    if (!showAddToListModal) return;
    const timer = setTimeout(() => fetchContactsForList(addToListSearch), 300);
    return () => clearTimeout(timer);
  }, [addToListSearch, showAddToListModal, fetchContactsForList]);

  /* ── Derived state ── */
  const selectedContacts = useMemo(() => Object.values(selectedMap), [selectedMap]);
  const selectedCount = selectedContacts.length;
  const allPageSelected = contacts.length > 0 && contacts.every(c => selectedMap[c._id]);
  const approvedTemplates = useMemo(() => templates.filter(t => t.status === 'APPROVED'), [templates]);
  const templateVariableKeys = Object.keys(templateVariables);
  const selectedTemplateHeaderFormat = useMemo(() => {
    const header = selectedTemplate?.components?.find(c => c.type === 'HEADER');
    const fmt = String(header?.format || '').toUpperCase();
    return ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(fmt) ? fmt : '';
  }, [selectedTemplate]);

  const waYesCount = contacts.filter(c => c.wa_exists === 'yes').length;
  const optInCount = contacts.filter(c => c.opt_in !== false).length;
  const pageNumbers = getPageNumbers(pagination.page, pagination.pages);

  /* ── KPIs ── */
  const kpis = [
    { label: 'Total Contacts', value: pagination.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: 'all contacts' },
    { label: 'WhatsApp Active', value: waYesCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', sub: 'on WhatsApp' },
    { label: 'Opted In', value: optInCount, icon: Send, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', sub: 'can receive' },
    { label: 'Contact Lists', value: lists.length, icon: List, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', sub: 'groups created' },
  ];

  /* ── Handlers ── */
  const resetComposer = () => { setSelectedTemplate(null); setTemplateVariables({}); setShowVariableConfig(false); setTemplateHeaderUrl(''); };

  const fetchListsForForm = async (contactId = null) => {
    setFormListsLoading(true);
    try {
      // Fetch all lists
      if (!lists.length) {
        const { data } = await api.get('/contact-lists', { params: { limit: 50 } });
        const d = data?.data || data;
        setLists(d.lists || []);
      }
      // If editing, fetch which lists this contact belongs to
      if (contactId) {
        const { data } = await api.get(`/contacts/${contactId}/lists`);
        const memberLists = data?.data?.lists || [];
        const map = {};
        memberLists.forEach(l => { map[l._id] = true; });
        setFormSelectedLists(map);
        setFormOriginalLists(map);
      } else {
        setFormSelectedLists({});
        setFormOriginalLists({});
      }
    } catch { /* silent */ }
    finally { setFormListsLoading(false); }
  };

  const openAddModal = () => {
    setEditId(null);
    const defaultCustom = {};
    customFieldDefs.forEach(f => { if (f.default_value != null) defaultCustom[f.field_name] = f.default_value; });
    setForm({ country_code: defaultCountryOption?.dialCode || '91', phone_number: '', phone: '', name: '', email: '', labels: '', notes: '', custom_fields: defaultCustom });
    setFormSelectedLists({});
    setFormOriginalLists({});
    setShowInlineNewList(false);
    setInlineListName('');
    setShowAddModal(true);
    fetchListsForForm();
  };

  const openEditModal = (contact) => {
    const split = splitCombinedPhone(contact.phone || '', defaultCountryOption?.dialCode || '91');
    setEditId(contact._id);
    setForm({ country_code: contact.country_code || split.country_code || defaultCountryOption?.dialCode || '91', phone_number: contact.phone_number || split.phone_number || '', phone: contact.phone, name: contact.name || '', email: contact.email || '', labels: (contact.labels || []).join(', '), notes: contact.notes || '', custom_fields: contact.custom_fields || {} });
    setShowInlineNewList(false);
    setInlineListName('');
    setShowAddModal(true);
    fetchListsForForm(contact._id);
  };

  const openSendModalForContacts = (contactsToOpen) => {
    const arr = Array.isArray(contactsToOpen) ? contactsToOpen : [contactsToOpen];
    setSelectedMap(cur => { const next = { ...cur }; arr.forEach(c => { if (c?._id) next[c._id] = c; }); return next; });
    resetComposer();
    setShowSendModal(true);
  };

  const saveContact = async () => {
    const parsed = parsePhoneInput({ phone: form.phone, country_code: form.country_code, phone_number: form.phone_number, default_country_code: defaultCountryOption?.dialCode || '91' });
    if (!parsed.ok) { toast.error(parsed.error); return; }
    if (!form.name.trim() && !editId) { toast.error('Contact name is recommended'); }
    setSaving(true);
    try {
      const payload = { phone: parsed.phone, country_code: parsed.country_code, phone_number: parsed.phone_number, name: form.name, email: form.email, labels: form.labels ? form.labels.split(',').map(l => l.trim()).filter(Boolean) : [], notes: form.notes, custom_fields: form.custom_fields || {} };
      let contactId = editId;
      if (editId) {
        await api.put(`/contacts/${editId}`, payload);
      } else {
        const res = await api.post('/contacts', payload);
        contactId = res.data?.data?._id || res.data?.data?.contact?._id;
      }

      // Sync list memberships
      if (contactId) {
        const toAdd = Object.keys(formSelectedLists).filter(id => !formOriginalLists[id]);
        const toRemove = Object.keys(formOriginalLists).filter(id => !formSelectedLists[id]);
        const syncPromises = [];
        for (const listId of toAdd) {
          syncPromises.push(api.post(`/contact-lists/${listId}/contacts`, { contact_ids: [contactId] }).catch(() => {}));
        }
        for (const listId of toRemove) {
          syncPromises.push(api.delete(`/contact-lists/${listId}/contacts`, { data: { contact_ids: [contactId] } }).catch(() => {}));
        }
        if (syncPromises.length) await Promise.all(syncPromises);
      }

      toast.success(editId ? 'Contact updated' : 'Contact added');
      setShowAddModal(false);
      fetchContacts(pagination.page);
      // Refresh lists if memberships changed
      if (Object.keys(formSelectedLists).length || Object.keys(formOriginalLists).length) {
        fetchLists();
      }
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleInlineCreateList = async () => {
    if (!inlineListName.trim()) return;
    try {
      const res = await api.post('/contact-lists', { name: inlineListName.trim(), color: '#25D366' });
      const newList = res.data?.data || res.data;
      setLists(cur => [...cur, newList]);
      setFormSelectedLists(cur => ({ ...cur, [newList._id]: true }));
      setInlineListName('');
      setShowInlineNewList(false);
      toast.success('List created');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create list');
    }
  };

  const deleteContact = (id) => { setDeleteConfirmData({ id, isBulk: false }); setShowDeleteConfirm(true); };
  const deleteSelected = () => { setDeleteConfirmData({ ids: selectedContacts.map(c => c._id), isBulk: true }); setShowDeleteConfirm(true); };

  const confirmDelete = async () => {
    try {
      if (deleteConfirmData.isBulk) {
        const { data } = await api.post('/contacts/bulk-delete', { contact_ids: deleteConfirmData.ids });
        toast.success(`Deleted ${data.data.deleted_count || 0} contacts`);
        setSelectedMap({});
      } else {
        await api.delete(`/contacts/${deleteConfirmData.id}`);
        toast.success('Contact deleted');
        setSelectedMap(cur => { const next = { ...cur }; delete next[deleteConfirmData.id]; return next; });
      }
      fetchContacts(pagination.page);
    } catch { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(false); setDeleteConfirmData(null); }
  };

  const toggleSelect = (contact) => setSelectedMap(cur => { const next = { ...cur }; if (next[contact._id]) delete next[contact._id]; else next[contact._id] = contact; return next; });
  const toggleSelectPage = () => setSelectedMap(cur => { const next = { ...cur }; if (allPageSelected) contacts.forEach(c => delete next[c._id]); else contacts.forEach(c => { next[c._id] = c; }); return next; });

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl); setTemplateHeaderUrl('');
    const vars = extractVars(tpl);
    const map = {}; vars.forEach(k => { map[k] = { type: 'static', value: '' }; });
    setTemplateVariables(map); setShowVariableConfig(vars.length > 0);
  };

  const buildTemplateComponents = (contact) => {
    if (!selectedTemplate || !templateVariableKeys.length) return [];
    const resolve = (key) => {
      const v = templateVariables[key];
      if (v?.type === 'contact_name') return contact?.name || contact?.wa_name || 'Customer';
      if (v?.type === 'contact_phone') return contact?.phone || '';
      if (v?.type === 'contact_email') return contact?.email || 'N/A';
      return v?.value || `{{${key.replace('header_', '')}}}`;
    };
    const headerP = templateVariableKeys.filter(k => k.startsWith('header_')).sort((a, b) => Number(a.replace('header_', '')) - Number(b.replace('header_', ''))).map(k => ({ type: 'text', text: resolve(k) }));
    const bodyP = templateVariableKeys.filter(k => !k.startsWith('header_')).sort((a, b) => Number(a) - Number(b)).map(k => ({ type: 'text', text: resolve(k) }));
    const comps = [];
    if (headerP.length) comps.push({ type: 'header', parameters: headerP });
    if (bodyP.length) comps.push({ type: 'body', parameters: bodyP });
    return comps;
  };

  const sendToSelected = async () => {
    if (!selectedContacts.length) { toast.error('Select at least one contact'); return; }
    if (!selectedTemplate) { toast.error('Select a template'); return; }
    if (selectedTemplateHeaderFormat && !templateHeaderUrl.trim()) { toast.error(`Template requires ${selectedTemplateHeaderFormat} header URL`); return; }
    setSending(true);
    try {
      let ok = 0; const fails = [];
      for (const c of selectedContacts) {
        const phone = String(c.phone || '').replace(/[^0-9]/g, '');
        if (!phone) { fails.push('Invalid phone'); continue; }
        try {
          await api.post('/meta/messages/send-template', { to: phone, template_name: selectedTemplate.name, language: selectedTemplate.language, components: buildTemplateComponents(c), header_type: selectedTemplateHeaderFormat ? selectedTemplateHeaderFormat.toLowerCase() : undefined, header_media_url: selectedTemplateHeaderFormat ? templateHeaderUrl.trim() : undefined });
          ok++;
        } catch (e) { fails.push(e?.response?.data?.error || 'Failed'); }
      }
      if (!ok) { toast.error(fails[0] || 'Send failed'); return; }
      toast.success(fails.length ? `${ok} sent, ${fails.length} failed` : `${ok} message(s) sent`);
      setShowSendModal(false); resetComposer();
    } finally { setSending(false); }
  };

  /* ── Contact Lists handlers ── */
  const openListCreate = () => { setListForm({ name: '', description: '', color: '#25D366' }); setListEditId(null); setShowListModal(true); };
  const openListEdit = (list) => { setListForm({ name: list.name, description: list.description || '', color: list.color || '#25D366' }); setListEditId(list._id); setShowListModal(true); };

  const handleListSave = async () => {
    if (!listForm.name.trim()) return toast.error('Name is required');
    setListSaving(true);
    try {
      if (listEditId) {
        await api.put(`/contact-lists/${listEditId}`, listForm);
        toast.success('List updated');
      } else {
        await api.post('/contact-lists', listForm);
        toast.success('List created');
      }
      setShowListModal(false);
      fetchLists();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setListSaving(false);
    }
  };

  const handleListDelete = async (id) => {
    if (!window.confirm('Delete this contact list?')) return;
    try {
      await api.delete(`/contact-lists/${id}`);
      toast.success('Deleted');
      if (activeList?._id === id) setActiveList(null);
      fetchLists();
    } catch { toast.error('Failed to delete'); }
  };

  const handleAddContactsToList = async () => {
    const ids = Object.keys(addToListSelected);
    if (!ids.length) return toast.error('Select contacts to add');
    try {
      await api.post(`/contact-lists/${activeList._id}/contacts`, { contact_ids: ids });
      toast.success(`${ids.length} contact(s) added to list`);
      setShowAddToListModal(false);
      setAddToListSearch('');
      setAddToListSelected({});
      setAddToListResults([]);
      fetchListContacts(activeList._id);
      fetchLists();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add contacts');
    }
  };

  const handleRemoveFromList = async (contactId) => {
    try {
      await api.delete(`/contact-lists/${activeList._id}/contacts`, { data: { contact_ids: [contactId] } });
      toast.success('Removed from list');
      fetchListContacts(activeList._id);
      fetchLists();
    } catch { toast.error('Failed to remove'); }
  };

  /* ── Add selected contacts (from table checkboxes) to a list ── */
  const [showBulkAddToList, setShowBulkAddToList] = useState(false);
  const [bulkAddListId, setBulkAddListId] = useState('');
  const [bulkAdding, setBulkAdding] = useState(false);

  const handleBulkAddToList = async () => {
    if (!bulkAddListId) return toast.error('Select a list');
    setBulkAdding(true);
    try {
      await api.post(`/contact-lists/${bulkAddListId}/contacts`, { contact_ids: selectedContacts.map(c => c._id) });
      toast.success(`${selectedContacts.length} contact(s) added to list`);
      setShowBulkAddToList(false);
      setBulkAddListId('');
      fetchLists();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setBulkAdding(false);
    }
  };

  /* Skeleton */
  const Skel = ({ h = 'h-24' }) => <div className={`bg-white rounded-xl border border-surface-200 ${h} animate-pulse`} />;

  return (
    <>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Contacts</h1>
            <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {pagination.total} contacts across {allLabels.length} groups
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (mainTab === 'contacts') fetchContacts(pagination.page, true); else fetchLists(); }} disabled={refreshing} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {mainTab === 'contacts' && (
              <>
                <a href={`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/contacts/export/csv`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">
                  <Download className="w-3.5 h-3.5" /> Export
                </a>
                <button onClick={() => setShowImportModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">
                  <Upload className="w-3.5 h-3.5" /> Import
                </button>
                <button onClick={openAddModal} className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Contact
                </button>
              </>
            )}
            {mainTab === 'lists' && !activeList && (
              <button onClick={openListCreate} className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" /> New List
              </button>
            )}
          </div>
        </div>

        {/* ── Main Tabs (Contacts / Lists) ── */}
        <div className="flex items-center bg-surface-100 rounded-lg p-0.5 w-fit animate-fade-in-up">
          {MAIN_TABS.map(tab => (
            <button key={tab.key} onClick={() => { setMainTab(tab.key); setActiveList(null); }}
              className={`inline-flex items-center gap-1.5 px-4 py-[7px] rounded-md text-[12px] font-semibold transition-all ${
                mainTab === tab.key ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
              }`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════ CONTACTS TAB ════════════ */}
        {mainTab === 'contacts' && (
          <>
            {/* ── KPI Strip ── */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skel key={i} />)}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((k, idx) => (
                  <div key={k.label} className={`bg-white rounded-xl border ${k.border} p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up`} style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center`}><k.icon className={`w-[18px] h-[18px] ${k.color}`} /></div>
                    </div>
                    <p className="text-[22px] font-extrabold text-surface-900 tracking-tight leading-none">{k.value}</p>
                    <p className="text-[11px] text-surface-400 mt-1.5 font-medium">{k.label}</p>
                    <p className="text-[10px] text-surface-300 mt-0.5">{k.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Filter Row ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
                {WA_FILTER_TABS.map(tab => (
                  <button key={tab.key} onClick={() => setFilterWa(tab.key)} className={`px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all ${filterWa === tab.key ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>{tab.label}</button>
                ))}
              </div>
              <div className="flex-1" />
              <select value={filterSub} onChange={e => setFilterSub(e.target.value)} className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-[12px] font-medium text-surface-700 focus:ring-2 focus:ring-brand-500/20 focus:outline-none">
                <option value="">All Subscription</option>
                <option value="subscribed">Subscribed</option>
                <option value="unsubscribed">Unsubscribed</option>
              </select>
              {allLabels.length > 0 && (
                <select value={filterLabel} onChange={e => setFilterLabel(e.target.value)} className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-[12px] font-medium text-surface-700 focus:ring-2 focus:ring-brand-500/20 focus:outline-none">
                  <option value="">All Groups</option>
                  {allLabels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              )}
              <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
                <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none" />
              </div>
            </div>

            {/* ── Bulk Actions ── */}
            {selectedCount > 0 && (
              <div className="bg-brand-50 rounded-xl border border-brand-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center"><CheckCircle2 className="w-[18px] h-[18px] text-white" /></div>
                  <div>
                    <p className="text-[13px] font-bold text-surface-900">{selectedCount} contact(s) selected</p>
                    <p className="text-[11px] text-surface-500">Selection persists across pages</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openSendModalForContacts(selectedContacts)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"><Send className="w-3.5 h-3.5" /> Send Message</button>
                  <button onClick={() => { fetchLists(); setShowBulkAddToList(true); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-200 bg-white text-[12px] font-semibold text-brand-700 hover:bg-brand-50 transition-all"><List className="w-3.5 h-3.5" /> Add to List</button>
                  <button onClick={deleteSelected} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-white text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                  <button onClick={() => setSelectedMap({})} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">Clear</button>
                </div>
              </div>
            )}

            {/* ── Contacts Table ── */}
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '160ms' }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
                <div className="flex items-center gap-3">
                  <h3 className="text-[14px] font-bold text-surface-900">Contacts</h3>
                  <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{pagination.total}</span>
                </div>
              </div>

              {loading ? (
                <div className="p-5 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-surface-50 rounded-lg animate-pulse" />)}</div>
              ) : contacts.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                  <p className="text-[13px] text-surface-500 font-medium">No contacts found</p>
                  <p className="text-[11px] text-surface-400 mt-1">Add contacts manually or import from a file</p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button onClick={openAddModal} className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" /> Add Contact</button>
                    <button onClick={() => setShowImportModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all"><Upload className="w-3.5 h-3.5" /> Import</button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-100 bg-surface-50/60">
                        <th className="px-5 py-2.5 text-left w-12">
                          <button onClick={toggleSelectPage} className="flex items-center justify-center w-[18px] h-[18px]">
                            {allPageSelected ? <CheckCircle2 className="w-[18px] h-[18px] text-brand-600" /> : <div className="w-[18px] h-[18px] border-2 border-surface-300 rounded hover:border-brand-500 transition-colors" />}
                          </button>
                        </th>
                        <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Contact</th>
                        <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Phone</th>
                        <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                        <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Groups</th>
                        {customFieldDefs.slice(0, 3).map(f => (
                          <th key={f._id} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">{f.field_label}</th>
                        ))}
                        <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {contacts.map(contact => {
                        const wa = WA_MAP[contact.wa_exists || 'unknown'] || WA_MAP.unknown;
                        return (
                          <tr key={contact._id} className="hover:bg-surface-50/60 transition-colors">
                            <td className="px-5 py-3">
                              <button onClick={() => toggleSelect(contact)} className="flex items-center justify-center w-[18px] h-[18px]">
                                {selectedMap[contact._id] ? <CheckCircle2 className="w-[18px] h-[18px] text-brand-600" /> : <div className="w-[18px] h-[18px] border-2 border-surface-300 rounded hover:border-brand-500 transition-colors" />}
                              </button>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                                  {(contact.wa_name || contact.name || 'C')[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-[13px] font-semibold text-surface-900">{contact.wa_name || contact.name || 'Unnamed'}</p>
                                    {contact.opt_in === false && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-600 border border-red-200">Unsubscribed</span>
                                    )}
                                  </div>
                                  {contact.email && <p className="text-[11px] text-surface-400">{contact.email}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-[13px] text-surface-700 font-medium">{formatDisplayPhone(contact.phone, contact.country_code)}</p>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${wa.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${wa.dot}`} />
                                {wa.label}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1 flex-wrap">
                                {(contact.labels || []).slice(0, 2).map(l => (
                                  <span key={l} className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">{l}</span>
                                ))}
                                {(contact.labels || []).length > 2 && <span className="text-[9px] text-surface-400">+{contact.labels.length - 2}</span>}
                              </div>
                            </td>
                            {customFieldDefs.slice(0, 3).map(f => {
                              const v = contact.custom_fields?.[f.field_name];
                              const display = v == null || v === '' ? '\u2014' : Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
                              return <td key={f._id} className="px-5 py-3 text-[12px] text-surface-600">{display}</td>;
                            })}
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openSendModalForContacts(contact)} className="p-1.5 hover:bg-brand-50 text-brand-600 rounded-lg transition-colors" title="Send message"><MessageSquare className="w-3.5 h-3.5" /></button>
                                <button onClick={() => openEditModal(contact)} className="p-1.5 hover:bg-surface-100 text-surface-600 rounded-lg transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteContact(contact._id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!loading && pagination.pages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
                  <p className="text-[11px] text-surface-400">Page {pagination.page} of {pagination.pages} — {pagination.total} total</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => fetchContacts(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    {pageNumbers.map((num, idx) => {
                      const prev = pageNumbers[idx - 1];
                      return (
                        <span key={num} className="flex items-center">
                          {prev && num - prev > 1 && <span className="text-[11px] text-surface-400 px-1">...</span>}
                          <button onClick={() => fetchContacts(num)} className={`w-8 h-8 rounded-lg text-[11px] font-semibold transition-all ${num === pagination.page ? 'bg-brand-600 text-white' : 'border border-surface-200 bg-white text-surface-600 hover:bg-surface-50'}`}>{num}</button>
                        </span>
                      );
                    })}
                    <button onClick={() => fetchContacts(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════ CONTACT LISTS TAB ════════════ */}
        {mainTab === 'lists' && !activeList && (
          <>
            {/* How it works guide */}
            <div className="bg-gradient-to-r from-brand-50 to-emerald-50 rounded-xl border border-brand-100 p-4 animate-fade-in-up">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <Info className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-surface-900 mb-1">How Contact Lists Work</p>
                  <p className="text-[12px] text-surface-600 leading-relaxed">
                    Contact Lists let you group your existing contacts for targeted campaigns. Create a list, then click on it to add or remove contacts.
                    You can also select contacts from the "All Contacts" tab and use the "Add to List" button to quickly group them.
                    Lists are used in Campaigns to target specific audiences.
                  </p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 w-full sm:w-72 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all animate-fade-in-up">
              <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
              <input value={listsSearch} onChange={e => setListsSearch(e.target.value)} placeholder="Search lists..." className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none" />
            </div>

            {/* Lists grid */}
            {listsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => <Skel key={i} h="h-32" />)}
              </div>
            ) : lists.length === 0 ? (
              <div className="bg-white rounded-xl border border-surface-200 py-16 text-center animate-fade-in-up">
                <List className="w-8 h-8 text-surface-300 mx-auto mb-3" />
                <p className="text-[13px] text-surface-500 font-medium">No contact lists yet</p>
                <p className="text-[11px] text-surface-400 mt-1">Create a list to group contacts for campaigns</p>
                <button onClick={openListCreate} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" /> New List
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
                {lists.map((list, idx) => (
                  <div key={list._id}
                    onClick={() => setActiveList(list)}
                    className="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                    style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${list.color || '#25D366'}15` }}>
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: list.color || '#25D366' }} />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openListEdit(list); }} className="p-1.5 rounded-lg text-surface-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleListDelete(list._id); }} className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <p className="text-[14px] font-bold text-surface-900">{list.name}</p>
                    {list.description && <p className="text-[11px] text-surface-400 mt-0.5 line-clamp-2">{list.description}</p>}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-surface-500 bg-surface-100 px-2 py-0.5 rounded-full">
                        <Users className="w-3 h-3" /> {list.contact_count || 0} contacts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════════ ACTIVE LIST DETAIL VIEW ════════════ */}
        {mainTab === 'lists' && activeList && (
          <>
            {/* Back + header */}
            <div className="flex items-center gap-3 animate-fade-in-up">
              <button onClick={() => setActiveList(null)} className="p-2 rounded-lg border border-surface-200 bg-white hover:bg-surface-50 transition-colors">
                <ChevronLeft className="w-4 h-4 text-surface-600" />
              </button>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${activeList.color || '#25D366'}15` }}>
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: activeList.color || '#25D366' }} />
              </div>
              <div className="flex-1">
                <h2 className="text-[16px] font-bold text-surface-900">{activeList.name}</h2>
                {activeList.description && <p className="text-[11px] text-surface-400">{activeList.description}</p>}
              </div>
              <button onClick={() => { setAddToListSearch(''); setAddToListSelected({}); setAddToListResults([]); setShowAddToListModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Add Contacts
              </button>
            </div>

            {/* List contacts table */}
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '80ms' }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
                <div className="flex items-center gap-3">
                  <h3 className="text-[14px] font-bold text-surface-900">Contacts in this list</h3>
                  <span className="text-[11px] font-bold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">{listContacts.length}</span>
                </div>
              </div>

              {listContactsLoading ? (
                <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-surface-50 rounded-lg animate-pulse" />)}</div>
              ) : listContacts.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                  <p className="text-[13px] text-surface-500 font-medium">No contacts in this list yet</p>
                  <p className="text-[11px] text-surface-400 mt-1">Click "Add Contacts" to search and add your existing contacts</p>
                  <button onClick={() => { setAddToListSearch(''); setAddToListSelected({}); setAddToListResults([]); setShowAddToListModal(true); }}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
                    <UserPlus className="w-3.5 h-3.5" /> Add Contacts
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-100 bg-surface-50/60">
                        <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Contact</th>
                        <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Phone</th>
                        <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                        <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-surface-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {listContacts.map(contact => {
                        const wa = WA_MAP[contact.wa_exists || 'unknown'] || WA_MAP.unknown;
                        return (
                          <tr key={contact._id} className="hover:bg-surface-50/60 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                                  {(contact.wa_name || contact.name || 'C')[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-[13px] font-semibold text-surface-900">{contact.wa_name || contact.name || 'Unnamed'}</p>
                                    {contact.opt_in === false && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-600 border border-red-200">Unsubscribed</span>
                                    )}
                                  </div>
                                  {contact.email && <p className="text-[11px] text-surface-400">{contact.email}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-[13px] text-surface-700 font-medium">{formatDisplayPhone(contact.phone, contact.country_code)}</p>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${wa.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${wa.dot}`} />
                                {wa.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button onClick={() => handleRemoveFromList(contact._id)}
                                className="inline-flex items-center gap-1 p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors text-[11px] font-semibold"
                                title="Remove from list">
                                <UserMinus className="w-3.5 h-3.5" /> Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ════════════ MODALS ════════════ */}

      {/* ── Add/Edit Contact Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditId(null); }} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-surface-200 shadow-2xl animate-fade-in-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center"><Users className="w-[18px] h-[18px] text-brand-600" /></div>
                <div>
                  <h2 className="text-[16px] font-bold text-surface-900">{editId ? 'Edit Contact' : 'Add Contact'}</h2>
                  <p className="text-[11px] text-surface-400">{editId ? 'Update contact details' : 'Add a new contact to your list'}</p>
                </div>
              </div>
              <button onClick={() => { setShowAddModal(false); setEditId(null); }} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"><X className="w-4 h-4 text-surface-400" /></button>
            </div>
            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-[110px,1fr] gap-2">
                  <select value={form.country_code} onChange={e => { const code = e.target.value; setForm({ ...form, country_code: code, phone: `${code}${form.phone_number}` }); }} className="rounded-lg border border-surface-200 bg-surface-50 px-2 py-2.5 text-[12px] font-medium text-surface-700 focus:ring-2 focus:ring-brand-500/20 focus:outline-none">
                    {COUNTRY_PHONE_OPTIONS.map(o => <option key={`${o.iso2}-${o.dialCode}`} value={o.dialCode}>+{o.dialCode} {o.iso2}</option>)}
                  </select>
                  <input value={form.phone_number} onChange={e => { const v = e.target.value.replace(/[^\d]/g, ''); setForm({ ...form, phone_number: v, phone: `${form.country_code}${v}` }); }} placeholder="9876543210" className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" type="email" className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Tags (comma-separated)</label>
                <input value={form.labels} onChange={e => setForm({ ...form, labels: e.target.value })} placeholder="Premium, VIP" className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all" />
              </div>
              {/* ── Contact Lists picker ── */}
              <div>
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><List className="w-3 h-3" /> Contact Lists</label>
                {formListsLoading ? (
                  <div className="flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 animate-spin text-brand-500" /><span className="text-[11px] text-surface-400">Loading lists...</span></div>
                ) : lists.length === 0 && !showInlineNewList ? (
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-surface-400">No lists yet.</p>
                    <button type="button" onClick={() => setShowInlineNewList(true)} className="text-[11px] font-semibold text-brand-600 hover:text-brand-700">Create one</button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {lists.map(list => {
                        const isChecked = !!formSelectedLists[list._id];
                        return (
                          <button key={list._id} type="button"
                            onClick={() => setFormSelectedLists(cur => {
                              const next = { ...cur };
                              if (next[list._id]) delete next[list._id];
                              else next[list._id] = true;
                              return next;
                            })}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                              isChecked
                                ? 'border-brand-300 bg-brand-50 text-brand-700'
                                : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                            }`}>
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: list.color || '#25D366' }} />
                            {list.name}
                            {isChecked && <CheckCircle2 className="w-3 h-3 text-brand-600" />}
                          </button>
                        );
                      })}
                      {!showInlineNewList && (
                        <button type="button" onClick={() => setShowInlineNewList(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-dashed border-surface-300 text-surface-500 hover:border-brand-400 hover:text-brand-600 transition-all">
                          <Plus className="w-3 h-3" /> New List
                        </button>
                      )}
                    </div>
                    {showInlineNewList && (
                      <div className="flex items-center gap-2 mt-1">
                        <input value={inlineListName} onChange={e => setInlineListName(e.target.value)} placeholder="New list name..."
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineCreateList(); } }}
                          className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-2.5 py-1.5 text-[12px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" autoFocus />
                        <button type="button" onClick={handleInlineCreateList} className="px-2.5 py-1.5 bg-brand-600 text-white text-[11px] font-semibold rounded-lg hover:bg-brand-700 transition-colors">Create</button>
                        <button type="button" onClick={() => { setShowInlineNewList(false); setInlineListName(''); }} className="p-1.5 text-surface-400 hover:text-surface-600"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                    <p className="text-[10px] text-surface-400">Click to assign this contact to lists. Used for targeted campaigns.</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={3} className="w-full resize-none rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all" />
              </div>

              {/* ── Custom Fields ── */}
              {customFieldDefs.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-surface-100">
                  <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3" /> Custom Fields</p>
                  {customFieldDefs.map(field => {
                    const val = form.custom_fields?.[field.field_name] ?? '';
                    const onChange = (v) => setForm(f => ({ ...f, custom_fields: { ...f.custom_fields, [field.field_name]: v } }));
                    const inputCls = "w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all";
                    return (
                      <div key={field._id}>
                        <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 block">
                          {field.field_label}{field.is_required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {['text', 'email', 'url', 'phone'].includes(field.field_type) && (
                          <input type="text" value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} required={field.is_required} className={inputCls} />
                        )}
                        {field.field_type === 'number' && (
                          <input type="number" value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} required={field.is_required} className={inputCls} />
                        )}
                        {field.field_type === 'date' && (
                          <input type="date" value={val} onChange={e => onChange(e.target.value)} required={field.is_required} className={inputCls} />
                        )}
                        {field.field_type === 'textarea' && (
                          <textarea value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} required={field.is_required} rows={2} className={`${inputCls} resize-none`} />
                        )}
                        {field.field_type === 'boolean' && (
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={!!val} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500/20" />
                            <span className="text-[12px] text-surface-600">{val ? 'Yes' : 'No'}</span>
                          </label>
                        )}
                        {field.field_type === 'select' && (
                          <select value={val} onChange={e => onChange(e.target.value)} required={field.is_required} className={inputCls}>
                            <option value="">{field.placeholder || 'Select...'}</option>
                            {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        )}
                        {field.field_type === 'multi_select' && (
                          <div className="flex flex-wrap gap-2">
                            {(field.options || []).map(opt => {
                              const arr = Array.isArray(val) ? val : [];
                              const checked = arr.includes(opt);
                              return (
                                <label key={opt} className="inline-flex items-center gap-1.5 cursor-pointer">
                                  <input type="checkbox" checked={checked} onChange={() => {
                                    const next = checked ? arr.filter(v => v !== opt) : [...arr, opt];
                                    onChange(next);
                                  }} className="w-3.5 h-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500/20" />
                                  <span className="text-[12px] text-surface-600">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-100 bg-surface-50/50">
              <button onClick={() => { setShowAddModal(false); setEditId(null); }} className="px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">Cancel</button>
              <button onClick={saveContact} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {saving ? 'Saving...' : editId ? 'Update Contact' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-8 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative w-full max-w-5xl bg-white rounded-2xl border border-surface-200 shadow-2xl animate-fade-in-up overflow-hidden mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center"><Upload className="w-[18px] h-[18px] text-violet-600" /></div>
                <div>
                  <h2 className="text-[16px] font-bold text-surface-900">Import Contacts</h2>
                  <p className="text-[11px] text-surface-400">Upload CSV or XLSX file to bulk import contacts</p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"><X className="w-4 h-4 text-surface-400" /></button>
            </div>
            <div className="p-6">
              <ContactImportWizard onComplete={() => { setShowImportModal(false); fetchContacts(1); }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Send Message Modal ── */}
      {showSendModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowSendModal(false); resetComposer(); }} />
          <div className="relative w-full max-w-xl bg-white rounded-2xl border border-surface-200 shadow-2xl animate-fade-in-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Send className="w-[18px] h-[18px] text-blue-600" /></div>
                <div>
                  <h2 className="text-[16px] font-bold text-surface-900">Send Template Message</h2>
                  <p className="text-[11px] text-surface-400">Send to {selectedContacts.length} contact(s)</p>
                </div>
              </div>
              <button onClick={() => { setShowSendModal(false); resetComposer(); }} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"><X className="w-4 h-4 text-surface-400" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Template selection */}
              <div>
                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 block">Select Template</label>
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
                ) : approvedTemplates.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                    <p className="text-[13px] text-surface-500 font-medium">No approved templates</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {approvedTemplates.map(tpl => {
                      const isSelected = selectedTemplate?.id === tpl.id;
                      return (
                        <button key={tpl.id} onClick={() => handleSelectTemplate(tpl)} className={`w-full rounded-lg px-3 py-2.5 text-left transition-all border ${isSelected ? 'border-brand-400 bg-brand-50/60 ring-1 ring-brand-200' : 'border-surface-100 bg-surface-50/50 hover:border-surface-200'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-500'}`}>
                              {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-bold text-surface-900">{tpl.name}</p>
                              <p className="text-[10px] text-surface-400">{tpl.category} · {tpl.language}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Variables */}
              {selectedTemplate && templateVariableKeys.length > 0 && showVariableConfig && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Variables</label>
                  {templateVariableKeys.map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md min-w-[42px] text-center flex-shrink-0">{`{{${key}}}`}</span>
                      <select value={templateVariables[key]?.type || 'static'} onChange={e => setTemplateVariables(c => ({ ...c, [key]: { ...c[key], type: e.target.value } }))} className="rounded-lg border border-surface-200 bg-white px-2 py-1.5 text-[11px] font-medium text-surface-700 focus:ring-2 focus:ring-brand-500/20 focus:outline-none flex-shrink-0">
                        <option value="static">Custom</option>
                        <option value="contact_name">Contact Name</option>
                        <option value="contact_phone">Contact Phone</option>
                        <option value="contact_email">Contact Email</option>
                      </select>
                      {templateVariables[key]?.type === 'static' ? (
                        <input value={templateVariables[key]?.value || ''} onChange={e => setTemplateVariables(c => ({ ...c, [key]: { ...c[key], value: e.target.value } }))} placeholder="Enter value..." className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-2.5 py-1.5 text-[12px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
                      ) : <span className="flex-1 text-[11px] text-brand-600 font-semibold px-2">Auto-filled</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Header media */}
              {selectedTemplate && selectedTemplateHeaderFormat && (
                <div>
                  <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 block">{selectedTemplateHeaderFormat} Header URL <span className="text-red-500">*</span></label>
                  <input value={templateHeaderUrl} onChange={e => setTemplateHeaderUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[12px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-100 bg-surface-50/50">
              <button onClick={() => { setShowSendModal(false); resetComposer(); }} className="px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">Cancel</button>
              <button onClick={sendToSelected} disabled={sending} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending...' : `Send to ${selectedContacts.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmData(null); }} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl border border-surface-200 shadow-2xl animate-fade-in-up overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-[16px] font-bold text-surface-900">Delete Contact{deleteConfirmData?.isBulk ? 's' : ''}</h2>
              <p className="text-[13px] text-surface-500 mt-2">
                {deleteConfirmData?.isBulk
                  ? `Are you sure you want to delete ${deleteConfirmData.ids?.length} contact(s)? This cannot be undone.`
                  : 'Are you sure you want to delete this contact? This cannot be undone.'}
              </p>
            </div>
            <div className="flex items-center gap-2 px-6 py-4 border-t border-surface-100 bg-surface-50/50">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmData(null); }} className="flex-1 px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit List Modal ── */}
      {showListModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowListModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-surface-200 shadow-2xl animate-fade-in-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h3 className="text-[15px] font-bold text-surface-900">{listEditId ? 'Edit List' : 'New Contact List'}</h3>
              <button onClick={() => setShowListModal(false)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"><X className="w-4 h-4 text-surface-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Name *</label>
                <input type="text" value={listForm.name} onChange={e => setListForm({ ...listForm, name: e.target.value })} placeholder="e.g. VIP Customers" maxLength={120}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Description</label>
                <textarea value={listForm.description} onChange={e => setListForm({ ...listForm, description: e.target.value })} placeholder="Optional description..." rows={3} maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Color</label>
                <div className="flex items-center gap-2">
                  {LIST_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setListForm({ ...listForm, color: c })}
                      className={`w-7 h-7 rounded-lg transition-all ${listForm.color === c ? 'ring-2 ring-offset-2 ring-surface-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-100 bg-surface-50/50">
              <button onClick={() => setShowListModal(false)} className="px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">Cancel</button>
              <button onClick={handleListSave} disabled={listSaving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors">
                {listSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {listEditId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Contacts to List Modal ── */}
      {showAddToListModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddToListModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-surface-200 shadow-2xl animate-fade-in-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center"><UserPlus className="w-[18px] h-[18px] text-brand-600" /></div>
                <div>
                  <h2 className="text-[16px] font-bold text-surface-900">Add Contacts to "{activeList?.name}"</h2>
                  <p className="text-[11px] text-surface-400">Search your existing contacts and select them to add</p>
                </div>
              </div>
              <button onClick={() => setShowAddToListModal(false)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"><X className="w-4 h-4 text-surface-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
                <Search className="w-4 h-4 text-surface-400 flex-shrink-0" />
                <input value={addToListSearch} onChange={e => setAddToListSearch(e.target.value)} placeholder="Search by name or phone..." autoFocus
                  className="flex-1 border-0 bg-transparent text-[13px] text-surface-900 placeholder-surface-400 focus:outline-none" />
                {addToListLoading && <Loader2 className="w-4 h-4 animate-spin text-brand-500" />}
              </div>

              {Object.keys(addToListSelected).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-surface-500">Selected:</span>
                  {Object.values(addToListSelected).map(c => (
                    <span key={c._id} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                      {c.name || c.phone}
                      <button onClick={() => setAddToListSelected(cur => { const next = { ...cur }; delete next[c._id]; return next; })}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}

              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {addToListResults.length === 0 && !addToListLoading && (
                  <p className="text-[12px] text-surface-400 text-center py-4">No contacts found</p>
                )}
                {addToListLoading && addToListResults.length === 0 && (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
                )}
                {addToListResults.map(contact => {
                  const isSelected = !!addToListSelected[contact._id];
                  const alreadyInList = listContacts.some(c => c._id === contact._id);
                  return (
                    <button key={contact._id} disabled={alreadyInList}
                      onClick={() => {
                        setAddToListSelected(cur => {
                          const next = { ...cur };
                          if (next[contact._id]) delete next[contact._id];
                          else next[contact._id] = contact;
                          return next;
                        });
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        alreadyInList ? 'opacity-50 cursor-not-allowed bg-surface-50' :
                        isSelected ? 'bg-brand-50 border border-brand-200' : 'hover:bg-surface-50 border border-transparent'
                      }`}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                        {(contact.name || 'C')[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-surface-900 truncate">{contact.name || 'Unnamed'}</p>
                        <p className="text-[11px] text-surface-400">{formatDisplayPhone(contact.phone, contact.country_code)}</p>
                      </div>
                      {alreadyInList && <span className="text-[10px] font-semibold text-surface-400">Already in list</span>}
                      {isSelected && !alreadyInList && <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-100 bg-surface-50/50">
              <button onClick={() => setShowAddToListModal(false)} className="px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">Cancel</button>
              <button onClick={handleAddContactsToList} disabled={Object.keys(addToListSelected).length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors">
                <UserPlus className="w-4 h-4" /> Add {Object.keys(addToListSelected).length || ''} Contact{Object.keys(addToListSelected).length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Add to List Modal ── */}
      {showBulkAddToList && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBulkAddToList(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl border border-surface-200 shadow-2xl animate-fade-in-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h3 className="text-[15px] font-bold text-surface-900">Add to Contact List</h3>
              <button onClick={() => setShowBulkAddToList(false)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"><X className="w-4 h-4 text-surface-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[12px] text-surface-600">Add {selectedCount} selected contact(s) to a list:</p>
              {lists.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-[12px] text-surface-400">No lists yet. Create one first.</p>
                  <button onClick={() => { setShowBulkAddToList(false); setMainTab('lists'); openListCreate(); }}
                    className="mt-2 text-[12px] font-semibold text-brand-600 hover:text-brand-700">Create a list</button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {lists.map(list => (
                    <button key={list._id} onClick={() => setBulkAddListId(list._id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all border ${
                        bulkAddListId === list._id ? 'border-brand-400 bg-brand-50/60' : 'border-surface-100 hover:border-surface-200'
                      }`}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${list.color || '#25D366'}15` }}>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: list.color || '#25D366' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-surface-900 truncate">{list.name}</p>
                        <p className="text-[10px] text-surface-400">{list.contact_count || 0} contacts</p>
                      </div>
                      {bulkAddListId === list._id && <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-100 bg-surface-50/50">
              <button onClick={() => setShowBulkAddToList(false)} className="px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">Cancel</button>
              <button onClick={handleBulkAddToList} disabled={!bulkAddListId || bulkAdding}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors">
                {bulkAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <List className="w-4 h-4" />}
                Add to List
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
