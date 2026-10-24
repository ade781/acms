import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Plus,
  Search,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Check,
  X,
  FileText,
  Clock,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import InputField from '../components/common/InputField';
import IncidentModal from '../components/forms/IncidentModal';

export default function HalamanInsiden() {
  const navigate = useNavigate();
  const { activeDate, activeShiftNumber, activeTeam, user, isChief, isAdmin, isSupervisor } = useAuth();
  const canReport = isChief || isAdmin || isSupervisor || ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [filterScope, setFilterScope] = useState('shift'); // 'shift' | 'all'
  const [filterPriority, setFilterPriority] = useState('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filterScope === 'shift'
        ? { date: activeDate, shift: activeShiftNumber, team_group: cleanTeam(activeTeam) }
        : {};
      if (filterPriority !== 'ALL') {
        params.priority = filterPriority;
      }
      const res = await api.get('/incidents', { params });
      const list = Array.isArray(res.data?.incidents)
        ? res.data.incidents
        : Array.isArray(res.data)
        ? res.data
        : [];
      setIncidents(list);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Gagal memuat daftar laporan insiden operasional.');
    } finally {
      setLoading(false);
    }
  }, [filterScope, filterPriority, activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const filteredIncidents = incidents.filter((inc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inc.report_number?.toLowerCase().includes(q) ||
      inc.title?.toLowerCase().includes(q) ||
      inc.location?.toLowerCase().includes(q) ||
      inc.aircraft_info?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredIncidents.length / pageSize) || 1;
  const paginatedIncidents = filteredIncidents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPriorityBadge = (lvl) => {
    const l = (lvl || '').toLowerCase();
    if (l === 'kritis' || l === 'critical') return <Badge variant="unserviceable" size="sm">Siaga I (Kritis)</Badge>;
    if (l === 'tinggi' || l === 'high') return <Badge variant="pending" size="sm">Siaga II (Tinggi)</Badge>;
    if (l === 'sedang' || l === 'medium') return <Badge variant="info" size="sm">Sedang</Badge>;
    return <Badge variant="default" size="sm">Rendah</Badge>;
  };

  const getStatusBadge = (st) => {
    const s = (st || 'dalam_proses').toLowerCase();
    if (s === 'selesai') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Selesai
        </span>
      );
    }
    if (s === 'menunggu_tindak_lanjut') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          Tindak Lanjut
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" />
        Dalam Proses
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Pemantauan & Laporan Insiden
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Shift {activeShiftNumber} • Regu {activeTeam} • Bandara Internasional Yogyakarta (YIA)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            icon={FileText}
            onClick={() => navigate('/insiden/laporan')}
          >
            Laporan Rekap Insiden
          </Button>

          {canReport && (
            <Button
              variant="danger"
              icon={Plus}
              onClick={() => setModalOpen(true)}
            >
              Tambah Insiden
            </Button>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-emerald-500 hover:text-emerald-700 p-0.5"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Toolbar: Shift Scope, Priority, & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Toggle Shift Ini vs Semua Riwayat */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-600 mr-1">Cakupan:</span>
            <button
              type="button"
              onClick={() => {
                setFilterScope('shift');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-100 ${
                filterScope === 'shift'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Shift Ini ({formatTeam(activeTeam)})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterScope('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-100 ${
                filterScope === 'all'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Riwayat
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor/judul/lokasi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors duration-100"
            />
          </div>
        </div>

        {/* Filter Prioritas Chips */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">Prioritas:</span>
          {['ALL', 'kritis', 'tinggi', 'sedang', 'rendah'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setFilterPriority(lvl);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors duration-100 ${
                filterPriority === lvl
                  ? 'bg-red-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lvl === 'ALL' ? 'Semua Prioritas' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <StateView
          loading={loading}
          error={error}
          isEmpty={filteredIncidents.length === 0}
          emptyTitle="Belum Ada Laporan Insiden"
          emptyDescription={
            filterScope === 'shift'
              ? `Tidak ada kejadian darurat atau insiden operasional pada Shift ${activeShiftNumber} Regu ${activeTeam}.`
              : 'Tidak ada data insiden yang sesuai dengan filter pencarian.'
          }
          emptyAction={
            canReport ? (
              <Button variant="danger" size="sm" onClick={() => setModalOpen(true)}>
                Catat Insiden Sekarang
              </Button>
            ) : null
          }
          onRetry={fetchIncidents}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">No. Laporan</th>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  <th className="py-3 px-4">Regu / Shift</th>
                  <th className="py-3 px-4">Judul Kejadian</th>
                  <th className="py-3 px-4">Lokasi Area</th>
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedIncidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors duration-100 group"
                  >
                    <td className="py-3 px-4 font-bold text-red-700 font-mono text-[11.5px]">
                      {inc.report_number || `INC-${inc.id}`}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <div>{inc.incident_date}</div>
                      <div className="text-[10.5px] text-slate-400">
                        {(inc.incident_time || '').slice(0, 5)} WIB
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <div>Regu {inc.team_group || 'Alpha'}</div>
                      <div className="text-[10.5px] text-slate-400">Shift #{inc.shift_number || 1}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-semibold max-w-xs">
                      <div className="truncate">{inc.title}</div>
                      <div className="text-[10.5px] text-slate-400 font-normal">
                        {inc.aircraft_info || 'Non-Pesawat'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{inc.location || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getPriorityBadge(inc.priority_level)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(inc.status)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/incidents/${inc.id}`);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 group-hover:text-red-600 group-hover:bg-red-50 transition-colors duration-100"
                        title="Buka Detail Insiden"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </StateView>
      </div>

      {/* Modal Tambah Insiden Baru */}
      <IncidentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(msg) => {
          setToastMsg(msg || 'Laporan insiden berhasil dikirimkan.');
          fetchIncidents();
        }}
      />
    </div>
  );
}
