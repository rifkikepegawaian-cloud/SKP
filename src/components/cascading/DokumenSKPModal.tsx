'use client'

import React, { useState } from 'react'
import { User, ROLE_LABELS, MasterPeriodeSKP } from '@/lib/types'
import { ASPEK_BERAKHLAK } from '@/lib/constants/perilakuKerja'
import {
  SAMPLE_HASIL_KERJA_UTAMA,
  DEFAULT_PEGAWAI_RIFKI,
  DEFAULT_PENILAI_MONA,
} from '@/lib/constants/skpTemplateRifki'

interface DokumenSKPModalProps {
  isOpen: boolean
  onClose: () => void
  periode: MasterPeriodeSKP | null
  pegawaiUser: User | null
  atasanUser: User | null
  tasks: Array<{
    id: string
    title: string
    target: number | string
    satuan: string
    parentTitle?: string
    isDirectSync?: boolean
    indikatorKinerja?: string
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
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const periodeTahun = periode?.tahun || '2025'
  const periodeMulai = periode?.tgl_mulai_cascading || `03 Januari ${periodeTahun}`
  const periodeAkhir = periode?.tgl_akhir_cascading || `31 Desember ${periodeTahun}`

  // Determine tasks to display
  const displayTasks = tasks.length > 0 ? tasks : SAMPLE_HASIL_KERJA_UTAMA

  // Pegawai Info
  const namaPegawai = pegawaiUser?.pegawai?.nama_lengkap || pegawaiUser?.email || DEFAULT_PEGAWAI_RIFKI.nama
  const nipPegawai = pegawaiUser?.pegawai?.nip || DEFAULT_PEGAWAI_RIFKI.nip
  const pangkatPegawai = 'Setara Penata Muda/ Set. III/a'
  const jabatanPegawai = pegawaiUser?.pegawai?.jabatan || DEFAULT_PEGAWAI_RIFKI.jabatan
  const unitPegawai = pegawaiUser?.pegawai?.unit_es2 || DEFAULT_PEGAWAI_RIFKI.unitKerja

  // Atasan Info
  const namaPenilai = atasanUser?.pegawai?.nama_lengkap || atasanUser?.email || DEFAULT_PENILAI_MONA.nama
  const nipPenilai = atasanUser?.pegawai?.nip || DEFAULT_PENILAI_MONA.nip
  const pangkatPenilai = 'Setara Penata Muda/ Set. III/a'
  const jabatanPenilai = atasanUser?.pegawai?.jabatan || DEFAULT_PENILAI_MONA.jabatan
  const unitPenilai = atasanUser?.pegawai?.unit_es2 || DEFAULT_PENILAI_MONA.unitKerja

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:static">
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-outline-variant/30 overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">description</span>
            <span className="font-bold text-sm text-on-surface">Dokumen Rencana SKP Resmi</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Format PermenPAN-RB No. 6/2022
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Cetak Dokumen
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Printable Document Body (Exact Match to Rencana SKP Rifki.pdf) */}
        <div className="p-8 md:p-12 overflow-y-auto space-y-4 text-black font-sans print:p-0 print:overflow-visible text-xs">
          {/* Header Title */}
          <div className="text-center space-y-1 pb-1">
            <h1 className="text-sm md:text-base font-black tracking-wide uppercase">
              SASARAN KINERJA PEGAWAI
            </h1>
            <h2 className="text-xs md:text-sm font-bold tracking-wide uppercase leading-snug">
              PENDEKATAN HASIL KERJA KUALITATIF<br />BAGI PEJABAT ADMINISTRASI/ FUNGSIONAL
            </h2>
          </div>

          {/* Institution & Period Header */}
          <div className="flex justify-between items-center font-bold text-xs pt-2 pb-1 border-t-2 border-black">
            <span>UNIVERSITAS DIPONEGORO</span>
            <span className="uppercase">
              PERIODE PENILAIAN: {periodeMulai} S.D. {periodeAkhir}
            </span>
          </div>

