import React from 'react';
import { ExternalLink } from 'lucide-react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import { formatIndoDate, cleanAnnouncementDescription, cleanAnnouncementTitle } from '../../../utils/shiftHelper';

export default function AnnouncementDetailModal({
  isOpen,
  onClose,
  announcement,
  announcements = [],
  getAttachmentUrl = (u) => u
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        cleanAnnouncementTitle(announcement?.title) || 'Pengumuman Operasional'
      }
      subtitle={
        announcement
          ? `${announcement.circular_number ? `No. Edaran: ${announcement.circular_number} • ` : ''}Diterbitkan: ${formatIndoDate(announcement.published_date)}`
          : 'Informasi surat edaran dinas'
      }
      maxWidth="max-w-2xl"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      {!announcement ? (
        <div className="py-8 text-center text-xs font-sans text-slate-500">
          Belum ada pengumuman atau surat edaran operasional yang diterbitkan.
        </div>
      ) : (
        <div className="space-y-4 text-xs font-sans">
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="text-xs font-semibold text-slate-500">Ringkasan / Isi Pengumuman</div>
            <p className="text-slate-800 leading-relaxed whitespace-pre-line">
              {cleanAnnouncementDescription(announcement?.description) || 'Tidak ada ringkasan teks tambahan.'}
            </p>
          </div>

          {announcement.id && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
              <div>
                <div className="font-semibold text-slate-900">
                  {announcement.file_name || 'Lampiran Surat Edaran Resmi (PDF)'}
                </div>
                <div className="text-xs text-slate-500">
                  Diterbitkan oleh: {announcement.creator_name || 'Manajemen ARFF'}
                </div>
              </div>
              <a
                href={getAttachmentUrl(`/api/announcements/${announcement.id}/attachment`)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Buka Dokumen</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {announcements.length > 1 && (
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                Tersedia <span className="font-mono tabular-nums font-semibold">{announcements.length}</span> surat edaran resmi di papan pengumuman ARFF.
              </span>
              <a
                href="/announcements"
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>Buka Seluruh Pengumuman & Arsip</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
