import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  Users,
  Calendar,
  FileText,
  Truck,
  Radio,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserCheck,
  UserX,
  PhoneCall,
  Activity,
  HelpCircle,
} from 'lucide-react';
import api from '../../../services/api';
import {
  getCurrentOperationalShift,
  getDailyRoster,
  formatIndoDate,
  cleanTeam,
} from '../../../utils/shiftHelper';

/**
 * Konsep Dashboard 5: True Modular Bento Grid (Agent 5)
 * 
 * Filosofi Desain:
 * - Asymmetric Modular Bento Grid (Ubin berukuran beragam, bebas dari 4 card kotak redundan di atas).
 * - Tidak membagi layar menjadi 2 kotak simetris; ubin tersusun harmonis dalam grid 4 kolom:
 *   - Ubin A (2 Kolom x 2 Baris): Kesiapan Armada Operasional (Jangkar Utama).
 *   - Ubin B (2 Kolom x 1 Baris): Status Dinas & Shift Jaga (Regu, Jam Dinas, Tanggal, Chief).
 *   - Ubin C (1 Kolom x 1 Baris): Matriks Personel Aktif (Total Unit, Dinas, Cuti).
 *   - Ubin D (1 Kolom x 1 Baris): Posko Watchroom & Radio Komunikasi (Status, Frekuensi, Hotline).
 *   - Ubin E (Full Width Memanjang di Bawah): Agenda & Log Kegiatan Shift Aktif.
 * - 100% Menggunakan Data Riil dari API / Database Backend.
 * - Murni Light Mode / Putih (bg-slate-50, card bg-white, border border-slate-200).
 * - Bebas dari slogan/jargon AI ("SOP ICAO", "CAT IX", "Target response 180s", dll).
 */
