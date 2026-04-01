import { X } from 'lucide-react';

export default function PortalModal({ open, title, subtitle, onClose, children, size = 'lg' }) {
  if (!open) return null;

  const sizeClass =
    size === 'xl'
      ? 'max-w-6xl'
      : size === 'md'
        ? 'max-w-2xl'
        : 'max-w-4xl';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-[#081425]/55 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClass} max-h-[90vh] overflow-hidden rounded-[32px] bg-white shadow-2xl shadow-slate-900/20`}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 sm:px-8">
          <div>
            <h2 className="font-display text-2xl font-semibold text-gray-900">{title}</h2>
            {subtitle ? <p className="text-sm text-gray-500 mt-1">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-5.5rem)] overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
          {children}
        </div>
      </div>
    </div>
  );
}
