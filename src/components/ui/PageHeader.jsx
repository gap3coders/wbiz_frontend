export default function PageHeader({ title, description, icon: Icon, children, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-brand-600" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{title}</h1>
          {description && <p className="text-sm text-surface-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
