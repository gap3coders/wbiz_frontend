import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FileText, Plus, Search, Trash2, Eye, X, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const SS={APPROVED:{bg:'bg-emerald-50',text:'text-emerald-700',icon:CheckCircle2},PENDING:{bg:'bg-amber-50',text:'text-amber-700',icon:Clock},REJECTED:{bg:'bg-red-50',text:'text-red-700',icon:XCircle},PAUSED:{bg:'bg-gray-100',text:'text-gray-600',icon:AlertTriangle}};
const CC={MARKETING:'bg-violet-100 text-violet-700',UTILITY:'bg-blue-100 text-blue-700',AUTHENTICATION:'bg-amber-100 text-amber-700'};

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [preview, setPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({name:'',category:'MARKETING',language:'en',headerText:'',bodyText:'',footerText:''});

  const fetch_ = async () => { setLoading(true); try { const {data}=await api.get('/meta/templates'); setTemplates(data.data.templates||[]); } catch(e) { const err=e.response?.data; toast.error(err?.error_source==='meta'?`Meta Error: ${err.error}`:'Failed to load'); } finally{setLoading(false);} };
  useEffect(()=>{fetch_();},[]);

  const handleCreate = async () => {
    if(!form.name||!form.bodyText){toast.error('Name and body required');return;} setCreating(true);
    try {
      const components=[];
      if(form.headerText) components.push({type:'HEADER',format:'TEXT',text:form.headerText});
      components.push({type:'BODY',text:form.bodyText});
      if(form.footerText) components.push({type:'FOOTER',text:form.footerText});
      await api.post('/meta/templates',{name:form.name.toLowerCase().replace(/[^a-z0-9_]/g,'_'),category:form.category,language:form.language,components});
      toast.success('Submitted to Meta for approval!');
      setShowCreate(false); setForm({name:'',category:'MARKETING',language:'en',headerText:'',bodyText:'',footerText:''}); fetch_();
    } catch(e) { const err=e.response?.data; toast.error(err?.error_source==='meta'?`Meta rejected: ${err.error}`:`Platform error: ${err?.error||'Failed'}`); }
    finally{setCreating(false);}
  };

  const handleDelete = async name => {
    if(!window.confirm(`Delete "${name}" from Meta? Irreversible.`)) return;
    try { await api.delete(`/meta/templates/${name}`); toast.success('Deleted from Meta'); fetch_(); }
    catch(e) { const err=e.response?.data; toast.error(err?.error_source==='meta'?`Meta Error: ${err.error}`:'Delete failed'); }
  };

  const filtered = templates.filter(t => { if(search&&!t.name.toLowerCase().includes(search.toLowerCase())) return false; if(filterStatus!=='all'&&t.status!==filterStatus) return false; return true; });

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div><h1 className="font-display text-2xl font-bold text-gray-900">Meta Templates</h1><p className="text-gray-500 text-sm mt-0.5">Live from Meta WhatsApp Cloud API — create, review status, and manage</p></div>
        <div className="flex gap-2"><button onClick={fetch_} className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"><RefreshCw className="w-4 h-4"/></button><button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-500/20"><Plus className="w-4 h-4"/>Create Template</button></div>
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
            <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-6 py-4"><p className="text-sm font-semibold text-gray-900">{t.name}</p><p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{t.components?.find(c=>c.type==='BODY')?.text?.substring(0,60)||'—'}</p>{t.rejected_reason&&<p className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Meta rejection: {t.rejected_reason}</p>}</td>
              <td className="px-6 py-4"><span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${CC[t.category]||'bg-gray-100 text-gray-600'}`}>{t.category}</span></td>
              <td className="px-6 py-4"><span className="text-sm text-gray-600">{t.language}</span></td>
              <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}><SI className="w-3 h-3"/>{t.status}</span></td>
              <td className="px-6 py-4"><div className="flex items-center justify-end gap-1"><button onClick={()=>setPreview(t)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><Eye className="w-4 h-4"/></button><button onClick={()=>handleDelete(t.name)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4"/></button></div></td></tr>
          )})}</tbody></table></div>}
      </div>

      {showCreate&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-display text-lg font-bold text-gray-900">Submit Template to Meta</h2><button onClick={()=>setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button></div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="order_confirmation" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/><p className="text-[10px] text-gray-400 mt-1">Lowercase, underscores only per Meta rules</p></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"><option value="MARKETING">Marketing</option><option value="UTILITY">Utility</option><option value="AUTHENTICATION">Authentication</option></select></div><div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Language</label><select value={form.language} onChange={e=>setForm({...form,language:e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"><option value="en">English</option><option value="en_US">English (US)</option><option value="hi">Hindi</option><option value="es">Spanish</option><option value="pt_BR">Portuguese</option><option value="ar">Arabic</option></select></div></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Header</label><input value={form.headerText} onChange={e=>setForm({...form,headerText:e.target.value})} placeholder="Order Update" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Body *</label><textarea value={form.bodyText} onChange={e=>setForm({...form,bodyText:e.target.value})} placeholder={"Hello {{1}}, your order {{2}} shipped!"} rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/><p className="text-[10px] text-gray-400 mt-1">Use {"{{1}}"}, {"{{2}}"} for variables</p></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Footer</label><input value={form.footerText} onChange={e=>setForm({...form,footerText:e.target.value})} placeholder="Reply STOP to unsubscribe" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/></div>
          </div>
          <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Preview</label><div className="bg-[#e5ddd5] rounded-2xl p-4 min-h-[280px]"><div className="flex justify-end"><div className="bg-[#d9fdd3] rounded-2xl rounded-tr-md px-3 py-2 max-w-[90%] shadow-sm">{form.headerText&&<p className="text-sm font-bold text-gray-900 mb-1">{form.headerText}</p>}<p className="text-sm text-gray-900">{form.bodyText||'Body appears here...'}</p>{form.footerText&&<p className="text-xs text-gray-500 mt-2">{form.footerText}</p>}</div></div></div></div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100"><button onClick={()=>setShowCreate(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button><button onClick={handleCreate} disabled={creating} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50">{creating?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Plus className="w-4 h-4"/>}Submit to Meta</button></div>
      </div></div>}

      {preview&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setPreview(null)}><div className="bg-white rounded-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-display text-lg font-bold text-gray-900">{preview.name}</h2><button onClick={()=>setPreview(null)} className="p-1 text-gray-400"><X className="w-5 h-5"/></button></div>
        <div className="p-6"><div className="bg-[#e5ddd5] rounded-2xl p-4"><div className="flex justify-end"><div className="bg-[#d9fdd3] rounded-2xl rounded-tr-md px-3 py-2 max-w-[90%] shadow-sm">{preview.components?.map((c,i)=>(<div key={i}>{c.type==='HEADER'&&<p className="text-sm font-bold text-gray-900 mb-1">{c.text||`[${c.format}]`}</p>}{c.type==='BODY'&&<p className="text-sm text-gray-900">{c.text}</p>}{c.type==='FOOTER'&&<p className="text-xs text-gray-500 mt-2">{c.text}</p>}{c.type==='BUTTONS'&&<div className="mt-2 pt-2 border-t border-gray-200/50">{c.buttons?.map((b,j)=><div key={j} className="text-center text-sm text-blue-600 font-medium py-1">{b.text}</div>)}</div>}</div>))}</div></div></div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-400 uppercase">Status</p><p className="text-sm font-semibold">{preview.status}</p></div><div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-400 uppercase">Category</p><p className="text-sm font-semibold">{preview.category}</p></div><div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-400 uppercase">Language</p><p className="text-sm font-semibold">{preview.language}</p></div></div>
          {preview.rejected_reason&&<div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100"><p className="text-xs text-red-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/>Meta Rejection: {preview.rejected_reason}</p></div>}
        </div>
      </div></div>}
    </div>
  );
}
