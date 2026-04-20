export default function Card({ children, className = '', hover = false, padding = 'default', ...props }) {
  const paddings = {
    none: '',
    sm: 'p-4',
    default: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={`
        bg-white border border-surface-200 rounded-xl shadow-card
        ${hover ? 'hover:shadow-card-hover hover:border-surface-300 transition-all duration-200 cursor-pointer' : ''}
        ${paddings[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, sublabel, trend, icon: Icon, iconBg = 'bg-brand-50', iconColor = 'text-brand-600' }) {
  const isPositive = trend > 0;

  return (
    <Card className="flex items-start gap-4">
      {Icon && (
        <div className={`flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-surface-900 mt-0.5">{value}</p>
        {(sublabel || trend !== undefined) && (
          <div className="flex items-center gap-2 mt-1">
            {trend !== undefined && (
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{trend}%
              </span>
            )}
            {sublabel && <span className="text-xs text-surface-400">{sublabel}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}
