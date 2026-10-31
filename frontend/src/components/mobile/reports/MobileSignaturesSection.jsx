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
  isClosed = false,
}) {
  const { token } = useAuth();
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('arff_token') : '') || '';

  const getAuthorizedUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (!authToken || url.includes('token=')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(authToken)}`;
  };

  const teamClean = cleanTeam(teamGroup || supervisor?.team_group || 'Alpha');
  const formattedDate = formatIndoDate(shiftDate || new Date());

  // Style untuk lembar cetak dokumen A4 (sheet preview)
  if (isSheet) {
    return (
      <div className="pt-3 sm:pt-4 border-t-2 border-slate-300 mt-4 text-xs sm:text-sm text-center text-slate-800 font-sans relative z-10">
        <div className="grid grid-cols-2 gap-4 items-end">
          {/* Section Head / Dept Head */}
          <div className="p-1 sm:p-2 flex flex-col items-center">
            <p className="text-slate-600 font-medium leading-tight">Mengetahui,</p>
            <p className="font-bold text-slate-900 leading-tight">Section Head ARFF</p>
            
            <div className="h-14 sm:h-20 w-full flex items-center justify-center my-1.5">
              {isClosed && deptHead?.signature_url ? (
                <img
                  src={getAuthorizedUrl(deptHead.signature_url)}
                  alt={`Tanda Tangan ${deptHead.name || 'Section Head'}`}
                  className="max-h-12 sm:max-h-18 max-w-[130px] sm:max-w-[180px] object-contain"
                  loading="lazy"
                />
              ) : !isClosed ? (
                <div className="border border-dashed border-red-300 bg-red-50/70 rounded px-2.5 py-1 text-center max-w-[200px]">
                  <span className="text-xs font-semibold text-red-700 block">
                    [ DRAFT • BELUM DISAHKAN ]
                  </span>
                </div>
              ) : (
                <span className="text-xs font-sans text-slate-500 font-medium italic">
                  [ Tanda Tangan Digital ]
                </span>
              )}
            </div>

            <p className="font-bold text-slate-900 underline leading-tight text-xs sm:text-sm">
              {deptHead?.name || 'Section Head ARFF'}
            </p>
            {deptHead?.nip && deptHead.nip !== '-' && (
              <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                NIP. {deptHead.nip}
              </p>
            )}
            <p className="text-xs text-slate-500 leading-tight mt-0.5">
              Airport Rescue & Fire Fighting Section Head
            </p>
          </div>

          {/* Ketua Regu Dinas */}
          <div className="p-1 sm:p-2 flex flex-col items-center">
            <p className="text-slate-600 font-medium leading-tight">Kulon Progo, {formattedDate}</p>
            <p className="font-bold text-slate-900 leading-tight">
              Ketua Regu Dinas ({teamClean})
            </p>
            
            <div className="h-14 sm:h-20 w-full flex items-center justify-center my-1.5">
              {supervisor?.signature_url ? (
                <img
                  src={getAuthorizedUrl(supervisor.signature_url)}
                  alt={`Tanda Tangan ${supervisor.name || 'Ketua Regu'}`}
                  className="max-h-12 sm:max-h-18 max-w-[130px] sm:max-w-[180px] object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-xs font-sans text-slate-500 font-medium italic">
                  [ Tanda Tangan Digital ]
                </span>
              )}
            </div>

            <p className="font-bold text-slate-900 underline leading-tight text-xs sm:text-sm">
              {supervisor?.name || `Chief ${formatTeam(teamClean)}`}
            </p>
            {supervisor?.nip && supervisor.nip !== '-' && (
              <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                NIP. {supervisor.nip}
              </p>
            )}
            <p className="text-xs text-slate-500 leading-tight mt-0.5">
              Airport Rescue & Fire Fighting Shift Supervisor
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Style untuk tampilan card reguler
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-3 font-sans">
      <div className="border-b border-slate-100 pb-2">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
          Pejabat Penandatangan Dinas
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Dept Head */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col items-center text-center">
          <span className="text-xs text-slate-500 font-semibold uppercase block">
            Section Head ARFF
          </span>

          <div className="h-14 w-full flex items-center justify-center my-1.5 bg-white/70 rounded border border-slate-100">
            {isClosed && deptHead?.signature_url ? (
              <img
                src={getAuthorizedUrl(deptHead.signature_url)}
                alt="Tanda Tangan Section Head"
                className="max-h-12 max-w-[110px] object-contain"
                loading="lazy"
              />
            ) : !isClosed ? (
              <span className="text-xs font-sans text-amber-700 font-medium italic text-center px-1">
                Menunggu Pengesahan
              </span>
            ) : (
              <span className="text-xs font-sans text-slate-500 font-medium italic">
                Tanda tangan digital
              </span>
            )}
          </div>

          <p className="font-bold text-slate-900 text-xs underline truncate max-w-full">
            {deptHead?.name || 'Section Head ARFF'}
          </p>
          {deptHead?.nip && deptHead.nip !== '-' ? (
            <p className="text-xs text-slate-500 font-mono tabular-nums truncate max-w-full">
              NIP. {deptHead.nip}
            </p>
          ) : (
            <p className="text-xs text-slate-500 font-medium">-</p>
          )}
        </div>

        {/* Supervisor / Ketua Regu */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col items-center text-center">
          <span className="text-xs text-slate-500 font-semibold uppercase block">
            Ketua Regu ({teamClean})
          </span>

          <div className="h-14 w-full flex items-center justify-center my-1.5 bg-white/70 rounded border border-slate-100">
            {supervisor?.signature_url ? (
              <img
                src={getAuthorizedUrl(supervisor.signature_url)}
                alt="Tanda Tangan Ketua Regu"
                className="max-h-12 max-w-[110px] object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-xs font-sans text-slate-500 font-medium italic">
                Tanda tangan digital
              </span>
            )}
          </div>

          <p className="font-bold text-slate-900 text-xs underline truncate max-w-full">
            {supervisor?.name || `Chief ${formatTeam(teamClean)}`}
          </p>
          {supervisor?.nip && supervisor.nip !== '-' ? (
            <p className="text-xs text-slate-500 font-mono tabular-nums truncate max-w-full">
              NIP. {supervisor.nip}
            </p>
          ) : (
            <p className="text-xs text-slate-500 font-medium">-</p>
          )}
        </div>
      </div>
    </div>
  );
}
