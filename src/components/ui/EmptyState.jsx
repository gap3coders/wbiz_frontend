import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-surface-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-surface-800">{title}</h3>
      {description && (
        <p className="text-sm text-surface-500 mt-1.5 max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="md"
          icon={actionIcon}
          onClick={onAction}
          className="mt-5"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