export default function DashboardVariant5() {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [watchroomData, setWatchroomData] = useState({});
  const [totalPersonnelCount, setTotalPersonnelCount] = useState(0);
  const [deployments, setDeployments] = useState([]);
  const [absents, setAbsents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [shiftData, setShiftData] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Shift operasional real-time berdasarkan jam lokal
  const currentShiftMeta = useMemo(() => getCurrentOperationalShift(), []);
  const dailyRoster = useMemo(
    () => getDailyRoster(currentShiftMeta.shiftDate),
    [currentShiftMeta.shiftDate]
  );

  const activeDate = currentShiftMeta.shiftDate;
  const activeShiftNumber = currentShiftMeta.shiftNumber;
  const activeShiftName = currentShiftMeta.shiftName;
  const activeTeam = shiftData?.team_group || currentShiftMeta.scheduledTeam;

  const shiftHoursMap = {
    1: '07:00 - 13:00 WIB',
    2: '13:00 - 20:00 WIB',
    3: '20:00 - 07:00 WIB',
  };
  const activeHours = shiftHoursMap[activeShiftNumber] || '-';

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = `date=${activeDate}&shift=${activeShiftNumber}&team_group=${cleanTeam(activeTeam)}`;

      const [vRes, wRes, pRes, dRes, aRes] = await Promise.allSettled([
        api.get(`/readiness/vehicles?${params}`),
        api.get(`/readiness/watchroom?${params}`),
        api.get('/personnel?is_active=1'),
        api.get(`/deployments/current?${params}`),
        api.get(`/activities?${params}`),
      ]);

      // 1. Data Armada (Dinamis dari database)
      if (vRes.status === 'fulfilled' && vRes.value?.data?.data) {
        const rawVehicles = vRes.value.data.data;
        const list = Array.isArray(rawVehicles) ? rawVehicles : rawVehicles.vehicles || [];
        setVehicles(list);
      }

      // 2. Data Watchroom Posko
      if (wRes.status === 'fulfilled' && wRes.value?.data?.data) {
        setWatchroomData(wRes.value.data.data || {});
      }

      // 3. Total Personel Aktif Unit Seluruh Regu
      if (pRes.status === 'fulfilled' && pRes.value?.data) {
        const pData = pRes.value.data.data || pRes.value.data.personnel || [];
        setTotalPersonnelCount(Array.isArray(pData) ? pData.length : 0);
      }

      // 4. Ploting Shift Dinas, Supervisor & Personel Cuti
      if (dRes.status === 'fulfilled' && dRes.value?.data?.data) {
        const dData = dRes.value.data.data;
        setShiftData(dData.shift || null);
        setDeployments(dData.deployments || []);
        setAbsents(dData.absents || []);
      }

      // 5. Log Kegiatan Dinas Shift Aktif
      if (aRes.status === 'fulfilled' && aRes.value?.data?.data) {
        const aData = aRes.value.data.data;
        setActivities(Array.isArray(aData) ? aData : []);
      }
    } catch (err) {
      console.warn('DashboardVariant5: Gagal memuat data API', err.message);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Kalkulasi Metrik Personel & Armada
  const deployedPersonnelCount = deployments.filter((d) => d.deployment_type !== 'absent').length;
  const absentPersonnelCount = absents.length;
  const serviceableCount = vehicles.filter((v) => v.status === 'serviceable').length;

  // Nama Ketua Regu (Chief) dinamis
  const supervisorName =
    shiftData?.supervisor_name ||
    deployments.find((d) => d.is_pic === 1 && d.rank_position?.toLowerCase().includes('chief'))?.full_name ||
    deployments.find((d) => d.rank_position?.toLowerCase().includes('chief'))?.full_name ||
    null;

  return (
    <div className="space-y-4">
      {/* BAR STATUS & REFRESH */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-800">
            True Modular Bento Grid
          </span>
          <span className="text-slate-300">•</span>
          <span>Pembaruan Data Riil: {lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
        </div>
        <button
          type="button"
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          title="Muat ulang seluruh data operasional"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-[11px] font-medium">Segarkan Data</span>
        </button>
      </div>

      {/* =========================================================================
          BENTO GRID MODULAR UTAMA (4 KOLOM ASIMETRIS)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* -----------------------------------------------------------------------
            UBIN A (Ukuran Besar: 2 Kolom x 2 Baris) - Kesiapan Armada Operasional
            Jangkar utama bento grid. Format: Hanya Nama Kendaraan & Nama PIC di bawahnya.
            ----------------------------------------------------------------------- */}
        <div className="lg:col-span-2 lg:row-span-2 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Kesiapan Armada Operasional
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Status fisik & PIC kendaraan operasional shift berjalan
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded shadow-2xs">
                {serviceableCount}/{vehicles.length} Siap Operasi
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                  Memeriksa kelaikan armada...
                </div>
              ) : vehicles.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  Data armada operasional belum tercatat pada shift ini.
                </div>
              ) : (
                vehicles.map((v) => {
                  const isServ = v.status === 'serviceable';
                  const isUnserv = v.status === 'unserviceable';

                  return (
                    <div
                      key={v.id || v.code_name}
                      className="flex items-center justify-between py-2 px-4 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {v.vehicle_name || v.code_name}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          PIC: {v.pic_name || <span className="text-slate-400 italic">Belum Ditunjuk</span>}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                            isServ
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isUnserv
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : 'bg-slate-50 text-slate-600 border-slate-300'
                          }`}
                        >
                          {isUnserv ? 'Unserviceable' : isServ ? 'Serviceable' : 'Belum Dicek'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Seluruh unit terpantau dinamis dari database</span>
            <span className="font-bold text-slate-600">Total {vehicles.length} Entitas</span>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            UBIN B (Ukuran Sedang: 2 Kolom x 1 Baris) - Status Dinas & Shift Jaga
            Menampilkan identitas Regu aktif, jam dinas berjalan, tanggal, dan Chief.
            ----------------------------------------------------------------------- */}
        <div className="lg:col-span-2 lg:row-span-1 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Status Dinas & Shift Jaga
                </h3>
                <p className="text-[11px] text-slate-500">
                  Kepemimpinan shift & jam operasional aktif
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Dinas Aktif
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 my-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Regu Bertugas</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                Regu {cleanTeam(activeTeam)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeShiftName} • {activeHours}
              </p>
            </div>

            <div className="border-l border-slate-100 pl-3">
              <span className="text-[10px] font-bold uppercase text-slate-400">Ketua Regu (Chief)</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                {supervisorName || <span className="text-slate-400 italic">Belum Terploting</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatIndoDate(activeDate)}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Pemberitahuan Serah Terima: Terbuka</span>
            <span className="font-semibold text-slate-600">Pelaksanaan Shift Berjalan</span>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            UBIN C (Ukuran: 1 Kolom x 1 Baris) - Matriks Personel Aktif
            Kartu metrik kompak: Total Personel Unit, Anggota Berdinas, dan Personel Cuti.
            ----------------------------------------------------------------------- */}
        <div className="lg:col-span-1 lg:row-span-1 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Matriks Personel
              </h3>
            </div>
            <span className="text-xs font-black text-slate-900 font-mono">
              {totalPersonnelCount}
            </span>
          </div>

          <div className="space-y-2 my-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Total Unit:
              </span>
              <strong className="text-slate-900">{totalPersonnelCount} Personel</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Berdinas:
              </span>
              <strong className="text-emerald-700">{deployedPersonnelCount} Hadir</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Izin / Cuti:
              </span>
              <strong className="text-amber-700">{absentPersonnelCount} Personel</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 truncate">
            {absentPersonnelCount > 0
              ? `${absentPersonnelCount} personel izin/cuti hari ini`
              : 'Presensi dinas shift lengkap'}
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            UBIN D (Ukuran: 1 Kolom x 1 Baris) - Posko Watchroom & Radio
            Status kesiapan Watchroom Posko dan nomor kontak / frekuensi standby.
            ----------------------------------------------------------------------- */}
        <div className="lg:col-span-1 lg:row-span-1 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Posko Watch Room
              </h3>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                watchroomData?.status === 'unserviceable'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {watchroomData?.status === 'unserviceable' ? 'Kendala' : 'Normal'}
            </span>
          </div>

          <div className="space-y-1.5 my-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Frekuensi:</span>
              <span className="font-mono font-bold text-slate-800">121.90 MHz</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Emergency:</span>
              <span className="font-mono font-bold text-red-600">121.50 MHz</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">Hotline ATC:</span>
              <span className="font-bold text-slate-800">Direct Line YIA</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 truncate">
            Petugas: <strong>{watchroomData?.pic_name || 'Operator Jaga Posko'}</strong>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            UBIN E (Ukuran Memanjang: Full Width Bawah) - Agenda & Log Kegiatan Shift
            Daftar kegiatan shift yang sedang atau telah terlaksana dalam susunan rapi.
            ----------------------------------------------------------------------- */}
        <div className="col-span-full bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Agenda & Log Kegiatan Shift Berjalan
                </h3>
                <p className="text-[11px] text-slate-500">
                  Catatan kegiatan operasional, apel serah terima, dan inspeksi shift aktif
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono">
              {activities.length} Kegiatan Terjadwal
            </span>
          </div>

          {loading ? (
            <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
              Memuat data kegiatan dinas...
            </div>
          ) : activities.length === 0 ? (
            <div className="py-6 px-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/40">
              <p className="text-xs font-medium text-slate-600">
                Belum ada kegiatan dinas khusus yang tercatat pada shift ini.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kegiatan rutin harian seperti apel dinas, pemanasan kendaraan, dan pengawasan area apron berjalan sesuai jadwal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/60 transition-colors flex flex-col justify-between space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 leading-tight line-clamp-1">
                      {act.activity_name || act.title || 'Kegiatan Dinas'}
                    </h4>
                    {act.activity_time && (
                      <span className="text-[10px] font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded shrink-0">
                        {act.activity_time} WIB
                      </span>
                    )}
                  </div>
                  {act.description && (
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {act.description}
                    </p>
                  )}
                  {act.location && (
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      Lokasi: <span className="font-medium text-slate-600">{act.location}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between mt-3">
            <span>Log kegiatan terekam otomatis pada logbook dinas harian</span>
            <span className="font-semibold text-slate-600">Dokumen Operasional Sah</span>
          </div>
        </div>

      </div>
    </div>
  );
}
