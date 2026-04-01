import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MessageSquare, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

const META_APP_ID = import.meta.env.VITE_META_APP_ID;
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID;
const META_GRAPH_API_VERSION = import.meta.env.VITE_META_GRAPH_API_VERSION || 'v18.0';
const LOG_PREFIX = '[Meta Connect]';

export default function SetupConnect() {
  const navigate = useNavigate();
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [signupSession, setSignupSession] = useState(null);
  const [exchangeStarted, setExchangeStarted] = useState(false);
  const missingMetaConfig = !META_APP_ID || !META_CONFIG_ID;

  const debugLog = (...args) => {
    if (import.meta.env.DEV) console.log(LOG_PREFIX, ...args);
  };
  const debugError = (...args) => {
    if (import.meta.env.DEV) console.error(LOG_PREFIX, ...args);
  };

  // Load Facebook SDK
  useEffect(() => {
    debugLog('SetupConnect mounted', {
      currentUrl: window.location.href,
      hasMetaAppId: Boolean(META_APP_ID),
      hasMetaConfigId: Boolean(META_CONFIG_ID),
      graphApiVersion: META_GRAPH_API_VERSION,
    });

    if (missingMetaConfig) {
      debugError('Missing frontend Meta configuration');
      setError('Meta frontend configuration is missing. Please set VITE_META_APP_ID and VITE_META_CONFIG_ID.');
      return;
    }

    if (window.FB) {
      debugLog('Facebook SDK already present on window');
      setSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = () => {
      debugLog('Initializing Facebook SDK', {
        appId: META_APP_ID,
        version: META_GRAPH_API_VERSION,
      });
      window.FB.init({
        appId: META_APP_ID,
        version: META_GRAPH_API_VERSION,
        cookie: true,
        xfbml: false,
      });
      debugLog('Facebook SDK initialized successfully');
      setSdkLoaded(true);
    };

    if (!document.getElementById('facebook-jssdk')) {
      debugLog('Injecting Facebook SDK script tag');
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [missingMetaConfig]);

  useEffect(() => {
    const sessionInfoListener = (event) => {
      const origin = event.origin || '';
      if (!origin.endsWith('facebook.com')) return;

      try {
        const data =
          typeof event.data === 'string'
            ? JSON.parse(event.data)
            : event.data;

        if (data.type !== 'WA_EMBEDDED_SIGNUP') return;

        debugLog('Embedded Signup message received', {
          origin,
          event: data.event,
          data: data.data || null,
        });

        if (data.event === 'FINISH' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
          setSignupSession({
            business_id: data.data?.business_id || data.data?.businessId || '',
            phone_number_id: data.data?.phone_number_id || '',
            waba_id: data.data?.waba_id || '',
          });
        } else if (data.event === 'ERROR') {
          debugError('Embedded Signup error message received', data.data || null);
          setConnecting(false);
          setError(data.data?.error_message || 'Embedded Signup failed inside Meta. Please try again.');
        } else {
          debugLog('Ignoring non-finish Embedded Signup event', data.event);
          setConnecting(false);
        }
      } catch (err) {
        if (typeof event.data === 'string' && event.data.startsWith('cb=')) {
          debugLog('Ignoring non-JSON Facebook callback message', {
            origin,
            rawDataPreview: event.data.slice(0, 120),
          });
          return;
        }

        debugError('Failed to parse Embedded Signup message', {
          origin,
          rawData: event.data,
          message: err.message,
        });
      }
    };

    debugLog('Registering window message listener for Embedded Signup');
    window.addEventListener('message', sessionInfoListener);
    return () => window.removeEventListener('message', sessionInfoListener);
  }, []);

  useEffect(() => {
    if (!authCode) return;
    debugLog('Received auth code from Facebook login callback', {
      codeLength: authCode.length,
    });
  }, [authCode]);

  useEffect(() => {
    if (!signupSession) return;
    debugLog('Received signup session details', signupSession);
  }, [signupSession]);

  useEffect(() => {
    if (!authCode || !signupSession?.waba_id || exchangeStarted) {
      return;
    }

    debugLog('Starting token exchange with session details', {
      waba_id: signupSession.waba_id,
      phone_number_id: signupSession.phone_number_id || null,
      business_id: signupSession.business_id || null,
    });
    setExchangeStarted(true);
    exchangeCode(authCode, signupSession);
  }, [authCode, signupSession, exchangeStarted]);

  useEffect(() => {
    if (!authCode || signupSession || exchangeStarted) return;

    const timer = window.setTimeout(() => {
      debugError('Timed out waiting for Embedded Signup session details after auth code', {
        currentUrl: window.location.href,
      });
      setConnecting(false);
      setError(
        'Meta completed the popup but did not return WABA details to the app. Add this page URL to Valid OAuth Redirect URIs and retry.'
      );
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [authCode, signupSession, exchangeStarted]);

  const handleConnect = () => {
    if (missingMetaConfig) {
      debugError('Connect clicked but Meta config is missing');
      setError('Meta frontend configuration is missing. Please check your frontend env values.');
      return;
    }

    if (!window.FB) {
      debugError('Connect clicked before Facebook SDK was available');
      setError('Facebook SDK not loaded. Please allow popups and refresh.');
      return;
    }

    debugLog('Opening Facebook Embedded Signup popup', {
      currentUrl: window.location.href,
      configId: META_CONFIG_ID,
      appId: META_APP_ID,
    });
    setConnecting(true);
    setError('');
    setAuthCode('');
    setSignupSession(null);
    setExchangeStarted(false);

    window.FB.login(
      (response) => {
        debugLog('FB.login callback received', {
          status: response.status || null,
          hasAuthResponse: Boolean(response.authResponse),
          hasCode: Boolean(response.authResponse?.code),
        });

        if (response.authResponse?.code) {
          setAuthCode(response.authResponse.code);
        } else {
          debugError('FB.login completed without an auth code', response);
          setConnecting(false);
          setError('Facebook connection was cancelled or failed. Please try again.');
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        },
      }
    );
  };

  const exchangeCode = async (code, session) => {
    try {
      const payload = { code };
      if (session?.waba_id) {
        payload.waba_id = session.waba_id;
        if (session.phone_number_id) payload.phone_number_id = session.phone_number_id;
        if (session.business_id) payload.business_id = session.business_id;
      }

      debugLog('Calling /meta/exchange-token', {
        hasCode: Boolean(code),
        waba_id: payload.waba_id || null,
        phone_number_id: payload.phone_number_id || null,
        business_id: payload.business_id || null,
      });
      const { data } = await api.post('/meta/exchange-token', payload);
      const wabaAccounts = data.data.waba_accounts;

      debugLog('/meta/exchange-token succeeded', {
        wabaCount: wabaAccounts?.length || 0,
        wabaSummary: (wabaAccounts || []).map((account) => ({
          id: account.id,
          business_id: account.business_id || null,
          phone_numbers: (account.phone_numbers || []).map((phone) => ({
            id: phone.id,
            display_phone_number: phone.display_phone_number,
          })),
        })),
      });

      if (!wabaAccounts || wabaAccounts.length === 0) {
        debugError('Exchange returned no WhatsApp Business Accounts');
        setError('No WhatsApp Business Accounts found. Please ensure you have a WABA in your Meta Business Manager.');
        setConnecting(false);
        return;
      }

      // Store WABAs in sessionStorage for the next step
      sessionStorage.setItem('waba_accounts', JSON.stringify(wabaAccounts));
      toast.success('Facebook connected! Now select your phone number.');
      navigate('/portal/setup/select-number');
    } catch (err) {
      debugError('Exchange request failed', {
        message: err.message,
        response: err.response?.data || null,
      });
      setError(err.response?.data?.error || 'Failed to connect Facebook account. Please try again.');
      setConnecting(false);
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
              <div key={step} className={`h-2 rounded-full transition-all ${step <= 2 ? (step === 2 ? 'w-8 bg-emerald-500' : 'w-2 bg-emerald-300') : 'w-2 bg-gray-200'}`} />
            ))}
            <span className="text-xs text-gray-400 ml-2">Step 2 of 3</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-xl mx-auto px-6 py-16 animate-fade-in-up">
        <button onClick={() => navigate('/portal/setup')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-3">Connect your Meta account</h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Authorize access to your WhatsApp Business Account through Facebook.
          </p>
        </div>

        {/* Permissions info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">We'll request access to:</h3>
          <div className="space-y-3">
            {[
              { label: 'WhatsApp Business Management', desc: 'Manage your WABA and phone numbers' },
              { label: 'WhatsApp Business Messaging', desc: 'Send and receive messages on your behalf' },
              { label: 'Business Management', desc: 'Read your business account info' },
            ].map((perm, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-gray-900">{perm.label}</p>
                  <p className="text-xs text-gray-500">{perm.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">Connection failed</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Connect button */}
        <button onClick={handleConnect} disabled={!sdkLoaded || connecting}
          className="w-full py-4 px-6 bg-[#1877F2] hover:bg-[#166FE5] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 text-base shadow-lg shadow-blue-600/20">
          {connecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Connecting to Facebook...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              <span>Connect with Facebook</span>
            </>
          )}
        </button>

        {!sdkLoaded && (
          <p className="text-center text-xs text-gray-400 mt-3">Loading Facebook SDK...</p>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs text-blue-700">
            <strong>Popup blocked?</strong> If the Facebook login window doesn't appear, check your browser's popup blocker and allow popups for this site.
          </p>
        </div>
      </div>
    </div>
  );
}
