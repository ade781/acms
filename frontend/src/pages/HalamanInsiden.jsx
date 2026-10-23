import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Search, Calendar, ChevronRight, ChevronLeft, ShieldAlert, Check, X } from 'lucide-react';
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
      const res = await api.get('/incidents', { params });
      const list = Array.isArray(res.data?.incidents) ? res.data.incidents : (Array.isArray(res.data) ? res.data : []);
      setIncidents(list);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Gagal memuat daftar laporan insiden operasional.');
    } finally {
      setLoading(false);
    }
  }, [filterScope, activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const filteredIncidents = incidents.filter((inc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inc.report_number?.toLowerCase().includes(q) ||
      inc.title?.toLowerCase().includes(q) ||
      inc.location?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredIncidents.length / pageSize) || 1;
  const paginatedIncidents = filteredIncidents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPriorityBadge = (lvl) => {
    const l = (lvl || '').toLowerCase();
    if (l === 'kritis' || l === 'critical') return <Badge variant="unserviceable">Kritis (Siaga I)</Badge>;
    if (l === 'tinggi' || l === 'high') return <Badge variant="pending">Tinggi (Siaga II)</Badge>;
    if (l === 'sedang' || l === 'medium') return <Badge variant="info">Sedang</Badge>;
    return <Badge variant="default">Rendah</Badge>;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Laporan Insiden
          </h2>
        </div>

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

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
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

      {/* Filter Scope & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setFilterScope('shift');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors duration-100 ${
                filterScope === 'shift'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shift Berjalan (#{activeShiftNumber} - {formatTeam(activeTeam)})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterScope('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors duration-100 ${
                filterScope === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Riwayat
            </button>
          </div>
        </div>

        <InputField
          id="searchIncident"
          placeholder="Cari nomor laporan (contoh: INC-0001), judul, atau lokasi kejadian..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          icon={Search}
        />
      </div>

      <StateView
        loading={loading}
        error={error}
        isEmpty={filteredIncidents.length === 0}
        emptyTitle="Belum Ada Laporan Insiden"
        emptyDescription="Seluruh pergerakan dan situasi operasional bandara berada dalam kondisi aman terkendali."
        emptyAction={
          canReport ? (
            <Button variant="danger" size="sm" onClick={() => setModalOpen(true)}>
              Catat Laporan Kejadian
            </Button>
          ) : null
        }
        onRetry={fetchIncidents}
      >
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Nomor Laporan</th>
                  <th className="px-5 py-3.5">Judul & Lokasi Kejadian</th>
                  <th className="px-5 py-3.5">Waktu Kejadian</th>
                  <th className="px-5 py-3.5">Regu Dinas</th>
                  <th className="px-5 py-3.5">Tingkat Prioritas</th>
                  <th className="px-5 py-3.5">Status Penanganan</th>
                  <th className="px-5 py-3.5 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedIncidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors duration-100"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-red-700 text-xs">
                        {inc.report_number || `INC-${String(inc.id).padStart(4, '0')}`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{inc.title}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Lokasi: {inc.location || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>{inc.incident_date}</div>
                      <div className="text-slate-500 text-[11px] font-mono">{inc.incident_time || '-'} WIB</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={`team${cleanTeam(inc.team_group) || 'Alpha'}`} size="sm">
                        {formatTeam(inc.team_group || '-')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {getPriorityBadge(inc.priority_level)}
                    </td>
                    <td className="px-5 py-3.5 capitalize">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                        inc.status === 'selesai'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}>
                        {inc.status || 'dalam_proses'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-arff-primary hover:underline font-semibold inline-flex items-center gap-1">
                        Detail <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredIncidents.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Menampilkan <strong className="text-slate-700">{(currentPage - 1) * pageSize + 1}</strong> -{' '}
                <strong className="text-slate-700">
                  {Math.min(currentPage * pageSize, filteredIncidents.length)}
                </strong>{' '}
                dari <strong className="text-slate-700">{filteredIncidents.length}</strong> insiden
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Sebelumnya
                </Button>
                <span className="text-xs font-semibold px-2">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronRight}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      </StateView>

      {modalOpen && (
        <IncidentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          activeDate={activeDate}
          activeShiftNumber={activeShiftNumber}
          activeTeam={activeTeam}
          onSuccess={(msg) => {
            fetchIncidents();
            setToastMsg(msg || 'Laporan insiden berhasil disimpan.');
          }}
        />
      )}
    </div>
  );
}
