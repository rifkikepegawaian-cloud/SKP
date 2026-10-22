'use client'

import React from 'react'
import Link from 'next/link'
import { useCascading } from '@/context/CascadingContext'
import { ROLE_LABELS } from '@/lib/types'

export default function PenugasanBawahanPage() {
  const {
    user,
    role,
    periode,
    isLoading,
    groupedIkuList,
    incomingTasks,
    myAssignedTasks,
    sukpaAssignments,
    outputAssignments,
    uraianAssignments,
    subUraianAssignments,
    isViewOnly,
    openSplitterForParent,
    openSplitterForOutput,
    handleDeleteAssignment,
  } = useCascading()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
          <span className="material-symbols-outlined text-2xl">sync</span>
        </div>
        <p className="text-xs font-medium text-on-surface-variant">Memuat data penugasan cascading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Cascading & Rencana SKP</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Penugasan ke Bawahan (Top-Down)</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Penugasan ke Bawahan (Top-Down)
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Pecah dan distribusikan target kinerja kepada pejabat atau staf di bawah kewenangan Anda.
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

      {/* Main Assignment Content */}
      <div className="p-6 rounded-3xl bg-white shadow-xs border border-outline-variant/30 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Alokasi Target ke Pejabat / Pegawai Bawahan
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant">
              {role === 'rektor' && 'Pilih dari 32 Master IKU universitas untuk dialokasikan kepada para Pimpinan SUKPA.'}
              {role === 'pimpinan_sukpa' && 'Bagi target IKU yang telah Anda sepakati kepada Pimpinan Unit di bawah SUKPA Anda.'}
              {role === 'pimpinan_unit' && 'Bagi Output IKU kepada Manajer Bagian yang membidangi.'}
              {role === 'manajer' && 'Pecah Output IKU menjadi Uraian Tugas untuk Supervisor (SPV) / Kasubbag.'}
              {role === 'supervisor' && 'Pecah Uraian Tugas menjadi Sub-Uraian Tugas untuk Staf Pelaksana.'}
            </p>
          </div>
        </div>

        {/* If Rektor: Show 32 IKU list */}
        {role === 'rektor' && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-on-surface-variant font-medium bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  32
                </span>
                <span>Total <b>{groupedIkuList.length} Indikator Kinerja Utama (IKU)</b> Universitas Diponegoro</span>
              </div>
              <span className="text-[11px] text-primary bg-primary/10 px-3 py-1 rounded-xl font-bold border border-primary/20">
                Alokasi Target 100% per IKU ke Pimpinan SUKPA
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedIkuList.map((iku) => {
                const assignedForThis = sukpaAssignments.filter(s => iku.all_ids.includes(s.iku_id) || s.iku?.kode_iku === iku.kode_iku)
                const totalAssigned = assignedForThis.reduce((acc, s) => acc + Number(s.target), 0)
                const isRatio = iku.satuan_default === 'Rasio' || iku.target_default.includes(':')
                const isFullyAssigned = isRatio ? assignedForThis.length > 0 : totalAssigned >= 100

                return (
                  <div 
                    key={iku.kode_iku}
                    className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest flex flex-col justify-between gap-3 hover:border-primary/50 transition-all hover:shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-black">
                          IKU {iku.kode_iku}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isFullyAssigned 
                            ? 'bg-success/10 text-success' 
                            : totalAssigned > 0 || assignedForThis.length > 0
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {isRatio 
                            ? (assignedForThis.length > 0 ? `${assignedForThis.length} SUKPA Ditugaskan` : 'Belum Ditugaskan')
                            : (isFullyAssigned ? '100% Ditugaskan' : totalAssigned > 0 ? `${totalAssigned}% Teralokasi` : 'Belum Ditugaskan')}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-on-surface line-clamp-3 leading-snug">
                        {iku.nama_iku}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] font-bold border border-outline-variant/30 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] text-primary">flag</span>
                          Target: <b>{iku.target_default} {iku.satuan_default}</b>
                        </span>
                        <span className="text-[10px] text-on-surface-variant flex items-center gap-1 font-medium ml-1">
                          <span className="material-symbols-outlined text-[13px] text-primary">account_tree</span>
                          {iku.outputs.length} Output
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        {assignedForThis.length} SUKPA Terlibat
                      </span>
                      <button
                        onClick={() => openSplitterForParent(iku, 'iku_sukpa')}
                        className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">call_split</span>
                        Bagi Target
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* If SUKPA, Pimpinan Unit, Manajer, SPV */}
        {role !== 'rektor' && (
          <div className="space-y-3 pt-2">
            {incomingTasks.filter(t => t.status === 'agreed').length === 0 ? (
              <div className="p-8 rounded-2xl bg-surface-container-low text-center space-y-3">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">assignment_late</span>
                <p className="text-xs font-semibold text-on-surface-variant">
                  Belum ada tugas yang disepakati untuk dialokasikan ke bawahan.
                </p>
                <p className="text-[11px] text-on-surface-variant/70">
                  Silakan buka menu <b>"Tugas Masuk & Dialog Kinerja"</b> terlebih dahulu untuk menyetujui target dari atasan Anda.
                </p>
                <div>
                  <Link
                    href="/cascading/dialog-kinerja"
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 inline-flex items-center gap-1.5 shadow-md shadow-primary/20 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">inbox</span>
                    Buka Tugas Masuk & Dialog Kinerja
                    {incomingTasks.filter(t => t.status === 'assigned').length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-900 font-black">
                        {incomingTasks.filter(t => t.status === 'assigned').length} Baru
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            ) : role === 'pimpinan_unit' ? (
              /* KHUSUS PIMPINAN UNIT: Dimunculkan semua daftar output dari IKU yang ditugasi pimpinan sukpa */
              <div className="space-y-6 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-on-surface-variant font-medium bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-xs">
                      <span className="material-symbols-outlined text-sm">widgets</span>
                    </span>
                    <span>Daftar <b>Output IKU</b> yang Ditugaskan oleh Pimpinan SUKPA</span>
                  </div>
                  <span className="text-[11px] text-sky-700 bg-sky-500/10 px-3 py-1 rounded-xl font-bold border border-sky-500/20">
                    Pimpinan Unit ke Manajer Bagian
                  </span>
                </div>

                {incomingTasks.filter(t => t.status === 'agreed').map((unitItem: any) => {
                  const kodeIku = unitItem.parent_sukpa?.iku?.kode_iku || unitItem.iku?.kode_iku || ''
                  const namaIku = unitItem.parent_sukpa?.iku?.nama_iku || unitItem.iku?.nama_iku || 'IKU'
                  const matchedGroup = groupedIkuList.find(g => g.kode_iku === kodeIku)
                  const outputsList = matchedGroup?.outputs || []

                  return (
                    <div key={unitItem.id} className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/40 space-y-4 shadow-sm">
                      {/* Banner Header IKU Induk */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-outline-variant/30">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-black">
                              IKU {kodeIku}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Target IKU Unit: {unitItem.target} {unitItem.satuan}
                            </span>
                            {unitItem.is_direct_sync && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-semibold">
                                Direct Sync
                              </span>
                            )}
                          </div>
                          <h4 className="font-headline-sm text-sm font-bold text-on-surface">
                            {namaIku}
                          </h4>
                          <p className="text-[11px] text-on-surface-variant">
                            Tentukan target masing-masing Output Kinerja berikut (satuan dapat berbeda dengan IKU) dan alokasikan ke Manajer Bagian terkait.
                          </p>
                        </div>

                        <button
                          onClick={() => openSplitterForParent(unitItem, 'output')}
                          className="px-3.5 py-1.5 rounded-xl border border-outline-variant/50 hover:bg-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5 self-start md:self-center transition-colors cursor-pointer"
                          title="Tambah output kustom di luar daftar master"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                          Tambah Output Kustom
                        </button>
                      </div>

                      {/* Grid Kartu Output */}
                      {outputsList.length === 0 ? (
                        <div className="p-6 text-center text-xs text-on-surface-variant italic">
                          Tidak ada daftar master output untuk IKU ini. Gunakan tombol "Tambah Output Kustom" di atas untuk menugaskan.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {outputsList.map((output, oIdx) => {
                            const assignedManagers = outputAssignments.filter(o => 
                              o.parent_unit_id === unitItem.id && 
                              (o.nama_output === output.nama_output || o.kode_output === output.kode_output)
                            )
                            const isAssigned = assignedManagers.length > 0
                            const managerNames = assignedManagers.map(m => m.manajer_user?.pegawai?.nama_lengkap || m.manajer_user?.email).join(', ')

                            return (
                              <div 
                                key={output.id || oIdx}
                                className="p-4 rounded-2xl border border-outline-variant/40 bg-white flex flex-col justify-between gap-3 hover:border-primary/50 transition-all hover:shadow-md"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-700 text-xs font-black">
                                      Output {output.kode_output || (oIdx + 1)}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      isAssigned
                                        ? 'bg-success/10 text-success'
                                        : 'bg-surface-container-high text-on-surface-variant'
                                    }`}>
                                      {isAssigned ? `${assignedManagers.length} Manajer Ditugaskan` : 'Belum Ditugaskan'}
                                    </span>
                                  </div>

                                  <h5 className="text-xs font-bold text-on-surface line-clamp-3 leading-snug">
                                    {output.nama_output}
                                  </h5>

                                  {output.nama_kegiatan && (
                                    <p className="text-[10px] text-on-surface-variant flex items-center gap-1 font-medium">
                                      <span className="material-symbols-outlined text-[11px] text-primary">folder_open</span>
                                      {output.nama_kegiatan}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] font-bold border border-outline-variant/30 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[12px] text-primary">flag</span>
                                      Target: <b>{isAssigned ? assignedManagers.map(m => `${m.target} ${m.satuan}`).join(', ') : 'Belum Diatur'}</b>
                                    </span>
                                  </div>

                                  {isAssigned && (
                                    <p className="text-[10px] text-primary font-medium line-clamp-1 pt-0.5">
                                      Penerima: {managerNames}
                                    </p>
                                  )}
                                </div>

                                <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                                  <span className="text-[10px] text-on-surface-variant font-medium">
                                    {isAssigned ? 'Dapat dialokasikan lagi' : 'Pilih Manajer & Target'}
                                  </span>
                                  <button
                                    onClick={() => openSplitterForOutput(unitItem, output)}
                                    className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-xs">call_split</span>
                                    Bagi Target
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header info jika role manajer */}
                {role === 'manajer' && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-on-surface-variant font-medium bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        <span className="material-symbols-outlined text-sm">task_alt</span>
                      </span>
                      <span>Output IKU yang <b>Telah Anda Sepakati</b> (Siap Dibuatkan Uraian Tugas ke SPV)</span>
                    </div>
                    <span className="text-[11px] text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl font-bold border border-emerald-200">
                      Buat Uraian Tugas & Target Operasional SPV
                    </span>
                  </div>
                )}

                {/* Header info jika role supervisor */}
                {role === 'supervisor' && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-on-surface-variant font-medium bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        <span className="material-symbols-outlined text-sm">task_alt</span>
                      </span>
                      <span>Uraian Tugas yang <b>Telah Anda Sepakati</b> (Siap Dibuatkan Sub-Uraian Tugas ke Staf Pelaksana)</span>
                    </div>
                    <span className="text-[11px] text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl font-bold border border-emerald-200">
                      Buat Sub-Uraian Tugas & Target Pelaksana Staf
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingTasks.filter(t => t.status === 'agreed').map((item: any) => {
                    const relatedChildren = role === 'manajer' 
                      ? uraianAssignments.filter(u => u.parent_output_id === item.id)
                      : role === 'supervisor'
                        ? subUraianAssignments.filter(s => s.parent_uraian_id === item.id)
                        : []

                    const parentIkuName = role === 'supervisor'
                      ? (item.parent_output?.parent_unit?.parent_sukpa?.iku?.nama_iku || item.parent_output?.parent_unit?.iku?.nama_iku)
                      : (item.parent_unit?.parent_sukpa?.iku?.nama_iku || item.parent_sukpa?.iku?.nama_iku)

                    const parentOutputName = role === 'supervisor' ? item.parent_output?.nama_output : null

                    return (
                      <div 
                        key={item.id} 
                        className="p-5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest flex flex-col justify-between gap-4 hover:border-primary/50 transition-all hover:shadow-md"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-xs">verified</span>
                              Target Disepakati: {item.target} {item.satuan}
                            </span>
                            {item.is_direct_sync && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">
                                Direct Sync
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-on-surface leading-snug">
                              {item.nama_sub_uraian || item.nama_uraian || item.nama_output || item.parent_sukpa?.iku?.nama_iku || item.iku?.nama_iku}
                            </h4>
                            {parentOutputName && (
                              <p className="text-[11px] text-on-surface-variant font-medium mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-primary">output</span>
                                Output: {parentOutputName}
                              </p>
                            )}
                            {parentIkuName && (
                              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-primary">flag</span>
                                IKU: {parentIkuName}
                              </p>
                            )}
                          </div>

                          {/* Daftar Uraian Tugas SPV (Manajer) */}
                          {role === 'manajer' && (
                            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-on-surface flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs text-primary">assignment</span>
                                  Uraian Tugas SPV ({relatedChildren.length})
                                </span>
                              </div>

                              {relatedChildren.length === 0 ? (
                                <p className="text-[11px] text-on-surface-variant/70 italic">
                                  Belum ada Uraian Tugas yang didelegasikan ke SPV.
                                </p>
                              ) : (
                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                  {relatedChildren.map((u: any) => (
                                    <div key={u.id} className="p-2 rounded-lg bg-white border border-outline-variant/30 flex items-center justify-between gap-2 text-xs">
                                      <div className="min-w-0">
                                        <p className="font-semibold text-on-surface line-clamp-1">{u.nama_uraian}</p>
                                        <p className="text-[10px] text-on-surface-variant">
                                          SPV: <span className="font-medium text-primary">{u.spv_user?.pegawai?.nama_lengkap || u.spv_user?.email}</span>
                                        </p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="font-bold text-xs text-on-surface block">{u.target} {u.satuan}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          u.status === 'agreed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                          {u.status === 'agreed' ? 'Disepakati' : 'Menunggu SPV'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Daftar Sub-Uraian Tugas Staf (Supervisor) */}
                          {role === 'supervisor' && (
                            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-on-surface flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs text-primary">assignment</span>
                                  Sub-Uraian Tugas Staf ({relatedChildren.length})
                                </span>
                              </div>

                              {relatedChildren.length === 0 ? (
                                <p className="text-[11px] text-on-surface-variant/70 italic">
                                  Belum ada Sub-Uraian Tugas yang didelegasikan ke Staf Pelaksana.
                                </p>
                              ) : (
                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                  {relatedChildren.map((s: any) => (
                                    <div key={s.id} className="p-2 rounded-lg bg-white border border-outline-variant/30 flex items-center justify-between gap-2 text-xs">
                                      <div className="min-w-0">
                                        <p className="font-semibold text-on-surface line-clamp-1">{s.nama_sub_uraian}</p>
                                        <p className="text-[10px] text-on-surface-variant">
                                          Staf: <span className="font-medium text-primary">{s.staff_user?.pegawai?.nama_lengkap || s.staff_user?.email}</span>
                                        </p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="font-bold text-xs text-on-surface block">{s.target} {s.satuan}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          s.status === 'agreed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                          {s.status === 'agreed' ? 'Disepakati' : 'Menunggu Staf'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-end">
                          <button
                            onClick={() => {
                              if (role === 'pimpinan_sukpa') openSplitterForParent(item, 'iku_unit')
                              else if (role === 'manajer') openSplitterForParent(item, 'uraian')
                              else if (role === 'supervisor') openSplitterForParent(item, 'sub_uraian')
                            }}
                            className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {role === 'manajer' || role === 'supervisor' ? 'add_task' : 'call_split'}
                            </span>
                            {role === 'manajer' 
                              ? (relatedChildren.length > 0 ? '+ Tambah Uraian Tugas SPV' : '+ Buat Uraian Tugas SPV')
                              : role === 'supervisor'
                                ? (relatedChildren.length > 0 ? '+ Tambah Sub-Uraian Tugas Staf' : '+ Buat Sub-Uraian Tugas Staf')
                                : 'Bagi Target ke Bawahan'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table: Riwayat Penugasan yang Telah Dikirim */}
      <div className="p-6 rounded-3xl bg-white shadow-xs border border-outline-variant/30 space-y-4">
        <h3 className="font-headline-sm text-base font-bold text-on-surface">
          Daftar Penugasan yang Telah Diteruskan ke Bawahan
        </h3>

        {myAssignedTasks.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic py-4">Belum ada penugasan yang diteruskan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container text-on-surface-variant border-b border-outline-variant/30 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Nama Tugas / Output</th>
                  <th className="p-3">Ditugaskan Kepada</th>
                  <th className="p-3">Porsi Target</th>
                  <th className="p-3">Direct Sync</th>
                  <th className="p-3">Status Kesepakatan</th>
                  <th className="p-3">Catatan / Sanggahan</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {myAssignedTasks.map((task: any) => {
                  const assignee = task.sukpa_user || task.unit_user || task.manajer_user || task.spv_user || task.staff_user

                  return (
                    <tr key={task.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-3 font-semibold text-on-surface max-w-xs">
                        {task.nama_sub_uraian || task.nama_uraian || task.nama_output || task.iku?.nama_iku || '-'}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-on-surface">{assignee?.pegawai?.nama_lengkap || assignee?.email}</p>
                        <p className="text-[10px] text-on-surface-variant">{assignee?.pegawai?.jabatan || assignee?.role}</p>
                      </td>
                      <td className="p-3 font-bold text-on-surface">
                        {task.target} {task.satuan}
                      </td>
                      <td className="p-3">
                        {task.is_direct_sync ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Aktif</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px]">Rekomendasi</span>
                        )}
                      </td>
                      <td className="p-3">
                        {task.status === 'agreed' && (
                          <span className="px-2.5 py-1 rounded-full bg-success/15 text-success text-[10px] font-bold flex items-center gap-1 w-fit">
                            <span className="material-symbols-outlined text-xs">check_circle</span> Disepakati
                          </span>
                        )}
                        {task.status === 'assigned' && (
                          <span className="px-2.5 py-1 rounded-full bg-warning/20 text-amber-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <span className="material-symbols-outlined text-xs">hourglass_empty</span> Menunggu
                          </span>
                        )}
                        {task.status === 'objected' && (
                          <span className="px-2.5 py-1 rounded-full bg-error/15 text-error text-[10px] font-bold flex items-center gap-1 w-fit">
                            <span className="material-symbols-outlined text-xs">gavel</span> Disanggah
                          </span>
                        )}
                      </td>
                      <td className="p-3 max-w-xs">
                        {task.catatan_sanggahan ? (
                          <div className="space-y-1">
                            <p className="text-[11px] text-error bg-error/10 p-2 rounded-xl border border-error/20 leading-snug">
                              "{task.catatan_sanggahan}"
                            </p>
                            {task.target_usulan && (
                              <p className="text-[10px] text-on-surface-variant">
                                Usulan Bawahan: <b>{task.target_usulan} {task.satuan}</b>
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-on-surface-variant/50">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteAssignment(task)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                          title="Batalkan / Hapus Penugasan Ini"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
