'use client'

import { useState } from 'react'
import { User, ROLE_LABELS, MasterPeriodeSKP } from '@/lib/types'

interface DokumenSKPModalProps {
  isOpen: boolean
  onClose: () => void
  periode: MasterPeriodeSKP | null
  pegawaiUser: User | null
  atasanUser: User | null
  tasks: Array<{
    id: string
    title: string
    target: number
    satuan: string
    parentTitle?: string
    isDirectSync?: boolean
  }>
}

export default function DokumenSKPModal({
  isOpen,
  onClose,
  periode,
  pegawaiUser,
  atasanUser,
  tasks,
}: DokumenSKPModalProps) {
  const [isSigned, setIsSigned] = useState(true)

  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:static">
      <div 
        className="w-full max-w-4xl max-h-[95vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-outline-variant/30 overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* Modal Controls (Hidden in Print) */}
        <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">description</span>
            <span className="font-bold text-sm text-on-surface">Dokumen Rencana SKP Resmi</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success">
              Disepakati Bersama
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Cetak Dokumen
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 md:p-12 overflow-y-auto space-y-6 text-on-surface font-sans print:p-0 print:overflow-visible">
          {/* Header Lembaga */}
          <div className="border-b-2 border-on-surface pb-4 text-center space-y-1">
            <h2 className="text-base font-extrabold uppercase tracking-wide">
              KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI
            </h2>
            <h1 className="text-lg font-black uppercase tracking-wider text-primary print:text-black">
              UNIVERSITAS DIPONEGORO
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant print:text-black">
              RENCANA SASARAN KINERJA PEGAWAI (SKP)
            </p>
            <p className="text-[11px] text-on-surface-variant print:text-black">
              Periode Penilaian: <b>{periode?.tgl_mulai_cascading || '1 Januari 2026'}</b> s.d. <b>{periode?.tgl_akhir_cascading || '31 Desember 2026'}</b> (Tahun {periode?.tahun || '2026'})
            </p>
          </div>

          {/* Pegawai & Atasan Penilai Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border border-on-surface/40 rounded-xl p-4 bg-surface-container-lowest/50">
            {/* Kolom Pegawai Yang Dinilai */}
            <div className="space-y-2">
              <h4 className="font-bold uppercase text-[11px] pb-1 border-b border-outline-variant text-primary print:text-black">
                I. Pegawai yang Dinilai
              </h4>
              <table className="w-full text-left space-y-1">
                <tbody>
                  <tr>
                    <td className="w-24 text-on-surface-variant font-medium">Nama</td>
                    <td className="w-3">:</td>
                    <td className="font-bold">{pegawaiUser?.pegawai?.nama_lengkap || pegawaiUser?.email || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-on-surface-variant font-medium">NIP</td>
                    <td>:</td>
                    <td>{pegawaiUser?.pegawai?.nip || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-on-surface-variant font-medium">Jabatan</td>
                    <td>:</td>
                    <td>{pegawaiUser?.pegawai?.jabatan || pegawaiUser?.role || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-on-surface-variant font-medium">Unit Kerja</td>
                    <td>:</td>
                    <td>{pegawaiUser?.pegawai?.unit_es2 || 'Universitas Diponegoro'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Kolom Pejabat Penilai Kinerja */}
            <div className="space-y-2">
              <h4 className="font-bold uppercase text-[11px] pb-1 border-b border-outline-variant text-primary print:text-black">
                II. Pejabat Penilai Kinerja
              </h4>
              <table className="w-full text-left space-y-1">
                <tbody>
                  <tr>
                    <td className="w-24 text-on-surface-variant font-medium">Nama</td>
                    <td className="w-3">:</td>
                    <td className="font-bold">{atasanUser?.pegawai?.nama_lengkap || atasanUser?.email || 'Atasan Langsung'}</td>
                  </tr>
                  <tr>
                    <td className="text-on-surface-variant font-medium">NIP</td>
                    <td>:</td>
                    <td>{atasanUser?.pegawai?.nip || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-on-surface-variant font-medium">Jabatan</td>
                    <td>:</td>
                    <td>{atasanUser?.pegawai?.jabatan || atasanUser?.role || 'Pejabat Penilai'}</td>
                  </tr>
                  <tr>
                    <td className="text-on-surface-variant font-medium">Unit Kerja</td>
                    <td>:</td>
                    <td>{atasanUser?.pegawai?.unit_es2 || 'Universitas Diponegoro'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabel Rencana SKP */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase text-xs text-on-surface">
              III. Rencana Kinerja & Target Hasil Kesepakatan Cascading
            </h4>
            <div className="border border-on-surface/40 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-container text-on-surface border-b border-on-surface/40 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 border-r border-on-surface/40 w-10 text-center">No</th>
                    <th className="p-2.5 border-r border-on-surface/40">Rencana Kinerja Atasan yang Diintervensi</th>
                    <th className="p-2.5 border-r border-on-surface/40">Rencana Kinerja Individu (IKU / Output / Uraian)</th>
                    <th className="p-2.5 border-r border-on-surface/40 w-24 text-center">Target</th>
                    <th className="p-2.5 w-24 text-center">Satuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-on-surface/20">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-on-surface-variant italic">
                        Belum ada tugas yang disepakati untuk dimasukkan ke dalam SKP Rencana.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task, idx) => (
                      <tr key={task.id} className="hover:bg-surface-container-lowest">
                        <td className="p-2.5 border-r border-on-surface/30 text-center font-medium">{idx + 1}</td>
                        <td className="p-2.5 border-r border-on-surface/30 text-on-surface-variant text-[11px]">
                          {task.parentTitle || 'Mendukung Sasaran Strategis Institusi'}
                        </td>
                        <td className="p-2.5 border-r border-on-surface/30 font-bold text-on-surface">
                          {task.title}
                        </td>
                        <td className="p-2.5 border-r border-on-surface/30 text-center font-bold text-primary print:text-black">
                          {task.target}
                        </td>
                        <td className="p-2.5 text-center font-medium">
                          {task.satuan}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lembar Pengesahan & Tanda Tangan */}
          <div className="pt-6 border-t border-on-surface/30 text-xs">
            <p className="text-right pb-4 text-on-surface-variant print:text-black">
              Semarang, {currentDate}
            </p>
            <div className="grid grid-cols-2 gap-8 text-center">
              {/* Pegawai Yang Dinilai */}
              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-on-surface-variant print:text-black">Pegawai yang Dinilai,</p>
                  <p className="text-[10px] text-success font-bold flex items-center justify-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    Telah Disetujui secara Digital
                  </p>
                </div>
                <div>
                  <p className="font-bold underline text-on-surface">{pegawaiUser?.pegawai?.nama_lengkap || pegawaiUser?.email}</p>
                  <p className="text-[11px] text-on-surface-variant print:text-black">NIP. {pegawaiUser?.pegawai?.nip || '-'}</p>
                </div>
              </div>

              {/* Pejabat Penilai Kinerja */}
              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-on-surface-variant print:text-black">Pejabat Penilai Kinerja,</p>
                  <p className="text-[10px] text-success font-bold flex items-center justify-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    Telah Diverifikasi secara Digital
                  </p>
                </div>
                <div>
                  <p className="font-bold underline text-on-surface">{atasanUser?.pegawai?.nama_lengkap || atasanUser?.email || 'Atasan Langsung'}</p>
                  <p className="text-[11px] text-on-surface-variant print:text-black">NIP. {atasanUser?.pegawai?.nip || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
