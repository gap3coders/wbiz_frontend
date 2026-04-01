import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MessageSquare, ArrowLeft, Loader2, Phone, CheckCircle2, Building2, AlertCircle, Signal } from 'lucide-react';

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
      await fetchUser(); // Refresh user state to active
      navigate('/portal/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save configuration. Please try again.');
      setSaving(false);
    }
  };

  const qualityColor = (rating) => {
    switch (rating?.toLowerCase()) {
      case 'green': return 'bg-emerald-100 text-emerald-700';
      case 'yellow': return 'bg-amber-100 text-amber-700';
      case 'red': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-gray-900">WhatsApp SaaS</span>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className={`h-2 rounded-full transition-all ${step <= 3 ? (step === 3 ? 'w-8 bg-emerald-500' : 'w-2 bg-emerald-300') : 'w-2 bg-gray-200'}`} />
            ))}
            <span className="text-xs text-gray-400 ml-2">Step 3 of 3</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-16 animate-fade-in-up">
        <button onClick={() => navigate('/portal/setup/connect')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-3">Select your phone number</h1>
          <p className="text-gray-500 text-lg">Choose which WhatsApp Business number to connect to this platform.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* WABA list */}
        <div className="space-y-6 mb-8">
          {wabaAccounts.map((waba) => (
            <div key={waba.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* WABA header */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{waba.name}</p>
                  <p className="text-xs text-gray-500">WABA ID: {waba.id}</p>
                </div>
              </div>

              {/* Phone numbers */}
              <div className="divide-y divide-gray-50">
                {waba.phone_numbers?.map((phone) => {
                  const isSelected =
                    selectedPhone?.waba_id === waba.id &&
                    selectedPhone?.phone_number_id === phone.id;

                  return (
                    <label key={phone.id}
                      className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all hover:bg-emerald-50/50 ${isSelected ? 'bg-emerald-50/80 ring-1 ring-emerald-200 ring-inset' : ''}`}>
                      <input type="radio" name="phone_number" checked={isSelected}
                        onChange={() => setSelectedPhone({
                          waba_id: waba.id,
                          phone_number_id: phone.id,
                          display: phone.display_phone_number,
                          name: phone.verified_name,
                        })}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{phone.display_phone_number}</span>
                        </div>
                        <p className="text-sm text-gray-500">{phone.verified_name || 'Unverified'}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {phone.quality_rating && (
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${qualityColor(phone.quality_rating)}`}>
                            <Signal className="w-3 h-3" />
                            {phone.quality_rating}
                          </span>
                        )}
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${phone.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {phone.status || 'Unknown'}
                        </span>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      )}
                    </label>
                  );
                })}

                {(!waba.phone_numbers || waba.phone_numbers.length === 0) && (
                  <div className="px-6 py-8 text-center">
                    <p className="text-gray-400 text-sm">No phone numbers found under this WABA.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Selected summary */}
        {selectedPhone && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Selected: {selectedPhone.display}</p>
              <p className="text-xs text-emerald-700">{selectedPhone.name}</p>
            </div>
          </div>
        )}

        {/* Confirm button */}
        <button onClick={handleConfirm} disabled={!selectedPhone || saving}
          className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>
          ) : (
            <><span>Confirm & Complete Setup</span><CheckCircle2 className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
