import React, { useState } from 'react';
import {
  User,
  Shield,
  Award,
  Clock,
  Briefcase,
  CheckCircle2,
  Compass,
  Edit3,
} from 'lucide-react';
import Badge from '../common/Badge';
import { formatTeam, formatRoleName, formatIndoDate } from '../../utils/shiftHelper';

export const ALL_ADDITIONAL_COMPETENCIES = [
  'SAR',
  'TOT',
  'Human Faktor',
  'K3 Kebakaran',
  'K3 Umum',
  'Uji Mutu Foam',
  'General Instructur Course',
  'First Aid',
  'Investigator',
  'Safety Manajement System',
  'Auditor',
];

export function calculateAge(birthDateStr) {
  if (!birthDateStr) return '-';
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return '-';

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }
  if (today.getDate() < birthDate.getDate()) {
    months = Math.max(0, months - 1);
  }

  return `${years} Thn ${months} Bln`;
}

export function calculateTenure(tmtDateStr) {
  if (!tmtDateStr) return '-';
  const tmtDate = new Date(tmtDateStr);
  if (isNaN(tmtDate.getTime())) return '-';

  const today = new Date();
  let years = today.getFullYear() - tmtDate.getFullYear();
  let months = today.getMonth() - tmtDate.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < tmtDate.getDate())) {
    years--;
    months += 12;
  }
  if (today.getDate() < tmtDate.getDate()) {
    months = Math.max(0, months - 1);
  }

  return `${years} Thn ${months} Bln`;
}

