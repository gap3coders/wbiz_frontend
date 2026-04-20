export default function Toggle({ checked, onChange, label, description, disabled = false, className = '' }) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={`
          relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2
          ${checked ? 'bg-brand-500' : 'bg-surface-300'}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm
            transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
      {(label || description) && (
        <div className="pt-0.5">
          {label && <span className="text-sm font-medium text-surface-700">{label}</span>}
          {description && <p className="text-sm text-surface-500 mt-0.5">{description}</p>}
        </div>
      )}
    </label>
  );
}
