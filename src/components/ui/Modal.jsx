import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)]',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closable = true,
  className = '',
}) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === 'Escape' && closable) onClose?.(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, closable, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === overlayRef.current && closable) onClose?.(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />

      {/* Content */}
      <div
        ref={contentRef}
        className={`
          relative w-full ${sizes[size]}
          bg-white shadow-modal
          rounded-t-2xl sm:rounded-xl
          max-h-[90vh] flex flex-col
          animate-scale-in
          ${className}
        `}
      >
        {/* Header */}
        {(title || closable) && (
          <div className="flex items-start justify-between px-6 pt-6 pb-0">
            <div>
              {title && <h2 className="text-xl font-semibold text-surface-900">{title}</h2>}
              {description && <p className="mt-1 text-sm text-surface-500">{description}</p>}
            </div>
            {closable && (
              <button
                onClick={onClose}
                className="p-1.5 -mr-1.5 rounded-md text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 bg-surface-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
