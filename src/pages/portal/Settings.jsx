import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Shield,
  Globe,
  Users,
  CreditCard,
  Phone,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Clock,
  Plus,
  X,
  Key,
  Trash2,
} from 'lucide-react';

const TABS = [
  { key:'whatsapp', label:'WhatsApp', icon:Shield },
  { key:'phones', label:'Sender Numbers', icon:Phone },
  { key:'profile', label:'Business Profile', icon:Globe },
  { key:'team', label:'Team', icon:Users },
  { key:'billing', label:'Billing', icon:CreditCard },
];

const getDefaultLocale = () => {
  if (typeof navigator === 'undefined' || !navigator.language) return 'en_US';
  return navigator.language.replace('-', '_');
};

export default function SettingsPage() {
  const { user, tenant } = useAuth();
  const [tab, setTab] = useState('whatsapp');
  const [health, setHealth] = useState(null);
  const [loadH, setLoadH] = useState(true);
  const [phones, setPhones] = useState([]);
  const [activePhoneId, setActivePhoneId] = useState(null);
  const [loadP, setLoadP] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadPr, setLoadPr] = useState(false);
  const [savingPr, setSavingPr] = useState(false);
  const [prForm, setPrForm] = useState({ about:'', description:'', email:'', address:'', vertical:'' });

  const [showAddPhone, setShowAddPhone] = useState(false);
  const [phoneForm, setPhoneForm] = useState({ country_code:'', phone_number:'', verified_name:'' });
  const [showVerify, setShowVerify] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyPin, setVerifyPin] = useState('');
  const [deletingPhoneId, setDeletingPhoneId] = useState(null);
  const [runningPhoneMigration, setRunningPhoneMigration] = useState(false);
  const [clearingTenantData, setClearingTenantData] = useState(false);
  const devError = (...args) => {
    if (import.meta.env.DEV) console.error(...args);
  };

  const closeVerifyModal = () => {
    setShowVerify(null);
    setVerifyCode('');
    setVerifyPin('');
  };

  const refreshHealth = async () => {
    setLoadH(true);
    try {
      const r = await api.get('/meta/account-health');
      setHealth(r.data.data);
    } catch (e) {
      const err = e.response?.data;
      if (err?.error) {
        devError('[Settings][Health Fetch Failed]', err);
      }
    } finally {
      setLoadH(false);
    }
  };

  useEffect(() => {
    refreshHealth();
  }, []);

  const refreshPhones = async () => {
    setLoadP(true);
    try {
      const r = await api.get('/meta/phone-numbers');
      setPhones(r.data.data.phone_numbers || []);
      setActivePhoneId(r.data.data.active_phone_id);
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : 'Failed');
    } finally {
      setLoadP(false);
    }
  };

  useEffect(() => {
    if (tab === 'phones') refreshPhones();
  }, [tab]);

  useEffect(() => {
    if (tab === 'profile' && !profile) {
      setLoadPr(true);
      api.get('/meta/business-profile')
        .then(r => {
          setProfile(r.data.data);
          setPrForm({
            about: r.data.data.about || '',
            description: r.data.data.description || '',
            email: r.data.data.email || '',
            address: r.data.data.address || '',
            vertical: r.data.data.vertical || '',
          });
        })
        .catch(() => {})
        .finally(() => setLoadPr(false));
    }
  }, [tab, profile]);

  const saveProfile = async () => {
    setSavingPr(true);
    try {
      await api.put('/meta/business-profile', prForm);
      toast.success('Saved to Meta');
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error_source === 'meta' ? `Meta Error: ${err.error}` : 'Failed');
    } finally {
      setSavingPr(false);
    }
  };

  const switchPhone = async (id) => {
    try {
      await api.post('/meta/phone-numbers/switch', { phone_number_id:id });
      setActivePhoneId(id);
      toast.success('Switched');
      await refreshHealth();
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : 'Failed');
    }
  };

  const deregisterPhone = async (phone) => {
    const otherPhones = phones.filter((item) => item.id !== phone.id);
    const isActive = phone.id === activePhoneId;

    if (isActive && !otherPhones.length) {
      toast.error('Add another sender number first, then remove the current active sender.');
      return;
    }

    const replacementPhone = isActive ? otherPhones[0] : null;
    const confirmed = window.confirm(
      isActive
        ? `Remove ${phone.display_phone_number} from Meta and switch the active sender to ${replacementPhone?.display_phone_number || 'another saved number'}?`
        : `Remove ${phone.display_phone_number} from Meta sender numbers?`
    );

    if (!confirmed) return;

    try {
      setDeletingPhoneId(phone.id);
      const { data } = await api.post('/meta/phone-numbers/deregister', {
        phone_number_id: phone.id,
        next_phone_number_id: replacementPhone?.id,
      });
      setPhones(data.data.phone_numbers || []);
      setActivePhoneId(data.data.active_phone_id || null);
      await refreshHealth();
      toast.success(data.data.message || 'Sender removed from Meta');
    } catch (e) {
      const err = e.response?.data;
      devError('[Settings][Phone Deregister Failed]', err || e);
      toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : `Platform: ${err?.error || 'Failed'}`);
    } finally {
      setDeletingPhoneId(null);
    }
  };

  const registerPhone = async () => {
    if (!phoneForm.country_code || !phoneForm.phone_number || !phoneForm.verified_name.trim()) {
      toast.error('Country code, phone number, and display name are required');
      return;
    }

    try {
      await api.post('/meta/phone-numbers/register', phoneForm);
      toast.success('Number added in Meta. Request a verification code next.');
      setShowAddPhone(false);
      setPhoneForm({ country_code:'', phone_number:'', verified_name:'' });
      await refreshPhones();
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error_source === 'meta' ? `Meta rejected: ${err.error}` : `Platform: ${err?.error || 'Failed'}`);
    }
  };

  const requestCode = async (phoneId) => {
    setShowVerify({ phoneId, codeMethod:'SMS', locale:getDefaultLocale(), otpRequested:false });
  };

  const sendVerificationCode = async () => {
    if (!showVerify?.phoneId) return;

    try {
      await api.post('/meta/phone-numbers/request-code', {
        phone_number_id: showVerify.phoneId,
        code_method: showVerify.codeMethod,
        locale: showVerify.locale.trim() || getDefaultLocale(),
      });
      toast.success(`OTP sent via ${showVerify.codeMethod}`);
      setShowVerify((current) => current ? { ...current, otpRequested:true } : current);
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : `Platform: ${err?.error || 'Failed to send OTP'}`);
    }
  };

  const verifyPhone = async () => {
    if (!showVerify?.otpRequested) {
      toast.error('Send OTP first');
      return;
    }

    if (!verifyCode.trim() || !/^\d{6}$/.test(verifyPin.replace(/\D/g, ''))) {
      toast.error('OTP and a 6-digit PIN are required');
      return;
    }

    try {
      await api.post('/meta/phone-numbers/verify', {
        phone_number_id: showVerify.phoneId,
        code: verifyCode,
        pin: verifyPin,
      });
      toast.success('Phone verified and registered on Meta!');
      closeVerifyModal();
      await refreshPhones();
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error_source === 'meta' ? `Meta: ${err.error}` : `Platform: ${err?.error || 'Verification failed'}`);
    }
  };

  const reconnect = async () => {
    if (!window.confirm('Disconnect?')) return;
    try {
      await api.post('/meta/reconnect');
      window.location.href = '/portal/setup';
    } catch {
      toast.error('Failed');
    }
  };

  const runContactPhoneNormalization = async () => {
    if (!window.confirm('Run contact phone normalization now? This updates existing contacts to country code + local number format.')) return;
    setRunningPhoneMigration(true);
    try {
      const { data } = await api.post('/contacts/maintenance/normalize-phones');
      const report = data?.data || {};
      toast.success(`Done. Scanned ${report.scanned || 0}, updated ${report.updated || 0}, skipped ${report.skipped || 0}.`);
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error || 'Failed to run phone normalization');
    } finally {
      setRunningPhoneMigration(false);
    }
  };

  const clearTenantData = async () => {
    const confirmation = window.prompt('Type CLEAR to wipe contacts, chats, campaigns, gallery files, and logs.');
    if (String(confirmation || '').trim().toUpperCase() !== 'CLEAR') {
      toast.error('Cleanup cancelled. Confirmation text mismatch.');
      return;
    }
    setClearingTenantData(true);
    try {
      const { data } = await api.post('/meta/maintenance/clear-tenant-data', { confirm_text: 'CLEAR' });
      const report = data?.data || {};
      toast.success(`Data cleared. Contacts ${report.contacts || 0}, chats ${report.messages || 0}, campaigns ${report.campaigns || 0}.`);
    } catch (e) {
      const err = e.response?.data;
      toast.error(err?.error || 'Failed to clear tenant data');
    } finally {
      setClearingTenantData(false);
    }
  };

  const qc = (r) => {
    if (r === 'green') return 'text-emerald-600 bg-emerald-50';
    if (r === 'yellow') return 'text-amber-600 bg-amber-50';
    if (r === 'red') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="font-display text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">All synced with Meta WhatsApp Cloud API</p>
      </div>

      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 overflow-x-auto animate-fade-in-up" style={{ animationDelay:'50ms' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'whatsapp' && (
        <div className="space-y-6 animate-fade-in-up" style={{ animationDelay:'100ms' }}>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-gray-900">Meta Account Status</h3>
                <p className="text-xs text-gray-500">Live from Cloud API</p>
              </div>
            </div>

            {loadH ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : health ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Connection</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <Wifi className="w-4 h-4" />
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Phone</span>
                  <span className="text-sm font-semibold text-gray-900">{health.display_phone_number || '-'}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Business</span>
                  <span className="text-sm font-semibold text-gray-900">{health.display_name || '-'}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Quality</span>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${qc(health.quality_rating)}`}>{health.quality_rating || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Tier</span>
                  <span className="text-sm font-semibold text-gray-900">Tier {health.messaging_limit_tier || '-'}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Webhook</span>
                  <span className={`flex items-center gap-1.5 text-sm font-semibold ${health.webhook_verified ? 'text-emerald-700' : 'text-amber-600'}`}>
                    {health.webhook_verified ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {health.webhook_verified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <WifiOff className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Unable to load</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-display font-semibold text-gray-900 mb-2">Reconnect</h3>
            <p className="text-sm text-gray-500 mb-4">Disconnect and reconnect via Meta Embedded Signup.</p>
            <button onClick={reconnect} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100">
              <RefreshCw className="w-4 h-4" />
              Disconnect & Reconnect
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-display font-semibold text-gray-900 mb-2">Data Maintenance</h3>
            <p className="text-sm text-gray-500 mb-4">Normalize all existing contact numbers into country code + local number format.</p>
            <button
              onClick={runContactPhoneNormalization}
              disabled={runningPhoneMigration}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-xl hover:bg-blue-100 disabled:opacity-60"
            >
              {runningPhoneMigration ? <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {runningPhoneMigration ? 'Running...' : 'Run Contact Phone Migration'}
            </button>
            <div className="mt-5 pt-5 border-t border-gray-100">
              <h4 className="font-semibold text-red-700 mb-1">Danger Zone</h4>
              <p className="text-xs text-gray-500 mb-3">Wipes contacts, conversations, messages, campaigns, gallery assets, and logs. WhatsApp account connection stays linked.</p>
              <button
                onClick={clearTenantData}
                disabled={clearingTenantData}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-100 disabled:opacity-60"
              >
                {clearingTenantData ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-700 rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {clearingTenantData ? 'Clearing data...' : 'Clear All Tenant Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'phones' && (
        <div className="space-y-6 animate-fade-in-up" style={{ animationDelay:'100ms' }}>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-gray-900">Sender Numbers</h3>
                  <p className="text-xs text-gray-500">From your Meta WABA - add, verify, and switch active sender</p>
                </div>
              </div>
              <button onClick={() => setShowAddPhone(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600">
                <Plus className="w-4 h-4" />
                Add Number
              </button>
            </div>

            {loadP ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : phones.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No phone numbers on your WABA</p>
            ) : (
              <div className="space-y-3">
                {phones.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${p.id === activePhoneId ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.id === activePhoneId ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.display_phone_number}</p>
                        <p className="text-xs text-gray-500">{p.verified_name} • {p.status}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${p.quality_rating === 'GREEN' ? 'bg-emerald-100 text-emerald-700' : p.quality_rating === 'YELLOW' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                            {p.quality_rating || '-'}
                          </span>
                          {p.messaging_limit_tier && <span className="text-[10px] text-gray-400">Tier {p.messaging_limit_tier}</span>}
                          {p.code_verification_status && p.code_verification_status !== 'VERIFIED' && (
                            <button onClick={() => requestCode(p.id)} className="text-[10px] text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
                              <Key className="w-3 h-3" />
                              Verify & Register
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.id === activePhoneId ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <button onClick={() => switchPhone(p.id)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-100">
                          Switch
                        </button>
                      )}

                      <button
                        onClick={() => deregisterPhone(p)}
                        disabled={deletingPhoneId === p.id || (p.id === activePhoneId && phones.length <= 1)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={p.id === activePhoneId && phones.length <= 1 ? 'Add another sender first before removing the active one.' : 'Remove this sender from Meta Cloud API'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingPhoneId === p.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-700 font-medium">Add the number here or through Meta Business Manager, then request a code and finish the final registration step with a 6-digit PIN.</p>
            </div>
            <div className="mt-3 p-3 bg-amber-50 rounded-xl">
              <p className="text-xs text-amber-700 font-medium">Remove uses Meta's Cloud API deregister flow. If you remove the active sender, the portal will auto-switch to another saved sender. If this is your only sender number, add another one first or reconnect the whole WhatsApp setup.</p>
            </div>
          </div>

          {showAddPhone && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-gray-900">Add New Number in Meta</h3>
                <button onClick={() => setShowAddPhone(false)} className="p-1 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Country Code</label>
                  <input value={phoneForm.country_code} onChange={(e) => setPhoneForm({ ...phoneForm, country_code:e.target.value })} placeholder="91" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Phone Number</label>
                  <input value={phoneForm.phone_number} onChange={(e) => setPhoneForm({ ...phoneForm, phone_number:e.target.value })} placeholder="9876543210" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Display Name / Verified Name</label>
                <input value={phoneForm.verified_name} onChange={(e) => setPhoneForm({ ...phoneForm, verified_name:e.target.value })} placeholder="Acme Support" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
              </div>

              <button onClick={registerPhone} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600">
                <Plus className="w-4 h-4" />
                Add to Meta
              </button>
              <p className="text-xs text-gray-400 mt-2">Meta requires the verified display name before it will create the sender.</p>
            </div>
          )}

          {showVerify && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <h3 className="font-display font-semibold text-gray-900 mb-4">Complete Meta Verification</h3>
                <p className="text-sm text-gray-500 mb-4">Step 1: choose how Meta should send the OTP. Step 2: enter the OTP and your 6-digit registration PIN.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Method</label>
                    <select value={showVerify.codeMethod} onChange={(e) => setShowVerify((current) => current ? { ...current, codeMethod:e.target.value } : current)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500">
                      <option value="SMS">SMS</option>
                      <option value="VOICE">Voice Call</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Locale</label>
                    <input value={showVerify.locale} onChange={(e) => setShowVerify((current) => current ? { ...current, locale:e.target.value } : current)} placeholder="en_US" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
                  </div>
                </div>
                {!showVerify.otpRequested ? (
                  <button onClick={sendVerificationCode} className="w-full px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 mb-2">Send OTP</button>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-emerald-700">OTP sent. Enter it below to finish setup.</p>
                      <button onClick={sendVerificationCode} className="text-xs text-blue-600 font-semibold hover:underline">Resend OTP</button>
                    </div>
                    <input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="Enter OTP" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-center text-lg font-mono tracking-[0.3em]" />
                    <input value={verifyPin} onChange={(e) => setVerifyPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Choose 6-digit PIN" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-center text-lg font-mono tracking-[0.3em]" />
                  </>
                )}
                <div className="flex gap-3">
                  <button onClick={closeVerifyModal} className="flex-1 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                  <button onClick={verifyPhone} disabled={!showVerify.otpRequested} className="flex-1 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed">Verify & Register</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up" style={{ animationDelay:'100ms' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900">Business Profile</h3>
              <p className="text-xs text-gray-500">Saved directly to Meta - visible on your WhatsApp business page</p>
            </div>
          </div>

          {loadPr ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">About</label>
                <input value={prForm.about} onChange={(e) => setPrForm({ ...prForm, about:e.target.value })} placeholder="Brief description" maxLength={139} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
                <p className="text-[10px] text-gray-400 mt-1">{prForm.about.length}/139</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea value={prForm.description} onChange={(e) => setPrForm({ ...prForm, description:e.target.value })} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
                  <input value={prForm.email} onChange={(e) => setPrForm({ ...prForm, email:e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Industry</label>
                  <select value={prForm.vertical} onChange={(e) => setPrForm({ ...prForm, vertical:e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500">
                    <option value="">Select</option>
                    {['AUTOMOTIVE','BEAUTY','CLOTHING','EDUCATION','FINANCE','FOOD_GROCERY','HEALTH','HOTEL','PROFESSIONAL_SERVICES','RETAIL','TRAVEL','RESTAURANT','OTHER'].map((v) => (
                      <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Address</label>
                <input value={prForm.address} onChange={(e) => setPrForm({ ...prForm, address:e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
              </div>
              <button onClick={saveProfile} disabled={savingPr} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 mt-2">
                {savingPr ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save to Meta
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up" style={{ animationDelay:'100ms' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900">Team Members</h3>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{user?.full_name} (You)</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full uppercase">{user?.role || 'Owner'}</span>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-700 font-medium">Team management coming soon. Max {tenant?.seats_limit || 3} seats.</p>
          </div>
        </div>
      )}

      {tab === 'billing' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up" style={{ animationDelay:'100ms' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900">Plan</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Plan</p>
              <p className="text-lg font-bold text-gray-900 capitalize">{tenant?.plan || 'Starter'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
              <p className="text-lg font-bold text-emerald-600 capitalize">{tenant?.plan_status || 'Trial'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Monthly Messages</p>
              <p className="text-lg font-bold text-gray-900">{tenant?.message_limit_monthly?.toLocaleString() || '1,000'}</p>
            </div>
          </div>
          {tenant?.trial_ends_at && (
            <div className="p-4 bg-amber-50 rounded-xl mb-4">
              <div className="flex items-center gap-2 text-amber-700">
                <Clock className="w-4 h-4" />
                <p className="text-sm font-medium">Trial ends {new Date(tenant.trial_ends_at).toLocaleDateString([], { month:'long', day:'numeric', year:'numeric' })}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
