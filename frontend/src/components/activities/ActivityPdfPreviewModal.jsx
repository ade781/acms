import React from 'react';
import { FileText, Download, ExternalLink, X, RefreshCw, AlertTriangle } from 'lucide-react';
import Button from '../common/Button';

export default function ActivityPdfPreviewModal({
  isOpen = false,
  onClose,
  previewPdfUrl = null,
  isLoading = false,
  error = null,
  onRetry,
  onDownload,
  isDownloading = false,
  periodLabel = '',
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/70 animate-in fade-in duration-150 font-sans">
      <div className="bg-white w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pratinjau Dokumen PDF Logbook Kegiatan
              </h3>
              <p className="text-xs text-slate-500">
                Periode: <span className="font-mono tabular-nums font-medium">{periodLabel || 'Logbook Operasional'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {previewPdfUrl && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={ExternalLink}
                  onClick={() => window.open(previewPdfUrl, '_blank')}
                  title="Buka PDF di tab baru browser"
                >
                  Buka Tab Baru
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Download}
                  onClick={onDownload}
                  loading={isDownloading}
                >
                  Unduh PDF
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors duration-100 ml-1 cursor-pointer"
              title="Tutup Pratinjau"
              aria-label="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Area Pratinjau Dokumen */}
        <div className="flex-1 bg-slate-100 p-2 sm:p-4 flex flex-col items-center justify-center overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-500 text-xs py-16">
              <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
              <p className="font-semibold text-slate-700 text-sm">
                Menyusun & Merender Dokumen PDF...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs space-y-3">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">
                {typeof error === 'string' ? error : 'Gagal memuat pratinjau dokumen PDF logbook kegiatan.'}
              </p>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Coba Muat Ulang
                </Button>
              )}
            </div>
          ) : previewPdfUrl ? (
            <iframe
              src={`${previewPdfUrl}#toolbar=1&navpanes=0`}
              title="Pratinjau PDF Logbook Kegiatan Resmi"
              className="w-full h-full rounded-xl border border-slate-300 shadow-inner bg-white"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

