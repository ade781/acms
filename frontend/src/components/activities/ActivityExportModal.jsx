import React from 'react';
import { Download } from 'lucide-react';
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
  onExport,
  isExporting = false,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isExporting && onClose()}
      title="Cetak Rekapitulasi Logbook Kegiatan Resmi"
      subtitle="Unduh berkas PDF logbook rangkaian kegiatan dinas bertandatangan pimpinan dinas ARFF YIA"
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

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
          <p className="font-semibold">Format Dokumen Cetak Standar D-OPS ARFF YIA:</p>
          <p className="text-[11px] text-blue-700">
            Dokumen PDF memuat daftar kronologis aktivitas dinas, jam pelaksanaan (WIB), kategori kegiatan, uraian teknis hasil pelaksanaan, serta lembar tanda tangan dinas Section Head.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            disabled={isExporting}
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={Download}
            loading={isExporting}
            disabled={isExporting || (exportPeriod === 'custom' && (!exportStartDate || !exportEndDate))}
            onClick={onExport}
          >
            {isExporting ? 'Memproses Dokumen PDF...' : 'Unduh Dokumen PDF'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
