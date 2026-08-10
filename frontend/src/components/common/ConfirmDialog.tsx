import React from 'react';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  isLoading = false,
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm glass-card rounded-2xl border border-slate-700/80 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
        {/* Icon + Title */}
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${
            variant === 'danger'
              ? 'bg-rose-950/80 border border-rose-700'
              : 'bg-amber-950/80 border border-amber-700'
          }`}>
            <AlertTriangle className={`h-5 w-5 ${variant === 'danger' ? 'text-rose-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">{title}</h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
