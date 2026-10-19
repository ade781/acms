import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Shield, Award, Calendar, FileUp, Info } from 'lucide-react';
import api from '../services/api';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

export default function HalamanDetailPersonel() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [personnel, setPersonnel] = useState(null);

  useEffect(() => {
    async function fetchPersonnelDetail() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/personnel/${id}`);
        setPersonnel(res.data?.personnel || res.data);
      } catch (err) {
        console.error('Error fetching personnel detail:', err);
        setError('Gagal memuat profil personel.');
      } finally {
        setLoading(false);
      }
    }
    fetchPersonnelDetail();
  }, [id]);

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate('/personnel')}
        >
          Kembali ke Katalog Personel
        </Button>
      </div>

      <StateView loading={loading} error={error} onRetry={() => window.location.reload()}>
        {personnel && (
          <div className="space-y-6">
            {/* Header Identity Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-red-100 text-arff-primary flex items-center justify-center font-bold text-xl select-none">
                  {personnel.full_name?.charAt(0) || <User className="w-8 h-8" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900">{personnel.full_name}</h2>
                    <Badge variant={`team${cleanTeam(personnel.team_group) || 'Alpha'}`} size="md">
                      {formatTeam(personnel.team_group || 'Alpha')}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {personnel.rank_position || 'Anggota Unit PKP-PK'}
                  </p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    NIP: <span className="font-bold text-slate-800">{personnel.nip || '-'}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <span className="text-[11px] font-bold uppercase text-slate-400">Status Kepegawaian</span>
                <span className="text-xs font-bold text-slate-800 capitalize px-2.5 py-1 bg-slate-100 rounded-md">
                  {personnel.employment_status || 'Organik'}
                </span>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* License & Certification */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
                  <Award className="w-5 h-5 text-arff-primary" />
                  <h3 className="text-sm font-bold text-slate-900">Kualifikasi Lisensi PKP-PK</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Tingkat Lisensi:</span>
                    <Badge variant="info" size="sm">
                      {personnel.cert_level || 'Junior'} Fire Fighter
                    </Badge>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Nomor Registrasi Lisensi:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {personnel.cert_number || 'Belum Tercatat'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Masa Berlaku Lisensi:</span>
                    <span className="font-medium text-slate-800">
                      {personnel.cert_expiry_date || 'Permanen / Tidak Ditentukan'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Pendidikan Terakhir:</span>
                    <span className="font-medium text-slate-800">
                      {personnel.formal_education || 'SMA / Sederajat'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Operational Records */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
                  <Shield className="w-5 h-5 text-sky-600" />
                  <h3 className="text-sm font-bold text-slate-900">Status Kedinasan & Akun</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Status Aktif Dinas:</span>
                    <span className="font-semibold text-emerald-700">Aktif Berdinas</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Nomor Induk Pegawai (NIP):</span>
                    <span className="font-mono font-bold text-slate-900">{personnel.nip || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Kesesuaian Regu:</span>
                    <span className="font-bold text-slate-800">{formatTeam(personnel.team_group)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Terdaftar Sejak:</span>
                    <span className="text-slate-700">
                      {personnel.created_at ? new Date(personnel.created_at).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coming Soon: Document Upload Banner (Section 3 Item 6) */}
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 shadow-sm text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileUp className="w-6 h-6" />
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
                Fitur Pengunggahan Berkas (Coming Soon)
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Penyimpanan Digital Sertifikat & Dokumen Personel
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Modul pengunggahan file scan ijazah, lisensi PKP-PK, dan sertifikat pelatihan akan diaktifkan pada rilis pembaruan berikutnya.
              </p>
            </div>
          </div>
        )}
      </StateView>
    </div>
  );
}
