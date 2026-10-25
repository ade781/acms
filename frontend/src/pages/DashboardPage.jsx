import React, { useState } from 'react';
import { Layers, BarChart3 } from 'lucide-react';

// Dua Konsep Terpilih Sesuai Keputusan Pengguna (Konsep 3 & Konsep 5)
import DashboardVariant3 from '../components/dashboard/variants/DashboardVariant3';
import DashboardVariant5 from '../components/dashboard/variants/DashboardVariant5';

export default function DashboardPage() {
  const [selectedVariant, setSelectedVariant] = useState('variant3'); // Default ke Konsep 3

  const variants = [
    {
      id: 'variant3',
      name: 'Konsep 3 (Linear Minimalist)',
      author: 'Agent 3',
      icon: Layers,
      desc: 'Scorecard 4 Card Baku & Matriks Armada Kompak',
    },
    {
      id: 'variant5',
      name: 'Konsep 5 (True Modular Bento Grid)',
      author: 'Agent 5',
      icon: BarChart3,
      desc: 'Bento Grid Asimetris 4 Kolom & Widget Terintegrasi',
    },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* SWITCHER / TAB PEMILIH 2 KONSEP DASHBOARD TERPILIH */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs">
        <div className="px-3 py-1.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-800">
              Komparasi 2 Konsep Dashboard Terpilih
            </span>
            <p className="text-xs text-slate-500">
              Pilih konsep di bawah untuk meninjau tata letak operasional:
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded self-start sm:self-auto">
            Mode Evaluasi Terarah (Konsep 3 & 5)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {variants.map((v) => {
            const Icon = v.icon;
            const isSelected = selectedVariant === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v.id)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    isSelected
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-bold leading-tight ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {v.name}
                    </h4>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {v.author}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-1 ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {v.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AREA RENDERING KONSEP DASHBOARD TERPILIH */}
      <div>
        {selectedVariant === 'variant3' && <DashboardVariant3 />}
        {selectedVariant === 'variant5' && <DashboardVariant5 />}
      </div>
    </div>
  );
}
