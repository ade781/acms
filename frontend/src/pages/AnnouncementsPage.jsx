import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  FileText,
  UploadCloud,
  Download,
  Calendar,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  AlertCircle,
  ExternalLink,
  Plus,
  Pin,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import InputField from '../components/common/InputField';
import TextareaField from '../components/common/TextareaField';
import StateView from '../components/common/StateView';

export default function HalamanPengumuman() {
  const { user, isAdmin, isSupervisor } = useAuth();
  const canPublish = isAdmin || isSupervisor || ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user?.role);
  const canDelete = isAdmin || ['admin', 'dept_head'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [pdfLoadedForId, setPdfLoadedForId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Konfirmasi Hapus In-App
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteAnnouncement, setTargetDeleteAnnouncement] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const dateFormatted = d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeFormatted = d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }).replace('.', ':');
      return `${dateFormatted}, ${timeFormatted} WIB`;
    } catch {
      return dateStr;
    }
  };

  // Helper penanda pengumuman mendesak / pinned
  const isUrgentAnnouncement = (ann) => {
    return Boolean(
      ann?.is_pinned === 1 ||
      ann?.is_pinned === true ||
      ann?.title?.toUpperCase().includes('[MENDESAK]') ||
      ann?.title?.toUpperCase().includes('PINNED')
    );
  };

  // Modal Upload Pengumuman
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [circularNumber, setCircularNumber] = useState('');
  const [publishedDate, setPublishedDate] = useState(getCurrentDateTimeLocal());
  const [description, setDescription] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/announcements');
      const data = res.data?.data || res.data;
      const list = Array.isArray(data?.announcements) ? data.announcements : (Array.isArray(data) ? data : []);

      // Urutkan pengumuman: Pinned / Mendesak di paling atas, kemudian berdasarkan tanggal terbaru
      const sortedList = [...list].sort((a, b) => {
        const aUrgent = isUrgentAnnouncement(a) ? 1 : 0;
        const bUrgent = isUrgentAnnouncement(b) ? 1 : 0;
        if (aUrgent !== bUrgent) return bUrgent - aUrgent;
        const dateA = new Date(a.published_date || a.created_at || 0).getTime();
        const dateB = new Date(b.published_date || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setAnnouncements(sortedList);
      setUnreadCount(Number(data?.unread_count || 0));

      // Lazy / On-Demand Preview: Hapus pemuatan otomatis dokumen pertama di awal muat halaman agar hemat bandwidth
      setSelectedAnnouncement(null);
      setPdfLoadedForId(null);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Gagal memuat papan pengumuman operasional.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSelectAnnouncement = async (ann) => {
    setSelectedAnnouncement(ann);
    setDownloadError(null);

    // Jika belum dibaca, kirim sinyal read
    const isUnread = Boolean(!ann.is_read || ann.is_read === 0);
    if (isUnread) {
      try {
        await api.post(`/announcements/${ann.id}/read`);
        // Update lokal state seketika
        setAnnouncements((prev) =>
          prev.map((item) => (item.id === ann.id ? { ...item, is_read: 1 } : item))
        );
        setSelectedAnnouncement((prev) => (prev && prev.id === ann.id ? { ...prev, is_read: 1 } : prev));
        setUnreadCount((c) => Math.max(0, c - 1));
        window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
      } catch (e) {
        console.warn('Gagal menandai status baca:', e);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setFormError('Berkas harus berupa dokumen format PDF (.pdf).');
        setPdfFile(null);
        return;
      }
      setFormError(null);
      setPdfFile(file);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Judul pengumuman / surat edaran wajib diisi.');
      return;
    }
    if (!pdfFile) {
      setFormError('Berkas dokumen PDF wajib dipilih.');
      return;
    }

    setSubmitting(true);
    try {
      let finalTitle = title.trim();
      if (isPinned && !finalTitle.toUpperCase().includes('[MENDESAK]')) {
        finalTitle = `[MENDESAK] ${finalTitle}`;
      }

      const formData = new FormData();
      formData.append('title', finalTitle);
      formData.append('circular_number', circularNumber.trim());
      formData.append('published_date', publishedDate);
      formData.append('description', description.trim());
      formData.append('file', pdfFile);
      if (isPinned) {
        formData.append('is_pinned', '1');
      }

      await api.post('/announcements', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadModalOpen(false);
      setTitle('');
      setCircularNumber('');
      setDescription('');
      setIsPinned(false);
      setPdfFile(null);
      fetchAnnouncements();
      setToastMsg({ type: 'success', text: 'Surat edaran dinas berhasil dipublikasikan.' });
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal mempublikasikan pengumuman.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (ann, e) => {
    if (e) e.stopPropagation();
    setTargetDeleteAnnouncement(ann);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetDeleteAnnouncement) return;
    setDeleting(true);
    try {
      await api.delete(`/announcements/${targetDeleteAnnouncement.id}`);
      if (selectedAnnouncement?.id === targetDeleteAnnouncement.id) {
        setSelectedAnnouncement(null);
        setPdfLoadedForId(null);
      }
      setDeleteModalOpen(false);
      setTargetDeleteAnnouncement(null);
      fetchAnnouncements();
      setToastMsg({ type: 'success', text: 'Pengumuman berhasil dihapus.' });
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      setToastMsg({
        type: 'error',
        text: `Gagal menghapus pengumuman: ${err.response?.data?.message || err.message}`
      });
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setDeleting(false);
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.title?.toLowerCase().includes(q) ||
      a.circular_number?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    );
  });

  const getPdfUrl = (filePath, id) => {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
    const token = localStorage.getItem('arff_token') || '';
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    if (id) {
      const baseApi = import.meta.env.VITE_API_URL || '/api';
      return `${baseApi}/announcements/${id}/attachment${tokenQuery}`;
    }
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
    return `${baseUrl}${cleanPath}${tokenQuery}`;
  };

  return (
    <div>
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`mb-4 p-3 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-sm transition-all duration-150 ${
            toastMsg.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="p-1 rounded hover:bg-black/5 text-current cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors duration-100">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Papan Pengumuman & Surat Edaran
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-red-100 text-red-700 border border-red-300">
                  {unreadCount} Baru
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Instruksi dinas resmi, nota dinas pimpinan, dan SOP operasional ARFF YIA.
            </p>
          </div>
        </div>

        {canPublish && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setUploadModalOpen(true)}
          >
            Unggah Edaran Baru
          </Button>
        )}
      </div>

      <StateView
        loading={loading}
        error={error}
        isEmpty={announcements.length === 0}
        emptyTitle="Belum Ada Surat Edaran Dinas"
        emptyDescription="Belum ada surat edaran dinas yang dipublikasikan."
        onRetry={fetchAnnouncements}
      >
        {/* Split View Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Kolom Kiri: List Surat Edaran (5 Kolom) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[750px] overflow-hidden">
            {/* Search Bar & Header */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari edaran atau no. surat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors duration-100"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                <span>{filteredAnnouncements.length} Dokumen Tersedia</span>
                {unreadCount > 0 && (
                  <span className="font-semibold text-red-600">
                    {unreadCount} belum dibaca
                  </span>
                )}
              </div>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
              {filteredAnnouncements.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Tidak ditemukan pengumuman sesuai pencarian.
                </div>
              ) : (
                filteredAnnouncements.map((ann) => {
                  const isSelected = selectedAnnouncement?.id === ann.id;
                  const isUnread = Boolean(!ann.is_read || ann.is_read === 0);

                  return (
                    <div
                      key={ann.id}
                      onClick={() => handleSelectAnnouncement(ann)}
                      className={`p-3.5 rounded-xl cursor-pointer transition-colors duration-100 relative ${
                        isSelected
                          ? 'bg-red-50/80 border-l-4 border-l-red-600 border border-red-200/80 shadow-xs'
                          : isUrgentAnnouncement(ann)
                          ? 'bg-red-50/30 hover:bg-red-50/50 text-slate-800 border-l-4 border-l-red-500 border border-red-200/60'
                          : isUnread
                          ? 'bg-amber-50/50 hover:bg-amber-50 text-slate-800 border border-amber-200/60'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isUrgentAnnouncement(ann) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-600 text-white shadow-xs">
                                <Pin className="w-3 h-3 fill-white" />
                                MENDESAK
                              </span>
                            )}
                            {ann.circular_number && (
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                  isSelected
                                    ? 'bg-red-100 text-red-800 border border-red-200/70'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {ann.circular_number}
                              </span>
                            )}
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Belum dibaca" />
                            )}
                          </div>

                          <h4
                            className={`text-xs font-bold mt-1.5 line-clamp-2 ${
                              isSelected ? 'text-red-950' : 'text-slate-900'
                            }`}
                          >
                            {ann.title}
                          </h4>

                          {ann.description && (
                            <p
                              className={`text-[11px] mt-1 line-clamp-2 ${
                                isSelected ? 'text-slate-600' : 'text-slate-500'
                              }`}
                            >
                              {ann.description}
                            </p>
                          )}

                          <div className="mt-2.5 flex items-center gap-3 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatDateTime(ann.published_date || ann.created_at)}
                            </span>
                            {ann.creator_name && (
                              <span className="truncate">Oleh: {ann.creator_name}</span>
                            )}
                          </div>
                        </div>

                        {/* Delete Button for Admin */}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenDeleteModal(ann, e)}
                            title="Hapus Pengumuman"
                            className="p-1.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-700 transition-colors duration-100 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Kolom Kanan: PDF In-Web Viewer & Actions (7 Kolom) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[750px] overflow-hidden">
            {selectedAnnouncement ? (
              <>
                {/* Header Preview */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Pratinjau Dokumen
                      </span>
                      {selectedAnnouncement.circular_number && (
                        <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded">
                          {selectedAnnouncement.circular_number}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDateTime(selectedAnnouncement.published_date || selectedAnnouncement.created_at)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                      {selectedAnnouncement.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={getPdfUrl(selectedAnnouncement.file_path, selectedAnnouncement.id)}
                      download={selectedAnnouncement.file_name || 'pengumuman.pdf'}
                      onClick={(e) => {
                        if (!selectedAnnouncement.file_path) {
                          e.preventDefault();
                          setDownloadError('Lampiran berkas surat edaran ini belum tersedia di server.');
                        } else {
                          setDownloadError(null);
                        }
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-white text-xs font-bold transition-colors duration-100 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF</span>
                    </a>

                    <a
                      href={getPdfUrl(selectedAnnouncement.file_path, selectedAnnouncement.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-bold transition-colors duration-100 shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Tab Baru</span>
                    </a>
                  </div>
                </div>

                {downloadError && (
                  <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                    <span>{downloadError}</span>
                    <button
                      type="button"
                      onClick={() => setDownloadError(null)}
                      className="font-bold text-amber-900 ml-2 hover:underline"
                    >
                      Tutup
                    </button>
                  </div>
                )}

                {/* In-Web Viewer Iframe with On-Demand Preview */}
                <div className="flex-1 w-full bg-slate-100 relative overflow-hidden flex flex-col">
                  {pdfLoadedForId === selectedAnnouncement.id ? (
                    <iframe
                      src={`${getPdfUrl(selectedAnnouncement.file_path, selectedAnnouncement.id)}#toolbar=1&navpanes=0`}
                      title={selectedAnnouncement.title}
                      className="w-full h-full border-none flex-1"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/80">
                      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mb-3 shadow-xs">
                        <FileText className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">
                        Pratinjau Dokumen PDF Siap Dimuat
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mb-4">
                        {selectedAnnouncement.file_name || 'Dokumen surat edaran resmi'}.
                        Pemuatan dokumen dilakukan on-demand demi menghemat kuota dan bandwidth operasional.
                      </p>
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        <button
                          type="button"
                          onClick={() => setPdfLoadedForId(selectedAnnouncement.id)}
                          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors duration-100 shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Muat Pratinjau Dokumen PDF</span>
                        </button>
                        <a
                          href={getPdfUrl(selectedAnnouncement.file_path, selectedAnnouncement.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors duration-100 shadow-xs flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka Tab Baru</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FileText className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-medium">Pilih surat edaran dari daftar sebelah kiri</p>
                <p className="text-xs text-slate-400 mt-1">
                  Dokumen PDF akan langsung dapat dibaca di sini tanpa perlu diunduh terlebih dahulu.
                </p>
              </div>
            )}
          </div>
        </div>
      </StateView>

      {/* Modal Upload Surat Edaran Baru */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Unggah Surat Edaran / Pengumuman Resmi"
        subtitle="Publikasikan instruksi kedinasan atau SOP untuk seluruh personel ARFF"
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleCreateAnnouncement} loading={submitting}>
              Publikasikan Edaran
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <InputField
            label="Judul Edaran / Pengumuman"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Instruksi Pengisian Checklist Kesiapan Armada & Roster Shift"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField
              label="Nomor Surat Edaran (Opsional)"
              value={circularNumber}
              onChange={(e) => setCircularNumber(e.target.value)}
              placeholder="Contoh: ED.04/ARFF-YIA/X/2026"
            />

            <InputField
              label="Tanggal & Waktu Terbit (WIB)"
              type="datetime-local"
              value={publishedDate}
              onChange={(e) => setPublishedDate(e.target.value)}
              required
            />
          </div>

          <TextareaField
            label="Ringkasan / Uraian Singkat (Opsional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tuliskan poin penting surat edaran ini secara ringkas..."
            rows={2}
          />

          {/* Opsi Sematkan / Pinned */}
          <div className="p-3 rounded-xl bg-red-50/80 border border-red-200">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-red-900">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 border-red-300 focus:ring-red-500 transition-colors duration-100"
              />
              <span className="flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 text-red-600" />
                Sematkan Sebagai Pengumuman Mendesak (PINNED)
              </span>
            </label>
            <p className="text-[11px] text-red-700 mt-1 pl-6">
              Pengumuman berprioritas tinggi akan otomatis disematkan di posisi teratas daftar dengan lencana merah khusus.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Berkas Dokumen PDF Pengumuman (Maks. 10 MB) <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-slate-400 bg-slate-50/50 transition-colors duration-100">
              <input
                type="file"
                id="announcement-pdf-input"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="announcement-pdf-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">
                  {pdfFile ? pdfFile.name : 'Pilih atau Seret Berkas Dokumen PDF'}
                </span>
                <span className="text-[11px] text-slate-400">
                  Format resmi Portable Document Format (.pdf)
                </span>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus Pengumuman In-App */}
      {deleteModalOpen && targetDeleteAnnouncement && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Hapus Surat Edaran / Pengumuman"
          subtitle={targetDeleteAnnouncement.circular_number || 'Dokumen Resmi'}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                loading={deleting}
              >
                Hapus Pengumuman
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-700">
              Apakah Anda yakin ingin menghapus surat edaran dinas berikut dari papan pengumuman?
            </p>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-900">{targetDeleteAnnouncement.title}</p>
              {targetDeleteAnnouncement.circular_number && (
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  No. Surat: {targetDeleteAnnouncement.circular_number}
                </p>
              )}
            </div>
            <p className="text-[11px] text-red-600 font-medium">
              Tindakan ini tidak dapat dibatalkan dan berkas dokumen lampiran akan dihapus permanen dari server.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
