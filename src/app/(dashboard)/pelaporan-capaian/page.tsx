'use client'

import React, { useState } from 'react'
import { CascadingProvider, useCascading } from '@/context/CascadingContext'
import { ROLE_LABELS } from '@/lib/types'

function PelaporanCapaianContent() {
  const {
    role,
    periode,
    isLoading,
    incomingTasks,
    subordinateReports,
    myReports,
    currentCascadingLevel,
    handleOpenPelaporanModal,
    handleApproveLaporan,
    handleRejectLaporan,
  } = useCascading()

  const [activeTab, setActiveTab] = useState<'verifikasi' | 'laporan-saya'>(
    role === 'staff' ? 'laporan-saya' : 'verifikasi'
  )
  const [rejectPromptId, setRejectPromptId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
          <span className="material-symbols-outlined text-2xl">sync</span>
        </div>
        <p className="text-xs font-medium text-on-surface-variant">Memuat data pelaporan & verifikasi capaian...</p>
      </div>
    )
  }

  const agreedTasks = incomingTasks.filter(t => t.status === 'agreed')
  const pendingVerificationCount = subordinateReports.filter(r => r.status === 'pending').length

  const onConfirmReject = async (laporanId: string) => {
    await handleRejectLaporan(laporanId, rejectNote)
    setRejectPromptId(null)
    setRejectNote('')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Kinerja Pegawai</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Pelaporan & Verifikasi Capaian</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Pelaporan & Verifikasi Capaian
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Input bukti realisasi pengerjaan target SKP dan verifikasi progres kinerja bawahan secara akuntabel.
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

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 w-fit">
        {role !== 'staff' && (
          <button
            onClick={() => setActiveTab('verifikasi')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'verifikasi'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-sm">fact_check</span>
            Verifikasi Capaian Bawahan
            {pendingVerificationCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'verifikasi' ? 'bg-white text-primary' : 'bg-rose-500 text-white'
              }`}>
                {pendingVerificationCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('laporan-saya')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'laporan-saya'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-sm">task_alt</span>
          Laporan Capaian Saya ({myReports.length})
        </button>
      </div>

      {/* SECTION 1: VERIFIKASI CAPAIAN BAWAHAN */}
      {activeTab === 'verifikasi' && role !== 'staff' && (
        <div className="p-6 rounded-3xl bg-white shadow-xs border border-outline-variant/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-headline-sm text-base font-bold text-on-surface">
                Verifikasi Laporan Realisasi Kinerja Bawahan
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Tinjau bukti dukung (Google Drive) dan pertanggungjawaban bawahan. Persetujuan Anda akan mengakumulasikan capaian resmi.
              </p>
            </div>
            {pendingVerificationCount > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 self-start">
                {pendingVerificationCount} Menunggu Tindakan
              </span>
            )}
          </div>

          {subordinateReports.length === 0 ? (
            <div className="p-12 text-center text-xs text-on-surface-variant italic space-y-2">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">assignment_turned_in</span>
              <p>Belum ada pengajuan laporan capaian dari bawahan Anda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container text-on-surface-variant border-b border-outline-variant/30 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="p-3">Pegawai Bawahan</th>
                    <th className="p-3">Angka Realisasi</th>
                    <th className="p-3">Keterangan / Hasil Kerja</th>
                    <th className="p-3">Bukti Dukung</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {subordinateReports.map((report) => (
                    <tr key={report.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-on-surface">{report.user?.pegawai?.nama_lengkap || report.user?.email}</p>
                        <p className="text-[10px] text-on-surface-variant">{report.user?.pegawai?.jabatan || report.user?.role}</p>
                      </td>
                      <td className="p-3 font-bold text-primary text-sm">
                        +{report.capaian}
                      </td>
                      <td className="p-3 max-w-xs text-on-surface leading-snug">
                        {report.keterangan}
                      </td>
                      <td className="p-3">
                        {report.evidence_url ? (
                          <a
                            href={report.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold flex items-center gap-1 w-fit transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                            Buka Bukti Drive
                          </a>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/50">Tidak ada file</span>
                        )}
                      </td>
                      <td className="p-3">
                        {report.status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Menunggu Verifikasi
                          </span>
                        )}
                        {report.status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Disetujui
                          </span>
                        )}
                        {report.status === 'revision' && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            Diminta Revisi
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {report.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setRejectPromptId(report.id)}
                              className="px-2.5 py-1 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Minta Revisi
                            </button>
                            <button
                              onClick={() => handleApproveLaporan(report)}
                              className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 shadow-sm transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-xs">check</span>
                              Setujui
                            </button>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant/50 text-[11px]">Selesai</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal / Dialog Catatan Revisi */}
          {rejectPromptId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-outline-variant/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-on-surface">Minta Perbaikan / Revisi Bukti</h4>
                  <button
                    onClick={() => setRejectPromptId(null)}
                    className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-on-surface">Catatan Kekurangan / Masukan:</label>
                  <textarea
                    rows={3}
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="Contoh: Bukti link Drive belum dapat diakses, atau lampiran dokumen kurang lengkap..."
                    className="w-full p-3 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all leading-relaxed"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setRejectPromptId(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => onConfirmReject(rejectPromptId)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-all"
                  >
                    Kirim Permintaan Revisi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: LAPORAN CAPAIAN SAYA */}
      {(activeTab === 'laporan-saya' || role === 'staff') && (
        <div className="space-y-6">
          {/* Card 1: Tugas Rencana SKP Saya yang Siap Dilaporkan */}
          <div className="p-6 rounded-3xl bg-white shadow-xs border border-outline-variant/30 space-y-4">
            <div>
              <h3 className="font-headline-sm text-base font-bold text-on-surface">
                Tugas SKP Anda yang Siap Dilaporkan Capaiannya
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Klik tombol "Laporkan Capaian" untuk mengunggah bukti hasil kerja dan menginput angka realisasi yang telah tercapai.
              </p>
            </div>

            {agreedTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant italic bg-surface-container-low rounded-2xl">
                Belum ada tugas berstatus <b>Disepakati</b>. Harap sepakati target terlebih dahulu pada menu <b>Tugas Masuk & Dialog Kinerja</b>.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agreedTasks.map((task: any) => {
                  const capaianApproved = Number(task.capaian_approved) || 0
                  const targetNum = Number(task.target) || 0
                  const percent = targetNum > 0 ? Math.min(100, Math.round((capaianApproved / targetNum) * 100)) : 0

                  return (
                    <div
                      key={task.id}
                      className="p-5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest flex flex-col justify-between gap-4 hover:border-primary/50 transition-all hover:shadow-md"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Target SKP: {task.target} {task.satuan}
                          </span>
                          <span className="text-[11px] font-black text-primary">
                            {percent}% Tercapai
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-on-surface line-clamp-3 leading-snug">
                          {task.nama_sub_uraian || task.nama_uraian || task.nama_output || task.parent_sukpa?.iku?.nama_iku || task.iku?.nama_iku}
                        </h4>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-on-surface-variant flex items-center justify-between">
                            <span>Realisasi terverifikasi:</span>
                            <b>{capaianApproved} {task.satuan}</b>
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-outline-variant/20 flex justify-end">
                        <button
                          onClick={() => handleOpenPelaporanModal(task, currentCascadingLevel)}
                          className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                          Laporkan Capaian
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Card 2: Riwayat Pengajuan Laporan Capaian Saya */}
          <div className="p-6 rounded-3xl bg-white shadow-xs border border-outline-variant/30 space-y-4">
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Riwayat Laporan Capaian yang Telah Anda Ajukan
            </h3>

            {myReports.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic py-4">Belum ada riwayat laporan yang Anda kirimkan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container text-on-surface-variant border-b border-outline-variant/30 uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Tanggal Lapor</th>
                      <th className="p-3">Angka Realisasi</th>
                      <th className="p-3">Keterangan / Aktivitas</th>
                      <th className="p-3">Bukti Dukung</th>
                      <th className="p-3">Status Verifikasi</th>
                      <th className="p-3">Catatan Reviewer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {myReports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="p-3 text-on-surface-variant font-mono text-[11px]">
                          {new Date(rep.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="p-3 font-bold text-primary text-sm">
                          +{rep.capaian}
                        </td>
                        <td className="p-3 max-w-xs text-on-surface leading-snug">
                          {rep.keterangan}
                        </td>
                        <td className="p-3">
                          {rep.evidence_url ? (
                            <a
                              href={rep.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold flex items-center gap-1 w-fit transition-colors"
                            >
                              <span className="material-symbols-outlined text-xs">open_in_new</span>
                              Buka Drive
                            </a>
                          ) : (
                            <span className="text-on-surface-variant/50">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {rep.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Menunggu Verifikasi
                            </span>
                          )}
                          {rep.status === 'approved' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Disetujui
                            </span>
                          )}
                          {rep.status === 'revision' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              Perlu Revisi
                            </span>
                          )}
                        </td>
                        <td className="p-3 max-w-xs">
                          {rep.catatan_reviewer ? (
                            <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 leading-snug">
                              "{rep.catatan_reviewer}"
                            </p>
                          ) : (
                            <span className="text-on-surface-variant/50">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PelaporanCapaianPage() {
  return (
    <CascadingProvider>
      <PelaporanCapaianContent />
    </CascadingProvider>
  )
}
