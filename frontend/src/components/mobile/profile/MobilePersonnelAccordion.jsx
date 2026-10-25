import React, { useState } from 'react';
import {
  User,
  Award,
  Compass,
  ChevronDown,
  ChevronUp,
  Edit3,
  Lock,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCheck,
  Building,
  GraduationCap,
} from 'lucide-react';
import Badge from '../../common/Badge';

const ALL_ADDITIONAL_COMPETENCIES = [
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

function calculateAge(birthDateStr) {
  if (!birthDateStr) return '-';
  try {
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return '-';
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return '-';
    return `${years} Thn ${months} Bln`;
  } catch {
    return '-';
  }
}

function calculateTenure(tmtDateStr) {
  if (!tmtDateStr) return '-';
  try {
    const tmt = new Date(tmtDateStr);
    if (isNaN(tmt.getTime())) return '-';
    const now = new Date();
    let years = now.getFullYear() - tmt.getFullYear();
    let months = now.getMonth() - tmt.getMonth();
    if (now.getDate() < tmt.getDate()) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return 'Baru';
    return `${years} Thn ${months} Bln`;
  } catch {
    return '-';
  }
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

function formatTeam(team) {
  if (!team) return '-';
  const clean = team.toUpperCase();
  return ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'].includes(clean) ? `Regu ${clean}` : team;
}

function formatRoleName(role) {
  const map = {
    admin: 'Administrator',
    dept_head: 'Dept. Head',
    chief: 'Chief ARFF',
    assistant_chief: 'Assistant Chief',
    danru: 'Komandan Regu',
    pic: 'Person In Charge',
    staff: 'Personel Rescue',
  };
  return map[role] || (role ? role.toUpperCase() : 'Personel');
}

export default function MobilePersonnelAccordion({
  personnel,
  canEdit = true,
  onEditClick = () => {},
  onChangePasswordClick = () => {},
}) {
  // Sesuai keputusan wawancara /grill-me:
  // Seksi 1 (Identitas & Kepegawaian) terbuka default sejak awal.
  // Seksi 2 & 3 tertutup rapi.
  const [openSections, setOpenSections] = useState({
    identity: true,
    licenses: false,
    competencies: false,
  });

  if (!personnel) return null;

  const toggleSection = (key) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const competencies = Array.isArray(personnel.additional_competencies)
    ? personnel.additional_competencies
    : [];

  const ownedCompCount = competencies.length;
  const isStkpValid = personnel.license_valid_until
    ? new Date(personnel.license_valid_until) >= new Date()
    : null;

  return (
    <div className="space-y-2.5 text-xs">
      {/* 1. Header Profil & Identitas Ringkas (100% Light Theme) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-lg flex items-center justify-center select-none shrink-0 shadow-2xs">
              {personnel.full_name ? personnel.full_name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm tracking-tight leading-snug">
                  {personnel.full_name}
                </h3>
                <Badge
                  variant={personnel.is_active ? 'success' : 'neutral'}
                  className="text-[9px] uppercase font-bold py-0.5 px-1.5"
                >
                  {personnel.is_active ? 'Aktif' : 'Non-Aktif'}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 font-mono">
                <span>NIP: {personnel.nip || '-'}</span>
                <span>•</span>
                <span className="font-sans font-medium text-slate-700">
                  {personnel.team_group === 'Non-Shift' ? 'Administrasi (Non-Shift)' : formatTeam(personnel.team_group)}
                </span>
              </div>
              <p className="text-[10px] text-slate-700 font-semibold mt-0.5">
                {formatRoleName(personnel.rank_position)} <span className="text-amber-800 font-bold">• Role: {formatRoleName(personnel.user_role || (personnel.team_group === 'Non-Shift' ? 'admin' : 'junior_firefighter'))}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons di Header Profil */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onChangePasswordClick}
            className="w-full py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors duration-100 shadow-2xs cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Ubah Sandi</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={onEditClick}
              className="w-full py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors duration-100 shadow-2xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Kualifikasi</span>
            </button>
          )}
        </div>

        {/* Quick KPI Bar (4 Matriks Kompak) */}
        <div className="grid grid-cols-4 gap-1.5 mt-2.5 pt-2 border-t border-slate-100 bg-slate-50/80 p-2 rounded-lg text-center">
          <div className="border-r border-slate-200/80 pr-1">
            <span className="text-[9px] text-slate-500 block">Kualifikasi</span>
            <span className="font-bold text-slate-900 text-[11px] block truncate">
              {personnel.cert_level ? `Lvl ${personnel.cert_level}` : '-'}
            </span>
          </div>
          <div className="border-r border-slate-200/80 pr-1">
            <span className="text-[9px] text-slate-500 block">Usia</span>
            <span className="font-bold text-slate-900 text-[11px] block truncate">
              {calculateAge(personnel.birth_date)}
            </span>
          </div>
          <div className="border-r border-slate-200/80 pr-1">
            <span className="text-[9px] text-slate-500 block">Masa Kerja</span>
            <span className="font-bold text-slate-900 text-[11px] block truncate">
              {calculateTenure(personnel.tmt_date)}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block">Kompetensi</span>
            <span className="font-bold text-emerald-800 text-[11px] block truncate">
              {ownedCompCount}/11
            </span>
          </div>
        </div>
      </div>

      {/* 2. ACCORDION 1: IDENTITAS & KEPEGAWAIAN */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-colors duration-100">
        <button
          type="button"
          onClick={() => toggleSection('identity')}
          className="w-full p-3 flex items-center justify-between text-left bg-white hover:bg-slate-50/80 transition-colors duration-100 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs">Identitas & Kepegawaian</h4>
              <p className="text-[10px] text-slate-500">TTL, TMT, Status & Pendidikan</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            {openSections.identity ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openSections.identity && (
          <div className="p-3 pt-0 border-t border-slate-100 space-y-2.5">
            <div className="grid grid-cols-2 gap-2 pt-2.5">
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Tempat Lahir</span>
                <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                  {personnel.birth_place || '-'}
                </span>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Tanggal Lahir</span>
                <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                  {formatDateIndo(personnel.birth_date)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Usia Personel</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                  {calculateAge(personnel.birth_date)}
                </span>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Status Karyawan</span>
                <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                  {personnel.employment_status || 'Karyawan Organik'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] text-slate-500 block">TMT Karyawan</span>
                <span className="font-semibold text-slate-900 text-xs mt-0.5 block font-mono">
                  {formatDateIndo(personnel.tmt_date)}
                </span>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Masa Kerja</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                  {calculateTenure(personnel.tmt_date)}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                <span>Pendidikan Formal</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-[10px] text-slate-500 block">Pendidikan Dimiliki</span>
                  <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                    {personnel.education_owned || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Pendidikan Diakui</span>
                  <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                    {personnel.education_recognized || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. ACCORDION 2: LISENSI STKP & SALVAGE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-colors duration-100">
        <button
          type="button"
          onClick={() => toggleSection('licenses')}
          className="w-full p-3 flex items-center justify-between text-left bg-white hover:bg-slate-50/80 transition-colors duration-100 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs">Lisensi STKP & Salvage</h4>
              <p className="text-[10px] text-slate-500">
                Rating, Basic/Junior/Senior & Salvage
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            {openSections.licenses ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openSections.licenses && (
          <div className="p-3 pt-0 border-t border-slate-100 space-y-2.5">
            {/* Status Lisensi STKP Terkini */}
            <div className="p-2.5 bg-amber-50/50 border border-amber-200/70 rounded-lg space-y-1.5 mt-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 text-xs">Lisensi STKP ARFF</span>
                {isStkpValid !== null && (
                  <Badge
                    variant={isStkpValid ? 'success' : 'danger'}
                    className="text-[9px] font-bold py-0.5 px-1.5"
                  >
                    {isStkpValid ? 'Aktif / Berlaku' : 'Kedaluwarsa'}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/50">
                <div>
                  <span className="text-[10px] text-slate-600 block">Rating Lisensi</span>
                  <span className="font-bold text-slate-900 text-xs block">
                    {personnel.cert_level ? `Level ${personnel.cert_level}` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block">Masa Berlaku</span>
                  <span className="font-semibold text-slate-900 text-xs block font-mono">
                    {formatDateIndo(personnel.license_valid_until)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 block">Nomor Lisensi STKP</span>
                <span className="font-mono font-bold text-slate-900 text-xs block">
                  {personnel.license_number || '-'}
                </span>
              </div>
            </div>

            {/* Riwayat Jenjang STKP (Basic, Junior, Senior) */}
            <div className="space-y-1.5">
              <span className="font-bold text-slate-800 text-[11px] block">
                Riwayat Jenjang Kualifikasi STKP
              </span>

              {/* Basic */}
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Basic ARFF</span>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    No: {personnel.cert_basic_no || '-'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Lemdik</span>
                  <span className="font-semibold text-slate-800 text-xs block">
                    {personnel.cert_basic_lemdik || '-'}
                  </span>
                </div>
              </div>

              {/* Junior */}
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Junior ARFF</span>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    No: {personnel.cert_junior_no || '-'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Lemdik</span>
                  <span className="font-semibold text-slate-800 text-xs block">
                    {personnel.cert_junior_lemdik || '-'}
                  </span>
                </div>
              </div>

              {/* Senior */}
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Senior ARFF</span>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    No: {personnel.cert_senior_no || '-'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Lemdik</span>
                  <span className="font-semibold text-slate-800 text-xs block">
                    {personnel.cert_senior_lemdik || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Lisensi & Refreshing Salvage */}
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg space-y-1.5">
              <span className="font-bold text-slate-900 text-xs block">
                Lisensi & Refreshing Salvage
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-[10px] text-slate-500 block">No. Lisensi Salvage</span>
                  <span className="font-mono font-semibold text-slate-900 text-xs block truncate">
                    {personnel.salvage_license_no || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Masa Berlaku</span>
                  <span className="font-mono font-semibold text-slate-900 text-xs block">
                    {formatDateIndo(personnel.salvage_license_valid_until)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block">Lemdik Salvage</span>
                  <span className="font-semibold text-slate-800 text-xs block truncate">
                    {personnel.salvage_lemdik || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Tgl Refreshing Salvage</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs block">
                    {formatDateIndo(personnel.salvage_refreshing_date)}
                  </span>
                </div>
              </div>
            </div>

            {/* General Refreshing STKP */}
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
              <span className="font-bold text-slate-900 text-xs block">
                General Refreshing STKP (Basic, Junior & Senior)
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1.5 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-[10px] text-slate-500 block">No. Sertifikat</span>
                  <span className="font-mono font-semibold text-slate-900 text-xs block truncate">
                    {personnel.refreshing_cert_number || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Tanggal / Tahun</span>
                  <span className="font-mono font-semibold text-slate-900 text-xs block">
                    {formatDateIndo(personnel.refreshing_date)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. ACCORDION 3: 11 KOMPETENSI TAMBAHAN */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-colors duration-100">
        <button
          type="button"
          onClick={() => toggleSection('competencies')}
          className="w-full p-3 flex items-center justify-between text-left bg-white hover:bg-slate-50/80 transition-colors duration-100 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-slate-900 text-xs">11 Kompetensi Tambahan</h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {ownedCompCount} / 11
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                SAR, TOT, K3, Foam, Investigator, SMS, dll
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            {openSections.competencies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openSections.competencies && (
          <div className="p-3 pt-0 border-t border-slate-100 space-y-2">
            <div className="grid grid-cols-1 gap-1.5 pt-2">
              {ALL_ADDITIONAL_COMPETENCIES.map((comp) => {
                const isOwned = competencies.includes(comp);
                return (
                  <div
                    key={comp}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors duration-100 ${
                      isOwned
                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-semibold'
                        : 'bg-slate-50/60 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isOwned
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {isOwned ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        )}
                      </div>
                      <span className={isOwned ? 'text-emerald-950 font-bold' : 'text-slate-500'}>
                        {comp}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${
                        isOwned ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {isOwned ? 'Dimiliki' : 'Belum'}
                    </span>
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
