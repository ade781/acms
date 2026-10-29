import React from 'react';
import AnnouncementDetailModal from './modals/AnnouncementDetailModal';
import PersonnelCompositionModal from './modals/PersonnelCompositionModal';
import ShiftPlotingModal from './modals/ShiftPlotingModal';
import ShiftLeavesModal from './modals/ShiftLeavesModal';
import ShiftActivitiesModal from './modals/ShiftActivitiesModal';
import IncidentQuickDetailModal from './modals/IncidentQuickDetailModal';
import VehicleQuickDetailModal from './modals/VehicleQuickDetailModal';

/**
 * DashboardDetailModals (Orchestrator)
 * Mengorkestrasi 7 submodal rincian Layer 2 dashboard secara modular:
 * 1. AnnouncementDetailModal - Pengumuman & Surat Edaran
 * 2. PersonnelCompositionModal - Komposisi Personel Regu
 * 3. ShiftPlotingModal - Formasi Shift & Ploting Tugas
 * 4. ShiftLeavesModal - Daftar Personel Izin/Cuti
 * 5. ShiftActivitiesModal - Logbook Kegiatan Shift
 * 6. IncidentQuickDetailModal - Rincian Laporan Insiden
 * 7. VehicleQuickDetailModal - Rincian Unit Armada / Posko Watchroom
 */
export default function DashboardDetailModals({
  activeModal,
  setActiveModal,
  announcements,
  personnelComposition,
  selectedTeamTab,
  setSelectedTeamTab,
  filteredModalPersonnel,
  deploymentByPersonnelId,
  currentTeam,
  activeDate,
  activeShiftNumber,
  supervisorName,
  shiftInfo,
  activities,
  selectedIncidentDetail,
  setSelectedIncidentDetail,
  loadingIncidentDetail,
  watchroomLog,
  vehicleDeploymentDetails,
  getAttachmentUrl,
  handleInteractiveKeyDown,
  getShiftLabel,
  getShiftHours,
  formatIncidentCategory,
  formatIncidentStatus
}) {
  const closeModal = () => setActiveModal(null);

  return (
    <>
      <AnnouncementDetailModal
        isOpen={activeModal?.type === 'announcement'}
        onClose={closeModal}
        announcement={activeModal?.item}
        announcements={announcements}
        getAttachmentUrl={getAttachmentUrl}
      />

      <PersonnelCompositionModal
        isOpen={activeModal?.type === 'personnel'}
        onClose={closeModal}
        personnelComposition={personnelComposition}
        selectedTeamTab={selectedTeamTab}
        setSelectedTeamTab={setSelectedTeamTab}
        filteredModalPersonnel={filteredModalPersonnel}
        deploymentByPersonnelId={deploymentByPersonnelId}
        currentTeam={currentTeam}
        activeShiftNumber={activeShiftNumber}
        getShiftLabel={getShiftLabel}
      />

      <ShiftPlotingModal
        isOpen={activeModal?.type === 'shift'}
        onClose={closeModal}
        activeShiftNumber={activeShiftNumber}
        currentTeam={currentTeam}
        activeDate={activeDate}
        supervisorName={supervisorName}
        shiftInfo={shiftInfo}
        personnelComposition={personnelComposition}
        getShiftLabel={getShiftLabel}
        getShiftHours={getShiftHours}
      />

      <ShiftLeavesModal
        isOpen={activeModal?.type === 'leave'}
        onClose={closeModal}
        activeDate={activeDate}
        activeShiftNumber={activeShiftNumber}
        currentTeam={currentTeam}
        personnelComposition={personnelComposition}
        getShiftLabel={getShiftLabel}
      />

      <ShiftActivitiesModal
        isOpen={activeModal?.type === 'activities'}
        onClose={closeModal}
        currentTeam={currentTeam}
        activeDate={activeDate}
        activeShiftNumber={activeShiftNumber}
        activities={activities}
        getShiftLabel={getShiftLabel}
        getAttachmentUrl={getAttachmentUrl}
      />

      <IncidentQuickDetailModal
        isOpen={activeModal?.type === 'incident_item' && Boolean(selectedIncidentDetail)}
        onClose={() => {
          closeModal();
          setSelectedIncidentDetail(null);
        }}
        incident={selectedIncidentDetail}
        loading={loadingIncidentDetail}
        currentTeam={currentTeam}
        getAttachmentUrl={getAttachmentUrl}
        formatIncidentCategory={formatIncidentCategory}
        formatIncidentStatus={formatIncidentStatus}
      />

      <VehicleQuickDetailModal
        isOpen={activeModal?.type === 'vehicle_item' && Boolean(activeModal?.item)}
        onClose={closeModal}
        vehicle={activeModal?.item}
        currentTeam={currentTeam}
        activeShiftNumber={activeShiftNumber}
        vehicleDeploymentDetails={vehicleDeploymentDetails}
        watchroomLog={watchroomLog}
        getShiftLabel={getShiftLabel}
        getAttachmentUrl={getAttachmentUrl}
      />
    </>
  );
}