          {/* Tabel Identitas Pegawai & Pejabat Penilai Kinerja (2 Kolom) */}
          <div className="border border-black overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#c2d7f2] border-b border-black font-bold text-center">
                  <th className="p-1.5 w-8 border-r border-black text-center">NO</th>
                  <th className="p-1.5 border-r border-black w-[45%] text-left uppercase">
                    PEGAWAI YANG DINILAI
                  </th>
                  <th className="p-1.5 w-8 border-r border-black text-center">NO</th>
                  <th className="p-1.5 w-[45%] text-left uppercase">
                    PEJABAT PENILAI KINERJA
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Nama */}
                <tr className="border-b border-black">
                  <td className="p-1.5 text-center border-r border-black font-bold">1</td>
                  <td className="p-1.5 border-r border-black">
                    <div className="flex">
                      <span className="w-40 font-bold">NAMA</span>
                      <span className="w-3">:</span>
                      <span className="flex-1 font-bold">{namaPegawai}</span>
                    </div>
                  </td>
                  <td className="p-1.5 text-center border-r border-black font-bold">1</td>
                  <td className="p-1.5">
                    <div className="flex">
                      <span className="w-40 font-bold">NAMA</span>
                      <span className="w-3">:</span>
                      <span className="flex-1 font-bold">{namaPenilai}</span>
                    </div>
                  </td>
                </tr>

                {/* 2. NPPU */}
                <tr className="border-b border-black">
                  <td className="p-1.5 text-center border-r border-black font-bold">2</td>
                  <td className="p-1.5 border-r border-black">
                    <div className="flex">
                      <span className="w-40 font-bold">NPPU</span>
                      <span className="w-3">:</span>
                      <span className="flex-1 font-mono">{nipPegawai}</span>
                    </div>
                  </td>
                  <td className="p-1.5 text-center border-r border-black font-bold">2</td>
                  <td className="p-1.5">
                    <div className="flex">
                      <span className="w-40 font-bold">NPPU</span>
                      <span className="w-3">:</span>
                      <span className="flex-1 font-mono">{nipPenilai}</span>
                    </div>
                  </td>
                </tr>

                {/* 3. Pangkat / Gol. Ruang */}
                <tr className="border-b border-black">
                  <td className="p-1.5 text-center border-r border-black font-bold">3</td>
                  <td className="p-1.5 border-r border-black">
                    <div className="flex">
                      <span className="w-40 font-bold">PANGKAT/ GOL. RUANG</span>
                      <span className="w-3">:</span>
                      <span className="flex-1">{pangkatPegawai}</span>
                    </div>
                  </td>
                  <td className="p-1.5 text-center border-r border-black font-bold">3</td>
                  <td className="p-1.5">
                    <div className="flex">
                      <span className="w-40 font-bold">PANGKAT/ GOL. RUANG</span>
                      <span className="w-3">:</span>
                      <span className="flex-1">{pangkatPenilai}</span>
                    </div>
                  </td>
                </tr>

                {/* 4. Jabatan */}
                <tr className="border-b border-black">
                  <td className="p-1.5 text-center border-r border-black font-bold">4</td>
                  <td className="p-1.5 border-r border-black">
                    <div className="flex">
                      <span className="w-40 font-bold">JABATAN</span>
                      <span className="w-3">:</span>
                      <span className="flex-1">{jabatanPegawai}</span>
                    </div>
                  </td>
                  <td className="p-1.5 text-center border-r border-black font-bold">4</td>
                  <td className="p-1.5">
                    <div className="flex">
                      <span className="w-40 font-bold">JABATAN</span>
                      <span className="w-3">:</span>
                      <span className="flex-1">{jabatanPenilai}</span>
                    </div>
                  </td>
                </tr>

                {/* 5. Unit Kerja */}
                <tr>
                  <td className="p-1.5 text-center border-r border-black font-bold">5</td>
                  <td className="p-1.5 border-r border-black">
                    <div className="flex">
                      <span className="w-40 font-bold">UNIT KERJA</span>
                      <span className="w-3">:</span>
                      <span className="flex-1">{unitPegawai}</span>
                    </div>
                  </td>
                  <td className="p-1.5 text-center border-r border-black font-bold">5</td>
                  <td className="p-1.5">
                    <div className="flex">
                      <span className="w-40 font-bold">UNIT KERJA</span>
                      <span className="w-3">:</span>
                      <span className="flex-1">{unitPenilai}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabel HASIL KERJA */}
          <div className="border border-black overflow-hidden">
            <div className="bg-[#c2d7f2] font-black p-1.5 border-b border-black text-black tracking-wide uppercase">
              HASIL KERJA
            </div>
            <div className="font-bold p-1.5 border-b border-black bg-white uppercase">
              A. UTAMA
            </div>

            <table className="w-full text-left border-collapse">
              <tbody>
                {displayTasks.map((task, idx) => (
                  <React.Fragment key={task.id || idx}>
                    <tr className="border-b border-black">
                      <td className="w-8 p-1.5 text-center align-top border-r border-black font-bold">
                        {idx + 1}
                      </td>
                      <td className="p-1.5 align-top font-semibold leading-relaxed">
                        {task.title}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-1.5 border-r border-black bg-neutral-50/50"></td>
                      <td className="p-1.5 pl-4 align-top space-y-0.5 leading-relaxed bg-neutral-50/30">
                        <p className="font-bold italic text-[11px]">
                          Ukuran keberhasilan/ Indikator Kinerja Individu, Target, dan Perspektif :
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          {task.indikatorKinerja ||
                            `Terprosesnya ${task.title} sebanyak ${task.target || 100} ${task.satuan || '%'} diproses 100%`}
                        </p>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tabel PERILAKU KERJA */}
          <div className="border border-black overflow-hidden break-before-page">
            <div className="bg-[#c2d7f2] font-black p-1.5 border-b border-black text-black tracking-wide">
              PERILAKU KERJA*
            </div>

            <table className="w-full text-left border-collapse">
              <tbody>
                {ASPEK_BERAKHLAK.map((aspek, idx) => (
                  <tr key={aspek.id} className="border-b border-black last:border-b-0">
                    <td className="w-8 p-1.5 text-center align-top border-r border-black font-bold">
                      {idx + 1}
                    </td>
                    <td className="p-1.5 align-top border-r border-black w-1/2">
                      <p className="font-bold text-black capitalize mb-0.5">
                        {aspek.nama}
                      </p>
                      <ul className="space-y-0.5 text-black text-[11px]">
                        {aspek.panduan.map((pd, pIndex) => (
                          <li key={pIndex} className="flex items-start">
                            <span className="mr-1.5">-</span>
                            <span className="leading-tight">{pd}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-1.5 align-top w-1/2 space-y-0.5">
                      <p className="font-bold text-black text-[11px]">
                        Ekspektasi Khusus Pimpinan:
                      </p>
                      <p className="text-black font-medium text-[11px] leading-relaxed">
                        {aspek.defaultEkspektasi}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lembar Pengesahan & Tanda Tangan */}
          <div className="pt-6 border-t-2 border-black space-y-1">
            <div className="text-right pr-12 pb-2">
              <p className="font-medium text-xs">
                Semarang, 01 Januari {periodeTahun}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-16">
                <p className="font-bold">Pegawai yang Dinilai</p>
                <div>
                  <p className="font-bold underline text-sm">{namaPegawai}</p>
                  <p className="font-mono text-xs">NPPU {nipPegawai}</p>
                </div>
              </div>

              <div className="space-y-16">
                <p className="font-bold">Pejabat Penilai Kinerja</p>
                <div>
                  <p className="font-bold underline text-sm">{namaPenilai}</p>
                  <p className="font-mono text-xs">NPPU {nipPenilai}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