export default function PersonnelDossier({
  personnel,
  canEdit = false,
  onEditClick = () => {},
  className = '',
}) {
  const [activeTab, setActiveTab] = useState('identity');

  if (!personnel) return null;

  const competencies = Array.isArray(personnel.additional_competencies)
    ? personnel.additional_competencies
    : [];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Dossier Header Card (100% Light Theme) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 text-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-xl select-none shrink-0 shadow-2xs">
              {personnel.full_name ? personnel.full_name.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {personnel.full_name}
                </h2>
                <Badge
                  variant={personnel.is_active ? 'success' : 'neutral'}
                  className="text-[10px] uppercase font-semibold"
                >
                  {personnel.is_active ? 'Aktif Dinas' : 'Non-Aktif'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="font-mono text-slate-700">NIP: {personnel.nip || '-'}</span>
                <span>•</span>
                <span className="text-slate-800 font-medium">{formatRoleName(personnel.rank_position)}</span>
                <span>•</span>
                <span className="text-slate-700 font-medium">
                  {personnel.team_group === 'Non-Shift' ? 'Administrasi (Non-Shift)' : formatTeam(personnel.team_group)}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                  Role: {formatRoleName(personnel.user_role || (personnel.team_group === 'Non-Shift' ? 'admin' : 'junior_firefighter'))}
                </span>
              </div>
            </div>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={onEditClick}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors duration-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer w-full sm:w-auto justify-center"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Kualifikasi & Data</span>
            </button>
          )}
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 bg-slate-50/70 p-3 rounded-lg text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Kualifikasi STKP</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {personnel.cert_level ? `Level ${personnel.cert_level}` : '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Usia Personel</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {calculateAge(personnel.birth_date)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Status Kepegawaian</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block capitalize">
              {personnel.employment_status || 'Organik'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Masa Kerja (TMT)</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {calculateTenure(personnel.tmt_date)}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-2 pt-2 rounded-t-xl overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('identity')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors duration-100 cursor-pointer shrink-0 ${
            activeTab === 'identity'
              ? 'border-amber-600 text-amber-700 bg-amber-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Identitas & Kepegawaian</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('licenses')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors duration-100 cursor-pointer shrink-0 ${
            activeTab === 'licenses'
              ? 'border-amber-600 text-amber-700 bg-amber-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Lisensi STKP & Salvage</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('competencies')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors duration-100 cursor-pointer shrink-0 ${
            activeTab === 'competencies'
              ? 'border-amber-600 text-amber-700 bg-amber-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Kompetensi Tambahan ({competencies.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-4 sm:p-6 shadow-sm">
        {/* TAB 1: IDENTITAS & KEPEGAWAIAN */}
        {activeTab === 'identity' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                Data Pribadi & Riwayat Lahir
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Nama Lengkap</span>
                  <span className="font-semibold text-slate-900 mt-1 block">{personnel.full_name || '-'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">NIP</span>
                  <span className="font-mono font-semibold text-slate-900 mt-1 block">{personnel.nip || '-'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Tempat Lahir</span>
                  <span className="font-semibold text-slate-900 mt-1 block">{personnel.birth_place || '-'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Tanggal Lahir</span>
                  <span className="font-semibold text-slate-900 mt-1 block">{formatIndoDate(personnel.birth_date, { shortMonth: true })}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Usia Sekarang</span>
                  <span className="font-bold text-amber-700 mt-1 block">{calculateAge(personnel.birth_date)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-500" />
                Kedinasan & Riwayat Pendidikan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Status Kepegawaian</span>
                  <span className="font-semibold text-slate-900 mt-1 block uppercase">
                    {personnel.employment_status || 'Organik'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">TMT Karyawan</span>
                  <span className="font-semibold text-slate-900 mt-1 block">{formatIndoDate(personnel.tmt_date, { shortMonth: true })}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Masa Kerja Efektif</span>
                  <span className="font-bold text-slate-900 mt-1 block">{calculateTenure(personnel.tmt_date)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Pendidikan Dimiliki</span>
                  <span className="font-semibold text-slate-900 mt-1 block">{personnel.formal_education || '-'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Pendidikan Diakui</span>
                  <span className="font-semibold text-slate-900 mt-1 block">{personnel.recognized_education || '-'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Regu Penugasan</span>
                  <span className="font-semibold text-slate-900 mt-1 block">{formatTeam(personnel.team_group)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LISENSI STKP & SALVAGE */}
        {activeTab === 'licenses' && (
          <div className="space-y-6">
            {/* Primary STKP Active Certificate */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-100 text-amber-800">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                      Lisensi STKP Utama (Aktif)
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {personnel.cert_level ? `Rating STKP Level ${personnel.cert_level}` : 'Belum Terdaftar'}
                    </h4>
                  </div>
                </div>
                <Badge variant={personnel.cert_number ? 'success' : 'neutral'} className="text-[10px]">
                  {personnel.cert_number ? 'Terdaftar Resmi' : 'Belum Lisensi'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-amber-200/60 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Nomor Lisensi STKP</span>
                  <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                    {personnel.cert_number || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Masa Berlaku Lisensi</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {formatIndoDate(personnel.cert_expiry_date, { shortMonth: true })}
                  </span>
                </div>
              </div>
            </div>

            {/* Stepper / Jenjang Kompetensi STKP */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-500" />
                Riwayat Jenjang Kualifikasi STKP & Lemdik
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Basic */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-800">Kompetensi Basic</span>
                    <Badge variant={personnel.basic_cert_number ? 'success' : 'neutral'} className="text-[9px]">
                      {personnel.basic_cert_number ? 'Lulus' : 'Belum'}
                    </Badge>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Lembaga Pendidikan (Lemdik)</span>
                      <span className="font-semibold text-slate-800">{personnel.basic_lemdik || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Nomor Sertifikat</span>
                      <span className="font-mono text-slate-700 text-[11px] block break-all">
                        {personnel.basic_cert_number || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Junior */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-800">Kompetensi Junior</span>
                    <Badge variant={personnel.junior_cert_number ? 'success' : 'neutral'} className="text-[9px]">
                      {personnel.junior_cert_number ? 'Lulus' : 'Belum'}
                    </Badge>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Lembaga Pendidikan (Lemdik)</span>
                      <span className="font-semibold text-slate-800">{personnel.junior_lemdik || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Nomor Sertifikat</span>
                      <span className="font-mono text-slate-700 text-[11px] block break-all">
                        {personnel.junior_cert_number || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Senior */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-800">Kompetensi Senior</span>
                    <Badge variant={personnel.senior_cert_number ? 'success' : 'neutral'} className="text-[9px]">
                      {personnel.senior_cert_number ? 'Lulus' : 'Belum'}
                    </Badge>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Lembaga Pendidikan (Lemdik)</span>
                      <span className="font-semibold text-slate-800">{personnel.senior_lemdik || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Nomor Sertifikat</span>
                      <span className="font-mono text-slate-700 text-[11px] block break-all">
                        {personnel.senior_cert_number || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Salvage & General Refreshing */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Salvage & General Refreshing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Salvage */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900">Salvage Lisensi & Refreshing</span>
                    <Badge variant={personnel.salvage_license_number ? 'success' : 'neutral'} className="text-[9px]">
                      {personnel.salvage_license_number ? 'Memiliki' : 'Tidak Ada'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Nomor Lisensi Salvage</span>
                      <span className="font-mono text-slate-800 font-semibold block break-all">
                        {personnel.salvage_license_number || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Masa Berlaku Salvage</span>
                      <span className="text-slate-800 font-medium block">
                        {formatIndoDate(personnel.salvage_expiry_date, { shortMonth: true })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">No. Sertifikat Refreshing Salvage</span>
                      <span className="font-mono text-slate-700 text-[11px] block break-all">
                        {personnel.salvage_refreshing_cert_number || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Tanggal Refreshing Salvage</span>
                      <span className="text-slate-800 font-medium block">
                        {formatIndoDate(personnel.salvage_refreshing_date, { shortMonth: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* General Refreshing STKP */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900">General Refreshing STKP</span>
                    <Badge variant={personnel.refreshing_cert_number ? 'success' : 'neutral'} className="text-[9px]">
                      {personnel.refreshing_cert_number ? 'Telah Refreshing' : 'Belum'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Nomor Sertifikat Refreshing</span>
                      <span className="font-mono text-slate-800 font-semibold block break-all">
                        {personnel.refreshing_cert_number || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Tanggal / Tahun Refreshing</span>
                      <span className="text-slate-800 font-medium block">
                        {formatIndoDate(personnel.refreshing_date, { shortMonth: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KOMPETENSI TAMBAHAN */}
        {activeTab === 'competencies' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Matriks 11 Kompetensi Tambahan ARFF
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Keahlian khusus penunjang operasional, kualifikasi safety, investigasi, dan instruktur.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                {competencies.length} / {ALL_ADDITIONAL_COMPETENCIES.length} Dimiliki
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
              {ALL_ADDITIONAL_COMPETENCIES.map((comp) => {
                const isOwned = competencies.includes(comp);
                return (
                  <div
                    key={comp}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors duration-100 ${
                      isOwned
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isOwned ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      <span className={`text-xs font-semibold truncate ${isOwned ? 'text-emerald-950 font-bold' : 'text-slate-500'}`}>
                        {comp}
                      </span>
                    </div>
                    {isOwned ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">-</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
