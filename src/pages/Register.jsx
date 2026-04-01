import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, ArrowRight, MessageSquare } from 'lucide-react';

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
    phone: '', company_name: '', country: 'India', industry: '',
    whatsapp_number: '', terms: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Debounced email uniqueness check
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

  // Password strength
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
      { label: 'Strong', color: 'bg-emerald-500' },
    ];
    return { score, ...(levels[score - 1] || { label: '', color: '' }) };
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.terms) return toast.error('Please accept the Terms of Service');
    if (form.password !== form.confirm_password) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      const result = await register(form);
      toast.success('Account created! Check your email to verify.');
      navigate('/login', { state: { registered: true, email: form.email } });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] bg-brand-gradient flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-10 w-72 h-72 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-display font-bold text-xl">WhatsApp SaaS</span>
          </div>
          <h1 className="text-white font-display text-4xl font-bold leading-tight mb-4">
            Connect your business<br />to WhatsApp
          </h1>
          <p className="text-emerald-100 text-lg leading-relaxed max-w-md">
            Start messaging your customers on WhatsApp in minutes. Live chat, bulk campaigns, templates, and analytics — all in one platform.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-6 text-emerald-200 text-sm">
          <span>14-day free trial</span>
          <span className="w-1 h-1 rounded-full bg-emerald-300" />
          <span>No credit card required</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-lg animate-fade-in-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-gray-900">WhatsApp SaaS</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
          <p className="text-gray-500 mb-8">Get started with your 14-day free trial</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name *</label>
                <input name="full_name" value={form.full_name} onChange={handleChange} required minLength={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm transition-all hover:border-gray-300" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Work email *</label>
                <div className="relative">
                  <input name="email" type="email" value={form.email} onChange={handleChange} required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm pr-10 transition-all hover:border-gray-300" placeholder="you@company.com" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailChecking && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                    {!emailChecking && emailAvailable === true && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {!emailChecking && emailAvailable === false && <XCircle className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
                {emailAvailable === false && <p className="text-xs text-red-500 mt-1">This email is already registered</p>}
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                <div className="relative">
                  <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} required minLength={8}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm pr-10 transition-all hover:border-gray-300" placeholder="Min 8 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`flex-1 rounded-full transition-all ${i <= pwStrength.score ? pwStrength.color : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">{pwStrength.label}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password *</label>
                <div className="relative">
                  <input name="confirm_password" type={showConfirm ? 'text' : 'password'} value={form.confirm_password} onChange={handleChange} required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm pr-10 transition-all hover:border-gray-300" placeholder="Repeat password" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.confirm_password && form.password !== form.confirm_password && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
            </div>

            {/* Phone + Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number *</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm transition-all hover:border-gray-300" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company name *</label>
                <input name="company_name" value={form.company_name} onChange={handleChange} required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm transition-all hover:border-gray-300" placeholder="Acme Inc." />
              </div>
            </div>

            {/* Country + Industry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country *</label>
                <select name="country" value={form.country} onChange={handleChange} required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm transition-all hover:border-gray-300">
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
                <select name="industry" value={form.industry} onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm transition-all hover:border-gray-300">
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>

            {/* WhatsApp number (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Business number <span className="text-gray-400">(optional)</span></label>
              <input name="whatsapp_number" type="tel" value={form.whatsapp_number} onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm transition-all hover:border-gray-300" placeholder="+91 98765 43210" />
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" name="terms" checked={form.terms} onChange={handleChange}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
              <span className="text-sm text-gray-600 group-hover:text-gray-800">
                I agree to the <a href="/terms" className="text-emerald-600 font-medium hover:underline">Terms of Service</a> and{' '}
                <a href="/privacy" className="text-emerald-600 font-medium hover:underline">Privacy Policy</a>
              </span>
            </label>

            {/* Submit */}
            <button type="submit" disabled={loading || emailAvailable === false}
              className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-600/20">
              {loading ? <span className="spinner" /> : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account? <Link to="/login" className="text-emerald-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
