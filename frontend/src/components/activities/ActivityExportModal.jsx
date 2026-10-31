import React from 'react';
import { FileText } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InputField from '../common/InputField';
import SelectField from '../common/SelectField';
import { OFFICIAL_ACTIVITY_CATEGORIES } from '../../utils/activityCategories';

export default function ActivityExportModal({
  isOpen = false,
  onClose,
  exportPeriod = '1month',
  setExportPeriod,
  exportStartDate = '',
  setExportStartDate,
  exportEndDate = '',
  setExportEndDate,
  exportCategory = 'ALL',
  setExportCategory,
  exportTeam = 'ALL',
  setExportTeam,
  onPreview,
  isLoadingPreview = false,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isLoadingPreview && onClose()}
      title="Cetak Rekapitulasi Logbook Kegiatan Resmi"
    >
      <div className="space-y-4">
        <SelectField
          label="Periode Rekapitulasi"
          value={exportPeriod}
          onChange={(e) => setExportPeriod(e.target.value)}
          options={[
            { value: '1week', label: '1 Minggu Terakhir (7 Hari)' },
            { value: '1month', label: '1 Bulan Terakhir (30 Hari)' },
            { value: '3months', label: '3 Bulan Terakhir (Triwulan)' },
            { value: '1year', label: '1 Tahun Terakhir (Tahunan)' },
            { value: 'custom', label: 'Rentang Tanggal Kustom' },
          ]}
        />

        {exportPeriod === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <InputField
              label="Tanggal Mulai"
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
            />
            <InputField
              label="Tanggal Selesai"
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField
            label="Filter Kategori Kegiatan"
            value={exportCategory}
            onChange={(e) => setExportCategory(e.target.value)}
            options={[
              { value: 'ALL', label: 'Semua Kategori Aktivitas' },
              ...OFFICIAL_ACTIVITY_CATEGORIES.map((c) => ({
                value: c.value,
                label: c.label.split('(')[0].trim(),
              })),
            ]}
          />

          <SelectField
            label="Filter Regu Dinas"
            value={exportTeam}
            onChange={(e) => setExportTeam(e.target.value)}
            options={[
              { value: 'ALL', label: 'Seluruh Regu Dinas (A-D)' },
              { value: 'Alpha', label: 'Regu Alpha' },
              { value: 'Bravo', label: 'Regu Bravo' },
              { value: 'Charlie', label: 'Regu Charlie' },
              { value: 'Delta', label: 'Regu Delta' },
            ]}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            disabled={isLoadingPreview}
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={FileText}
            loading={isLoadingPreview}
            disabled={isLoadingPreview || (exportPeriod === 'custom' && (!exportStartDate || !exportEndDate))}
            onClick={onPreview}
          >
            {isLoadingPreview ? 'Menyusun Pratinjau...' : 'Buka Pratinjau PDF'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
