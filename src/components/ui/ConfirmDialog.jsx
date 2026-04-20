import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center py-2">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
          variant === 'danger' ? 'bg-red-50' : 'bg-amber-50'
        }`}>
          <AlertTriangle className={`w-7 h-7 ${
            variant === 'danger' ? 'text-red-600' : 'text-amber-600'
          }`} />
        </div>
        <h3 className="text-xl font-semibold text-surface-900">{title}</h3>
        <p className="text-sm text-surface-500 mt-2 max-w-sm">{description}</p>
      </div>
    </Modal>
  );
}
