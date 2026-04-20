import { useNavigate } from 'react-router-dom';
import { MessageCircle, Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-[18px] font-extrabold text-surface-900 tracking-tight">WBIZ.IN</span>
        </div>

        {/* 404 */}
        <div className="w-20 h-20 rounded-2xl bg-surface-100 border border-surface-200 flex items-center justify-center mx-auto mb-5">
          <span className="text-[28px] font-extrabold text-surface-300">404</span>
        </div>

        <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight mb-2">
          Page not found
        </h1>
        <p className="text-[13px] text-surface-500 mb-6 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/portal/dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 text-surface-700 text-[13px] font-semibold rounded-lg hover:bg-surface-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        <p className="text-[11px] text-surface-300 mt-8">
          WBIZ.IN — Your Business. Your WhatsApp. One Powerful Platform.
        </p>
      </div>
    </div>
  );
}
