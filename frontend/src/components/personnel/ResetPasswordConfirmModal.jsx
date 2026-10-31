import React from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';

export default function ResetPasswordConfirmModal({
  isOpen,
  onClose,
  personnel,
  onConfirm,
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose();
      }}
      title="Konfirmasi Reset Kata Sandi"
      subtitle="Atur ulang kata sandi personel ke nilai bawaan sistem"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={loading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Ya, Reset Kata Sandi
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
        <p>
          Apakah Anda yakin ingin mereset kata sandi akun untuk <strong>{personnel?.full_name}</strong>?
        </p>
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
          <span className="font-bold block">• Kata sandi baru akan diatur ke: <strong className="font-mono tabular-nums">123456</strong></span>
          <span className="block">• Pengguna akan diwajibkan mengganti kata sandi secara mandiri pada saat login pertama kali.</span>
        </div>
      </div>
    </Modal>
  );
}
