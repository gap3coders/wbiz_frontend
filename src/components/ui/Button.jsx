import { Loader2 } from 'lucide-react';

const variants = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  secondary: 'bg-surface-100 text-surface-700 hover:bg-surface-200 active:bg-surface-300 border border-surface-200',
  outline:   'border border-surface-300 text-surface-700 hover:bg-surface-50 active:bg-surface-100',
  ghost:     'text-surface-600 hover:bg-surface-100 active:bg-surface-200',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
  success:   'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm',
  whatsapp:  'bg-brand-500 text-white hover:bg-[#1ebf5a] active:bg-brand-600 shadow-sm',
};

const sizes = {
  xs: 'h-8 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-9 px-3 text-sm gap-2 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 px-6 text-lg gap-2.5 rounded-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 select-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className={size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      ) : null}
      {children}
      {IconRight && !loading && <IconRight className="w-4 h-4" />}
    </button>
  );
}
