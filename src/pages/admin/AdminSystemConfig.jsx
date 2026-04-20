import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Settings, Save, Loader2, Eye, EyeOff, RefreshCw, ShieldCheck, Key, ToggleLeft, ToggleRight } from 'lucide-react';

const CONFIG_GROUPS = {
  'Payment Gateway': ['razorpay_key_id', 'razorpay_key_secret', 'razorpay_mode'],
  'Trial Settings': ['trial_days', 'require_admin_approval'],
};

export default function AdminSystemConfig() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [revealedSecrets, setRevealedSecrets] = useState({});

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/system/config');
      const configList = data.data?.configs || data.data || [];
      setConfigs(configList);
      const vals = {};
      configList.forEach(c => { vals[c.key] = c.value; });
      setEditValues(vals);
    } catch { toast.error('Failed to load system config'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/system/config', { configs: editValues });
      toast.success('Configuration saved');
      fetchConfigs();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const toggleReveal = (key) => {
    setRevealedSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getGroupedConfigs = () => {
    const grouped = {};
    const ungrouped = [];

    for (const [group, keys] of Object.entries(CONFIG_GROUPS)) {
      grouped[group] = configs.filter(c => keys.includes(c.key));
    }

    const allGroupedKeys = Object.values(CONFIG_GROUPS).flat();
    configs.forEach(c => {
      if (!allGroupedKeys.includes(c.key)) ungrouped.push(c);
    });

    if (ungrouped.length > 0) grouped['Other'] = ungrouped;
    return grouped;
  };

  const renderInput = (config) => {
    const key = config.key;
    const value = editValues[key] ?? '';
    const isSecret = config.is_secret;
    const isRevealed = revealedSecrets[key];

    // Boolean toggle for specific keys
    if (key === 'require_admin_approval') {
      const boolVal = value === true || value === 'true' || value === '1';
      return (
        <button
          onClick={() => setEditValues(prev => ({ ...prev, [key]: !boolVal }))}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-semibold transition-colors ${
            boolVal ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-surface-50 border-surface-200 text-surface-500'
          }`}
        >
          {boolVal ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          {boolVal ? 'Enabled' : 'Disabled'}
        </button>
      );
    }

    // Number input for trial_days
    if (key === 'trial_days') {
      return (
        <input
          type="number"
          min="1"
          max="365"
          value={value}
          onChange={e => setEditValues(prev => ({ ...prev, [key]: parseInt(e.target.value) || 7 }))}
          className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      );
    }

    // Select for razorpay_mode
    if (key === 'razorpay_mode') {
      return (
        <select
          value={value}
          onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
          className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="test">Test Mode</option>
          <option value="live">Live Mode</option>
        </select>
      );
    }

    // Secret / text input
    return (
      <div className="relative">
        <input
          type={isSecret && !isRevealed ? 'password' : 'text'}
          value={value}
          onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
          placeholder={isSecret ? 'Enter secret value...' : 'Enter value...'}
          className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 pr-10 text-[13px] text-surface-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        {isSecret && (
          <button
            onClick={() => toggleReveal(key)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-surface-400 hover:text-surface-600 transition-colors"
          >
            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const grouped = getGroupedConfigs();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">System Configuration</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            Manage payment gateway, trial settings, and system preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchConfigs}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-200 hover:bg-surface-50 text-surface-700 font-semibold text-[13px] rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[13px] rounded-xl transition-colors shadow-sm shadow-brand-500/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Security Note */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-bold text-blue-800">Security Notice</p>
          <p className="text-[11px] text-blue-600 mt-0.5">
            Secret values (API keys) are masked for security. Enter a new value to update, or leave unchanged to keep the existing value.
          </p>
        </div>
      </div>

      {/* Config Groups */}
      {Object.entries(grouped).map(([groupName, groupConfigs]) => {
        if (groupConfigs.length === 0) return null;
        return (
          <div key={groupName} className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                {groupName === 'Payment Gateway' ? (
                  <Key className="w-4 h-4 text-brand-600" />
                ) : (
                  <Settings className="w-4 h-4 text-brand-600" />
                )}
              </div>
              <h3 className="text-[14px] font-bold text-surface-900">{groupName}</h3>
            </div>
            <div className="divide-y divide-surface-100">
              {groupConfigs.map(config => (
                <div key={config.key} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-[13px] font-semibold text-surface-800">
                        {config.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </label>
                      {config.description && (
                        <p className="text-[11px] text-surface-400 mt-0.5">{config.description}</p>
                      )}
                    </div>
                    {config.is_secret && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-bold text-amber-700 uppercase">Secret</span>
                    )}
                  </div>
                  {renderInput(config)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
