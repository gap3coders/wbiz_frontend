import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Send, CheckCheck, Eye, MessageSquare, Users, Megaphone, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

export default function Analytics() {
  const [ov, setOv] = useState(null);
  const [vol, setVol] = useState([]);
  const [types, setTypes] = useState([]);
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => { setLoading(true); Promise.allSettled([api.get('/analytics/overview').then(r=>setOv(r.data.data)),api.get('/analytics/volume',{params:{days}}).then(r=>setVol(r.data.data.volume||[])),api.get('/analytics/message-types').then(r=>setTypes(r.data.data.breakdown||[])),api.get('/analytics/campaigns').then(r=>setCamps(r.data.data.campaigns||[]))]).finally(()=>setLoading(false)); }, [days]);

  const metrics = ov ? [{label:'Sent Today',value:ov.sent_today,icon:Send,color:'from-emerald-500 to-teal-600'},{label:'Delivery Rate',value:`${ov.delivery_rate}%`,icon:CheckCheck,color:'from-blue-500 to-indigo-600'},{label:'Read Rate',value:`${ov.read_rate}%`,icon:Eye,color:'from-violet-500 to-purple-600'},{label:'Open Chats',value:ov.open_conversations,icon:MessageSquare,color:'from-amber-500 to-orange-600'},{label:'Contacts (WA ✓)',value:`${ov.wa_verified}/${ov.total_contacts}`,icon:Users,color:'from-cyan-500 to-sky-600'},{label:'Active Campaigns',value:ov.active_campaigns,icon:Megaphone,color:'from-rose-500 to-pink-600'}] : [];
  const maxVol = Math.max(...vol.map(v=>v.inbound+v.outbound),1);
  const TC={text:'bg-emerald-500',template:'bg-blue-500',image:'bg-violet-500',document:'bg-amber-500',audio:'bg-cyan-500',video:'bg-pink-500',unknown:'bg-gray-400',location:'bg-orange-500',reaction:'bg-rose-400',sticker:'bg-indigo-400'};
  const totalT = types.reduce((a,m)=>a+m.count,0)||1;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in-up"><div><h1 className="font-display text-2xl font-bold text-gray-900">Analytics</h1><p className="text-gray-500 text-sm mt-0.5">Message stats from local DB + Meta webhook delivery data</p></div><div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1">{[7,14,30].map(d=>(<button key={d} onClick={()=>setDays(d)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${days===d?'bg-emerald-100 text-emerald-700':'text-gray-500 hover:bg-gray-100'}`}>{d}d</button>))}</div></div>

      {loading ? <div className="space-y-6"><div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">{[1,2,3,4,5,6].map(i=><div key={i} className="h-28 bg-white rounded-2xl animate-pulse"/>)}</div></div>
      : (<>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">{metrics.map((m,i)=>(<div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all animate-fade-in-up" style={{animationDelay:`${i*50}ms`}}><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-3`}><m.icon className="w-5 h-5 text-white"/></div><p className="font-display text-2xl font-bold text-gray-900">{m.value}</p><p className="text-xs text-gray-500 mt-0.5">{m.label}</p></div>))}</div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up" style={{animationDelay:'150ms'}}>
            <div className="flex items-center justify-between mb-5"><h3 className="font-display font-semibold text-gray-900">Message Volume</h3><span className="text-xs text-gray-400">Last {days} days</span></div>
            {vol.length===0 ? <div className="h-52 flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><p className="text-sm text-gray-400">No data</p></div>
            : <><div className="h-52 flex items-end gap-1.5">{vol.map(v=>{const t=v.inbound+v.outbound;const h=Math.max((t/maxVol)*100,4);const ip=t>0?(v.inbound/t)*100:0;return(<div key={v.date} className="flex-1 flex flex-col items-center group relative"><div className="w-full relative" style={{height:`${h}%`}}><div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-md" style={{height:`${100-ip}%`}}/><div className="absolute top-0 left-0 right-0 bg-blue-500 rounded-t-md" style={{height:`${ip}%`}}/></div><span className="text-[9px] text-gray-400 mt-1.5 truncate w-full text-center">{new Date(v.date).toLocaleDateString([],{month:'short',day:'numeric'})}</span><div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">Out:{v.outbound} In:{v.inbound}</div></div>)})}</div>
              <div className="flex items-center gap-4 mt-4"><span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-emerald-500 rounded"/>Outbound</span><span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-blue-500 rounded"/>Inbound</span></div></>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up" style={{animationDelay:'200ms'}}>
            <h3 className="font-display font-semibold text-gray-900 mb-5">Message Types</h3>
            {types.length===0?<p className="text-sm text-gray-400 text-center py-8">No data</p>
            :<div className="space-y-3">{types.map(mt=>{const pct=Math.round((mt.count/totalT)*100);return(<div key={mt._id}><div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-gray-700 capitalize">{mt._id}</span><span className="text-xs text-gray-500">{mt.count} ({pct}%)</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${TC[mt._id]||'bg-gray-400'}`} style={{width:`${pct}%`}}/></div></div>)})}</div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up" style={{animationDelay:'250ms'}}>
          <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-display font-semibold text-gray-900">Campaign Performance</h3></div>
          {camps.length===0?<div className="text-center py-12"><Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-400">No campaigns</p></div>
          :<div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100"><th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase">Campaign</th><th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase">Status</th><th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase">Total</th><th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase">Sent</th><th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase">Read</th><th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase">Failed</th></tr></thead>
            <tbody>{camps.map(c=>(<tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-6 py-3"><p className="text-sm font-semibold text-gray-900">{c.name}</p><p className="text-xs text-gray-400">{c.template_name}{c.scheduled_at?` • Scheduled: ${new Date(c.scheduled_at).toLocaleDateString()}`:''}</p></td><td className="px-6 py-3"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${c.status==='completed'?'bg-emerald-50 text-emerald-700':c.status==='running'?'bg-amber-50 text-amber-700':'bg-gray-100 text-gray-600'}`}>{c.status}</span></td><td className="px-6 py-3 text-right text-sm">{c.stats?.total||0}</td><td className="px-6 py-3 text-right text-sm text-emerald-600 font-medium">{c.stats?.sent||0}</td><td className="px-6 py-3 text-right text-sm text-blue-600 font-medium">{c.stats?.read||0}</td><td className="px-6 py-3 text-right text-sm text-red-500 font-medium">{c.stats?.failed||0}</td></tr>))}</tbody></table></div>}
        </div>
      </>)}
    </div>
  );
}
