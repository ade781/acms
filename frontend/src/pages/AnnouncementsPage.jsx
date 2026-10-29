import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  FileText,
  Calendar,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  AlertCircle,
  Plus,
  Pin,
  Pencil,
  Archive,
  RotateCcw,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatIndoDate } from '../utils/shiftHelper';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import StateView from '../components/common/StateView';
import AnnouncementPdfPreview from '../components/announcements/AnnouncementPdfPreview';
import AnnouncementUploadModal from '../components/announcements/AnnouncementUploadModal';
import AnnouncementEditModal from '../components/announcements/AnnouncementEditModal';

export default function AnnouncementsPage() {
  const { user, isAdmin, isSupervisor } = useAuth();
  const canPublish = isAdmin || isSupervisor || ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user?.role);
  const canDelete = isAdmin || ['admin', 'dept_head'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived'

  // Modal Konfirmasi Hapus In-App
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteAnnouncement, setTargetDeleteAnnouncement] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  // Helper penanda pengumuman disematkan (pinned)
  const isPinnedAnnouncement = (ann) => {
    return Boolean(
      Number(ann?.is_pinned) === 1 ||
      ann?.is_pinned === true
    );
  };

  const cleanTitle = (str) => {
    if (!str) return '';
    return String(str).replace(/^\[MENDESAK\]\s*/i, '').replace(/\[MENDESAK\]/gi, '').trim();
  };

  // Modal States
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [targetEditAnnouncement, setTargetEditAnnouncement] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchAnnouncements = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/announcements', { signal });
      const data = res.data?.data || res.data;
      const list = Array.isArray(data?.announcements) ? data.announcements : (Array.isArray(data) ? data : []);

      // Urutkan pengumuman: Pinned (disematkan) di paling atas, kemudian berdasarkan tanggal terbaru
      const sortedList = [...list].sort((a, b) => {
        const aPinned = isPinnedAnnouncement(a) ? 1 : 0;
        const bPinned = isPinnedAnnouncement(b) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        const dateA = new Date(a.published_date || a.created_at || 0).getTime();
        const dateB = new Date(b.published_date || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setAnnouncements(sortedList);
      setUnreadCount(Number(data?.unread_count || 0));

      // Lazy / On-Demand Preview: Hapus pemuatan otomatis dokumen pertama di awal muat halaman agar hemat bandwidth
      setSelectedAnnouncement(null);
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

  const handleCreateAnnouncement = async ({
    title,
    circularNumber,
    publishedDate,
    description,
    isPinned,
    pdfFile
  }) => {
    setSubmitting(true);
    try {
      const finalTitle = cleanTitle(title);

      const formData = new FormData();
      formData.append('title', finalTitle);
      formData.append('circular_number', (circularNumber || '').trim());
      formData.append('published_date', publishedDate);
      formData.append('description', (description || '').trim());
      formData.append('file', pdfFile);
      if (isPinned) {
        formData.append('is_pinned', '1');
      }

      await api.post('/announcements', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadModalOpen(false);
      fetchAnnouncements();
      setToastMsg({ type: 'success', text: 'Surat edaran dinas berhasil dipublikasikan.' });
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
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
      }
      setDeleteModalOpen(false);
      setTargetDeleteAnnouncement(null);
      fetchAnnouncements();
      setToastMsg({ type: 'success', text: 'Pengumuman berhasil dihapus.' });
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
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
    setTargetEditAnnouncement(ann);
    setEditModalOpen(true);
  };

  const handleUpdateAnnouncement = async ({
    id,
    title,
    circularNumber,
    publishedDate,
    description,
    isPinned
  }) => {
    setUpdating(true);
    try {
      const finalTitle = cleanTitle(title);

      const formData = new FormData();
      formData.append('title', finalTitle);
      formData.append('circular_number', (circularNumber || '').trim());
      formData.append('published_date', publishedDate);
      formData.append('description', (description || '').trim());
      formData.append('is_pinned', isPinned ? '1' : '0');

      const res = await api.put(`/announcements/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedPayload = res.data?.data;

      setAnnouncements((prev) => {
        const nextList = prev.map((item) =>
          item.id === id
            ? {
                ...item,
                title: finalTitle,
                circular_number: (circularNumber || '').trim() || null,
                published_date: publishedDate,
                description: (description || '').trim() || null,
                is_pinned: isPinned ? 1 : 0,
                ...(updatedPayload?.file_path ? { file_path: updatedPayload.file_path, file_name: updatedPayload.file_name } : {})
              }
            : item
        );
        return [...nextList].sort((a, b) => {
          const aPinned = isPinnedAnnouncement(a) ? 1 : 0;
          const bPinned = isPinnedAnnouncement(b) ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          const dateA = new Date(a.published_date || a.created_at || 0).getTime();
          const dateB = new Date(b.published_date || b.created_at || 0).getTime();
          return dateB - dateA;
        });
      });

      if (selectedAnnouncement?.id === id) {
        setSelectedAnnouncement((prev) => ({
          ...prev,
          title: finalTitle,
          circular_number: (circularNumber || '').trim() || null,
          published_date: publishedDate,
          description: (description || '').trim() || null,
          is_pinned: isPinned ? 1 : 0,
          ...(updatedPayload?.file_path ? { file_path: updatedPayload.file_path, file_name: updatedPayload.file_name } : {})
        }));
      }

      setEditModalOpen(false);
      setTargetEditAnnouncement(null);
      setToastMsg({ type: 'success', text: 'Perubahan surat edaran berhasil disimpan.' });
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
    } finally {
      setUpdating(false);
    }
  };

  const handleTogglePin = async (ann, e) => {
    if (e) e.stopPropagation();
    const currentPinned = isPinnedAnnouncement(ann);
    const nextPinned = !currentPinned;

    try {
      const finalTitle = cleanTitle(ann.title);

      setAnnouncements((prev) => {
        const nextList = prev.map((item) =>
          item.id === ann.id
            ? { ...item, is_pinned: nextPinned ? 1 : 0, title: finalTitle }
            : item
        );
        return nextList.sort((a, b) => {
          const aPin = isPinnedAnnouncement(a) ? 1 : 0;
          const bPin = isPinnedAnnouncement(b) ? 1 : 0;
          if (aPin !== bPin) return bPin - aPin;
          const dateA = new Date(a.published_date || a.created_at || 0).getTime();
          const dateB = new Date(b.published_date || b.created_at || 0).getTime();
          return dateB - dateA;
        });
      });

      if (selectedAnnouncement?.id === ann.id) {
        setSelectedAnnouncement((prev) => ({
          ...prev,
          is_pinned: nextPinned ? 1 : 0,
          title: finalTitle
        }));
      }

      setToastMsg({
        type: 'success',
        text: nextPinned
          ? 'Pengumuman berhasil disematkan di posisi teratas.'
          : 'Sematkan (Pin) pengumuman berhasil dilepas.'
      });
      setTimeout(() => setToastMsg(null), 3500);
      await api.patch(`/announcements/${ann.id}/pin`, { is_pinned: nextPinned ? 1 : 0 });
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

  const handleArchiveAnnouncement = async (ann, e) => {
    if (e) e.stopPropagation();
    try {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === ann.id ? { ...a, is_archived: 1 } : a))
      );
      if (selectedAnnouncement?.id === ann.id) {
        setSelectedAnnouncement(null);
      }
      setToastMsg({
        type: 'success',
        text: `Pengumuman "${ann.title?.slice(0, 24)}..." dipindahkan ke arsip dinas.`
      });
      setTimeout(() => setToastMsg(null), 3500);
      await api.post(`/announcements/${ann.id}/archive`);
      window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
    } catch (err) {
      console.error('Error archiving announcement:', err);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === ann.id ? { ...a, is_archived: 0 } : a))
      );
      setToastMsg({
        type: 'error',
        text: 'Gagal memindahkan pengumuman ke arsip dinas.'
      });
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleUnarchiveAnnouncement = async (ann, e) => {
    if (e) e.stopPropagation();
    try {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === ann.id ? { ...a, is_archived: 0 } : a))
      );
      setToastMsg({
        type: 'success',
        text: `Pengumuman "${ann.title?.slice(0, 24)}..." dikembalikan ke pengumuman aktif.`
      });
      setTimeout(() => setToastMsg(null), 3500);
      await api.post(`/announcements/${ann.id}/unarchive`);
      window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
    } catch (err) {
      console.error('Error unarchiving announcement:', err);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === ann.id ? { ...a, is_archived: 1 } : a))
      );
      setToastMsg({
        type: 'error',
        text: 'Gagal mengembalikan pengumuman dari arsip dinas.'
      });
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const isItemArchived = (a) => Boolean(Number(a.is_archived) === 1 || a.is_archived === true);
  const activeList = announcements.filter((a) => !isItemArchived(a));
  const archivedList = announcements.filter((a) => isItemArchived(a));
  const tabAnnouncements = activeTab === 'active' ? activeList : archivedList;

  const filteredAnnouncements = tabAnnouncements.filter((a) => {
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
            {/* Tab Filter: Pengumuman Aktif vs Arsip Dinas */}
            <div className="p-2 border-b border-slate-200 bg-slate-100/80 flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('active');
                  setSelectedAnnouncement(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors duration-100 cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bell className="w-3.5 h-3.5 text-red-600" />
                <span>Aktif</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 text-slate-700">
                  {activeList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('archived');
                  setSelectedAnnouncement(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors duration-100 cursor-pointer ${
                  activeTab === 'archived'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-slate-500" />
                <span>Arsip Dinas</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 text-slate-700">
                  {archivedList.length}
                </span>
              </button>
            </div>

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
                          : isPinnedAnnouncement(ann)
                          ? 'bg-slate-50/80 hover:bg-slate-100/70 text-slate-800 border-l-4 border-l-slate-700 border border-slate-200'
                          : isUnread
                          ? 'bg-amber-50/50 hover:bg-amber-50 text-slate-800 border border-amber-200/60'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isPinnedAnnouncement(ann) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white shadow-xs">
                                <Pin className="w-3 h-3 fill-white" />
                                <span>PINNED</span>
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
                            {cleanTitle(ann.title)}
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
                              title={isPinnedAnnouncement(ann) ? "Lepas Pin (Unpin)" : "Sematkan Pengumuman (Pin)"}
                              className={`p-1.5 rounded transition-colors duration-100 ${
                                isPinnedAnnouncement(ann)
                                  ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                              }`}
                            >
                              <Pin className={`w-3.5 h-3.5 ${isPinnedAnnouncement(ann) ? 'fill-slate-800 text-slate-800' : ''}`} />
                            </button>
                          )}

                          {activeTab === 'active' ? (
                            <button
                              type="button"
                              onClick={(e) => handleArchiveAnnouncement(ann, e)}
                              title="Pindahkan ke Arsip Dinas"
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors duration-100"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleUnarchiveAnnouncement(ann, e)}
                              title="Kembalikan ke Pengumuman Aktif"
                              className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 transition-colors duration-100"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
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
          <AnnouncementPdfPreview
            selectedAnnouncement={selectedAnnouncement}
            formatDateTime={formatDateTime}
            getPdfUrl={getPdfUrl}
          />
        </div>
      </StateView>

      {/* Modal Upload Surat Edaran Baru */}
      <AnnouncementUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSubmit={handleCreateAnnouncement}
        submitting={submitting}
      />

      {/* Modal Edit Surat Edaran / Pengumuman */}
      <AnnouncementEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        announcement={targetEditAnnouncement}
        onSubmit={handleUpdateAnnouncement}
        updating={updating}
      />

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
