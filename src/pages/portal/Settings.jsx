import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Settings, User, Globe, Users, CreditCard, Phone, Save, Plus, Trash2,
  X, Loader2, CheckCircle2, Shield, AlertTriangle, Key, Mail, MapPin,
  FileText, Hash, ShieldCheck, Zap, ChevronRight, Lock,
} from 'lucide-react';

const TABS = [
  { key: 'profile', label: 'Profile', icon: User, desc: 'Business info' },
  { key: 'whatsapp', label: 'WhatsApp', icon: Phone, desc: 'Connection & numbers' },
  { key: 'team', label: 'Team', icon: Users, desc: 'Members' },
  { key: 'billing', label: 'Billing', icon: CreditCard, desc: 'Plans & usage' },
];

const getDefaultLocale = () => {
  if (typeof navigator === 'undefined' || !navigator.language) return 'en_US';
  return navigator.language.replace('-', '_');
};

export default function SettingsPage() {
  const { user, tenant } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [health, setHealth] = useState(null);
  const [loadH, setLoadH] = useState(true);
  const [phones, setPhones] = useState([]);
  const [activePhoneId, setActivePhoneId] = useState(null);
  const [loadP, setLoadP] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadPr, setLoadPr] = useState(false);
  const [savingPr, setSavingPr] = useState(false);
  const [prForm, setPrForm] = useState({ about: '', description: '', email: '', address: '', vertical: '' });

  const [showAddPhone, setShowAddPhone] = useState(false);
  const [phoneForm, setPhoneForm] = useState({ country_code: '', phone_number: '', verified_name: '' });
  const [showVerify, setShowVerify] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyPin, setVerifyPin] = useState('');
  const [deletingPhoneId, setDeletingPhoneId] = useState(null);

  const refreshHealth = async () => {
    setLoadH(true);
    try { const r = await api.get('/meta/account-health'); setHealth(r.data.data); }
    catch {} finally { setLoadH(false); }
  };

  useEffect(() => { refreshHealth(); }, []);

  const refreshPhones = async () => {
    setLoadP(true);
    try {
      const r = await api.get('/meta/phone-numbers');
      setPhones(r.data.data.phone_numbers || []);
      setActivePhoneId(r.data.data.active_phone_id);
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : 'Failed to load phones');
    } finally { setLoadP(false); }
  };

  useEffect(() => { if (activeTab === 'whatsapp') refreshPhones(); }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'profile' && !profile) {
      setLoadPr(true);
      api.get('/meta/business-profile')
        .then(r => { setProfile(r.data.data); setPrForm({ about: r.data.data.about || '', description: r.data.data.description || '', email: r.data.data.email || '', address: r.data.data.address || '', vertical: r.data.data.vertical || '' }); })
        .catch(() => {})
        .finally(() => setLoadPr(false));
    }
  }, [activeTab, profile]);

  const saveProfile = async () => {
    setSavingPr(true);
    try { await api.put('/meta/business-profile', prForm); toast.success('Business profile saved'); }
    catch (e) { const err = e.response?.data; toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : 'Failed to save'); }
    finally { setSavingPr(false); }
  };

  const switchPhone = async (id) => {
    try { await api.post('/meta/phone-numbers/switch', { phone_number_id: id }); setActivePhoneId(id); toast.success('Switched to new sender number'); await refreshHealth(); }
    catch (e) { const err = e.response?.data; toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : 'Failed to switch'); }
  };

  const deregisterPhone = async (phone) => {
    const others = phones.filter(p => p.id !== phone.id);
    const isActive = phone.id === activePhoneId;
    if (isActive && !others.length) { toast.error('Add another sender number first'); return; }
    const replacement = isActive ? others[0] : null;
    if (!window.confirm(isActive ? `Remove ${phone.display_phone_number} and switch to ${replacement?.display_phone_number}?` : `Remove ${phone.display_phone_number}?`)) return;
    try {
      setDeletingPhoneId(phone.id);
      const { data } = await api.post('/meta/phone-numbers/deregister', { phone_number_id: phone.id, next_phone_number_id: replacement?.id });
      setPhones(data.data.phone_numbers || []); setActivePhoneId(data.data.active_phone_id || null); await refreshHealth();
      toast.success('Sender number removed');
    } catch (e) { const err = e.response?.data; toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : 'Failed to remove'); }
    finally { setDeletingPhoneId(null); }
  };

  const registerPhone = async () => {
    if (!phoneForm.country_code || !phoneForm.phone_number || !phoneForm.verified_name.trim()) { toast.error('All fields are required'); return; }
    try { await api.post('/meta/phone-numbers/register', phoneForm); toast.success('Number registered. Request verification code next.'); setShowAddPhone(false); setPhoneForm({ country_code: '', phone_number: '', verified_name: '' }); await refreshPhones(); }
    catch (e) { const err = e.response?.data; toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : 'Failed to register'); }
  };

  const requestCode = (phoneId) => { setShowVerify({ phoneId, codeMethod: 'SMS', locale: getDefaultLocale(), otpRequested: false }); };

  const sendVerificationCode = async () => {
    if (!showVerify?.phoneId) return;
    try { await api.post('/meta/phone-numbers/request-code', { phone_number_id: showVerify.phoneId, code_method: showVerify.codeMethod, locale: showVerify.locale.trim() || getDefaultLocale() }); toast.success(`OTP sent via ${showVerify.codeMethod}`); setShowVerify(c => c ? { ...c, otpRequested: true } : c); }
    catch (e) { const err = e.response?.data; toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : 'Failed to send OTP'); }
  };

  const verifyPhone = async () => {
    if (!showVerify?.otpRequested) { toast.error('Send OTP first'); return; }
    if (!verifyCode.trim() || !/^\d{6}$/.test(verifyPin.replace(/\D/g, ''))) { toast.error('OTP and 6-digit PIN required'); return; }
    try { await api.post('/meta/phone-numbers/verify', { phone_number_id: showVerify.phoneId, code: verifyCode, pin: verifyPin }); toast.success('Phone verified'); setShowVerify(null); setVerifyCode(''); setVerifyPin(''); await refreshPhones(); }
    catch (e) { const err = e.response?.data; toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : 'Verification failed'); }
  };

  const InputField = ({ label, icon: Icon, children, required, hint }) => (
    <div>
      <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-[10px] text-surface-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );

  const inputCls = "w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-none transition-all";
  const textareaCls = `${inputCls} resize-none`;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="animate-fade-in-up">
        <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Settings</h1>
        <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5" />
          Manage your account, WhatsApp connection, team, and billing
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Sidebar Navigation ── */}
        <div className="lg:w-52 flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="bg-white rounded-xl border border-surface-200 overflow-hidden lg:sticky lg:top-6">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`w-full px-4 py-3.5 flex items-center gap-3 text-left border-l-[3px] transition-all ${isActive ? 'bg-brand-50/60 border-l-brand-600' : 'border-l-transparent hover:bg-surface-50'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-brand-100' : 'bg-surface-100'}`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-surface-500'}`} />
                  </div>
                  <div>
                    <p className={`text-[12px] font-semibold ${isActive ? 'text-brand-700' : 'text-surface-700'}`}>{tab.label}</p>
                    <p className="text-[10px] text-surface-400">{tab.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content Area ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ═══ Profile Tab ═══ */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <div className="px-5 py-3.5 border-b border-surface-100">
                <h3 className="text-[14px] font-bold text-surface-900">Business Information</h3>
                <p className="text-[11px] text-surface-400 mt-0.5">Update your WhatsApp Business profile</p>
              </div>
              {loadPr ? (
                <div className="p-5 space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-surface-50 rounded-lg animate-pulse" />)}</div>
              ) : (
                <div className="p-5 space-y-4">
                  <InputField label="Business Name" icon={FileText}>
                    <input type="text" value={tenant?.name || ''} disabled className={`${inputCls} bg-surface-100 text-surface-500 cursor-not-allowed`} />
                  </InputField>
                  <InputField label="Email" icon={Mail}>
                    <input type="email" value={prForm.email} onChange={e => setPrForm(c => ({ ...c, email: e.target.value }))} placeholder="business@example.com" className={inputCls} />
                  </InputField>
                  <InputField label="About" icon={FileText} hint="Brief description of your business">
                    <textarea value={prForm.about} onChange={e => setPrForm(c => ({ ...c, about: e.target.value }))} rows={3} placeholder="What does your business do?" className={textareaCls} />
                  </InputField>
                  <InputField label="Description" icon={FileText} hint="Detailed description">
                    <textarea value={prForm.description} onChange={e => setPrForm(c => ({ ...c, description: e.target.value }))} rows={3} placeholder="Tell customers more about your business..." className={textareaCls} />
                  </InputField>
                  <InputField label="Address" icon={MapPin}>
                    <input type="text" value={prForm.address} onChange={e => setPrForm(c => ({ ...c, address: e.target.value }))} placeholder="123 Business St, City, Country" className={inputCls} />
                  </InputField>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-surface-100 bg-surface-50/50">
                <button onClick={saveProfile} disabled={savingPr} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg transition-colors">
                  {savingPr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingPr ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* ═══ WhatsApp Tab ═══ */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              {/* Account Status */}
              <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                <div className="px-5 py-3.5 border-b border-surface-100">
                  <h3 className="text-[14px] font-bold text-surface-900">Account Status</h3>
                  <p className="text-[11px] text-surface-400 mt-0.5">WhatsApp Business API connection details</p>
                </div>
                {loadH ? (
                  <div className="p-5 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-50 rounded-lg animate-pulse" />)}</div>
                ) : health ? (
                  <div className="divide-y divide-surface-100">
                    {[
                      { label: 'Phone Number', value: health.display_phone_number || '—', icon: Phone },
                      { label: 'Display Name', value: health.display_name || '—', icon: User },
                      { label: 'Quality Rating', value: health.quality_rating || 'Unknown', icon: Shield, badge: true },
                      { label: 'Messaging Tier', value: `Tier ${health.messaging_limit_tier || '—'}`, icon: Zap },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center"><row.icon className="w-4 h-4 text-surface-500" /></div>
                          <span className="text-[12px] font-semibold text-surface-600">{row.label}</span>
                        </div>
                        {row.badge ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            health.quality_rating === 'GREEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            health.quality_rating === 'YELLOW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${health.quality_rating === 'GREEN' ? 'bg-emerald-500' : health.quality_rating === 'YELLOW' ? 'bg-amber-500' : 'bg-red-500'}`} />
                            {row.value}
                          </span>
                        ) : (
                          <span className="text-[13px] font-semibold text-surface-900">{row.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <AlertTriangle className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                    <p className="text-[13px] text-surface-500 font-medium">Unable to load account status</p>
                  </div>
                )}
              </div>

              {/* Sender Numbers */}
              <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '180ms' }}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
                  <div>
                    <h3 className="text-[14px] font-bold text-surface-900">Sender Numbers</h3>
                    <p className="text-[11px] text-surface-400 mt-0.5">Manage WhatsApp sender phone numbers</p>
                  </div>
                  <button onClick={() => setShowAddPhone(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Number
                  </button>
                </div>

                {loadP ? (
                  <div className="p-5 space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-surface-50 rounded-lg animate-pulse" />)}</div>
                ) : phones.length === 0 ? (
                  <div className="py-16 text-center">
                    <Phone className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                    <p className="text-[13px] text-surface-500 font-medium">No sender numbers</p>
                    <p className="text-[11px] text-surface-400 mt-1">Add a phone number to start sending messages</p>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-100">
                    {phones.map(phone => {
                      const isActive = phone.id === activePhoneId;
                      return (
                        <div key={phone.id} className={`px-5 py-4 ${isActive ? 'bg-brand-50/30' : ''}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-brand-100' : 'bg-surface-100'}`}>
                                <Phone className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-surface-500'}`} />
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-surface-900">{phone.display_phone_number}</p>
                                <p className="text-[12px] text-surface-500 mt-0.5">{phone.verified_name}</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    phone.quality_rating === 'GREEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    phone.quality_rating === 'YELLOW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-surface-100 text-surface-600 border-surface-200'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${phone.quality_rating === 'GREEN' ? 'bg-emerald-500' : phone.quality_rating === 'YELLOW' ? 'bg-amber-500' : 'bg-surface-400'}`} />
                                    {phone.quality_rating || 'N/A'}
                                  </span>
                                  {phone.messaging_limit_tier && <span className="text-[10px] text-surface-400 font-medium">Tier {phone.messaging_limit_tier}</span>}
                                  {isActive && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                                      <CheckCircle2 className="w-3 h-3" /> Active
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!isActive && (
                                <button onClick={() => switchPhone(phone.id)} className="px-3 py-2 rounded-lg border border-surface-200 bg-white text-[11px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">Switch</button>
                              )}
                              <button onClick={() => requestCode(phone.id)} className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-all">
                                <Key className="w-3 h-3 inline -mt-0.5 mr-1" />Verify
                              </button>
                              <button onClick={() => deregisterPhone(phone)} disabled={deletingPhoneId === phone.id || (isActive && phones.length <= 1)} className="p-2 rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 disabled:opacity-30 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Phone Inline Card */}
              {showAddPhone && (
                <div className="bg-white rounded-xl border border-brand-200 overflow-hidden animate-fade-in-up">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center"><Plus className="w-[18px] h-[18px] text-brand-600" /></div>
                      <h3 className="text-[14px] font-bold text-surface-900">Add New Sender Number</h3>
                    </div>
                    <button onClick={() => setShowAddPhone(false)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"><X className="w-4 h-4 text-surface-400" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <InputField label="Country Code" icon={Hash} required>
                      <input type="text" placeholder="+1" value={phoneForm.country_code} onChange={e => setPhoneForm(c => ({ ...c, country_code: e.target.value }))} className={inputCls} />
                    </InputField>
                    <InputField label="Phone Number" icon={Phone} required>
                      <input type="text" placeholder="9876543210" value={phoneForm.phone_number} onChange={e => setPhoneForm(c => ({ ...c, phone_number: e.target.value }))} className={inputCls} />
                    </InputField>
                    <InputField label="Display Name" icon={User} required hint="Name shown to customers">
                      <input type="text" placeholder="Business Name" value={phoneForm.verified_name} onChange={e => setPhoneForm(c => ({ ...c, verified_name: e.target.value }))} className={inputCls} />
                    </InputField>
                  </div>
                  <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-surface-100 bg-surface-50/50">
                    <button onClick={() => setShowAddPhone(false)} className="px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">Cancel</button>
                    <button onClick={registerPhone} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"><Plus className="w-4 h-4" /> Register Number</button>
                  </div>
                </div>
              )}

              {/* Verify Inline Card */}
              {showVerify && (
                <div className="bg-white rounded-xl border border-blue-200 overflow-hidden animate-fade-in-up">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><ShieldCheck className="w-[18px] h-[18px] text-blue-600" /></div>
                      <h3 className="text-[14px] font-bold text-surface-900">Verify Phone Number</h3>
                    </div>
                    <button onClick={() => setShowVerify(null)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"><X className="w-4 h-4 text-surface-400" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    {!showVerify.otpRequested ? (
                      <>
                        <InputField label="Delivery Method" icon={Send}>
                          <select value={showVerify.codeMethod} onChange={e => setShowVerify(c => c ? { ...c, codeMethod: e.target.value } : c)} className={inputCls}>
                            <option value="SMS">SMS</option>
                            <option value="VOICE">Voice Call</option>
                          </select>
                        </InputField>
                        <InputField label="Locale" icon={Globe}>
                          <input type="text" value={showVerify.locale} onChange={e => setShowVerify(c => c ? { ...c, locale: e.target.value } : c)} placeholder="en_US" className={inputCls} />
                        </InputField>
                      </>
                    ) : (
                      <>
                        <InputField label="OTP Code" icon={Key} required>
                          <input type="text" placeholder="Enter OTP code" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} className={inputCls} />
                        </InputField>
                        <InputField label="6-Digit PIN" icon={Lock} required>
                          <input type="text" placeholder="Enter 6-digit PIN" value={verifyPin} onChange={e => setVerifyPin(e.target.value)} className={inputCls} />
                        </InputField>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-surface-100 bg-surface-50/50">
                    <button onClick={() => setShowVerify(null)} className="px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">Cancel</button>
                    {!showVerify.otpRequested ? (
                      <button onClick={sendVerificationCode} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-lg transition-colors"><Send className="w-4 h-4" /> Send OTP</button>
                    ) : (
                      <button onClick={verifyPhone} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"><CheckCircle2 className="w-4 h-4" /> Verify</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ Team Tab ═══ */}
          {activeTab === 'team' && (
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <div className="px-5 py-3.5 border-b border-surface-100">
                <h3 className="text-[14px] font-bold text-surface-900">Team Members</h3>
                <p className="text-[11px] text-surface-400 mt-0.5">Team management features coming soon</p>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl border border-surface-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-emerald-400 flex items-center justify-center text-[13px] font-bold text-white">
                      {(user?.full_name || user?.email || 'U')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-surface-900">{user?.full_name || user?.email}</p>
                      <p className="text-[11px] text-surface-400">{user?.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Owner
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Billing Tab ═══ */}
          {activeTab === 'billing' && (
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <div className="px-5 py-3.5 border-b border-surface-100">
                <h3 className="text-[14px] font-bold text-surface-900">Billing</h3>
                <p className="text-[11px] text-surface-400 mt-0.5">Plans and usage information</p>
              </div>
              <div className="p-5">
                <div className="bg-surface-50 rounded-xl border border-surface-100 p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-6 h-6 text-surface-400" />
                  </div>
                  <p className="text-[14px] font-bold text-surface-900">Billing Coming Soon</p>
                  <p className="text-[12px] text-surface-400 mt-1">Contact support for billing inquiries</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
