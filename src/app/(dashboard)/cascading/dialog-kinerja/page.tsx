'use client'

import React from 'react'
import { useCascading } from '@/context/CascadingContext'
import { ROLE_LABELS } from '@/lib/types'

export default function DialogKinerjaPage() {
  const {
    role,
    periode,
    isLoading,
    incomingTasks,
    myAssignedTasks,
    handleAgreeTask,
    handleOpenSanggahan,
    handleAcceptSubordinateProposal,
  } = useCascading()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
          <span className="material-symbols-outlined text-2xl">sync</span>
        </div>
        <p className="text-xs font-medium text-on-surface-variant">Memuat data tugas masuk & dialog kinerja...</p>
      </div>
    )
  }

  const pendingCount = incomingTasks.filter(t => t.status === 'assigned').length
  const agreedCount = incomingTasks.filter(t => t.status === 'agreed').length
  const objectedCount = incomingTasks.filter(t => t.status === 'objected').length
  const subordinateObjections = myAssignedTasks.filter((t: any) => t.status === 'objected')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Cascading & Rencana SKP</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Tugas Masuk & Dialog Kinerja</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Tugas Masuk & Dialog Kinerja
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Tinjau alokasi target dari atasan, sepakati rencana SKP, atau lakukan dialog kinerja melalui sanggahan berdasar.
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

      {/* Status Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-outline-variant/30 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">hourglass_empty</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-on-surface-variant">Menunggu Konfirmasi</p>
            <p className="text-lg font-extrabold text-on-surface">{pendingCount} Tugas</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-outline-variant/30 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">verified</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-on-surface-variant">Telah Disepakati</p>
            <p className="text-lg font-extrabold text-on-surface">{agreedCount} Tugas</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-outline-variant/30 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">gavel</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-on-surface-variant">Dalam Dialog / Sanggahan</p>
            <p className="text-lg font-extrabold text-on-surface">{objectedCount} Tugas</p>
          </div>
        </div>
      </div>

      {/* Alert Objek Sanggahan dari Bawahan yang Memerlukan Respons Atasan */}
      {subordinateObjections.length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200/80 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <span className="material-symbols-outlined text-amber-600">forum</span>
            Ada {subordinateObjections.length} Usulan Sanggahan dari Bawahan yang Memerlukan Respons Anda
          </div>
          <p className="text-xs text-amber-800">
            Bawahan Anda telah mengajukan dialog kinerja / usulan penyesuaian target. Anda dapat meninjau alasan dan menyepakati target baru yang diusulkan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {subordinateObjections.map((subTask: any) => {
              const assignee = subTask.sukpa_user || subTask.unit_user || subTask.manajer_user || subTask.spv_user || subTask.staff_user
              return (
                <div key={subTask.id} className="p-4 rounded-2xl bg-white border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      Sanggahan dari {assignee?.pegawai?.nama_lengkap || assignee?.email}
                    </span>
                    <span className="text-xs font-bold text-on-surface">Target Semula: {subTask.target} {subTask.satuan}</span>
                  </div>
                  <h5 className="text-xs font-bold text-on-surface">
                    {subTask.nama_sub_uraian || subTask.nama_uraian || subTask.nama_output || subTask.iku?.nama_iku}
                  </h5>
                  <div className="p-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border border-outline-variant/30">
                    <p className="text-[10px] text-on-surface-variant font-semibold">Alasan / Catatan Bawahan:</p>
                    <p className="italic mt-0.5">"{subTask.catatan_sanggahan}"</p>
                    {subTask.target_usulan && (
                      <p className="mt-1.5 text-[11px] font-bold text-primary">
                        Usulan Target Baru: {subTask.target_usulan} {subTask.satuan}
                      </p>
                    )}
                  </div>
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => handleAcceptSubordinateProposal(subTask)}
                      className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">check</span>
                      Sepakati Target Usulan Ini
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main List of Incoming Tasks */}
      <div className="p-6 rounded-3xl bg-white shadow-xs border border-outline-variant/30 space-y-4">
        <h3 className="font-headline-sm text-base font-bold text-on-surface">
          Daftar Tugas Kinerja Masuk
        </h3>

        {incomingTasks.length === 0 ? (
          <div className="p-10 rounded-2xl bg-surface-container-low text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">inbox</span>
            <p className="text-sm font-semibold text-on-surface-variant">Tidak ada tugas masuk untuk Anda saat ini.</p>
            <p className="text-xs text-on-surface-variant/70">
              Target akan muncul di sini setelah atasan Anda mendistribusikan alokasi cascading.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incomingTasks.map((task: any) => {
              const assignedByName = task.assigned_by_user?.pegawai?.nama_lengkap || task.assigned_by_user?.email || 'Atasan Langsung'
              const parentIkuName = task.parent_sukpa?.iku?.nama_iku || task.parent_unit?.parent_sukpa?.iku?.nama_iku || task.parent_output?.nama_output

              return (
                <div
                  key={task.id}
                  className="p-5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest flex flex-col justify-between gap-4 hover:border-primary/50 transition-all hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        task.status === 'agreed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : task.status === 'objected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        <span className="material-symbols-outlined text-xs">
                          {task.status === 'agreed' ? 'verified' : task.status === 'objected' ? 'gavel' : 'hourglass_empty'}
                        </span>
                        {task.status === 'agreed' ? 'Disepakati' : task.status === 'objected' ? 'Disanggah / Dalam Dialog' : 'Menunggu Kesepakatan'}
                      </span>

                      {task.is_direct_sync && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">
                          Direct Sync
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-on-surface leading-snug">
                        {task.nama_sub_uraian || task.nama_uraian || task.nama_output || task.iku?.nama_iku || task.parent_sukpa?.iku?.nama_iku}
                      </h4>
                      {parentIkuName && (
                        <p className="text-[11px] text-on-surface-variant font-medium mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-primary">account_tree</span>
                          Induk: {parentIkuName}
                        </p>
                      )}
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Ditugaskan oleh: <b>{assignedByName}</b>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                      <span className="text-xs text-on-surface-variant font-medium">Target Beban:</span>
                      <span className="text-sm font-black text-primary">{task.target} {task.satuan}</span>
                    </div>

                    {task.catatan_sanggahan && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                        <p className="font-bold text-[11px] flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">info</span>
                          Catatan Sanggahan Anda:
                        </p>
                        <p className="italic">"{task.catatan_sanggahan}"</p>
                        {task.target_usulan && (
                          <p className="text-[10px] font-semibold text-rose-800">
                            Usulan Target: <b>{task.target_usulan} {task.satuan}</b>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-end gap-2">
                    {task.status === 'assigned' && (
                      <>
                        <button
                          onClick={() => handleOpenSanggahan(task, task._table)}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">gavel</span>
                          Sanggah / Dialog
                        </button>
                        <button
                          onClick={() => handleAgreeTask(task.id, task._table)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">check</span>
                          Setujui Target
                        </button>
                      </>
                    )}

                    {task.status === 'objected' && (
                      <span className="text-[11px] text-amber-800 italic">
                        Menunggu tanggapan atau kesepakatan dari atasan...
                      </span>
                    )}

                    {task.status === 'agreed' && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        Resmi Menjadi Rencana SKP
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
