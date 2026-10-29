import React from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, ExternalLink } from 'lucide-react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import { formatRoleName } from '../../../utils/shiftHelper';

export default function VehicleQuickDetailModal({
  isOpen,
  onClose,
  vehicle,
  currentTeam = 'A',
  activeShiftNumber = 1,
  vehicleDeploymentDetails = { crewMap: {}, picMap: {} },
  watchroomLog,
  getShiftLabel = (s) => `Shift ${s}`,
  getAttachmentUrl = (u) => u
}) {
  if (!isOpen || !vehicle) return null;

  const v = vehicle;
  const vId = v.id || v.vehicle_id;
  const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
  const status = v.status || v.readiness || 'belum_dilaporkan';
  const isServiceable = status === 'serviceable';
  const isUnserviceable = status === 'unserviceable';

  const crewList = isPosko
    ? vehicleDeploymentDetails?.crewMap?.['watchroom'] || []
    : vehicleDeploymentDetails?.crewMap?.[vId] || [];

  const picName = isPosko
    ? v.pic_name ||
      vehicleDeploymentDetails?.picMap?.['watchroom'] ||
      watchroomLog?.inspector_name ||
      'Belum Ditunjuk'
    : v.pic_name || vehicleDeploymentDetails?.picMap?.[vId] || 'Belum Ditunjuk';

  const notesText = v.justification || v.notes || (isPosko ? watchroomLog?.notes : null);
  const photoUrl = v.photo_webp_url || (isPosko ? watchroomLog?.photo_webp_url : null);

  return (
    <Modal
      isOpen={isOpen && Boolean(vehicle)}
      onClose={onClose}
      title={v.vehicle_name || v.code_name || 'Rincian Unit Operasional'}
      subtitle={`Status Kelaikan & Kru Terploting • Regu ${currentTeam} (${getShiftLabel(activeShiftNumber)})`}
      maxWidth="max-w-xl"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Strip Status Operasional Ringkas (Anti-Redundansi) */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Kelaikan:</span>
            {isUnserviceable ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-800 border border-red-200">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>Unserviceable (Kendala)</span>
              </span>
            ) : isServiceable ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Serviceable (Laik Operasi)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Belum Dicek Shift Ini</span>
              </span>
            )}
          </div>
          <div className="text-xs text-slate-600">
            Penanggung Jawab: <strong className="text-slate-900">{typeof picName === 'string' ? picName : (picName?.name || 'Belum Ditunjuk')}</strong>
          </div>
        </div>

        {notesText && (
          <div
            className={`p-3 rounded-lg border ${
              isUnserviceable
                ? 'bg-red-50/60 border-red-200 text-red-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="font-bold mb-1">
              {isUnserviceable ? 'Justifikasi / Kendala Teknis:' : 'Catatan Pemeriksaan:'}
            </div>
            <p className="leading-relaxed">{notesText}</p>
          </div>
        )}

        <div>
          <h4 className="font-bold text-slate-900 mb-2">
            Kru Terploting pada Unit Ini ({crewList.length} Personel)
          </h4>
          {crewList.length === 0 ? (
            <div className="py-5 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
              Belum ada personel yang diploting pada unit ini di shift berjalan.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {crewList.map((member, i) => (
                <div
                  key={member.id || `member-${i}`}
                  className="px-3.5 py-2 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {typeof member.full_name === 'string' ? member.full_name : String(member.full_name || '')}
                      {member.is_pic ? (
                        <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          PIC
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      NIP: {member.nip || '-'} • {formatRoleName(member.rank_position)}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {String(member.employment_status || 'organik').toLowerCase() === 'organik'
                      ? 'Organik'
                      : 'Outsourcing (Training)'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {photoUrl && (
          <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              Foto Bukti Pemeriksaan Fisik
            </div>
            <img
              src={getAttachmentUrl(photoUrl)}
              alt={`Bukti fisik ${v.vehicle_name || v.code_name}`}
              className="w-full max-h-60 object-contain rounded-lg border border-slate-200 bg-slate-50"
            />
          </div>
        )}

        {/* Tautan Cepat Manajemen Kesiapan Armada Penuh */}
        <div className="pt-2 border-t border-slate-200 flex justify-end">
          <a
            href="/vehicles"
            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
          >
            <span>Buka Manajemen Kesiapan Armada Lengkap</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </Modal>
  );
}
