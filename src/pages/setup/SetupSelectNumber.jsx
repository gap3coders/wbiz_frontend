import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import SetupLayout from '../../components/setup/SetupLayout';
import {
  Loader2, Phone, CheckCircle2, Building2, AlertCircle, Signal,
} from 'lucide-react';

const QUALITY_STYLES = {
  green:  'bg-brand-50 text-brand-700 border-brand-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  red:    'bg-red-50 text-red-700 border-red-200',
};

export default function SetupSelectNumber() {
  const navigate = useNavigate();
  const { fetchUser } = useAuth();
  const [wabaAccounts, setWabaAccounts] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('waba_accounts');
    if (!stored) {
      navigate('/portal/setup/connect');
      return;
    }
    const parsed = JSON.parse(stored);
    setWabaAccounts(parsed);

    // Auto-select if only one WABA with one number
    if (parsed.length === 1 && parsed[0].phone_numbers?.length === 1) {
      setSelectedPhone({
        waba_id: parsed[0].id,
        phone_number_id: parsed[0].phone_numbers[0].id,
        display: parsed[0].phone_numbers[0].display_phone_number,
        name: parsed[0].phone_numbers[0].verified_name,
      });
    }
  }, [navigate]);

  const handleConfirm = async () => {
    if (!selectedPhone) return toast.error('Please select a phone number');

    setSaving(true);
    setError('');

    try {
      await api.post('/meta/save-config', {
        waba_id: selectedPhone.waba_id,
        phone_number_id: selectedPhone.phone_number_id,
      });

      sessionStorage.removeItem('waba_accounts');
      toast.success('WhatsApp Business account connected!');
      await fetchUser();
      navigate('/portal/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save configuration. Please try again.');
      setSaving(false);
    }
  };

  const qualityColor = (rating) =>
    QUALITY_STYLES[rating?.toLowerCase()] || 'bg-surface-100 text-surface-600 border-surface-200';

  return (
    <SetupLayout step={3} backTo="/portal/setup/connect">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-500/25">
          <Phone className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 mb-2 tracking-tight">
          Select your phone number
        </h1>
        <p className="text-[15px] text-surface-500 max-w-md mx-auto leading-relaxed">
          Choose which WhatsApp Business number to connect to this platform.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50/60 border border-red-200/60 rounded-xl p-4 mb-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-red-700 leading-snug">{error}</p>
        </div>
      )}

      {/* WABA list */}
      <div className="space-y-5 mb-6">
        {wabaAccounts.map((waba) => (
          <div key={waba.id} className="bg-white rounded-2xl border border-surface-200/80 shadow-card overflow-hidden">
            {/* WABA header */}
            <div className="px-5 py-3.5 bg-surface-50/60 border-b border-surface-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-200/60 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-surface-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-surface-900 truncate">{waba.name}</p>
                <p className="text-[11px] text-surface-400 font-mono">WABA {waba.id}</p>
              </div>
            </div>

            {/* Phone numbers */}
            <div className="divide-y divide-surface-100">
              {waba.phone_numbers?.map((phone) => {
                const isSelected =
                  selectedPhone?.waba_id === waba.id &&
                  selectedPhone?.phone_number_id === phone.id;

                return (
                  <label
                    key={phone.id}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-all hover:bg-brand-50/30 ${
                      isSelected
                        ? 'bg-brand-50/40 ring-1 ring-inset ring-brand-200'
                        : ''
                    }`}
                  >
                    {/* Custom radio */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-brand-500'
                          : 'border-surface-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <input
                      type="radio"
                      name="phone_number"
                      checked={isSelected}
                      onChange={() =>
                        setSelectedPhone({
                          waba_id: waba.id,
                          phone_number_id: phone.id,
                          display: phone.display_phone_number,
                          name: phone.verified_name,
                        })
                      }
                      className="sr-only"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Phone className="w-4 h-4 text-surface-400" />
                        <span className="text-[14px] font-bold text-surface-900">
                          {phone.display_phone_number}
                        </span>
                      </div>
                      <p className="text-[12px] text-surface-500">
                        {phone.verified_name || 'Unverified'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {phone.quality_rating && (
                        <span
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 border ${qualityColor(
                            phone.quality_rating,
                          )}`}
                        >
                          <Signal className="w-3 h-3" />
                          {phone.quality_rating}
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border ${
                          phone.status === 'CONNECTED'
                            ? 'bg-brand-50 text-brand-700 border-brand-200'
                            : 'bg-surface-100 text-surface-600 border-surface-200'
                        }`}
                      >
                        {phone.status || 'Unknown'}
                      </span>
                    </div>
                  </label>
                );
              })}

              {(!waba.phone_numbers || waba.phone_numbers.length === 0) && (
                <div className="px-6 py-10 text-center">
                  <p className="text-[13px] text-surface-400">No phone numbers found under this WABA.</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected summary */}
      {selectedPhone && (
        <div className="bg-brand-50/40 border border-brand-200/60 rounded-xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-brand-600 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-brand-900">Selected: {selectedPhone.display}</p>
            <p className="text-[11px] text-brand-700">{selectedPhone.name}</p>
          </div>
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!selectedPhone || saving}
        className="w-full py-3.5 px-6 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:from-surface-200 disabled:to-surface-200 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-[14px] shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35 disabled:shadow-none"
      >
        {saving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Connecting...
          </>
        ) : (
          <>
            <span>Confirm & Complete Setup</span>
            <CheckCircle2 className="w-4 h-4" />
          </>
        )}
      </button>
    </SetupLayout>
  );
}
