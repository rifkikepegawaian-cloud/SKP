'use client'

import React from 'react'
import { useCascading } from '@/context/CascadingContext'
import { ROLE_LABELS } from '@/lib/types'

export default function CetakDokumenSKPPage() {
  const {
    user,
    role,
    periode,
    isLoading,
    agreedTasksForSKP,
  } = useCascading()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
          <span className="material-symbols-outlined text-2xl">sync</span>
        </div>
        <p className="text-xs font-medium text-on-surface-variant">Memuat template dokumen rencana SKP...</p>
      </div>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Page Header (Hidden in Print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Cascading & Rencana SKP</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Cetak Dokumen Rencana SKP</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Cetak Dokumen Rencana SKP
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Pratinjau template dokumen kesepakatan SKP resmi berdasarkan target yang telah Anda sepakati dalam alur cascading.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-2 shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Cetak Dokumen (Print / PDF)
          </button>
        </div>
      </div>

      {/* Info Notice for Future Discussion (Hidden in Print) */}
      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-start gap-3.5 print:hidden">
        <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-lg">info</span>
        </div>
        <div className="space-y-1 text-xs text-sky-950">
          <p className="font-bold">Pratinjau Template Rencana Sasaran Kinerja Pegawai (SKP)</p>
          <p className="text-sky-800 leading-relaxed text-[11px]">
            Halaman ini menampilkan draf format resmi SKP PermenPANRB No. 6 Tahun 2022. Komponen, lampiran, dan format cetak dokumen ini siap disesuaikan lebih lanjut pada diskusi berikutnya.
          </p>
        </div>
      </div>

      {/* Document Sheet (Printable A4 Preview) */}
      <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-md p-8 md:p-14 max-w-5xl mx-auto space-y-6 text-on-surface font-sans print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
        
        {/* Header Lembaga */}
        <div className="border-b-2 border-on-surface pb-4 text-center space-y-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-on-surface-variant">
            KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI
          </h3>
          <h1 className="text-lg font-black uppercase tracking-wider text-primary print:text-black" style={{ fontFamily: 'Manrope' }}>
            UNIVERSITAS DIPONEGORO
          </h1>
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-on-surface">
            RENCANA SASARAN KINERJA PEGAWAI (SKP)
          </h2>
          <p className="text-[11px] text-on-surface-variant">
            Periode Penilaian: <b>{periode?.tgl_mulai_cascading || '1 Januari 2026'}</b> s.d. <b>{periode?.tgl_akhir_cascading || '31 Desember 2026'}</b> (Tahun {periode?.tahun || '2026'})
          </p>
        </div>

        {/* Pegawai Yang Dinilai & Pejabat Penilai Kinerja */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border border-on-surface/30 rounded-2xl p-4 bg-surface-container-lowest">
          {/* Pegawai Yang Dinilai */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase text-[11px] pb-1 border-b border-outline-variant/40 text-primary print:text-black">
              I. Pegawai yang Dinilai
            </h4>
            <table className="w-full text-left space-y-1">
              <tbody>
                <tr>
                  <td className="w-24 text-on-surface-variant font-medium py-0.5">Nama</td>
                  <td className="w-3">:</td>
                  <td className="font-bold">{user?.pegawai?.nama_lengkap || user?.email || '-'}</td>
                </tr>
                <tr>
                  <td className="text-on-surface-variant font-medium py-0.5">NIP</td>
                  <td>:</td>
                  <td>{user?.pegawai?.nip || '-'}</td>
                </tr>
                <tr>
                  <td className="text-on-surface-variant font-medium py-0.5">Jabatan</td>
                  <td>:</td>
                  <td>{user?.pegawai?.jabatan || ROLE_LABELS[role] || '-'}</td>
                </tr>
                <tr>
                  <td className="text-on-surface-variant font-medium py-0.5">Unit Kerja</td>
                  <td>:</td>
                  <td>{user?.pegawai?.unit_es2 || 'Universitas Diponegoro'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pejabat Penilai Kinerja */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase text-[11px] pb-1 border-b border-outline-variant/40 text-primary print:text-black">
              II. Pejabat Penilai Kinerja
            </h4>
            <table className="w-full text-left space-y-1">
              <tbody>
                <tr>
                  <td className="w-24 text-on-surface-variant font-medium py-0.5">Nama</td>
                  <td className="w-3">:</td>
                  <td className="font-bold">Pejabat Atasan Langsung</td>
                </tr>
                <tr>
                  <td className="text-on-surface-variant font-medium py-0.5">NIP</td>
                  <td>:</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td className="text-on-surface-variant font-medium py-0.5">Jabatan</td>
                  <td>:</td>
                  <td>Atasan Penilai Kinerja</td>
                </tr>
                <tr>
                  <td className="text-on-surface-variant font-medium py-0.5">Unit Kerja</td>
                  <td>:</td>
                  <td>Universitas Diponegoro</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabel Hasil Kerja SKP */}
        <div className="space-y-2">
          <h4 className="font-bold uppercase text-xs text-on-surface">
            III. Rencana Kinerja (Sasaran Kerja Pegawai)
          </h4>

          {agreedTasksForSKP.length === 0 ? (
            <div className="p-8 text-center text-xs text-on-surface-variant/70 italic border border-dashed border-outline-variant rounded-2xl">
              Belum ada tugas yang berstatus <b>Disepakati</b>. Rencana kinerja akan otomatis terisi saat tugas disetujui pada menu <b>Tugas Masuk & Dialog Kinerja</b>.
            </div>
          ) : (
            <div className="overflow-x-auto border border-on-surface/30 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-container text-on-surface border-b border-on-surface/30 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 w-8 text-center border-r border-outline-variant/30">No</th>
                    <th className="p-3 border-r border-outline-variant/30">Rencana Kinerja Pimpinan yang Diintervensi</th>
                    <th className="p-3 border-r border-outline-variant/30">Rencana Kinerja Pegawai</th>
                    <th className="p-3 border-r border-outline-variant/30 text-center w-24">Target</th>
                    <th className="p-3 w-28 text-center">Satuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  <tr className="bg-surface-container-low font-bold text-[11px]">
                    <td colSpan={5} className="p-2.5 text-primary">A. KINERJA UTAMA</td>
                  </tr>
                  {agreedTasksForSKP.map((task, idx) => (
                    <tr key={task.id} className="hover:bg-surface-container-lowest">
                      <td className="p-3 text-center border-r border-outline-variant/20 font-medium">
                        {idx + 1}
                      </td>
                      <td className="p-3 border-r border-outline-variant/20 text-on-surface-variant">
                        {task.parentTitle || 'Pencapaian IKU dan Sasaran Strategis Universitas Diponegoro'}
                      </td>
                      <td className="p-3 border-r border-outline-variant/20 font-semibold text-on-surface">
                        {task.title}
                        {task.isDirectSync && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-800 font-bold print:hidden">
                            Direct Sync
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center border-r border-outline-variant/20 font-bold text-on-surface">
                        {task.target}
                      </td>
                      <td className="p-3 text-center font-medium text-on-surface-variant">
                        {task.satuan}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tanda Tangan */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center border-t border-outline-variant/30">
          <div className="space-y-16">
            <div>
              <p className="text-on-surface-variant">Pegawai yang Dinilai,</p>
            </div>
            <div>
              <p className="font-bold underline text-on-surface">
                {user?.pegawai?.nama_lengkap || user?.email || '(Nama Pegawai)'}
              </p>
              <p className="text-[11px] text-on-surface-variant font-mono">
                NIP. {user?.pegawai?.nip || '..............................'}
              </p>
            </div>
          </div>

          <div className="space-y-16">
            <div>
              <p className="text-on-surface-variant">Semarang, {currentDate}</p>
              <p className="text-on-surface-variant">Pejabat Penilai Kinerja,</p>
            </div>
            <div>
              <p className="font-bold underline text-on-surface">
                (Nama Pejabat Penilai)
              </p>
              <p className="text-[11px] text-on-surface-variant font-mono">
                NIP. ..............................
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
