import React from 'react';
import { cleanTeam, formatTeam, formatIndoDate } from '../../../utils/shiftHelper';
import { buildAuthenticatedFileUrl } from '../../../utils/fileHelper';

/**
 * Komponen Pengesahan & Tanda Tangan Pejabat Dinamis (Mobile & Dokumen A4)
 * Mendukung format Harian 3 Shift (3 Ketua Regu + Section Head) maupun Shift Tunggal.
 * Sesuai aturan GEMINI.md Butir 4 (Dilarang Hardcode Pejabat) & Butir 5 (Identitas Pengesah dari Database).
 */
export default function MobileSignaturesSection({
  deptHead,
  supervisor,
  chiefs,
  shiftDate,
  teamGroup,
  isSheet = false,
  isClosed = false,
  roster = null,
}) {
  const getSignatureUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    return buildAuthenticatedFileUrl(url);
  };

  const teamClean = cleanTeam(teamGroup || supervisor?.team_group || 'Alpha');
  const formattedDate = formatIndoDate(shiftDate || new Date());

  // 1. Format Tanda Tangan Harian (3 Ketua Regu di KIRI + Section Head di KANAN)
  if (chiefs && isSheet) {
    const chiefsArray = Array.isArray(chiefs)
      ? chiefs
      : [
          chiefs.shift_1 || { team: roster?.shift_1 || 'Delta', shift_number: 1 },
          chiefs.shift_2 || { team: roster?.shift_2 || 'Charlie', shift_number: 2 },
          chiefs.shift_3 || { team: roster?.shift_3 || 'Alpha', shift_number: 3 },
        ];

    const shiftTitles = [
      'Pejabat Shift 1 (Pagi),',
      'Pejabat Shift 2 (Siang),',
      'Pejabat Shift 3 (Malam),',
    ];

    return (
      <div className="pt-3 sm:pt-4 border-t-2 border-slate-300 mt-4 text-xs text-center text-slate-800 font-sans relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          {/* 3 Kolom Ketua Regu */}
          {chiefsArray.slice(0, 3).map((c, idx) => {
            const teamName = c.team ? `REGU ${c.team.toUpperCase()}` : `REGU ${idx + 1}`;
            return (
              <div key={`chief-sig-${idx}`} className="p-1 flex flex-col items-center">
                <p className="text-slate-500 font-medium leading-tight text-[11px] sm:text-xs">
                  {shiftTitles[idx]}
                </p>
                <p className="font-bold text-slate-900 leading-tight text-xs uppercase mt-0.5">
                  KETUA {teamName}
                </p>

                <div className="h-12 sm:h-16 w-full flex items-center justify-center my-1">
                  {c?.signature_url ? (
                    <img
                      src={getSignatureUrl(c.signature_url)}
                      alt={`Tanda Tangan ${c.name || teamName}`}
                      className="max-h-10 sm:max-h-14 max-w-[100px] sm:max-w-[120px] object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium italic">
                      [ Tanda Tangan Digital ]
                    </span>
                  )}
                </div>

                <p className="font-bold text-slate-900 underline leading-tight text-xs">
                  {c?.name || `Ketua Regu ${c.team || ''}`}
                </p>
                {c?.nip && c.nip !== '-' && (
                  <p className="text-[10px] sm:text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                    NIP. {c.nip}
                  </p>
                )}
              </div>
            );
          })}

          {/* Kolom Section Head di Kanan */}
          <div className="p-1 flex flex-col items-center">
            <p className="text-slate-600 font-medium leading-tight text-[11px] sm:text-xs">
              Kulon Progo, {formattedDate}
            </p>
            <p className="font-bold text-slate-900 leading-tight text-xs uppercase mt-0.5">
              ARFF SECTION HEAD
            </p>

            <div className="h-12 sm:h-16 w-full flex items-center justify-center my-1">
              {deptHead?.signature_url ? (
                <img
                  src={getSignatureUrl(deptHead.signature_url)}
                  alt={`Tanda Tangan ${deptHead.name || 'Section Head'}`}
                  className="max-h-10 sm:max-h-14 max-w-[100px] sm:max-w-[120px] object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium italic">
                  [ Tanda Tangan Digital ]
                </span>
              )}
            </div>

            <p className="font-bold text-slate-900 underline leading-tight text-xs">
              {deptHead?.name || 'Section Head ARFF'}
            </p>
            {deptHead?.nip && deptHead.nip !== '-' && (
              <p className="text-[10px] sm:text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                NIP. {deptHead.nip}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Format Dokumen A4 Standar (2 Pejabat)
  if (isSheet) {
    return (
      <div className="pt-3 sm:pt-4 border-t-2 border-slate-300 mt-4 text-xs sm:text-sm text-center text-slate-800 font-sans relative z-10">
        <div className="grid grid-cols-2 gap-4 items-end">
          {/* Section Head / Dept Head */}
          <div className="p-1 sm:p-2 flex flex-col items-center">
            <p className="text-slate-600 font-medium leading-tight">Mengetahui,</p>
            <p className="font-bold text-slate-900 leading-tight">Section Head ARFF</p>
            
            <div className="h-14 sm:h-20 w-full flex items-center justify-center my-1.5">
              {deptHead?.signature_url ? (
                <img
                  src={getSignatureUrl(deptHead.signature_url)}
                  alt={`Tanda Tangan ${deptHead.name || 'Section Head'}`}
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
                  src={getSignatureUrl(supervisor.signature_url)}
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
              Supervisor / Ketua Regu ARFF YIA
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Tampilan Mobile Standard View
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs font-sans">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        Pejabat Penanggung Jawab & Pengesahan
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-slate-500 block text-[11px] font-medium">Supervisor / Ketua Regu</span>
          <span className="font-bold text-slate-900 text-sm mt-0.5 block">
            {supervisor?.name || `Ketua Regu ${formatTeam(teamClean)}`}
          </span>
          {supervisor?.nip && (
            <span className="text-slate-500 font-mono tabular-nums block text-xs mt-0.5">
              NIP. {supervisor.nip}
            </span>
          )}
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-slate-500 block text-[11px] font-medium">Section Head ARFF YIA</span>
          <span className="font-bold text-slate-900 text-sm mt-0.5 block">
            {deptHead?.name || 'Section Head ARFF'}
          </span>
          {deptHead?.nip && (
            <span className="text-slate-500 font-mono tabular-nums block text-xs mt-0.5">
              NIP. {deptHead.nip}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
