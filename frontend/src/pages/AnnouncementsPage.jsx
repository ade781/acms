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
  PinOff,
  Pencil,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatIndoDate } from '../utils/shiftHelper';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import InputField from '../components/common/InputField';
import TextareaField from '../components/common/TextareaField';
import StateView from '../components/common/StateView';

export default function AnnouncementsPage() {
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
      const dateFormatted = formatIndoDate(dateStr, { shortMonth: true });
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

  // Modal Edit Pengumuman
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCircularNumber, setEditCircularNumber] = useState('');
  const [editPublishedDate, setEditPublishedDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [editPdfFile, setEditPdfFile] = useState(null);
  const [existingFileName, setExistingFileName] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editFormError, setEditFormError] = useState(null);

  const fetchAnnouncements = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/announcements', { signal });
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
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('Error fetching announcements:', err);
      setError('Gagal memuat papan pengumuman operasional.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAnnouncements(controller.signal);
    return () => controller.abort();
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
      const errMsg = typeof err.response?.data?.message === 'string' ? err.response.data.message : typeof err.response?.data === 'string' ? err.response.data : err.message || 'Gagal mempublikasikan pengumuman.';
      setFormError(errMsg);
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
      const errMsg = typeof err.response?.data?.message === 'string' ? err.response.data.message : typeof err.response?.data === 'string' ? err.response.data : err.message || 'Terjadi kesalahan';
      setToastMsg({
        type: 'error',
        text: `Gagal menghapus pengumuman: ${errMsg}`
      });
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEditModal = (ann, e) => {
    if (e) e.stopPropagation();
    setEditId(ann.id);
    const rawTitle = ann.title || '';
    const cleanTitle = rawTitle.replace(/^\[MENDESAK\]\s*/i, '').trim();
    setEditTitle(cleanTitle || rawTitle);
    setEditCircularNumber(ann.circular_number || '');

    let pubDateVal = '';
    if (ann.published_date) {
      try {
        const d = new Date(ann.published_date);
        if (!isNaN(d.getTime())) {
          const offset = d.getTimezoneOffset() * 60000;
          pubDateVal = new Date(d.getTime() - offset).toISOString().slice(0, 16);
        }
      } catch {
        pubDateVal = getCurrentDateTimeLocal();
      }
    } else {
      pubDateVal = getCurrentDateTimeLocal();
    }
    setEditPublishedDate(pubDateVal || getCurrentDateTimeLocal());
    setEditDescription(ann.description || '');
    setEditIsPinned(isUrgentAnnouncement(ann));
    setExistingFileName(ann.file_name || 'Lampiran tersimpan');
    setEditPdfFile(null);
    setEditFormError(null);
    setEditModalOpen(true);
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setEditFormError('Berkas harus berupa dokumen format PDF (.pdf).');
        setEditPdfFile(null);
        return;
      }
      setEditFormError(null);
      setEditPdfFile(file);
    }
  };

  const handleUpdateAnnouncement = async (e) => {
    e.preventDefault();
    setEditFormError(null);

    if (!editTitle.trim()) {
      setEditFormError('Judul pengumuman / surat edaran wajib diisi.');
      return;
    }

    setUpdating(true);
    try {
      let finalTitle = editTitle.trim();
      if (editIsPinned && !finalTitle.toUpperCase().includes('[MENDESAK]')) {
        finalTitle = `[MENDESAK] ${finalTitle}`;
      } else if (!editIsPinned && finalTitle.toUpperCase().includes('[MENDESAK]')) {
        finalTitle = finalTitle.replace(/^\[MENDESAK\]\s*/i, '').trim();
      }

      const formData = new FormData();
      formData.append('title', finalTitle);
      formData.append('circular_number', editCircularNumber.trim());
      formData.append('published_date', editPublishedDate);
      formData.append('description', editDescription.trim());
      formData.append('is_pinned', editIsPinned ? '1' : '0');
      if (editPdfFile) {
        formData.append('file', editPdfFile);
      }

      const res = await api.put(`/announcements/${editId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedPayload = res.data?.data;

      setAnnouncements((prev) => {
        const nextList = prev.map((item) =>
          item.id === editId
            ? {
                ...item,
                title: finalTitle,
                circular_number: editCircularNumber.trim() || null,
                published_date: editPublishedDate,
                description: editDescription.trim() || null,
                is_pinned: editIsPinned ? 1 : 0,
                ...(updatedPayload?.file_path ? { file_path: updatedPayload.file_path, file_name: updatedPayload.file_name } : {})
              }
            : item
        );
        return nextList.sort((a, b) => {
          const aUrgent = isUrgentAnnouncement(a) ? 1 : 0;
          const bUrgent = isUrgentAnnouncement(b) ? 1 : 0;
          if (aUrgent !== bUrgent) return bUrgent - aUrgent;
          const dateA = new Date(a.published_date || a.created_at || 0).getTime();
          const dateB = new Date(b.published_date || b.created_at || 0).getTime();
          return dateB - dateA;
        });
      });

      if (selectedAnnouncement?.id === editId) {
        setSelectedAnnouncement((prev) => ({
          ...prev,
          title: finalTitle,
          circular_number: editCircularNumber.trim() || null,
          published_date: editPublishedDate,
          description: editDescription.trim() || null,
          is_pinned: editIsPinned ? 1 : 0,
          ...(updatedPayload?.file_path ? { file_path: updatedPayload.file_path, file_name: updatedPayload.file_name } : {})
        }));
        if (editPdfFile) {
          setPdfLoadedForId(null);
        }
      }

      setEditModalOpen(false);
      setToastMsg({ type: 'success', text: 'Perubahan pengumuman berhasil disimpan.' });
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
    } catch (err) {
      const errMsg =
        typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : typeof err.response?.data === 'string'
          ? err.response.data
          : err.message || 'Gagal menyimpan perubahan pengumuman.';
      setEditFormError(errMsg);
    } finally {
      setUpdating(false);
    }
  };

  const handleTogglePin = async (ann, e) => {
    if (e) e.stopPropagation();
    const currentUrgent = isUrgentAnnouncement(ann);
    const nextPinned = !currentUrgent;

    try {
      let newTitle = ann.title || '';
      if (!nextPinned) {
        newTitle = newTitle.replace(/^\[MENDESAK\]\s*/i, '').trim();
      } else if (!newTitle.toUpperCase().includes('[MENDESAK]')) {
        newTitle = `[MENDESAK] ${newTitle}`;
      }

      await api.patch(`/announcements/${ann.id}/pin`, { is_pinned: nextPinned ? 1 : 0 });

      setAnnouncements((prev) => {
        const nextList = prev.map((item) =>
          item.id === ann.id
            ? { ...item, is_pinned: nextPinned ? 1 : 0, title: newTitle }
            : item
        );
        return nextList.sort((a, b) => {
          const aUrgent = isUrgentAnnouncement(a) ? 1 : 0;
          const bUrgent = isUrgentAnnouncement(b) ? 1 : 0;
          if (aUrgent !== bUrgent) return bUrgent - aUrgent;
          const dateA = new Date(a.published_date || a.created_at || 0).getTime();
          const dateB = new Date(b.published_date || b.created_at || 0).getTime();
          return dateB - dateA;
        });
      });

      if (selectedAnnouncement?.id === ann.id) {
        setSelectedAnnouncement((prev) => ({
          ...prev,
          is_pinned: nextPinned ? 1 : 0,
          title: newTitle
        }));
      }

      setToastMsg({
        type: 'success',
        text: nextPinned
          ? 'Pengumuman disematkan sebagai surat edaran mendesak (Pinned).'
          : 'Pin pengumuman berhasil dilepas (Unpinned).'
      });
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
    } catch (err) {
      console.error('Error toggling pin:', err);
      setToastMsg({
        type: 'error',
        text: 'Gagal memperbarui status pin pengumuman.'
      });
      setTimeout(() => setToastMsg(null), 3500);
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
            <span>{typeof toastMsg?.text === 'string' ? toastMsg.text : (toastMsg?.text?.message || 'Pemberitahuan')}</span>
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
                      key={ann.id || ann.circular_number || `ann-${ann.published_date}`}
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

                        {/* Action Buttons: Pin/Unpin, Edit, Delete */}
                        <div className="flex items-center gap-0.5 shrink-0 self-start">
                          {canPublish && (
                            <button
                              type="button"
                              onClick={(e) => handleTogglePin(ann, e)}
                              title={isUrgentAnnouncement(ann) ? "Lepas Pin (Unpin)" : "Sematkan Pengumuman (Pin)"}
                              className={`p-1.5 rounded transition-colors duration-100 ${
                                isUrgentAnnouncement(ann)
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'hover:bg-slate-100 text-slate-400 hover:text-red-600'
                              }`}
                            >
                              <Pin className={`w-3.5 h-3.5 ${isUrgentAnnouncement(ann) ? 'fill-red-600 text-red-600' : ''}`} />
                            </button>
                          )}

                          {canPublish && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(ann, e)}
                              title="Edit Surat Edaran"
                              className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors duration-100"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenDeleteModal(ann, e)}
                              title="Hapus Pengumuman"
                              className="p-1.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-700 transition-colors duration-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {canPublish && (
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(selectedAnnouncement, e)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors duration-100 shadow-xs cursor-pointer ${
                          isUrgentAnnouncement(selectedAnnouncement)
                            ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                            : 'border-slate-300 text-slate-700 hover:bg-white'
                        }`}
                        title={isUrgentAnnouncement(selectedAnnouncement) ? "Lepas Pin (Unpin)" : "Sematkan Pengumuman (Pin)"}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isUrgentAnnouncement(selectedAnnouncement) ? 'fill-red-600 text-red-600' : 'text-slate-500'}`} />
                        <span>{isUrgentAnnouncement(selectedAnnouncement) ? 'Lepas Pin' : 'Pin'}</span>
                      </button>
                    )}

                    {canPublish && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(selectedAnnouncement, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-white text-xs font-bold transition-colors duration-100 shadow-xs cursor-pointer"
                        title="Edit Surat Edaran"
                      >
                        <Pencil className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit</span>
                      </button>
                    )}

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
                    <span>{typeof downloadError === 'string' ? downloadError : 'Lampiran berkas belum tersedia.'}</span>
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
              <span>{typeof formError === 'string' ? formError : (formError?.message || 'Terjadi kesalahan.')}</span>
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

      {/* Modal Edit Surat Edaran / Pengumuman */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Surat Edaran / Pengumuman"
        subtitle={editCircularNumber || 'Pembaruan Dokumen Dinas'}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={updating}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleUpdateAnnouncement} loading={updating}>
              Simpan Perubahan
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateAnnouncement} className="space-y-4">
          {editFormError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{typeof editFormError === 'string' ? editFormError : (editFormError?.message || 'Terjadi kesalahan.')}</span>
            </div>
          )}

          <InputField
            label="Judul Edaran / Pengumuman"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Contoh: Instruksi Pengisian Checklist Kesiapan Armada & Roster Shift"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField
              label="Nomor Surat Edaran (Opsional)"
              value={editCircularNumber}
              onChange={(e) => setEditCircularNumber(e.target.value)}
              placeholder="Contoh: ED.04/ARFF-YIA/X/2026"
            />

            <InputField
              label="Tanggal & Waktu Terbit (WIB)"
              type="datetime-local"
              value={editPublishedDate}
              onChange={(e) => setEditPublishedDate(e.target.value)}
              required
            />
          </div>

          <TextareaField
            label="Ringkasan / Uraian Singkat (Opsional)"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Tuliskan poin penting surat edaran ini secara ringkas..."
            rows={2}
          />

          {/* Opsi Sematkan / Pinned */}
          <div className="p-3 rounded-xl bg-red-50/80 border border-red-200">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-red-900">
              <input
                type="checkbox"
                checked={editIsPinned}
                onChange={(e) => setEditIsPinned(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 border-red-300 focus:ring-red-500 transition-colors duration-100"
              />
              <span className="flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 text-red-600" />
                Sematkan Sebagai Pengumuman Mendesak (PINNED)
              </span>
            </label>
            <p className="text-[11px] text-red-700 mt-1 pl-6">
              Centang untuk menyematkan pengumuman di posisi teratas daftar dengan lencana merah khusus, atau hilangkan centang untuk melepas pin (unpin).
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Ganti Berkas Dokumen PDF (Opsional, Maks. 10 MB)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-slate-400 bg-slate-50/50 transition-colors duration-100">
              <input
                type="file"
                id="edit-announcement-pdf-input"
                accept="application/pdf"
                onChange={handleEditFileChange}
                className="hidden"
              />
              <label
                htmlFor="edit-announcement-pdf-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">
                  {editPdfFile ? editPdfFile.name : `Tetap gunakan: ${existingFileName}`}
                </span>
                <span className="text-[11px] text-slate-400">
                  Klik jika ingin memilih berkas PDF baru untuk menggantikan berkas lama
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
