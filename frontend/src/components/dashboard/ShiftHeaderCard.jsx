import React from 'react';
import { Clock, Calendar, Users, Shield, CheckCircle } from 'lucide-react';
import { SHIFT_DEFINITIONS, formatIndoDate, cleanTeam } from '../../utils/shiftHelper';
import Badge from '../common/Badge';

export default function ShiftHeaderCard({
  shiftNumber,
  shiftDate,
  teamGroup,
  supervisorName,
  isApproved = false,
  onApproveShift,
  canApprove = false,
  approving = false,
  personnelStats,
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
              Regu {team}
            </span>
            <Badge variant={`team${team}`} size="md">
              Dinas Aktif
            </Badge>
            {isApproved ? (
              <Badge variant="serviceable" size="md">
                <CheckCircle className="w-3.5 h-3.5" />
                Dinas Telah Disahkan
              </Badge>
            ) : (
              <Badge variant="pending" size="md">
                Status: Sesi Terbuka (Open)
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
              {currentDef.name} ({currentDef.startTime} s.d. {currentDef.endTime} WIB, {currentDef.durationHours} Jam)
            </span>
            {supervisorName && (
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Shield className="w-4 h-4 text-arff-primary" />
                Ketua Regu: <strong className="text-slate-900">{supervisorName}</strong>
              </span>
            )}
            {personnelStats && (
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Users className="w-4 h-4 text-sky-600" />
                <span>
                  Personel Regu: <strong className="text-slate-900">{personnelStats.total} Orang</strong>
                  {personnelStats.isPlotted ? (
                    <>
                      {' ('}
                      <span className="text-emerald-700 font-semibold">{personnelStats.duty} Bertugas</span>
                      {personnelStats.absent > 0 ? (
                        <>, <span className="text-amber-700 font-bold">{personnelStats.absent} Izin</span></>
                      ) : (
                        <>, <span className="text-slate-500">0 Izin</span></>
                      )}
                      {')'}
                    </>
                  ) : (
                    <span className="text-slate-500 italic"> (Siaga/Belum Diploting)</span>
                  )}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Approve Shift Action */}
        {canApprove && !isApproved && onApproveShift && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onApproveShift}
              disabled={approving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors duration-100 min-h-[44px] shadow-sm disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{approving ? 'Mengesahkan...' : 'Sahkan Laporan Shift'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
