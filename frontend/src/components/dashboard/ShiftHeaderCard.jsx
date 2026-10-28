import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, Users, Shield, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SHIFT_DEFINITIONS, formatIndoDate, cleanTeam } from '../../utils/shiftHelper';
import Badge from '../common/Badge';

export default function ShiftHeaderCard({
  shiftNumber,
  shiftDate,
  teamGroup,
  supervisorName,
  personnelStats,
  openIncidentsCount = 0,
  onOpenIncidentModal,
}) {
  const navigate = useNavigate();
  const currentDef = SHIFT_DEFINITIONS.find((s) => s.number === Number(shiftNumber)) || SHIFT_DEFINITIONS[0];
  const team = cleanTeam(teamGroup);

  const handleIncidentClick = () => {
    if (typeof onOpenIncidentModal === 'function') {
      onOpenIncidentModal();
    } else {
      navigate('/incidents');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Active Shift & Team Info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {team}
            </span>
            <Badge variant={`team${team}`} size="md">
              Dinas Aktif
            </Badge>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
              Pukul {currentDef.startTime} - {currentDef.endTime} WIB
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-slate-400" />
              {formatIndoDate(shiftDate)}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Clock className="w-4 h-4 text-slate-400" />
              {currentDef.name} ({currentDef.startTime} - {currentDef.endTime})
            </span>
            {supervisorName && (
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Shield className="w-4 h-4 text-arff-primary" />
                Ketua: <strong className="text-slate-900">{supervisorName}</strong>
              </span>
            )}
            {personnelStats && (
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Users className="w-4 h-4 text-sky-600" />
                <span>
                  Personel: <strong className="text-slate-900">{personnelStats.total}</strong>
                  {personnelStats.isPlotted ? (
                    <>
                      {' ('}
                      <span className="text-emerald-700 font-semibold">{personnelStats.duty} Dinas</span>
                      {personnelStats.absent > 0 ? (
                        <>, <span className="text-amber-700 font-bold">{personnelStats.absent} Izin</span></>
                      ) : (
                        <>, <span className="text-slate-500">0 Izin</span></>
                      )}
                      {')'}
                    </>
                  ) : (
                    <span className="text-slate-600 font-medium"> ({personnelStats.total} Siaga)</span>
                  )}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions (Incident Status Badge/Button navigasi ke /incidents) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleIncidentClick}
            title={openIncidentsCount > 0 ? `${openIncidentsCount} Insiden Aktif - Klik untuk buka insiden` : '0 Insiden - Klik untuk buka daftar insiden'}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors duration-100 min-h-[40px] shadow-sm border cursor-pointer ${
              openIncidentsCount > 0
                ? 'bg-red-600 border-red-700 text-white hover:bg-red-700 animate-pulse'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {openIncidentsCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-white shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>
              {openIncidentsCount > 0 ? `${openIncidentsCount} Insiden Aktif` : '0 Insiden'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
