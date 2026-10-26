import React from 'react';
import { X } from 'lucide-react';

export default function ActivityPhotoModal({
  photoUrl = null,
  onClose,
}) {
  if (!photoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl max-h-[85vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end p-1">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 p-1 rounded-lg"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <img
          src={photoUrl}
          alt="Pratinjau Foto Penuh"
          className="max-h-[75vh] w-auto mx-auto object-contain rounded-lg"
        />
      </div>
    </div>
  );
}
