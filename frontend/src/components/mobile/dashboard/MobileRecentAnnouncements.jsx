import React from 'react';
import { Bell, FileText, ChevronRight } from 'lucide-react';

export default function MobileRecentAnnouncements({
  announcements = [],
  onOpenAllAnnouncements,
  onOpenPdf
}) {
  const top3 = (announcements || []).slice(0, 3);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs space-y-1.5">
      {/* Header Pengumuman Dinas */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
        <div className="flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-red-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase">
            Pengumuman Dinas
          </h3>
        </div>
        {onOpenAllAnnouncements && (
          <button
            type="button"
            onClick={onOpenAllAnnouncements}
            className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:underline transition-colors duration-100 cursor-pointer flex items-center gap-0.5"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Konten Pengumuman */}
      {top3.length === 0 ? (
        <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-[10px]">Belum ada edaran atau pengumuman dinas baru.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {top3.map((ann) => {
            const dateStr = ann.created_at ? ann.created_at.split('T')[0] : (ann.date || '');
            const refNo = ann.reference_number || ann.refNo || 'ARFF-EDARAN';
            const snippet = ann.content || ann.snippet || ann.description || 'Surat edaran resmi operasional ARFF YIA.';

            return (
              <div
                key={ann.id}
                onClick={() => onOpenPdf && onOpenPdf(ann)}
                className="p-2 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors duration-100 cursor-pointer space-y-0.5"
              >
                <div className="flex items-center justify-between text-[9px] text-slate-400">
                  <span className="font-mono text-slate-500 font-semibold">{refNo}</span>
                  <span>{dateStr}</span>
                </div>
                <h4 className="text-[11px] font-bold text-slate-900 leading-tight flex items-start justify-between gap-1">
                  <span className="line-clamp-1">{ann.title}</span>
                  <FileText className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                </h4>
                <p className="text-[10px] text-slate-600 line-clamp-2 leading-snug">
                  {snippet}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
