'use client'

import React, { useState } from 'react'
import { useCascading } from '@/context/CascadingContext'
import { ROLE_LABELS } from '@/lib/types'

export default function MatriksCascadingPage() {
  const {
    role,
    periode,
    isLoading,
    sukpaAssignments,
    unitAssignments,
    outputAssignments,
    uraianAssignments,
    subUraianAssignments,
  } = useCascading()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIkuFilter, setSelectedIkuFilter] = useState<string>('all')

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
          <span className="material-symbols-outlined text-2xl">sync</span>
        </div>
        <p className="text-xs font-medium text-on-surface-variant">Memuat matriks & pohon cascading...</p>
      </div>
    )
  }

  // Unique IKUs for filter dropdown
  const uniqueIkus = Array.from(
    new Map(
      sukpaAssignments
        .filter((s): s is typeof s & { iku: NonNullable<typeof s.iku> } => Boolean(s.iku?.kode_iku))
        .map(s => [s.iku.kode_iku, { kode: s.iku.kode_iku, nama: s.iku.nama_iku }])
    ).values()
  ).sort((a, b) => parseInt(a.kode, 10) - parseInt(b.kode, 10))

  const filteredSukpa = sukpaAssignments.filter(s => {
    if (selectedIkuFilter !== 'all' && s.iku?.kode_iku !== selectedIkuFilter) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.iku?.nama_iku?.toLowerCase().includes(q) ||
      s.sukpa_user?.pegawai?.nama_lengkap?.toLowerCase().includes(q) ||
      s.sukpa_user?.email?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Cascading & Rencana SKP</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Matriks & Pohon Cascading</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Matriks & Pohon Cascading Kinerja
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Visualisasi hierarki aliran cascading berjenjang dari IKU Universitas (Level 1) hingga Sub-Uraian Staf (Level 5).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5 border border-primary/20">
            <span className="material-symbols-outlined text-sm">badge</span>
            Peran: {ROLE_LABELS[role] || role}
          </span>
          {periode && (
            <span className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold border border-outline-variant/40 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-emerald-600">calendar_month</span>
              Tahun {periode.tahun}
            </span>
          )}
        </div>
      </div>

      {/* Main Matrix Card */}
      <div className="p-6 rounded-3xl bg-white shadow-xs border border-outline-variant/30 space-y-5">
        {/* Controls: Search and Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
              <span className="material-symbols-outlined text-primary text-base">filter_list</span>
              Filter IKU:
            </div>
            <select
              value={selectedIkuFilter}
              onChange={e => setSelectedIkuFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none font-semibold text-on-surface cursor-pointer"
            >
              <option value="all">Semua IKU Terdistribusi ({uniqueIkus.length})</option>
              {uniqueIkus.map(iku => (
                <option key={iku.kode} value={iku.kode}>
                  IKU {iku.kode}: {iku.nama.substring(0, 45)}...
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-80 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama IKU atau pegawai..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-on-surface-variant/40 transition-all text-on-surface"
            />
            <span className="material-symbols-outlined text-sm absolute left-3 top-2.5 text-on-surface-variant">
              search
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-on-surface-variant bg-surface-container-low p-3 rounded-2xl border border-outline-variant/30">
          <span className="text-on-surface font-bold">Tingkat Penjenjangan:</span>
          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800">L1: SUKPA</span>
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">L2: Unit</span>
          <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800">L3: Manajer (Output)</span>
          <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800">L4: SPV (Uraian)</span>
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">L5: Staf (Sub-Uraian)</span>
        </div>

        {/* Tree Container */}
        <div className="space-y-4 pt-1">
          {filteredSukpa.length === 0 ? (
            <div className="p-12 text-center text-xs text-on-surface-variant italic space-y-2">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">account_tree</span>
              <p>Tidak ada pohon cascading yang sesuai dengan filter pencarian.</p>
            </div>
          ) : (
            filteredSukpa.map(sukpaItem => {
              const relatedUnits = unitAssignments.filter(u => u.parent_sukpa_id === sukpaItem.id)

              return (
                <div
                  key={sukpaItem.id}
                  className="p-5 rounded-3xl border border-outline-variant/40 bg-surface-container-lowest space-y-4 shadow-2xs hover:border-primary/40 transition-all"
                >
                  {/* Level 1 Header: SUKPA */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-outline-variant/20 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs shrink-0">
                        L1
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                            IKU {sukpaItem.iku?.kode_iku}
                          </span>
                          <span className="text-xs font-bold text-on-surface">
                            {sukpaItem.iku?.nama_iku}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Ditugaskan ke: <b>{sukpaItem.sukpa_user?.pegawai?.nama_lengkap || sukpaItem.sukpa_user?.email}</b>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                        Target: {sukpaItem.target} {sukpaItem.satuan}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        sukpaItem.status === 'agreed' ? 'bg-success/15 text-success' : 'bg-warning/20 text-amber-800'
                      }`}>
                        {sukpaItem.status === 'agreed' ? 'Disepakati' : 'Menunggu'}
                      </span>
                    </div>
                  </div>

                  {/* Level 2: Units */}
                  <div className="pl-3 md:pl-6 space-y-3">
                    {relatedUnits.length === 0 ? (
                      <p className="text-[11px] text-on-surface-variant/60 italic">
                        ↳ Belum ada target IKU yang diturunkan ke Pimpinan Unit.
                      </p>
                    ) : (
                      relatedUnits.map(unitItem => {
                        const relatedOutputs = outputAssignments.filter(o => o.parent_unit_id === unitItem.id)

                        return (
                          <div
                            key={unitItem.id}
                            className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  L2
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-on-surface">
                                    Pimpinan Unit: {unitItem.unit_user?.pegawai?.nama_lengkap || unitItem.unit_user?.email}
                                  </p>
                                  <p className="text-[10px] text-on-surface-variant">
                                    Target Unit: <b>{unitItem.target} {unitItem.satuan}</b>
                                  </p>
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                unitItem.status === 'agreed' ? 'bg-success/15 text-success' : 'bg-warning/20 text-amber-800'
                              }`}>
                                {unitItem.status === 'agreed' ? 'Disepakati' : 'Menunggu'}
                              </span>
                            </div>

                            {/* Level 3: Output Manajer */}
                            <div className="pl-4 space-y-2 border-l-2 border-primary/20">
                              {relatedOutputs.length === 0 ? (
                                <p className="text-[10px] text-on-surface-variant/60 italic">
                                  ↳ Belum ada Output IKU yang ditugaskan ke Manajer Bagian.
                                </p>
                              ) : (
                                relatedOutputs.map(outputItem => {
                                  const relatedUraians = uraianAssignments.filter(u => u.parent_output_id === outputItem.id)

                                  return (
                                    <div
                                      key={outputItem.id}
                                      className="p-3 rounded-xl bg-white border border-outline-variant/30 space-y-2"
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="w-5 h-5 rounded bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[9px] shrink-0">
                                            L3
                                          </span>
                                          <div>
                                            <p className="font-semibold text-on-surface">{outputItem.nama_output}</p>
                                            <p className="text-[10px] text-on-surface-variant">
                                              Manajer: {outputItem.manajer_user?.pegawai?.nama_lengkap || outputItem.manajer_user?.email}
                                            </p>
                                          </div>
                                        </div>
                                        <span className="font-bold text-primary text-[11px] shrink-0">
                                          {outputItem.target} {outputItem.satuan}
                                        </span>
                                      </div>

                                      {/* Level 4: Uraian SPV */}
                                      {relatedUraians.length > 0 && (
                                        <div className="pl-4 pt-1 space-y-1.5 border-l-2 border-teal-300">
                                          {relatedUraians.map(uraianItem => {
                                            const relatedSubUraians = subUraianAssignments.filter(s => s.parent_uraian_id === uraianItem.id)

                                            return (
                                              <div
                                                key={uraianItem.id}
                                                className="p-2 rounded-lg bg-teal-50/50 border border-teal-100 text-xs space-y-1"
                                              >
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="w-4 h-4 rounded bg-teal-200 text-teal-800 flex items-center justify-center font-bold text-[8px] shrink-0">
                                                      L4
                                                    </span>
                                                    <span className="font-medium text-on-surface text-[11px]">
                                                      {uraianItem.nama_uraian}
                                                    </span>
                                                    <span className="text-[10px] text-on-surface-variant">
                                                      (SPV: {uraianItem.spv_user?.pegawai?.nama_lengkap || uraianItem.spv_user?.email})
                                                    </span>
                                                  </div>
                                                  <span className="text-[10px] font-bold text-teal-900">
                                                    {uraianItem.target} {uraianItem.satuan}
                                                  </span>
                                                </div>

                                                {/* Level 5: Sub-Uraian Staff */}
                                                {relatedSubUraians.length > 0 && (
                                                  <div className="pl-3 space-y-1 border-l-2 border-emerald-300 pt-0.5">
                                                    {relatedSubUraians.map(subItem => (
                                                      <div
                                                        key={subItem.id}
                                                        className="flex items-center justify-between text-[10px] bg-white p-1.5 rounded border border-emerald-100"
                                                      >
                                                        <div className="flex items-center gap-1">
                                                          <span className="w-3.5 h-3.5 rounded bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-[7px] shrink-0">
                                                            L5
                                                          </span>
                                                          <span className="font-medium text-on-surface">
                                                            {subItem.nama_sub_uraian}
                                                          </span>
                                                          <span className="text-on-surface-variant">
                                                            (Staf: {subItem.staff_user?.pegawai?.nama_lengkap || subItem.staff_user?.email})
                                                          </span>
                                                        </div>
                                                        <span className="font-bold text-emerald-700">
                                                          {subItem.target} {subItem.satuan}
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
