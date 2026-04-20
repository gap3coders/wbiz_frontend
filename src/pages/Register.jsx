import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, User, Mail, Phone, Building2, Lock, Globe, MessageCircle } from 'lucide-react';
import { COUNTRY_PHONE_OPTIONS, detectDefaultCountryOption, parsePhoneInput } from '../utils/phone';

const INDUSTRIES = [
  'E-commerce', 'Healthcare', 'Finance', 'Education', 'Real Estate',
  'Travel & Hospitality', 'Food & Beverage', 'Technology', 'Retail', 'Other',
];

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'UAE', 'Saudi Arabia',
  'Singapore', 'Australia', 'Canada', 'Germany', 'Brazil', 'Nigeria',
  'South Africa', 'Indonesia', 'Philippines', 'Other',
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const emailTimeout = useRef(null);

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    phone: '', phone_country_code: '91', phone_number: '',
    company_name: '', country: 'India', industry: '',
    whatsapp_number: '', whatsapp_country_code: '91', whatsapp_phone_number: '', terms: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  useEffect(() => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setEmailAvailable(null);
      return;
    }
    setEmailChecking(true);
    clearTimeout(emailTimeout.current);
    emailTimeout.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/check-email?email=${form.email}`);
        setEmailAvailable(data.data.available);
      } catch {
        setEmailAvailable(null);
      } finally {
        setEmailChecking(false);
      }
    }, 500);
    return () => clearTimeout(emailTimeout.current);
  }, [form.email]);

  const pwStrength = (() => {
    const p = form.password;
    if (!p) return { score: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const levels = [
      { label: 'Weak', color: 'bg-red-500' },
      { label: 'Fair', color: 'bg-orange-500' },
      { label: 'Good', color: 'bg-yellow-500' },
      { label: 'Strong', color: 'bg-brand-500' },
    ];
    return { score, ...(levels[score - 1] || { label: '', color: '' }) };
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.terms) return toast.error('Please accept the Terms of Service');
    if (form.password !== form.confirm_password) return toast.error('Passwords do not match');

    const parsedPhone = parsePhoneInput({
      phone: form.phone,
      country_code: form.phone_country_code,
      phone_number: form.phone_number,
      default_country_code: form.phone_country_code || '91',
    });
    if (!parsedPhone.ok) return toast.error(parsedPhone.error);

    const parsedWhatsApp = form.whatsapp_phone_number || form.whatsapp_number
      ? parsePhoneInput({
          phone: form.whatsapp_number,
          country_code: form.whatsapp_country_code,
          phone_number: form.whatsapp_phone_number,
          default_country_code: form.whatsapp_country_code || form.phone_country_code || '91',
        })
      : null;
    if (parsedWhatsApp && !parsedWhatsApp.ok) return toast.error(`WhatsApp number: ${parsedWhatsApp.error}`);

    setLoading(true);
    try {
      const payload = {
        ...form,
        phone: parsedPhone.phone,
        whatsapp_number: parsedWhatsApp?.phone || '',
      };
      const result = await register(payload);
      toast.success('Account created! Check your email to verify.');
      navigate('/login', { state: { registered: true, email: form.email } });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    detectDefaultCountryOption().then((option) => {
      if (!mounted || !option) return;
      setForm((current) => ({
        ...current,
        phone_country_code: current.phone_country_code || option.dialCode,
        whatsapp_country_code: current.whatsapp_country_code || option.dialCode,
      }));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const inputCls = 'w-full px-3.5 py-2.5 rounded-lg border border-surface-200 bg-white text-sm text-gray-900 placeholder-surface-400 transition-all focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500';
  const selectCls = inputCls;
  const labelCls = 'block text-sm font-semibold text-gray-900 mb-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-white to-brand-50/30 flex items-center justify-center p-4 py-8">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-100 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-100 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-500 to-emerald-600 rounded-xl mb-4">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">WBIZ.IN</h1>
          <p className="text-sm text-surface-600">WhatsApp Business Platform</p>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 p-8 mb-6">
          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Create your account</h2>
            <p className="text-sm text-surface-600">Get started with your 14-day free trial</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full name */}
            <div>
              <label className={labelCls}>Full name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="full_name" value={form.full_name} onChange={handleChange} required minLength={2}
                  className={`${inputCls} pl-10`} placeholder="John Doe" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Work email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="email" type="email" value={form.email} onChange={handleChange} required
                  className={`${inputCls} pl-10 pr-10`} placeholder="you@company.com" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {emailChecking && <Loader2 className="w-4 h-4 text-surface-400 animate-spin" />}
                  {!emailChecking && emailAvailable === true && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
                  {!emailChecking && emailAvailable === false && <XCircle className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              {emailAvailable === false && <p className="text-xs text-red-500 mt-1.5">Already registered</p>}
            </div>

            {/* Phone number */}
            <div>
              <label className={labelCls}>Phone number</label>
              <div className="flex gap-2">
                <select name="phone_country_code" value={form.phone_country_code} onChange={handleChange} className={`${selectCls} flex-shrink-0 w-[80px] text-center`}>
                  {COUNTRY_PHONE_OPTIONS.map((option) => (
                    <option key={`${option.iso2}-${option.dialCode}`} value={option.dialCode}>
                      +{option.dialCode}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input name="phone_number" type="tel" value={form.phone_number} onChange={(event) => setForm((prev) => ({ ...prev, phone_number: event.target.value.replace(/[^\d]/g, ''), phone: `${prev.phone_country_code}${event.target.value.replace(/[^\d]/g, '')}` }))} required
                    className={`${inputCls} pl-10`} placeholder="9876543210" />
                </div>
              </div>
            </div>

            {/* Company name */}
            <div>
              <label className={labelCls}>Company name</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="company_name" value={form.company_name} onChange={handleChange} required
                  className={`${inputCls} pl-10`} placeholder="Acme Inc." />
              </div>
            </div>

            {/* Country and Industry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Country</label>
                <select name="country" value={form.country} onChange={handleChange} required className={selectCls}>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Industry</label>
                <select name="industry" value={form.industry} onChange={handleChange} className={selectCls}>
                  <option value="">Select...</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>

            {/* WhatsApp number */}
            <div>
              <label className={labelCls}>WhatsApp Business number <span className="text-surface-400 font-normal">(optional)</span></label>
              <div className="flex gap-2">
                <select name="whatsapp_country_code" value={form.whatsapp_country_code} onChange={handleChange} className={`${selectCls} flex-shrink-0 w-[80px] text-center`}>
                  {COUNTRY_PHONE_OPTIONS.map((option) => (
                    <option key={`wa-${option.iso2}-${option.dialCode}`} value={option.dialCode}>
                      +{option.dialCode}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input name="whatsapp_phone_number" type="tel" value={form.whatsapp_phone_number} onChange={(event) => setForm((prev) => ({ ...prev, whatsapp_phone_number: event.target.value.replace(/[^\d]/g, ''), whatsapp_number: `${prev.whatsapp_country_code}${event.target.value.replace(/[^\d]/g, '')}` }))}
                    className={`${inputCls} pl-10`} placeholder="9876543210" />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} required minLength={8}
                  className={`${inputCls} pl-10 pr-10`} placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 p-1 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden flex gap-0.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`flex-1 rounded-full transition-all ${i <= pwStrength.score ? pwStrength.color : 'bg-surface-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-surface-600 font-medium">{pwStrength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelCls}>Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="confirm_password" type={showConfirm ? 'text' : 'password'} value={form.confirm_password} onChange={handleChange} required
                  className={`${inputCls} pl-10 pr-10`} placeholder="Repeat password" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 p-1 transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.confirm_password && form.password !== form.confirm_password && (
                <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
              )}
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2 cursor-pointer py-1">
              <input type="checkbox" name="terms" checked={form.terms} onChange={handleChange}
                className="w-4 h-4 rounded border border-surface-200 text-brand-600 bg-white focus:ring-1 focus:ring-brand-500 cursor-pointer mt-0.5" />
              <span className="text-xs text-surface-600 leading-relaxed">
                I agree to the <a href="/terms" className="text-brand-600 font-medium hover:underline">Terms of Service</a> and{' '}
                <a href="/privacy" className="text-brand-600 font-medium hover:underline">Privacy Policy</a>
              </span>
            </label>

            {/* Submit */}
            <button type="submit" disabled={loading || emailAvailable === false}
              className="w-full py-2.5 px-4 mt-2 bg-brand-600 hover:bg-brand-700 disabled:bg-surface-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-surface-600">
          Already have an account? <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
