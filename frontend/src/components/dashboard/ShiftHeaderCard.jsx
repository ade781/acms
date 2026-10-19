import React from 'react';
import { Clock, Calendar, Users, Shield, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SHIFT_DEFINITIONS, formatIndoDate, cleanTeam } from '../../utils/shiftHelper';
import Badge from '../common/Badge';

export default function ShiftHeaderCard({
  shiftNumber,
  shiftDate,
  teamGroup,
  supervisorName,
  isApproved = false,
  personnelStats,
  openIncidentsCount = 0,
  onOpenIncidentModal,
}) {
  const currentDef = SHIFT_DEFINITIONS.find((s) => s.number === Number(shiftNumber)) || SHIFT_DEFINITIONS[0];
  const team = cleanTeam(teamGroup);

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
            {isApproved ? (
              <Badge variant="serviceable" size="md">
                <CheckCircle className="w-3.5 h-3.5" />
                Telah Disahkan
              </Badge>
            ) : (
              <Badge variant="default" size="md">
                Belum Disahkan
              </Badge>
            )}
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

        {/* Right: Actions (Incident Status Badge/Button & Approve Shift) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Insiden */}
          <button
            type="button"
            onClick={onOpenIncidentModal}
            title={openIncidentsCount > 0 ? `${openIncidentsCount} Insiden Aktif` : '0 Insiden'}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors duration-100 min-h-[40px] shadow-sm border ${
              openIncidentsCount > 0
                ? 'bg-red-600 border-red-700 text-white hover:bg-red-700 animate-pulse'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
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
