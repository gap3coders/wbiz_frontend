export default function Tabs({ tabs = [], active, onChange, className = '' }) {
  return (
    <div className={`flex overflow-x-auto border-b border-surface-200 ${className}`}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
              border-b-2 transition-colors
              ${isActive
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
              }
            `}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`
                ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full
                ${isActive ? 'bg-brand-50 text-brand-700' : 'bg-surface-100 text-surface-500'}
              `}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
