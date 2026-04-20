import { Component } from 'react';
import { MessageCircle, RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[WBIZ ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
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

            {/* Error Icon */}
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight mb-2">
              Something went wrong
            </h1>
            <p className="text-[13px] text-surface-500 mb-6 leading-relaxed">
              An unexpected error occurred. Please try refreshing the page or go back to the dashboard.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold rounded-lg transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
              <button
                onClick={() => { window.location.href = '/portal/dashboard'; }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 text-surface-700 text-[13px] font-semibold rounded-lg hover:bg-surface-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
            </div>

            {/* Error details (dev only) */}
            {this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-[11px] text-surface-400 cursor-pointer hover:text-surface-600 transition-colors">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-surface-100 rounded-lg text-[11px] text-surface-600 overflow-x-auto whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <p className="text-[11px] text-surface-300 mt-8">
              WBIZ.IN — Your Business. Your WhatsApp. One Powerful Platform.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
