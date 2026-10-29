import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';

export default function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  subtitle = 'Tindakan ini memerlukan konfirmasi sebelum diproses',
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  variant = 'danger',
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50/80 border border-red-200">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-slate-700 space-y-1">
            {typeof message === 'string' ? (
              <p className="whitespace-pre-line">{message}</p>
            ) : (
              message
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
