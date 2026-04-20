import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({
  label,
  helper,
  error,
  icon: Icon,
  iconRight: IconRight,
  type = 'text',
  className = '',
  inputClassName = '',
  required = false,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-surface-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
            <Icon className="w-[18px] h-[18px]" />
          </div>
        )}
        <input
          type={inputType}
          className={`
            w-full h-11 px-3.5 text-sm text-surface-800 bg-white
            border border-surface-200 rounded-md shadow-input
            placeholder:text-surface-400
            transition-all duration-150
            hover:border-surface-300
            focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none
            disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : ''}
            ${isPassword || IconRight ? 'pr-10' : ''}
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${inputClassName}
          `}
          required={required}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
          </button>
        )}
        {IconRight && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
            <IconRight className="w-[18px] h-[18px]" />
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helper && !error && <p className="text-sm text-surface-500">{helper}</p>}
    </div>
  );
}

export function Textarea({
  label,
  helper,
  error,
  maxLength,
  className = '',
  required = false,
  rows = 4,
  ...props
}) {
  const [count, setCount] = useState(props.value?.length || 0);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-surface-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        maxLength={maxLength}
        className={`
          w-full px-3.5 py-3 text-sm text-surface-800 bg-white
          border border-surface-200 rounded-md shadow-input resize-y
          placeholder:text-surface-400
          transition-all duration-150
          hover:border-surface-300
          focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none
          disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed
          ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}
        `}
        onChange={(e) => {
          setCount(e.target.value.length);
          props.onChange?.(e);
        }}
        required={required}
        {...props}
      />
      <div className="flex items-center justify-between">
        {error ? <p className="text-sm text-red-600">{error}</p> : helper ? <p className="text-sm text-surface-500">{helper}</p> : <span />}
        {maxLength && <span className="text-xs text-surface-400">{count}/{maxLength}</span>}
      </div>
    </div>
  );
}

export function Select({
  label,
  helper,
  error,
  icon: Icon,
  options = [],
  placeholder = 'Select...',
  className = '',
  required = false,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-surface-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
            <Icon className="w-[18px] h-[18px]" />
          </div>
        )}
        <select
          className={`
            w-full h-11 px-3.5 text-sm text-surface-800 bg-white appearance-none
            border border-surface-200 rounded-md shadow-input
            transition-all duration-150
            hover:border-surface-300
            focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none
            disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : ''}
            pr-10
            ${error ? 'border-red-400' : ''}
          `}
          required={required}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helper && !error && <p className="text-sm text-surface-500">{helper}</p>}
    </div>
  );
}
