import { useMemo, useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FileText, Plus, Search, Trash2, Eye, X, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw, Pencil } from 'lucide-react';

const SS={APPROVED:{bg:'bg-emerald-50',text:'text-emerald-700',icon:CheckCircle2},PENDING:{bg:'bg-amber-50',text:'text-amber-700',icon:Clock},REJECTED:{bg:'bg-red-50',text:'text-red-700',icon:XCircle},PAUSED:{bg:'bg-gray-100',text:'text-gray-600',icon:AlertTriangle}};
const CC={MARKETING:'bg-violet-100 text-violet-700',UTILITY:'bg-blue-100 text-blue-700',AUTHENTICATION:'bg-amber-100 text-amber-700'};
const HEADER_TYPES = ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'];
const BUTTON_TYPES = ['QUICK_REPLY', 'URL', 'PHONE'];

const makeInitialForm = () => ({
  name: '',
  category: 'MARKETING',
  language: 'en',
  headerType: 'NONE',
  headerContent: '',
  bodyText: '',
  footerText: '',
  buttons: [],
});

const hasUsefulRejectionReason = (value = '') => {
  const normalized = String(value || '').trim();
  return Boolean(normalized && normalized.toUpperCase() !== 'NONE');
};

const parsePlaceholders = (value = '') => {
  const found = [];
  const re = /\{\{(\d+)\}\}/g;
  let match;
  while ((match = re.exec(String(value || '')))) {
    found.push(Number(match[1]));
  }
  return Array.from(new Set(found)).sort((a, b) => a - b);
};

const validatePlaceholderSyntax = (value = '', label = 'Text') => {
  const tokens = String(value || '').match(/\{\{[^}]+\}\}/g) || [];
  for (const token of tokens) {
    if (!/^\{\{\d+\}\}$/.test(token)) {
      throw new Error(`${label} variables must use numeric placeholders like {{1}}`);
    }
  }
  const indexes = parsePlaceholders(value);
  for (let i = 0; i < indexes.length; i += 1) {
    if (indexes[i] !== i + 1) {
      throw new Error(`${label} placeholders must be sequential: {{1}}, {{2}}, ...`);
    }
  }
};

