import React from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { OFFICIAL_ACTIVITY_CATEGORIES } from '../../utils/activityCategories';

export default function ActivityDeleteModal({
  isOpen = false,
  onClose,
  targetActivity = null,
  onConfirm,
  deleting = false,
}) {
  if (!isOpen || !targetActivity) return null;

  const categoryLabel =
    OFFICIAL_ACTIVITY_CATEGORIES.find((c) => c.value === targetActivity.activity_type)?.label ||
    targetActivity.activity_type;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfirmasi Hapus Kegiatan"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={deleting}>
            Hapus Permanen
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs text-slate-700">
        <p>Apakah Anda yakin ingin menghapus catatan kegiatan berikut dari logbook dinas?</p>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="font-bold text-slate-900">{targetActivity.title}</div>
          <div className="text-slate-500 mt-0.5">
            Pukul {targetActivity.activity_time ? targetActivity.activity_time.slice(0, 5) : '-'} WIB •{' '}
            {categoryLabel}
          </div>
        </div>
        <p className="text-slate-500">
          Lampiran foto yang tersimpan pada server juga akan dihapus secara permanen.
        </p>
      </div>
    </Modal>
  );
}
