import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Megaphone, Plus, Play, Trash2, CheckCircle2, Clock, XCircle, X, FileText, ArrowRight, RefreshCw, Send, Pause, Calendar, Tag, Users, AlertTriangle, Eye, ChevronDown, ChevronUp } from 'lucide-react';

const SC={draft:{color:'bg-gray-100 text-gray-600',icon:FileText},scheduled:{color:'bg-blue-50 text-blue-700',icon:Clock},running:{color:'bg-amber-50 text-amber-700',icon:Play},paused:{color:'bg-orange-50 text-orange-700',icon:Pause},completed:{color:'bg-emerald-50 text-emerald-700',icon:CheckCircle2},failed:{color:'bg-red-50 text-red-700',icon:XCircle}};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [allLabels, setAllLabels] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({name:'',template_name:'',template_language:'en',target_type:'selected',target_tags:[],recipients:[],scheduled_at:'',variable_mapping:{},template_components:[],header_media_url:''});

  const fetch_ = async () => { setLoading(true); try { const {data}=await api.get('/campaigns'); setCampaigns(data.data.campaigns||[]); } catch(e){toast.error('Failed');} finally{setLoading(false);} };
  useEffect(()=>{fetch_();},[]);

  const openWiz = async () => {
    setShowCreate(true); setStep(1); setForm({name:'',template_name:'',template_language:'en',target_type:'selected',target_tags:[],recipients:[],scheduled_at:'',variable_mapping:{},template_components:[],header_media_url:''});
    try {
      const [t,c] = await Promise.all([api.get('/meta/templates'), api.get('/contacts',{params:{limit:500}})]);
      setTemplates((t.data.data.templates||[]).filter(t=>t.status==='APPROVED'));
      setContacts(c.data.data.contacts||[]);
      setAllLabels(c.data.data.labels||[]);
    } catch(e){toast.error('Failed to load data');}
  };

  const fetchDetail = async (id) => {
    try { const {data}=await api.get(`/campaigns/${id}`); setDetailData(data.data); setShowDetail(id); } catch(e){toast.error('Failed');}
  };

  // Extract template variables
  const extractVars = (tplName) => {
    const tpl = templates.find(t=>t.name===tplName);
    if (!tpl) return [];
    const vars = [];
    for (const comp of (tpl.components||[])) {
      const slot = String(comp.type || '').toUpperCase();
      if (!['BODY', 'HEADER'].includes(slot) || !comp.text) continue;
      (comp.text.match(/\{\{(\d+)\}\}/g)||[]).forEach((match) => {
        const n = match.replace(/[{}]/g,'');
        const token = { key: `${slot.toLowerCase()}_${n}`, slot: slot.toLowerCase(), index: n };
        if (!vars.some((item) => item.key === token.key)) vars.push(token);
      });
    }
    return vars;
  };

  const selectedTemplate = templates.find((item) => item.name === form.template_name) || null;
  const headerMediaFormat = (() => {
    const header = (selectedTemplate?.components || []).find((component) => String(component.type || '').toUpperCase() === 'HEADER');
    const format = String(header?.format || '').toUpperCase();
    if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) return '';
    return format.toLowerCase();
  })();

  const variableConfigFor = (tokenKey) => {
    const current = form.variable_mapping?.[tokenKey];
    if (!current) return { source: 'custom', value: '' };
    if (typeof current === 'string') return { source: current === 'static' ? 'custom' : current, value: '' };
    return { source: current.source || 'custom', value: current.value || '' };
  };

  const setVariableConfig = (tokenKey, nextPatch) => {
    setForm((prev) => {
      const current = prev.variable_mapping?.[tokenKey];
      const normalized = typeof current === 'string'
        ? { source: current === 'static' ? 'custom' : current, value: '' }
        : { source: 'custom', value: '', ...(current || {}) };
      return {
        ...prev,
        variable_mapping: {
          ...(prev.variable_mapping || {}),
          [tokenKey]: { ...normalized, ...nextPatch },
        },
      };
    });
  };

  const handleCreate = async () => {
    if(!form.name||!form.template_name){toast.error('Name & template required');return;}
    if(form.target_type==='selected'&&form.recipients.length===0){toast.error('Select recipients');return;}
    if(form.target_type==='tags'&&form.target_tags.length===0){toast.error('Select tags');return;}
    const requiredVars = extractVars(form.template_name);
    for (const token of requiredVars) {
      const config = variableConfigFor(token.key);
      if (config.source === 'custom' && !String(config.value || '').trim()) {
        toast.error(`Add value for ${token.slot.toUpperCase()} variable {{${token.index}}}`);
        return;
      }
    }
    if (headerMediaFormat && !String(form.header_media_url || '').trim()) {
      toast.error(`Template requires ${headerMediaFormat.toUpperCase()} header media URL`);
      return;
    }
    setCreating(true);
    try {
      const payload = {
        ...form,
        template_components: headerMediaFormat && form.header_media_url?.trim()
          ? [{
              type: 'header',
              parameters: [
                {
                  type: headerMediaFormat,
                  [headerMediaFormat]: { link: form.header_media_url.trim() },
                },
              ],
            }]
          : [],
      };
      const { data } = await api.post('/campaigns',payload);
      if (data?.data?.launch === 'started') toast.success('Campaign published and started now.');
      else toast.success('Campaign scheduled successfully.');
      setShowCreate(false);
      fetch_();
    }
    catch(e){const err=e.response?.data; toast.error(err?.error_source==='meta'?`Meta Error: ${err.error}`:`Platform: ${err?.error||'Failed'}`);} finally{setCreating(false);}
  };

  const launch = async id => {
    if(!window.confirm('Launch? Messages sent via Meta API immediately.')) return;
    try { await api.post(`/campaigns/${id}/launch`); toast.success('Launched!'); fetch_(); } catch(e){toast.error('Failed');}
  };

  const del = async id => { if(!window.confirm('Delete?')) return; try { await api.delete(`/campaigns/${id}`); toast.success('Deleted'); if(showDetail===id) setShowDetail(null); fetch_(); } catch(e){toast.error('Failed');} };
  const toggle = p => setForm(f=>({...f,recipients:f.recipients.includes(p)?f.recipients.filter(x=>x!==p):[...f.recipients,p]}));
  const toggleTag = t => setForm(f=>({...f,target_tags:f.target_tags.includes(t)?f.target_tags.filter(x=>x!==t):[...f.target_tags,t]}));
  const selectAll = () => setForm(f=>({...f,recipients:contacts.filter(c=>c.opt_in!==false).map(c=>c.phone)}));
  const filteredContacts = form.target_type==='tags' ? contacts.filter(c=>c.opt_in!==false && c.labels?.some(l=>form.target_tags.includes(l))) : contacts.filter(c=>c.opt_in!==false);

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div><h1 className="font-display text-2xl font-bold text-gray-900">Campaigns</h1><p className="text-gray-500 text-sm mt-0.5">Bulk sends via Meta API using approved templates with scheduling & targeting</p></div>
        <div className="flex gap-2"><button onClick={fetch_} className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"><RefreshCw className="w-4 h-4"/></button><button onClick={openWiz} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-500/20"><Plus className="w-4 h-4"/>New Campaign</button></div>
      </div>

      {loading ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[1,2,3].map(i=><div key={i} className="h-60 bg-white rounded-2xl animate-pulse"/>)}</div>
      : campaigns.length===0 ? <div className="text-center py-20 bg-white rounded-2xl border border-gray-100"><Megaphone className="w-16 h-16 text-gray-200 mx-auto mb-4"/><p className="text-gray-400 font-semibold text-lg mb-1">No campaigns</p><button onClick={openWiz} className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600"><Plus className="w-4 h-4"/>Create Campaign</button></div>
      : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{campaigns.map(c=>{const cfg=SC[c.status]||SC.draft;const SI=cfg.icon;const total=c.stats?.total||0;const sent=c.stats?.sent||0;const pct=total>0?Math.round((sent/total)*100):0;return(
        <div key={c._id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all animate-fade-in-up">
          <div className="flex items-start justify-between mb-3"><div><h3 className="text-sm font-bold text-gray-900 mb-1">{c.name}</h3><span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${cfg.color}`}><SI className="w-3 h-3"/>{c.status}</span></div>
            <div className="flex gap-1">{['draft','scheduled','paused'].includes(c.status)&&<button onClick={()=>launch(c._id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Launch"><Play className="w-4 h-4"/></button>}<button onClick={()=>fetchDetail(c._id)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="Details"><Eye className="w-4 h-4"/></button>{['draft','completed','failed'].includes(c.status)&&<button onClick={()=>del(c._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>}</div>
          </div>
          <div className="text-xs text-gray-400 mb-1">Template: <span className="font-medium text-gray-600">{c.template_name}</span></div>
          {c.target_type==='tags'&&<div className="text-xs text-gray-400 mb-1">Tags: {(c.target_tags||[]).map(t=><span key={t} className="inline-block px-1.5 py-0.5 bg-violet-50 text-violet-700 text-[9px] font-bold rounded mr-1">{t}</span>)}</div>}
          {c.scheduled_at&&<div className="text-xs text-gray-400 mb-2 flex items-center gap-1"><Calendar className="w-3 h-3"/>Scheduled: {new Date(c.scheduled_at).toLocaleString()}</div>}
          <div className="mb-3"><div className="flex items-center justify-between text-xs text-gray-500 mb-1.5"><span>Delivery</span><span className="font-semibold">{pct}%</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${pct}%`}}/></div></div>
          <div className="grid grid-cols-4 gap-2 text-center"><div className="bg-gray-50 rounded-lg py-2"><p className="text-xs text-gray-400">Total</p><p className="text-sm font-bold text-gray-900">{total}</p></div><div className="bg-gray-50 rounded-lg py-2"><p className="text-xs text-gray-400">Sent</p><p className="text-sm font-bold text-emerald-600">{sent}</p></div><div className="bg-gray-50 rounded-lg py-2"><p className="text-xs text-gray-400">Read</p><p className="text-sm font-bold text-blue-600">{c.stats?.read||0}</p></div><div className="bg-gray-50 rounded-lg py-2"><p className="text-xs text-gray-400">Failed</p><p className="text-sm font-bold text-red-500">{c.stats?.failed||0}</p></div></div>
          <p className="text-[10px] text-gray-400 mt-3">Created {new Date(c.created_at).toLocaleDateString()}</p>
        </div>
      )})}</div>}

      {/* Detail Modal */}
      {showDetail && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-display text-lg font-bold text-gray-900">{detailData.campaign?.name} — Report</h2><button onClick={()=>setShowDetail(null)} className="p-1 text-gray-400"><X className="w-5 h-5"/></button></div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-4 gap-3 text-center">{[['Total',detailData.live_stats?.sent+detailData.live_stats?.failed+detailData.live_stats?.delivered+detailData.live_stats?.read||detailData.campaign?.stats?.total||0,'text-gray-900'],['Sent',detailData.live_stats?.sent||0,'text-emerald-600'],['Read',detailData.live_stats?.read||0,'text-blue-600'],['Failed',detailData.live_stats?.failed||0,'text-red-500']].map(([l,v,c])=><div key={l} className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400">{l}</p><p className={`text-lg font-bold ${c}`}>{v}</p></div>)}</div>
            {detailData.errors?.length>0&&(
              <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Failed Deliveries ({detailData.errors.length})</p>
                <div className="max-h-48 overflow-y-auto space-y-1.5">{detailData.errors.map((e,i)=>(
                  <div key={i} className={`p-3 rounded-xl text-xs ${e.error_source==='meta'?'bg-red-50 border border-red-100':'bg-orange-50 border border-orange-100'}`}>
                    <div className="flex items-center gap-2 mb-0.5"><span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${e.error_source==='meta'?'bg-red-200 text-red-800':'bg-orange-200 text-orange-800'}`}>{e.error_source||'platform'}</span><span className="font-semibold text-gray-800">+{e.contact_phone}</span></div>
                    <p className="text-gray-600">{e.error_message}</p>
                  </div>
                ))}</div>
              </div>
            )}
          </div>
        </div></div>
      )}

      {/* Create Wizard */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-display text-lg font-bold text-gray-900">New Campaign — Step {step}/4</h2><button onClick={()=>setShowCreate(false)} className="p-1 text-gray-400"><X className="w-5 h-5"/></button></div>
          <div className="flex gap-1 px-6 pt-4">{[1,2,3,4].map(s=><div key={s} className={`h-1.5 flex-1 rounded-full ${s<=step?'bg-emerald-500':'bg-gray-200'}`}/>)}</div>
          <div className="p-6">
            {step===1&&<div className="space-y-4">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Campaign Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="March Promo" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Schedule (Optional)</label><input type="datetime-local" value={form.scheduled_at} onChange={e=>setForm({...form,scheduled_at:e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/><p className="text-[10px] text-gray-400 mt-1">Leave empty to start instantly after publish</p></div>
            </div>}

            {step===2&&<div className="space-y-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Select Meta-Approved Template</label>
              {templates.length===0?<p className="text-sm text-gray-400 text-center py-8">No approved templates</p>
              :<div className="space-y-2 max-h-60 overflow-y-auto">{templates.map(t=>{const vars=extractVars(t.name);return(
                <button key={t.id} onClick={()=>{setForm({...form,template_name:t.name,template_language:t.language,variable_mapping:{},template_components:[],header_media_url:''});}} className={`w-full text-left p-3 rounded-xl border-2 transition-all ${form.template_name===t.name?'border-emerald-300 bg-emerald-50':'border-gray-100 bg-gray-50 hover:border-gray-200'}`}><p className="text-sm font-semibold text-gray-900">{t.name}</p><p className="text-xs text-gray-500">{t.category} • {t.language}{vars.length>0?` • ${vars.length} var(s)`:''}</p></button>
              )})}</div>}
              {headerMediaFormat ? (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Header Media ({headerMediaFormat.toUpperCase()})</p>
                  <input
                    value={form.header_media_url || ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, header_media_url: event.target.value }))}
                    placeholder={`Public ${headerMediaFormat} URL`}
                    className="w-full text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              ) : null}
              {form.template_name && extractVars(form.template_name).length>0 && (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-2">Template Variables</p>
                  {extractVars(form.template_name).map((token)=>(
                    <div key={token.key} className="grid grid-cols-[auto,1fr] gap-2 mb-2 items-center">
                      <span className="text-xs font-mono bg-amber-100 text-amber-800 px-2 py-1 rounded">{`${token.slot.toUpperCase()} {{${token.index}}}`}</span>
                      <div className="space-y-2">
                        <select value={variableConfigFor(token.key).source} onChange={e=>setVariableConfig(token.key,{source:e.target.value})} className="w-full text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-emerald-500">
                          <option value="custom">Custom input</option><option value="contact_name">Contact Name</option><option value="contact_phone">Contact Phone</option><option value="contact_email">Contact Email</option>
                      </select>
                        {variableConfigFor(token.key).source === 'custom' ? (
                          <input
                            value={variableConfigFor(token.key).value}
                            onChange={(e) => setVariableConfig(token.key, { value: e.target.value })}
                            placeholder={`Value for ${token.slot.toUpperCase()} {{${token.index}}}`}
                            className="w-full text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-emerald-500"
                          />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>}

            {step===3&&<div className="space-y-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Target Audience</label>
              <div className="flex gap-2">{[{k:'all',l:'All Contacts',icon:Users},{k:'tags',l:'By Tags',icon:Tag},{k:'selected',l:'Select Manually',icon:CheckCircle2}].map(o=>(
                <button key={o.k} onClick={()=>setForm({...form,target_type:o.k,recipients:[],target_tags:[]})} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium flex-1 border-2 transition-all ${form.target_type===o.k?'border-emerald-300 bg-emerald-50 text-emerald-700':'border-gray-100 text-gray-600 hover:border-gray-200'}`}><o.icon className="w-4 h-4"/>{o.l}</button>
              ))}</div>
              {form.target_type==='all'&&<div className="p-3 bg-blue-50 rounded-xl"><p className="text-xs text-blue-700">All {contacts.filter(c=>c.opt_in!==false).length} opted-in contacts will receive this campaign.</p></div>}
              {form.target_type==='tags'&&<div><p className="text-xs text-gray-400 mb-2">Select tags:</p><div className="flex flex-wrap gap-1.5">{allLabels.map(l=>(
                <button key={l} onClick={()=>toggleTag(l)} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${form.target_tags.includes(l)?'bg-emerald-500 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{l}</button>
              ))}</div>{form.target_tags.length>0&&<p className="text-xs text-emerald-600 mt-2">{filteredContacts.length} contacts match these tags</p>}</div>}
              {form.target_type==='selected'&&<div><div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-400">{form.recipients.length} selected</span><button onClick={selectAll} className="text-xs text-emerald-600 font-medium hover:underline">Select All</button></div>
                <div className="space-y-1 max-h-52 overflow-y-auto">{contacts.filter(c=>c.opt_in!==false).map(c=>(
                  <button key={c._id} onClick={()=>toggle(c.phone)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${form.recipients.includes(c.phone)?'bg-emerald-50 border border-emerald-200':'hover:bg-gray-50 border border-transparent'}`}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${form.recipients.includes(c.phone)?'bg-emerald-500':'border-2 border-gray-300'}`}>{form.recipients.includes(c.phone)&&<svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}</div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-medium text-gray-700">{c.name||c.phone}</p></div>
                    {c.wa_exists==='yes'&&<span className="text-[9px] font-bold text-emerald-600">WA✓</span>}
                    {c.wa_exists==='no'&&<span className="text-[9px] font-bold text-red-500">No WA</span>}
                    {c.labels?.map(l=><span key={l} className="px-1.5 py-0.5 text-[9px] bg-gray-100 text-gray-500 rounded">{l}</span>)}
                  </button>
                ))}</div>
              </div>}
            </div>}

            {step===4&&<div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Review Campaign</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium text-gray-900">{form.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Template</span><span className="font-medium text-gray-900">{form.template_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Targeting</span><span className="font-medium text-gray-900 capitalize">{form.target_type}{form.target_type==='tags'?`: ${form.target_tags.join(', ')}`:''}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Recipients</span><span className="font-medium text-gray-900">{form.target_type==='all'?contacts.filter(c=>c.opt_in!==false).length:form.target_type==='tags'?filteredContacts.length:form.recipients.length}</span></div>
                {form.scheduled_at&&<div className="flex justify-between"><span className="text-gray-500">Schedule</span><span className="font-medium text-gray-900">{new Date(form.scheduled_at).toLocaleString()}</span></div>}
              </div>
            </div>}
          </div>
          <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-100">
            {step>1?<button onClick={()=>setStep(step-1)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Back</button>:<div/>}
            {step<4?<button onClick={()=>setStep(step+1)} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600">Next<ArrowRight className="w-4 h-4"/></button>
            :<button onClick={handleCreate} disabled={creating} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50">{creating?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Send className="w-4 h-4"/>}Publish Campaign</button>}
          </div>
        </div></div>
      )}
    </div>
  );
}
