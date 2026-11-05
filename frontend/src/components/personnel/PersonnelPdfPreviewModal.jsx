import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, ExternalLink, FileText, Shield, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import Button from '../common/Button';
import { fetchPersonnelReportPdfBlob, downloadPersonnelReportPdf } from '../../services/reportService';
import { getErrorMessage } from '../../utils/errorHelper';

export default function PersonnelPdfPreviewModal({ isOpen, onClose, selectedTeam, token }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  const loadPdfBlob = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await fetchPersonnelReportPdfBlob({ team: selectedTeam, token });
      if (blob) {
        const createdUrl = URL.createObjectURL(blob);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return createdUrl;
        });
      }
    } catch (err) {
      console.error('Error fetching personnel PDF blob:', err);
      setError(err?.message || 'Gagal memuat dokumen PDF.');
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, token]);

  useEffect(() => {
    if (!isOpen) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    loadPdfBlob();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, loadPdfBlob]);

  if (!isOpen) return null;

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (blobUrl) {
        // Gunakan blob yang sudah ter-buffer di memori untuk unduhan instan tanpa re-fetch
        const teamLabel = selectedTeam && selectedTeam !== 'ALL' ? `_${selectedTeam}` : '';
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Buku_Induk_Personel_ARFF_YIA${teamLabel}_${today}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        await downloadPersonnelReportPdf({ team: selectedTeam, token });
      }
    } catch (err) {
      console.error('Error downloading personnel PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const filterLabel = (selectedTeam && selectedTeam !== 'ALL')
    ? (selectedTeam.toLowerCase().startsWith('regu') ? selectedTeam : `Regu ${selectedTeam}`)
    : 'Seluruh Regu (A-D & Non-Shift)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 overflow-hidden animate-in fade-in">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[90vh] overflow-hidden">
        {/* Header Modal - Clean & Grounded */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Buku Induk Personel ARFF YIA
              </h3>
              <p className="text-xs text-slate-500">
                Dokumen Resmi Kedinasan • <span className="font-semibold text-slate-700">{filterLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              icon={ExternalLink}
              onClick={handleOpenNewTab}
              disabled={!blobUrl || loading}
              title="Buka di Tab Baru"
            >
              Tab Baru
            </Button>

            <Button
              variant="primary"
              size="xs"
              icon={Download}
              onClick={handleDownload}
              loading={isDownloading}
              disabled={!blobUrl || loading || isDownloading}
              title="Unduh Berkas PDF"
            >
              Unduh PDF
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-100 cursor-pointer ml-1"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Viewer (Native Browser PDF Blob Stream) */}
        <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-700">
                Memproses dan merender dokumen Buku Induk Personel...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center p-8 max-w-md text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Gagal Memuat Pratinjau</h4>
              <p className="text-xs text-slate-500">{getErrorMessage(error, 'Gagal memuat dokumen PDF.')}</p>
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={loadPdfBlob}
              >
                Coba Muat Ulang
              </Button>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <object
              data={`${blobUrl}#toolbar=1&view=FitH`}
              type="application/pdf"
              className="w-full h-full border-0"
            >
              <iframe
                src={`${blobUrl}#toolbar=1&view=FitH`}
                title="Buku Induk Personel ARFF YIA"
                className="w-full h-full border-0"
              >
                <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white space-y-3">
                  <FileText className="w-12 h-12 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">
                    Pratinjau PDF tidak dapat ditampilkan langsung di browser ini.
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Gunakan tombol di bawah untuk membuka dokumen di penampil PDF bawaan perangkat atau mengunduh berkas.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button variant="primary" size="sm" icon={ExternalLink} onClick={handleOpenNewTab}>
                      Buka Dokumen PDF
                    </Button>
                    <Button variant="outline" size="sm" icon={Download} onClick={handleDownload} loading={isDownloading}>
                      Unduh PDF
                    </Button>
                  </div>
                </div>
              </iframe>
            </object>
          )}
        </div>

        {/* Footer Strip */}
        <div className="px-5 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dokumen resmi terverifikasi dengan pengesahan digital Airport Technology & ARFF Dept Head.</span>
          </div>
          <Button variant="outline" size="xs" onClick={onClose}>
            Tutup Pratinjau
          </Button>
        </div>
      </div>
    </div>
  );
}
