const colorMap = {
  green:  'bg-green-50 text-green-700 border-green-200',
  red:    'bg-red-50 text-red-700 border-red-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  gray:   'bg-surface-100 text-surface-600 border-surface-200',
  brand:  'bg-brand-50 text-brand-700 border-brand-200',
};

const dotColorMap = {
  green:  'bg-green-500',
  red:    'bg-red-500',
  yellow: 'bg-amber-500',
  blue:   'bg-blue-500',
  purple: 'bg-purple-500',
  gray:   'bg-surface-400',
  brand:  'bg-brand-500',
};

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
};

export default function Badge({
  children,
  color = 'gray',
  size = 'sm',
  dot = false,
  icon: Icon,
  className = '',
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium border rounded-full
        ${colorMap[color]}
        ${sizeMap[size]}
        ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColorMap[color]}`} />}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}
