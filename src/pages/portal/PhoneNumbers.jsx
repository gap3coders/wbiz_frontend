import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Smartphone, Phone, Star, Edit3, Check, X, Loader2, Plus,
  Shield, BarChart3, MessageCircle, ChevronRight,
} from 'lucide-react';

const QUALITY_BADGE = {
  green:   { label: 'High',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  yellow:  { label: 'Medium',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  red:     { label: 'Low',     cls: 'bg-red-50 text-red-700 border-red-200' },
  unknown: { label: 'Unknown', cls: 'bg-surface-100 text-surface-500 border-surface-200' },
};

const STATUS_BADGE = {
  active:       { label: 'Active',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  suspended:    { label: 'Suspended',    cls: 'bg-red-50 text-red-700 border-red-200' },
  disconnected: { label: 'Disconnected', cls: 'bg-surface-100 text-surface-500 border-surface-200' },
};

export default function PhoneNumbers() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [settingDefault, setSettingDefault] = useState(null);
  const [savingLabel, setSavingLabel] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await api.get('/meta/accounts');
      setAccounts(data?.data?.accounts || []);
    } catch {
      toast.error('Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleSetDefault = async (accountId) => {
    setSettingDefault(accountId);
    try {
      await api.post(`/meta/accounts/${accountId}/set-default`);
      setAccounts(prev => prev.map(a => ({ ...a, is_default: a._id === accountId })));
      toast.success('Default number updated');
    } catch {
      toast.error('Failed to set default');
    } finally {
      setSettingDefault(null);
    }
  };

  const handleStartEdit = (account) => {
    setEditingId(account._id);
    setEditLabel(account.label || '');
  };

  const handleSaveLabel = async (accountId) => {
    setSavingLabel(true);
    try {
      await api.patch(`/meta/accounts/${accountId}`, { label: editLabel });
      setAccounts(prev => prev.map(a => a._id === accountId ? { ...a, label: editLabel } : a));
      setEditingId(null);
      toast.success('Label updated');
    } catch {
      toast.error('Failed to update label');
    } finally {
      setSavingLabel(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Phone Numbers</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" /> Manage your connected WhatsApp sender numbers
          </p>
        </div>
        <button
          onClick={() => navigate('/portal/setup/select-number')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Number
        </button>
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
            <Phone className="w-7 h-7 text-surface-300" />
          </div>
          <h3 className="text-base font-semibold text-surface-900 mb-1">No phone numbers connected</h3>
          <p className="text-sm text-surface-500 mb-4">Connect your first WhatsApp sender number to start messaging.</p>
          <button
            onClick={() => navigate('/portal/setup/select-number')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Connect Number
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(account => {
            const quality = QUALITY_BADGE[account.quality_rating] || QUALITY_BADGE.unknown;
            const status = STATUS_BADGE[account.account_status] || STATUS_BADGE.disconnected;
            const isEditing = editingId === account._id;

            return (
              <div
                key={account._id}
                className={`bg-white rounded-xl border transition-colors ${
                  account.is_default ? 'border-brand-200 ring-1 ring-brand-100' : 'border-surface-200'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      account.is_default ? 'bg-brand-50' : 'bg-surface-100'
                    }`}>
                      <Phone className={`w-5 h-5 ${account.is_default ? 'text-brand-500' : 'text-surface-400'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-bold text-surface-900">
                          {account.display_phone_number || account.phone_number_id}
                        </h3>
                        {account.is_default && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                            <Star className="w-2.5 h-2.5" />
                            Default
                          </span>
                        )}
                      </div>

                      {/* Label - inline edit */}
                      <div className="flex items-center gap-2 mb-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              placeholder="e.g. Sales Line, Support..."
                              className="text-sm border border-surface-300 rounded-lg px-2.5 py-1 w-48 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveLabel(account._id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveLabel(account._id)}
                              disabled={savingLabel}
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              {savingLabel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded-md text-surface-400 hover:bg-surface-100 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-surface-500">
                              {account.label || (account.display_name ? account.display_name : 'No label')}
                            </span>
                            <button
                              onClick={() => handleStartEdit(account)}
                              className="p-0.5 rounded text-surface-400 hover:text-surface-600 transition-colors"
                              title="Edit label"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${status.cls}`}>
                          {status.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${quality.cls}`}>
                          <BarChart3 className="w-3 h-3" />
                          Quality: {quality.label}
                        </span>
                        {account.messaging_limit_tier && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                            <MessageCircle className="w-3 h-3" />
                            Tier {account.messaging_limit_tier}
                          </span>
                        )}
                        {account.webhook_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Shield className="w-3 h-3" />
                            Webhook Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {!account.is_default && (
                        <button
                          onClick={() => handleSetDefault(account._id)}
                          disabled={settingDefault === account._id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-surface-200 text-surface-700 hover:bg-surface-50 transition-colors disabled:opacity-50"
                        >
                          {settingDefault === account._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Star className="w-3.5 h-3.5" />
                          )}
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Meta info row */}
                  <div className="mt-4 pt-3 border-t border-surface-100 flex items-center gap-4 text-[12px] text-surface-400">
                    <span>WABA: {account.waba_id}</span>
                    <span className="text-surface-200">|</span>
                    <span>Phone ID: {account.phone_number_id}</span>
                    {account.created_at && (
                      <>
                        <span className="text-surface-200">|</span>
                        <span>Connected: {new Date(account.created_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
