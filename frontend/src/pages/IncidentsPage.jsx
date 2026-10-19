import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Search, Calendar, ChevronRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import InputField from '../components/common/InputField';
import IncidentModal from '../components/forms/IncidentModal';

export default function IncidentsPage() {
  const { activeDate, activeShiftNumber, activeTeam } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/incidents');
      const list = Array.isArray(res.data?.incidents) ? res.data.incidents : (Array.isArray(res.data) ? res.data : []);
      setIncidents(list);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Gagal memuat daftar laporan insiden operasional.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const getPriorityBadge = (lvl) => {
    const l = (lvl || '').toLowerCase();
    if (l === 'kritis') return <Badge variant="unserviceable">Kritis (Siaga I)</Badge>;
    if (l === 'tinggi') return <Badge variant="pending">Tinggi (Siaga II)</Badge>;
    if (l === 'sedang') return <Badge variant="info">Sedang</Badge>;
    return <Badge variant="default">Rendah</Badge>;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Laporan Kejadian & Insiden Operasional ARFF
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan penanganan kecelakaan pesawat, kebakaran airside, ceceran fuel, dan respon darurat
          </p>
        </div>

        <Button
          variant="danger"
          icon={Plus}
          onClick={() => setModalOpen(true)}
        >
          Catat Insiden Baru
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
        <InputField
          id="searchIncident"
          placeholder="Cari nomor laporan (contoh: INC-0001), judul, atau lokasi kejadian..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
          <Button variant="danger" size="sm" onClick={() => setModalOpen(true)}>
            Catat Laporan Kejadian
          </Button>
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
                {filteredIncidents.map((inc) => (
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
                      <Badge variant={`team${inc.team_group || 'Alpha'}`} size="sm">
                        Regu {inc.team_group || '-'}
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
        </div>
      </StateView>

      {modalOpen && (
        <IncidentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          activeDate={activeDate}
          activeShiftNumber={activeShiftNumber}
          activeTeam={activeTeam}
          onSuccess={fetchIncidents}
        />
      )}
    </div>
  );
}