const isValidUrl = (value = '') => {
  try {
    const parsed = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const buildTemplatePayload = (form) => {
  if (!String(form.name || '').trim()) throw new Error('Template name is required');
  if (!String(form.bodyText || '').trim()) throw new Error('Body is required');

  validatePlaceholderSyntax(form.bodyText, 'Body');
  if (form.headerType === 'TEXT') validatePlaceholderSyntax(form.headerContent, 'Header');

  const components = [];
  if (form.headerType !== 'NONE') {
    if (!String(form.headerContent || '').trim()) throw new Error('Header content is required for selected header type');
    const format = String(form.headerType || 'TEXT').toUpperCase();
    if (format === 'TEXT') {
      components.push({ type: 'HEADER', format, text: String(form.headerContent).trim() });
    } else {
      const mediaHandle = String(form.headerContent || '').trim();
      if (!mediaHandle) throw new Error('Header media handle is required');
      if (/^https?:\/\//i.test(mediaHandle)) {
        throw new Error('For media headers, use Meta media handle (not URL). Upload sample in Meta template manager and paste the returned handle.');
      }
      components.push({
        type: 'HEADER',
        format,
        example: { header_handle: [mediaHandle] },
      });
    }
  }

  components.push({ type: 'BODY', text: String(form.bodyText).trim() });

  if (String(form.footerText || '').trim()) {
    components.push({ type: 'FOOTER', text: String(form.footerText).trim() });
  }

  const activeButtons = (form.buttons || []).filter((button) => String(button?.text || '').trim());
  if (activeButtons.length > 3) throw new Error('Maximum 3 buttons allowed');
  if (activeButtons.length) {
    const buttons = activeButtons.map((button) => {
      const type = String(button.type || 'QUICK_REPLY').toUpperCase();
      const text = String(button.text || '').trim();
      if (!text) throw new Error('Button text is required');
      if (!BUTTON_TYPES.includes(type)) throw new Error(`Unsupported button type: ${type}`);
      if (type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text };
      if (type === 'URL') {
        if (!isValidUrl(button.url)) throw new Error(`Button "${text}" requires a valid URL`);
        return { type: 'URL', text, url: String(button.url).trim() };
      }
      const phone = String(button.phone_number || '').replace(/[^\d+]/g, '');
      if (!phone) throw new Error(`Button "${text}" requires phone number`);
      return { type: 'PHONE_NUMBER', text, phone_number: phone };
    });
    components.push({ type: 'BUTTONS', buttons });
  }

  return {
    name: String(form.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    category: form.category || 'MARKETING',
    language: form.language || 'en',
    components,
  };
};

const parseTemplateToForm = (template) => {
  const components = Array.isArray(template?.components) ? template.components : [];
  const header = components.find((item) => String(item?.type || '').toUpperCase() === 'HEADER');
  const body = components.find((item) => String(item?.type || '').toUpperCase() === 'BODY');
  const footer = components.find((item) => String(item?.type || '').toUpperCase() === 'FOOTER');
  const buttonsComp = components.find((item) => String(item?.type || '').toUpperCase() === 'BUTTONS');
  const headerType = String(header?.format || 'NONE').toUpperCase();
  const parsedButtons = Array.isArray(buttonsComp?.buttons)
    ? buttonsComp.buttons.map((button) => {
        const type = String(button?.type || 'QUICK_REPLY').toUpperCase();
        if (type === 'PHONE_NUMBER') {
          return { type: 'PHONE', text: String(button?.text || ''), url: '', phone_number: String(button?.phone_number || '') };
        }
        return { type, text: String(button?.text || ''), url: String(button?.url || ''), phone_number: '' };
      })
    : [];
  return {
    name: String(template?.name || ''),
    category: String(template?.category || 'MARKETING').toUpperCase(),
    language: String(template?.language || 'en'),
    headerType: HEADER_TYPES.includes(headerType) ? headerType : 'NONE',
    headerContent: headerType === 'TEXT'
      ? String(header?.text || '')
      : String(header?.example?.header_handle?.[0] || ''),
    bodyText: String(body?.text || ''),
    footerText: String(footer?.text || ''),
    buttons: parsedButtons,
  };
};

const extractApiErrorMessage = (error, fallback = 'Failed') => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.error) return String(data.error);
  if (data?.message) return String(data.message);
  if (error?.message) return String(error.message);
  return fallback;
};

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [preview, setPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [resolvingHandle, setResolvingHandle] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editForm, setEditForm] = useState(makeInitialForm());
  const [savingEdit, setSavingEdit] = useState(false);
  const [resolvingEditHandle, setResolvingEditHandle] = useState(false);
  const [form, setForm] = useState(makeInitialForm());

  const fetch_ = async () => { setLoading(true); try { const {data}=await api.get('/meta/templates'); setTemplates(data.data.templates||[]); } catch(e) { const err=e.response?.data; toast.error(err?.error_source==='meta'?`Meta Error: ${err.error}`:'Failed to load'); } finally{setLoading(false);} };
  useEffect(()=>{fetch_();},[]);

  const generatedPayload = useMemo(() => {
    try {
      return JSON.stringify(buildTemplatePayload(form), null, 2);
    } catch {
      return '{}';
    }
  }, [form]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const payload = buildTemplatePayload(form);
      await api.post('/meta/templates', payload);
      toast.success('Submitted to Meta for approval!');
      setShowCreate(false); setForm(makeInitialForm()); fetch_();
    } catch(e) {
      const err=e.response?.data;
      const msg = extractApiErrorMessage(e, 'Failed to submit template');
      toast.error(err?.error_source==='meta'?`Meta rejected: ${msg}`:`Platform error: ${msg}`);
    }
    finally{setCreating(false);}
  };

  const resolveHeaderHandleFromUrl = async () => {
    const headerUrl = String(form.headerContent || '').trim();
    if (!headerUrl) {
      toast.error('Enter media URL first');
      return;
    }
    if (!/^https?:\/\//i.test(headerUrl)) {
      toast.error('Header content already looks like a handle');
      return;
    }
    if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(String(form.headerType || '').toUpperCase())) {
      toast.error('Handle conversion is available only for IMAGE/VIDEO/DOCUMENT header');
      return;
    }
    setResolvingHandle(true);
    try {
      const { data } = await api.post('/meta/templates/media-handle', {
        media_url: headerUrl,
        format: String(form.headerType || '').toUpperCase(),
      });
      const handle = String(data?.data?.handle || '').trim();
      if (!handle) throw new Error('Handle missing');
      setForm((current) => ({ ...current, headerContent: handle }));
      toast.success('Media handle generated from URL');
    } catch (error) {
      const statusCode = Number(error?.response?.status || 0);
      if (statusCode === 404) {
        toast.error('Media handle endpoint is not available on backend. Deploy latest backend and restart service.');
      } else {
        const msg = extractApiErrorMessage(error, 'Failed to generate media handle');
        toast.error(msg);
      }
    } finally {
      setResolvingHandle(false);
    }
  };

  const handleDelete = async name => {
    if(!window.confirm(`Delete "${name}" from Meta? Irreversible.`)) return;
    try { await api.delete(`/meta/templates/${name}`); toast.success('Deleted from Meta'); fetch_(); }
    catch(e) {
      const err=e.response?.data;
      const msg = extractApiErrorMessage(e, 'Delete failed');
      toast.error(err?.error_source==='meta'?`Meta Error: ${msg}`:msg);
    }
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setEditForm(parseTemplateToForm(template));
  };

  const saveEdit = async () => {
    if (!editingTemplate?.id) return;
    setSavingEdit(true);
    try {
      const payload = buildTemplatePayload(editForm);
      await api.post(`/meta/templates/${editingTemplate.id}/edit`, { components: payload.components });
      toast.success('Template edit submitted');
      setEditingTemplate(null);
      fetch_();
    } catch (error) {
      const msg = extractApiErrorMessage(error, 'Failed to edit template');
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const resolveEditHeaderHandleFromUrl = async () => {
    const headerUrl = String(editForm.headerContent || '').trim();
    const headerType = String(editForm.headerType || '').toUpperCase();
    if (!headerUrl) {
      toast.error('Enter media URL first');
      return;
    }
    if (!/^https?:\/\//i.test(headerUrl)) {
      toast.error('Header content already looks like a handle');
      return;
    }
    if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
      toast.error('Handle conversion is available only for IMAGE/VIDEO/DOCUMENT header');
      return;
    }
    setResolvingEditHandle(true);
    try {
      const { data } = await api.post('/meta/templates/media-handle', {
        media_url: headerUrl,
        format: headerType,
      });
      const handle = String(data?.data?.handle || '').trim();
      if (!handle) throw new Error('Handle missing');
      setEditForm((current) => ({ ...current, headerContent: handle }));
      toast.success('Media handle generated from URL');
    } catch (error) {
      const msg = extractApiErrorMessage(error, 'Failed to generate media handle');
      toast.error(msg);
    } finally {
      setResolvingEditHandle(false);
    }
  };

  const filtered = templates.filter(t => { if(search&&!t.name.toLowerCase().includes(search.toLowerCase())) return false; if(filterStatus!=='all'&&t.status!==filterStatus) return false; return true; });

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div><h1 className="font-display text-2xl font-bold text-gray-900">Meta Templates</h1><p className="text-gray-500 text-sm mt-0.5">Live from Meta WhatsApp Cloud API — create, review status, and manage</p></div>
        <div className="flex gap-2"><button onClick={fetch_} className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"><RefreshCw className="w-4 h-4"/></button><button onClick={()=>{setForm(makeInitialForm());setShowCreate(true);}} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-500/20"><Plus className="w-4 h-4"/>Create Template</button></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up" style={{animationDelay:'50ms'}}>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 flex-1"><Search className="w-4 h-4 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="bg-transparent border-none text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full focus:ring-0"/></div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">{['all','APPROVED','PENDING','REJECTED'].map(s=>(<button key={s} onClick={()=>setFilterStatus(s)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${filterStatus===s?'bg-emerald-100 text-emerald-700':'text-gray-500 hover:bg-gray-100'}`}>{s==='all'?'All':s.charAt(0)+s.slice(1).toLowerCase()}</button>))}</div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up" style={{animationDelay:'100ms'}}>
        {loading ? <div className="p-6 space-y-4">{[1,2,3,4].map(i=><div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
        : filtered.length===0 ? <div className="text-center py-16"><FileText className="w-12 h-12 text-gray-200 mx-auto mb-3"/><p className="text-gray-400 font-medium">No templates found on Meta</p></div>
        : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100"><th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th><th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th><th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lang</th><th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Meta Status</th><th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
          <tbody>{filtered.map(t=>{const s=SS[t.status]||SS.PENDING;const SI=s.icon;return(
            <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-6 py-4"><p className="text-sm font-semibold text-gray-900">{t.name}</p><p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{t.components?.find(c=>c.type==='BODY')?.text?.substring(0,60)||'—'}</p>{hasUsefulRejectionReason(t.rejected_reason)&&<p className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Meta rejection: {t.rejected_reason}</p>}</td>
              <td className="px-6 py-4"><span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${CC[t.category]||'bg-gray-100 text-gray-600'}`}>{t.category}</span></td>
              <td className="px-6 py-4"><span className="text-sm text-gray-600">{t.language}</span></td>
              <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}><SI className="w-3 h-3"/>{t.status}</span></td>
              <td className="px-6 py-4"><div className="flex items-center justify-end gap-1"><button onClick={()=>setPreview(t)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><Eye className="w-4 h-4"/></button><button onClick={()=>openEdit(t)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Pencil className="w-4 h-4"/></button><button onClick={()=>handleDelete(t.name)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4"/></button></div></td></tr>
          )})}</tbody></table></div>}
      </div>

      {showCreate&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-display text-lg font-bold text-gray-900">Submit Template to Meta</h2><button onClick={()=>setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button></div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="order_confirmation" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/><p className="text-[10px] text-gray-400 mt-1">Lowercase, underscores only per Meta rules</p></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"><option value="MARKETING">Marketing</option><option value="UTILITY">Utility</option><option value="AUTHENTICATION">Authentication</option></select></div><div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Language</label><select value={form.language} onChange={e=>setForm({...form,language:e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"><option value="en">English</option><option value="en_US">English (US)</option><option value="hi">Hindi</option><option value="es">Spanish</option><option value="pt_BR">Portuguese</option><option value="ar">Arabic</option></select></div></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Header Type</label><select value={form.headerType} onChange={e=>setForm({...form,headerType:e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500">{HEADER_TYPES.map((type)=><option key={type} value={type}>{type}</option>)}</select></div><div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Header Content</label><input value={form.headerContent} onChange={e=>setForm({...form,headerContent:e.target.value})} placeholder={form.headerType==='TEXT'?'Order Update':form.headerType==='NONE'?'Not required':'Meta media handle or URL'} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" disabled={form.headerType==='NONE'}/></div></div>
            {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(String(form.headerType || '').toUpperCase()) ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
                <p className="text-xs text-blue-700">If you have media URL, convert it to Meta media handle first.</p>
                <button onClick={resolveHeaderHandleFromUrl} disabled={resolvingHandle} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                  {resolvingHandle ? 'Converting...' : 'Generate Handle from URL'}
                </button>
              </div>
            ) : null}
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Body *</label><textarea value={form.bodyText} onChange={e=>setForm({...form,bodyText:e.target.value})} placeholder={"Hello {{1}}, your order {{2}} shipped!"} rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/><p className="text-[10px] text-gray-400 mt-1">Use {"{{1}}"}, {"{{2}}"} for variables</p></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Footer</label><input value={form.footerText} onChange={e=>setForm({...form,footerText:e.target.value})} placeholder="Reply STOP to unsubscribe" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Buttons (max 3)</label><div className="space-y-2">{form.buttons.map((button, index)=><div key={`${button.type}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2"><div className="grid grid-cols-3 gap-2"><select value={button.type} onChange={e=>setForm({...form,buttons:form.buttons.map((item,i)=>i===index?{...item,type:e.target.value}:item)})} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs">{BUTTON_TYPES.map((type)=><option key={type} value={type}>{type}</option>)}</select><input value={button.text} onChange={e=>setForm({...form,buttons:form.buttons.map((item,i)=>i===index?{...item,text:e.target.value}:item)})} placeholder="Button text" className="col-span-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"/></div>{button.type==='URL'&&<input value={button.url||''} onChange={e=>setForm({...form,buttons:form.buttons.map((item,i)=>i===index?{...item,url:e.target.value}:item)})} placeholder="https://example.com/path" className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"/>}{button.type==='PHONE'&&<input value={button.phone_number||''} onChange={e=>setForm({...form,buttons:form.buttons.map((item,i)=>i===index?{...item,phone_number:e.target.value}:item)})} placeholder="+919876543210" className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"/>}<button onClick={()=>setForm({...form,buttons:form.buttons.filter((_,i)=>i!==index)})} className="text-xs font-semibold text-red-600">Remove</button></div>)}</div><button onClick={()=>setForm({...form,buttons:[...form.buttons,{type:'QUICK_REPLY',text:'',url:'',phone_number:''}].slice(0,3)})} disabled={form.buttons.length>=3} className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 disabled:opacity-50">Add Button</button></div>
          </div>
          <div className="space-y-4"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Preview</label><div className="bg-[#e5ddd5] rounded-2xl p-4 min-h-[280px]"><div className="flex justify-end"><div className="bg-[#d9fdd3] rounded-2xl rounded-tr-md px-3 py-2 max-w-[90%] shadow-sm">{form.headerType==='TEXT'&&form.headerContent&&<p className="text-sm font-bold text-gray-900 mb-1">{form.headerContent}</p>}{form.headerType!=='NONE'&&form.headerType!=='TEXT'&&<p className="text-xs font-semibold text-gray-700 mb-1">[{form.headerType} HEADER]</p>}<p className="text-sm text-gray-900">{form.bodyText||'Body appears here...'}</p>{form.footerText&&<p className="text-xs text-gray-500 mt-2">{form.footerText}</p>}{form.buttons.length>0&&<div className="mt-2 pt-2 border-t border-gray-200/70">{form.buttons.map((button,idx)=><p key={`${button.type}-${idx}`} className="text-xs text-blue-600">{button.text||`Button ${idx+1}`}</p>)}</div>}</div></div></div><div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Generated JSON</label><textarea value={generatedPayload} readOnly rows={12} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700"/></div></div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100"><button onClick={()=>setShowCreate(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button><button onClick={handleCreate} disabled={creating} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50">{creating?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Plus className="w-4 h-4"/>}Submit to Meta</button></div>
      </div></div>}

      {preview&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setPreview(null)}><div className="bg-white rounded-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-display text-lg font-bold text-gray-900">{preview.name}</h2><button onClick={()=>setPreview(null)} className="p-1 text-gray-400"><X className="w-5 h-5"/></button></div>
        <div className="p-6"><div className="bg-[#e5ddd5] rounded-2xl p-4"><div className="flex justify-end"><div className="bg-[#d9fdd3] rounded-2xl rounded-tr-md px-3 py-2 max-w-[90%] shadow-sm">{preview.components?.map((c,i)=>(<div key={i}>{c.type==='HEADER'&&<p className="text-sm font-bold text-gray-900 mb-1">{c.text||`[${c.format}]`}</p>}{c.type==='BODY'&&<p className="text-sm text-gray-900">{c.text}</p>}{c.type==='FOOTER'&&<p className="text-xs text-gray-500 mt-2">{c.text}</p>}{c.type==='BUTTONS'&&<div className="mt-2 pt-2 border-t border-gray-200/50">{c.buttons?.map((b,j)=><div key={j} className="text-center text-sm text-blue-600 font-medium py-1">{b.text}</div>)}</div>}</div>))}</div></div></div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-400 uppercase">Status</p><p className="text-sm font-semibold">{preview.status}</p></div><div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-400 uppercase">Category</p><p className="text-sm font-semibold">{preview.category}</p></div><div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-400 uppercase">Language</p><p className="text-sm font-semibold">{preview.language}</p></div></div>
          {hasUsefulRejectionReason(preview.rejected_reason)&&<div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100"><p className="text-xs text-red-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/>Meta Rejection: {preview.rejected_reason}</p></div>}
        </div>
      </div></div>}

      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingTemplate(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-display text-lg font-bold text-gray-900">Edit Template: {editingTemplate.name}</h2>
              <button onClick={() => setEditingTemplate(null)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Name</label><input value={editForm.name} disabled className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500" /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Language</label><input value={editForm.language} disabled className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Header Type</label><select value={editForm.headerType} onChange={(e)=>setEditForm({...editForm,headerType:e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm">{HEADER_TYPES.map((type)=><option key={`edit-${type}`} value={type}>{type}</option>)}</select></div><div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Header Content</label><input value={editForm.headerContent} onChange={(e)=>setEditForm({...editForm,headerContent:e.target.value})} placeholder={editForm.headerType==='TEXT'?'Header text':editForm.headerType==='NONE'?'Not required':'Meta media handle or URL'} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm" disabled={editForm.headerType==='NONE'} /></div></div>
              {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(String(editForm.headerType || '').toUpperCase()) ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
                  <p className="text-xs text-blue-700">If you have media URL, convert it to Meta media handle first.</p>
                  <button onClick={resolveEditHeaderHandleFromUrl} disabled={resolvingEditHandle} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                    {resolvingEditHandle ? 'Converting...' : 'Generate Handle from URL'}
                  </button>
                </div>
              ) : null}
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Body *</label><textarea value={editForm.bodyText} onChange={(e)=>setEditForm({...editForm,bodyText:e.target.value})} rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none" /></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Footer</label><input value={editForm.footerText} onChange={(e)=>setEditForm({...editForm,footerText:e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Buttons (max 3)</label><div className="space-y-2">{editForm.buttons.map((button, index)=><div key={`edit-btn-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2"><div className="grid grid-cols-3 gap-2"><select value={button.type} onChange={e=>setEditForm({...editForm,buttons:editForm.buttons.map((item,i)=>i===index?{...item,type:e.target.value}:item)})} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs">{BUTTON_TYPES.map((type)=><option key={`edit-type-${type}`} value={type}>{type}</option>)}</select><input value={button.text} onChange={e=>setEditForm({...editForm,buttons:editForm.buttons.map((item,i)=>i===index?{...item,text:e.target.value}:item)})} placeholder="Button text" className="col-span-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"/></div>{button.type==='URL'&&<input value={button.url||''} onChange={e=>setEditForm({...editForm,buttons:editForm.buttons.map((item,i)=>i===index?{...item,url:e.target.value}:item)})} placeholder="https://example.com/path" className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"/>}{button.type==='PHONE'&&<input value={button.phone_number||''} onChange={e=>setEditForm({...editForm,buttons:editForm.buttons.map((item,i)=>i===index?{...item,phone_number:e.target.value}:item)})} placeholder="+919876543210" className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"/>}<button onClick={()=>setEditForm({...editForm,buttons:editForm.buttons.filter((_,i)=>i!==index)})} className="text-xs font-semibold text-red-600">Remove</button></div>)}</div><button onClick={()=>setEditForm({...editForm,buttons:[...editForm.buttons,{type:'QUICK_REPLY',text:'',url:'',phone_number:''}].slice(0,3)})} disabled={editForm.buttons.length>=3} className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 disabled:opacity-50">Add Button</button></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditingTemplate(null)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
              <button onClick={saveEdit} disabled={savingEdit} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{savingEdit ? 'Saving...' : 'Submit Edit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
