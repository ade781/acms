import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { cleanTeam, formatTeam, formatIndoDate } from '../../../utils/shiftHelper';

/**
 * Komponen Pengesahan & Tanda Tangan Pejabat Dinamis (Mobile & Dokumen A4)
 * Menampilkan Dept. Head dan Ketua Regu secara dinamis dari database sesuai shift dinas.
 * Sesuai aturan GEMINI.md Butir 4 (Dilarang Hardcode Pejabat) & Butir 5 (Identitas Pengesah dari Database).
 */
export default function MobileSignaturesSection({
  deptHead,
  supervisor,
  shiftDate,
  teamGroup,
  isSheet = false,
}) {
  const { token } = useAuth();
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('arff_token') : '') || '';

  const getAuthorizedUrl = (url) => {
    if (!url) return '';
    if (!authToken || url.includes('token=')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(authToken)}`;
  };

  const teamClean = cleanTeam(teamGroup || supervisor?.team_group || 'Alpha');
  const formattedDate = formatIndoDate(shiftDate || new Date());

  // Style untuk lembar cetak dokumen A4 (sheet preview)
  if (isSheet) {
    return (
      <div className="pt-3 border-t border-slate-300 mt-3 text-[8.5px] text-center text-slate-800">
        <div className="grid grid-cols-2 gap-2 items-end">
          {/* Section Head / Dept Head */}
          <div className="p-1 flex flex-col items-center">
            <p className="text-slate-600 font-medium leading-tight">Mengetahui,</p>
            <p className="font-bold text-slate-900 leading-tight">Section Head ARFF</p>
            
            <div className="h-12 w-full flex items-center justify-center my-1">
              {deptHead?.signature_url ? (
                <img
                  src={getAuthorizedUrl(deptHead.signature_url)}
                  alt={`Tanda Tangan ${deptHead.name || 'Section Head'}`}
                  className="max-h-11 max-w-[120px] object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-[7.5px] font-mono text-slate-400 italic">
                  [ Tanda Tangan Digital ]
                </span>
              )}
            </div>

            <p className="font-bold text-slate-900 underline leading-tight">
              {deptHead?.name || 'Section Head ARFF'}
            </p>
            {deptHead?.nip && deptHead.nip !== '-' && (
              <p className="text-[7.5px] text-slate-500 font-mono mt-0.5">
                NIP. {deptHead.nip}
              </p>
            )}
            <p className="text-[7px] text-slate-500 leading-tight">
              Airport Rescue & Fire Fighting Section Head
            </p>
          </div>

          {/* Ketua Regu Dinas */}
          <div className="p-1 flex flex-col items-center">
            <p className="text-slate-600 font-medium leading-tight">Kulon Progo, {formattedDate}</p>
            <p className="font-bold text-slate-900 leading-tight">
              Ketua Regu Dinas ({teamClean})
            </p>
            
            <div className="h-12 w-full flex items-center justify-center my-1">
              {supervisor?.signature_url ? (
                <img
                  src={getAuthorizedUrl(supervisor.signature_url)}
                  alt={`Tanda Tangan ${supervisor.name || 'Ketua Regu'}`}
                  className="max-h-11 max-w-[120px] object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-[7.5px] font-mono text-slate-400 italic">
                  [ Tanda Tangan Digital ]
                </span>
              )}
            </div>

            <p className="font-bold text-slate-900 underline leading-tight">
              {supervisor?.name || `Chief ${formatTeam(teamClean)}`}
            </p>
            {supervisor?.nip && supervisor.nip !== '-' && (
              <p className="text-[7.5px] text-slate-500 font-mono mt-0.5">
                NIP. {supervisor.nip}
              </p>
            )}
            <p className="text-[7px] text-slate-500 leading-tight">
              Airport Rescue & Fire Fighting Shift Supervisor
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Style untuk tampilan mobile card reguler
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs space-y-2">
      <div className="border-b border-slate-100 pb-1">
        <h4 className="text-xs font-bold text-slate-900 uppercase">
          Pejabat Penandatangan Dinas
        </h4>
        <p className="text-[9px] text-slate-500">
          Tervalidasi dinamis sesuai pejabat pimpinan shift operasional
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Dept Head */}
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col items-center text-center">
          <span className="text-[9px] text-slate-500 font-semibold uppercase block">
            Section Head ARFF
          </span>

          <div className="h-14 w-full flex items-center justify-center my-1 bg-white/70 rounded border border-slate-100">
            {deptHead?.signature_url ? (
              <img
                src={getAuthorizedUrl(deptHead.signature_url)}
                alt="Tanda Tangan Section Head"
                className="max-h-12 max-w-[110px] object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-[8px] font-mono text-slate-400 italic">
                Tanda tangan digital
              </span>
            )}
          </div>

          <p className="font-bold text-slate-900 text-[11px] underline truncate max-w-full">
            {deptHead?.name || 'Section Head ARFF'}
          </p>
          {deptHead?.nip && deptHead.nip !== '-' ? (
            <p className="text-[8.5px] text-slate-500 font-mono truncate max-w-full">
              NIP. {deptHead.nip}
            </p>
          ) : (
            <p className="text-[8.5px] text-slate-400">-</p>
          )}
        </div>

        {/* Supervisor / Ketua Regu */}
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col items-center text-center">
          <span className="text-[9px] text-slate-500 font-semibold uppercase block">
            Ketua Regu ({teamClean})
          </span>

          <div className="h-14 w-full flex items-center justify-center my-1 bg-white/70 rounded border border-slate-100">
            {supervisor?.signature_url ? (
              <img
                src={getAuthorizedUrl(supervisor.signature_url)}
                alt="Tanda Tangan Ketua Regu"
                className="max-h-12 max-w-[110px] object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-[8px] font-mono text-slate-400 italic">
                Tanda tangan digital
              </span>
            )}
          </div>

          <p className="font-bold text-slate-900 text-[11px] underline truncate max-w-full">
            {supervisor?.name || `Chief ${formatTeam(teamClean)}`}
          </p>
          {supervisor?.nip && supervisor.nip !== '-' ? (
            <p className="text-[8.5px] text-slate-500 font-mono truncate max-w-full">
              NIP. {supervisor.nip}
            </p>
          ) : (
            <p className="text-[8.5px] text-slate-400">-</p>
          )}
        </div>
      </div>
    </div>
  );
}
