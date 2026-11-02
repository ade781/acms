import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { cleanTeam, formatTeam, formatIndoDate } from '../../../utils/shiftHelper';

/**
 * Komponen Pengesahan & Tanda Tangan Pejabat Dinamis (Mobile & Dokumen A4)
 * Menampilkan 4 Pejabat Dinas Operasional 24 Jam (Chief Shift 1, Chief Shift 2, Chief Shift 3, dan Section Head ARFF).
 * Sesuai aturan GEMINI.md Butir 4 (Dilarang Hardcode Pejabat) & Butir 5 (Identitas Pengesah dari Database).
 */
export default function MobileSignaturesSection({
  deptHead,
  supervisor,
  shiftsData,
  chiefs,
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

  const formattedDate = formatIndoDate(shiftDate || new Date());

  // Ekstraksi 3 Chief dari shiftsData atau prop chiefs
  let shiftChiefs = [];
  if (Array.isArray(chiefs) && chiefs.length > 0) {
    shiftChiefs = chiefs;
  } else if (shiftsData) {
    shiftChiefs = [1, 2, 3].map((num) => {
      const s = shiftsData[num] || {};
      return {
        shiftNumber: num,
        shiftName: s.shiftName || `Shift ${num}`,
        teamGroup: s.teamGroup || (num === 1 ? 'Delta' : num === 2 ? 'Charlie' : 'Alpha'),
        name: s.supervisor_name || `Chief Shift ${num}`,
        nip: s.supervisor_nip || null,
        signature_url: s.supervisor_signature_url || null,
      };
    });
  } else if (supervisor) {
    const singleTeam = cleanTeam(teamGroup || supervisor?.team_group || 'Alpha');
    shiftChiefs = [
      {
        shiftNumber: 1,
        shiftName: 'Shift 1 (Pagi)',
        teamGroup: singleTeam,
        name: supervisor?.name || `Chief ${formatTeam(singleTeam)}`,
        nip: supervisor?.nip || null,
        signature_url: supervisor?.signature_url || null,
      },
    ];
  }

  // Style untuk lembar cetak dokumen A4 (sheet preview)
  if (isSheet) {
    return (
      <div className="pt-3 sm:pt-4 border-t-2 border-slate-300 mt-4 text-xs sm:text-sm text-center text-slate-800 font-sans relative z-10">
        <div className="mb-2 text-right text-xs text-slate-600 font-medium pr-2">
          Kulon Progo, {formattedDate}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Chief 3 Shift Operasional */}
          {shiftChiefs.map((c, idx) => {
            const teamClean = cleanTeam(c.teamGroup);
            return (
              <div key={`chief-${c.shiftNumber || idx}`} className="p-1 sm:p-2 flex flex-col items-center">
                <p className="text-slate-600 font-medium leading-tight text-xs">Ketua Regu</p>
                <p className="font-bold text-slate-900 leading-tight text-xs">
                  {c.shiftName || `Shift ${c.shiftNumber}`} ({teamClean})
                </p>

                <div className="h-12 sm:h-16 w-full flex items-center justify-center my-1 bg-slate-50/50 rounded">
                  {c.signature_url ? (
                    <img
                      src={getAuthorizedUrl(c.signature_url)}
                      alt={`Tanda Tangan ${c.name || 'Ketua Regu'}`}
                      className="max-h-10 sm:max-h-14 max-w-[100px] sm:max-w-[130px] object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs font-sans text-slate-400 font-medium italic">
                      [ Tanda Tangan Digital ]
                    </span>
                  )}
                </div>

                <p className="font-bold text-slate-900 underline leading-tight text-xs truncate max-w-full">
                  {c.name || `Chief ${formatTeam(teamClean)}`}
                </p>
                {c.nip && c.nip !== '-' && (
                  <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5 truncate max-w-full">
                    NIP. {c.nip}
                  </p>
                )}
                <p className="text-xs text-slate-500 leading-tight mt-0.5">
                  Shift Supervisor
                </p>
              </div>
            );
          })}

          {/* Section Head ARFF (Mengetahui) */}
          <div className="p-1 sm:p-2 flex flex-col items-center">
            <p className="text-slate-600 font-medium leading-tight text-xs">Mengetahui,</p>
            <p className="font-bold text-slate-900 leading-tight text-xs">Section Head ARFF</p>

            <div className="h-12 sm:h-16 w-full flex items-center justify-center my-1 bg-slate-50/50 rounded">
              {isClosed && deptHead?.signature_url ? (
                <img
                  src={getAuthorizedUrl(deptHead.signature_url)}
                  alt={`Tanda Tangan ${deptHead.name || 'Section Head'}`}
                  className="max-h-10 sm:max-h-14 max-w-[100px] sm:max-w-[130px] object-contain"
                  loading="lazy"
                />
              ) : !isClosed ? (
                <div className="border border-dashed border-red-300 bg-red-50/70 rounded px-2 py-0.5 text-center">
                  <span className="text-xs font-semibold text-red-700 block">
                    [ DRAFT • BELUM DISAHKAN ]
                  </span>
                </div>
              ) : (
                <span className="text-xs font-sans text-slate-400 font-medium italic">
                  [ Tanda Tangan Digital ]
                </span>
              )}
            </div>

            <p className="font-bold text-slate-900 underline leading-tight text-xs truncate max-w-full">
              {deptHead?.name || 'Section Head ARFF'}
            </p>
            {deptHead?.nip && deptHead.nip !== '-' && (
              <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5 truncate max-w-full">
                NIP. {deptHead.nip}
              </p>
            )}
            <p className="text-xs text-slate-500 leading-tight mt-0.5">
              Airport Rescue & Fire Fighting Section Head
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Style untuk tampilan card reguler (Desktop & Mobile view)
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 font-sans">
      <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
          Pengesahan Pejabat Dinas Operasional (24 Jam)
        </h4>
        <span className="text-xs text-slate-500 font-medium">4 Pejabat Dinas</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* 3 Chief Shift */}
        {shiftChiefs.map((c, idx) => {
          const teamClean = cleanTeam(c.teamGroup);
          return (
            <div
              key={`card-chief-${c.shiftNumber || idx}`}
              className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col items-center text-center space-y-1.5"
            >
              <div className="w-full">
                <span className="text-xs font-bold text-slate-800 uppercase block truncate">
                  {c.shiftName || `Shift ${c.shiftNumber}`}
                </span>
                <span className="text-xs text-slate-500 font-semibold block">
                  Regu {teamClean}
                </span>
              </div>

              <div className="h-14 w-full flex items-center justify-center bg-white rounded border border-slate-100 my-1">
                {c.signature_url ? (
                  <img
                    src={getAuthorizedUrl(c.signature_url)}
                    alt={`Tanda Tangan ${c.name || 'Ketua Regu'}`}
                    className="max-h-12 max-w-[110px] object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs font-sans text-slate-400 font-medium italic">
                    Tanda tangan digital
                  </span>
                )}
              </div>

              <p className="font-bold text-slate-900 text-xs underline truncate max-w-full">
                {c.name || `Chief ${formatTeam(teamClean)}`}
              </p>
              {c.nip && c.nip !== '-' ? (
                <p className="text-xs text-slate-500 font-mono tabular-nums truncate max-w-full">
                  NIP. {c.nip}
                </p>
              ) : (
                <p className="text-xs text-slate-400 font-medium">-</p>
              )}
            </div>
          );
        })}

        {/* Section Head ARFF */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col items-center text-center space-y-1.5">
          <div className="w-full">
            <span className="text-xs font-bold text-slate-800 uppercase block truncate">
              Mengetahui
            </span>
            <span className="text-xs text-slate-500 font-semibold block truncate">
              Section Head ARFF
            </span>
          </div>

          <div className="h-14 w-full flex items-center justify-center bg-white rounded border border-slate-100 my-1">
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
              <span className="text-xs font-sans text-slate-400 font-medium italic">
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
            <p className="text-xs text-slate-400 font-medium">-</p>
          )}
        </div>
      </div>
    </div>
  );
}
