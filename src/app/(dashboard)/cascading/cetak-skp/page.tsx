'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useCascading } from '@/context/CascadingContext'
import { ROLE_LABELS, NilaiPerilakuItem, UserRole } from '@/lib/types'
import { ASPEK_BERAKHLAK } from '@/lib/constants/perilakuKerja'
import { createClient } from '@/lib/supabase/client'
import { ProfileSKP } from '@/lib/constants/skpTemplateRifki'
import { getStructuralSuperiors } from '@/lib/skpHierarchy'
import Swal from 'sweetalert2'

export default function CetakDokumenSKPPage() {
  const {
    user,
    role,
    periode,
    isLoading,
    agreedTasksForSKP,
  } = useCascading()

  // 1. Identitas Pegawai Yang Dinilai (Data Riil)
  const [pegawaiProfile, setPegawaiProfile] = useState<ProfileSKP>(() => ({
    nama: user?.pegawai?.nama_lengkap || user?.email || '-',
    nip: user?.pegawai?.nip || '-',
    pangkatGol: user?.pegawai?.pangkat_golongan || '-',
    jabatan: user?.pegawai?.jabatan || (role ? ROLE_LABELS[role] : '-'),
    unitKerja: user?.pegawai?.unit_es2 || '-',
  }))

  // 2. Identitas Pejabat Penilai Kinerja (Atasan Langsung)
  const [penilaiProfile, setPenilaiProfile] = useState<ProfileSKP>(() => ({
    nama: 'Pejabat Penilai Kinerja',
    nip: '-',
    pangkatGol: '-',
    jabatan: 'Atasan Langsung',
    unitKerja: user?.pegawai?.unit_es2 || '-',
  }))

  // 3. Identitas Atasan Pejabat Penilai Kinerja (Atasan dari Atasan Langsung)
  const [atasanPenilaiProfile, setAtasanPenilaiProfile] = useState<ProfileSKP>(() => ({
    nama: 'Atasan Pejabat Penilai Kinerja',
    nip: '-',
    pangkatGol: '-',
    jabatan: 'Atasan dari Pejabat Penilai Kinerja',
    unitKerja: user?.pegawai?.unit_es2 || '-',
  }))

  // Modal dialog for editing employee / superior data
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Auto-detect superior based on structural hierarchy
  useEffect(() => {
    if (!user) return

    // 1. Update Pegawai profile from user
    setPegawaiProfile(prev => ({
      ...prev,
      nama: user.pegawai?.nama_lengkap || user.email || prev.nama,
      nip: user.pegawai?.nip || prev.nip,
      pangkatGol: user.pegawai?.pangkat_golongan || prev.pangkatGol,
      jabatan: user.pegawai?.jabatan || ROLE_LABELS[role] || prev.jabatan,
      unitKerja: user.pegawai?.unit_es2 || prev.unitKerja,
    }))

    // 2. Check localStorage for previously saved custom profiles
    const savedProfiles = localStorage.getItem(`skp_profiles_${user.id}`)
    if (savedProfiles) {
      try {
        const parsed = JSON.parse(savedProfiles)
        if (parsed.pegawai) setPegawaiProfile(parsed.pegawai)
        if (parsed.penilai) setPenilaiProfile(parsed.penilai)
        if (parsed.atasanPenilai) setAtasanPenilaiProfile(parsed.atasanPenilai)
        return
      } catch (e) {
        console.error(e)
      }
    }

    // 3. Resolve true structural superiors based on unit es4 / es3 / es2
    const supabase = createClient()
    getStructuralSuperiors(user, supabase).then(res => {
      setPenilaiProfile(res.pejabatPenilai)
      setAtasanPenilaiProfile(res.atasanPejabatPenilai)
    }).catch(err => {
      console.warn('Gagal memuat atasan struktural:', err)
    })
  }, [user, role])

  // Save customized profiles
  const handleSaveProfiles = (e: React.FormEvent) => {
    e.preventDefault()
    if (user) {
      localStorage.setItem(`skp_profiles_${user.id}`, JSON.stringify({
        pegawai: pegawaiProfile,
        penilai: penilaiProfile,
        atasanPenilai: atasanPenilaiProfile,
      }))
    }
    setIsEditModalOpen(false)
    Swal.fire({
      icon: 'success',
      title: 'Data Profil Tersimpan',
      text: 'Identitas pegawai, pejabat penilai kinerja, dan atasan pejabat penilai berhasil diperbarui.',
      timer: 1500,
      showConfirmButton: false,
    })
  }

  // Load Perilaku Kerja data
  const [perilakuMap, setPerilakuMap] = useState<Record<number, NilaiPerilakuItem>>(() => {
    const defaults: Record<number, NilaiPerilakuItem> = {}
    ASPEK_BERAKHLAK.forEach(a => {
      defaults[a.id] = {
        aspek_id: a.id,
        ekspektasi_khusus: a.defaultEkspektasi,
        rating: 'sesuai_ekspektasi',
      }
    })
    return defaults
  })

  useEffect(() => {
    if (!user) return
    const periodeId = periode?.id || 'default_periode'
    const storageKey = `skp_perilaku_${periodeId}_${user.id}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setPerilakuMap(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    } else {
      const loadSupabase = async () => {
        try {
          const supabase = createClient()
          const { data } = await supabase
            .from('skp_perilaku_kerja')
            .select('*')
            .eq('periode_id', periodeId)
            .eq('user_id', user.id)
          if (data && data.length > 0) {
            const loaded: Record<number, NilaiPerilakuItem> = {}
            ASPEK_BERAKHLAK.forEach(a => {
              const row = data.find((r: any) => r.aspek_id === a.id)
              loaded[a.id] = {
                aspek_id: a.id,
                ekspektasi_khusus: row?.ekspektasi_khusus || a.defaultEkspektasi,
                rating: row?.rating || 'sesuai_ekspektasi',
                umpan_balik: row?.umpan_balik || '',
              }
            })
            setPerilakuMap(loaded)
          }
        } catch (e) {
          // ignore
        }
      }
      loadSupabase()
    }
  }, [user, periode?.id])

  // Computed Tasks to display in HASIL KERJA (Real Data)
  const { tasksUtama, tasksTambahan } = useMemo(() => {
    const utama = agreedTasksForSKP.filter(t => (t.jenisKinerja || 'utama') === 'utama')
    const tambahan = agreedTasksForSKP.filter(t => t.jenisKinerja === 'tambahan')

    return {
      tasksUtama: utama,
      tasksTambahan: tambahan,
    }
  }, [agreedTasksForSKP])

  const periodeTahun = periode?.tahun || new Date().getFullYear().toString()
  const periodeMulai = periode?.tgl_mulai_cascading || `01 Januari ${periodeTahun}`
  const periodeAkhir = periode?.tgl_akhir_cascading || `31 Desember ${periodeTahun}`

  // Approach label based on role
  const isPimpinanTinggi = role === 'rektor' || role === 'pimpinan_sukpa'
  const subTitlePendekatan = isPimpinanTinggi
    ? 'PENDEKATAN HASIL KERJA KUANTITATIF\nBAGI PEJABAT PIMPINAN TINGGI'
    : 'PENDEKATAN HASIL KERJA KUALITATIF\nBAGI PEJABAT ADMINISTRASI/ FUNGSIONAL'

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

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. TOP CONTROL BAR (HIDDEN IN PRINT)                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <Link href="/cascading" className="font-semibold text-primary hover:underline">
              Cascading & Rencana SKP
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-on-surface font-medium">Cetak Dokumen Rencana SKP</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Dokumen Resmi Rencana Sasaran Kinerja Pegawai (SKP)
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Format resmi Lampiran PermenPAN-RB No. 6 Tahun 2022 (Sesuai Rencana SKP UNDIP).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Edit Profile Button */}
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-primary">edit</span>
            Ubah Data Pegawai & Penilai
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Cetak Dokumen (Print / PDF)
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-center justify-between gap-3 print:hidden text-xs">
        <div className="flex items-center gap-2.5 text-sky-950">
          <span className="material-symbols-outlined text-sky-600 text-lg">info</span>
          <div>
            <p className="font-bold">
              Menampilkan {tasksUtama.length} Butir Kinerja Riil dari Penugasan Cascading Aktif Anda
            </p>
            <p className="text-[11px] text-sky-800">
              Hasil kerja memuat data riil (IKU untuk Rektor/SUKPA/Unit, Output untuk Manajer, Uraian untuk Supervisor, dan Sub-Uraian untuk Staf).
            </p>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. OFFICIAL SKP DOCUMENT (MATCHING Rencana SKP Rifki.pdf)    */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-black/30 shadow-lg p-6 md:p-12 max-w-5xl mx-auto space-y-4 text-black font-sans print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none print:max-w-none text-xs">
        
        {/* Title Header */}
        <div className="text-center space-y-1 pb-1">
          <h1 className="text-sm md:text-base font-black tracking-wide uppercase">
            SASARAN KINERJA PEGAWAI
          </h1>
          <h2 className="text-xs md:text-sm font-bold tracking-wide uppercase whitespace-pre-line leading-snug">
            {subTitlePendekatan}
          </h2>
        </div>

        {/* Institution & Period Header */}
        <div className="flex justify-between items-center font-bold text-xs pt-2 pb-1 border-t-2 border-black">
          <span>UNIVERSITAS DIPONEGORO</span>
          <span className="uppercase">
            PERIODE PENILAIAN: {periodeMulai} S.D. {periodeAkhir}
          </span>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* TABEL IDENTITAS PEGAWAI & PEJABAT PENILAI (2 KOLOM)       */}
        {/* ────────────────────────────────────────────────────────── */}
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
              {/* Row 1: Nama */}
              <tr className="border-b border-black">
                <td className="p-1.5 text-center border-r border-black font-bold">1</td>
                <td className="p-1.5 border-r border-black">
                  <div className="flex">
                    <span className="w-40 font-bold">NAMA</span>
                    <span className="w-3">:</span>
                    <span className="flex-1 font-bold">{pegawaiProfile.nama}</span>
                  </div>
                </td>
                <td className="p-1.5 text-center border-r border-black font-bold">1</td>
                <td className="p-1.5">
                  <div className="flex">
                    <span className="w-40 font-bold">NAMA</span>
                    <span className="w-3">:</span>
                    <span className="flex-1 font-bold">{penilaiProfile.nama}</span>
                  </div>
                </td>
              </tr>

              {/* Row 2: NPPU / NIP */}
              <tr className="border-b border-black">
                <td className="p-1.5 text-center border-r border-black font-bold">2</td>
                <td className="p-1.5 border-r border-black">
                  <div className="flex">
                    <span className="w-40 font-bold">NPPU</span>
                    <span className="w-3">:</span>
                    <span className="flex-1 font-mono">{pegawaiProfile.nip}</span>
                  </div>
                </td>
                <td className="p-1.5 text-center border-r border-black font-bold">2</td>
                <td className="p-1.5">
                  <div className="flex">
                    <span className="w-40 font-bold">NPPU</span>
                    <span className="w-3">:</span>
                    <span className="flex-1 font-mono">{penilaiProfile.nip}</span>
                  </div>
                </td>
              </tr>

              {/* Row 3: Pangkat / Gol. Ruang */}
              <tr className="border-b border-black">
                <td className="p-1.5 text-center border-r border-black font-bold">3</td>
                <td className="p-1.5 border-r border-black">
                  <div className="flex">
                    <span className="w-40 font-bold">PANGKAT/ GOL. RUANG</span>
                    <span className="w-3">:</span>
                    <span className="flex-1">{pegawaiProfile.pangkatGol}</span>
                  </div>
                </td>
                <td className="p-1.5 text-center border-r border-black font-bold">3</td>
                <td className="p-1.5">
                  <div className="flex">
                    <span className="w-40 font-bold">PANGKAT/ GOL. RUANG</span>
                    <span className="w-3">:</span>
                    <span className="flex-1">{penilaiProfile.pangkatGol}</span>
                  </div>
                </td>
              </tr>

              {/* Row 4: Jabatan */}
              <tr className="border-b border-black">
                <td className="p-1.5 text-center border-r border-black font-bold">4</td>
                <td className="p-1.5 border-r border-black">
                  <div className="flex">
                    <span className="w-40 font-bold">JABATAN</span>
                    <span className="w-3">:</span>
                    <span className="flex-1">{pegawaiProfile.jabatan}</span>
                  </div>
                </td>
                <td className="p-1.5 text-center border-r border-black font-bold">4</td>
                <td className="p-1.5">
                  <div className="flex">
                    <span className="w-40 font-bold">JABATAN</span>
                    <span className="w-3">:</span>
                    <span className="flex-1">{penilaiProfile.jabatan}</span>
                  </div>
                </td>
              </tr>

              {/* Row 5: Unit Kerja */}
              <tr>
                <td className="p-1.5 text-center border-r border-black font-bold">5</td>
                <td className="p-1.5 border-r border-black">
                  <div className="flex">
                    <span className="w-40 font-bold">UNIT KERJA</span>
                    <span className="w-3">:</span>
                    <span className="flex-1">{pegawaiProfile.unitKerja}</span>
                  </div>
                </td>
                <td className="p-1.5 text-center border-r border-black font-bold">5</td>
                <td className="p-1.5">
                  <div className="flex">
                    <span className="w-40 font-bold">UNIT KERJA</span>
                    <span className="w-3">:</span>
                    <span className="flex-1">{penilaiProfile.unitKerja}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* TABEL HASIL KERJA (A. UTAMA & B. TAMBAHAN)                 */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="border border-black overflow-hidden">
          {/* Header Section: HASIL KERJA */}
          <div className="bg-[#c2d7f2] font-black p-1.5 border-b border-black text-black tracking-wide uppercase">
            HASIL KERJA
          </div>

          {/* Subheader: A. UTAMA */}
          <div className="font-bold p-1.5 border-b border-black bg-white uppercase">
            A. UTAMA
          </div>

          {/* List of Tasks Utama */}
            <table className="w-full text-left border-collapse">
              <tbody>
                {tasksUtama.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-center italic text-neutral-500 text-xs">
                      Belum ada rencana hasil kerja utama yang disepakati untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  tasksUtama.map((task, idx) => (
                    <React.Fragment key={task.id || idx}>
                      {/* Baris 1: Nomor dan Sasaran Kinerja */}
                      <tr className="border-b border-black">
                        <td className="w-8 p-1.5 text-center align-top border-r border-black font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-1.5 align-top font-semibold leading-relaxed">
                          <p className="font-bold">{task.sasaranKinerja || task.title}</p>
                          {task.sasaranKinerja && task.title && task.sasaranKinerja !== task.title && (
                            <p className="text-[10px] text-neutral-600 font-normal italic">
                              Lingkup: {task.title}
                            </p>
                          )}
                        </td>
                      </tr>

                      {/* Baris 2: Indikator Keberhasilan dan Target */}
                      <tr className="border-b border-black">
                        <td className="p-1.5 border-r border-black bg-neutral-50/50"></td>
                        <td className="p-1.5 pl-4 align-top space-y-0.5 leading-relaxed bg-neutral-50/30">
                          <p className="font-bold italic text-[11px]">
                            Ukuran keberhasilan/ Indikator Kinerja Individu, Target, dan Perspektif :
                          </p>
                          <p className="text-[11px] leading-relaxed">
                            {task.indikatorKinerjaIndividu
                              ? `${task.indikatorKinerjaIndividu} sebanyak ${task.target || 100} ${task.satuan || '%'}`
                              : (task.indikatorKinerja ||
                                `Terprosesnya ${task.title} sebanyak ${task.target || 100} ${task.satuan || '%'} diproses 100%`)}
                          </p>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>

          {/* Subheader & List: B. TAMBAHAN */}
          {tasksTambahan.length > 0 && (
            <>
              <div className="font-bold p-1.5 border-t border-b border-black bg-[#c2d7f2] uppercase">
                B. TAMBAHAN
              </div>
              <table className="w-full text-left border-collapse">
                <tbody>
                  {tasksTambahan.map((task, idx) => (
                    <React.Fragment key={task.id || idx}>
                      <tr className="border-b border-black">
                        <td className="w-8 p-1.5 text-center align-top border-r border-black font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-1.5 align-top font-semibold leading-relaxed">
                          <p className="font-bold">{task.sasaranKinerja || task.title}</p>
                          {task.sasaranKinerja && task.title && task.sasaranKinerja !== task.title && (
                            <p className="text-[10px] text-neutral-600 font-normal italic">
                              Lingkup: {task.title}
                            </p>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1.5 border-r border-black bg-neutral-50/50"></td>
                        <td className="p-1.5 pl-4 align-top space-y-0.5 leading-relaxed bg-neutral-50/30">
                          <p className="font-bold italic text-[11px]">
                            Ukuran keberhasilan/ Indikator Kinerja Individu, Target, dan Perspektif :
                          </p>
                          <p className="text-[11px] leading-relaxed">
                            {task.indikatorKinerjaIndividu
                              ? `${task.indikatorKinerjaIndividu} sebanyak ${task.target || 100} ${task.satuan || '%'}`
                              : (task.indikatorKinerja ||
                                `Terprosesnya ${task.title} sebanyak ${task.target || 100} ${task.satuan || '%'} diproses 100%`)}
                          </p>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* TABEL PERILAKU KERJA (7 CORE VALUES BerAKHLAK)             */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="border border-black overflow-hidden break-before-page">
          <div className="bg-[#c2d7f2] font-black p-1.5 border-b border-black text-black tracking-wide">
            PERILAKU KERJA*
          </div>

          <table className="w-full text-left border-collapse">
            <tbody>
              {ASPEK_BERAKHLAK.map((aspek, idx) => {
                const itemData = perilakuMap[aspek.id]
                const ekspektasi = itemData?.ekspektasi_khusus || aspek.defaultEkspektasi

                return (
                  <tr key={aspek.id} className="border-b border-black last:border-b-0">
                    {/* No */}
                    <td className="w-8 p-1.5 text-center align-top border-r border-black font-bold">
                      {idx + 1}
                    </td>

                    {/* Aspek & Panduan Perilaku */}
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

                    {/* Ekspektasi Khusus Pimpinan */}
                    <td className="p-1.5 align-top w-1/2 space-y-0.5">
                      <p className="font-bold text-black text-[11px]">
                        Ekspektasi Khusus Pimpinan:
                      </p>
                      <p className="text-black font-medium text-[11px] leading-relaxed">
                        {ekspektasi}
                      </p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* LEMBAR PENGESAHAN & TANDA TANGAN (SEMARANG, 01 JANUARI)    */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="pt-6 border-t-2 border-black space-y-1">
          <div className="text-right pr-12 pb-2">
            <p className="font-medium text-xs">
              Semarang, 01 Januari {periodeTahun}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-center text-xs">
            {/* Pegawai Yang Dinilai */}
            <div className="space-y-16">
              <p className="font-bold">Pegawai yang Dinilai</p>
              <div>
                <p className="font-bold underline text-sm">{pegawaiProfile.nama}</p>
                <p className="font-mono text-xs">NPPU {pegawaiProfile.nip}</p>
              </div>
            </div>

            {/* Pejabat Penilai Kinerja */}
            <div className="space-y-16">
              <p className="font-bold">Pejabat Penilai Kinerja</p>
              <div>
                <p className="font-bold underline text-sm">{penilaiProfile.nama}</p>
                <p className="font-mono text-xs">NPPU {penilaiProfile.nip}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. MODAL EDIT IDENTITAS PEGAWAI & PEJABAT PENILAI           */}
      {/* ──────────────────────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">manage_accounts</span>
                <span className="font-bold text-sm text-on-surface">Sesuaikan Data Pegawai & Pejabat Penilai</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProfiles} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              {/* Kolom Pegawai */}
              <div className="space-y-3">
                <h4 className="font-bold text-primary uppercase border-b border-outline-variant/40 pb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">person</span>
                  I. Pegawai yang Dinilai
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">Nama Lengkap & Gelar:</label>
                    <input
                      type="text"
                      value={pegawaiProfile.nama}
                      onChange={e => setPegawaiProfile({ ...pegawaiProfile, nama: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">NPPU / NIP:</label>
                    <input
                      type="text"
                      value={pegawaiProfile.nip}
                      onChange={e => setPegawaiProfile({ ...pegawaiProfile, nip: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">Pangkat / Gol. Ruang:</label>
                    <input
                      type="text"
                      value={pegawaiProfile.pangkatGol}
                      onChange={e => setPegawaiProfile({ ...pegawaiProfile, pangkatGol: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">Jabatan:</label>
                    <input
                      type="text"
                      value={pegawaiProfile.jabatan}
                      onChange={e => setPegawaiProfile({ ...pegawaiProfile, jabatan: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold text-on-surface-variant block mb-1">Unit Kerja:</label>
                    <input
                      type="text"
                      value={pegawaiProfile.unitKerja}
                      onChange={e => setPegawaiProfile({ ...pegawaiProfile, unitKerja: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Kolom Pejabat Penilai */}
              <div className="space-y-3">
                <h4 className="font-bold text-primary uppercase border-b border-outline-variant/40 pb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  II. Pejabat Penilai Kinerja (Atasan Langsung)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">Nama Pejabat Penilai:</label>
                    <input
                      type="text"
                      value={penilaiProfile.nama}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, nama: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">NPPU / NIP Penilai:</label>
                    <input
                      type="text"
                      value={penilaiProfile.nip}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, nip: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">Pangkat / Gol. Ruang Penilai:</label>
                    <input
                      type="text"
                      value={penilaiProfile.pangkatGol}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, pangkatGol: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">Jabatan Penilai:</label>
                    <input
                      type="text"
                      value={penilaiProfile.jabatan}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, jabatan: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold text-on-surface-variant block mb-1">Unit Kerja Penilai:</label>
                    <input
                      type="text"
                      value={penilaiProfile.unitKerja}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, unitKerja: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Kolom Atasan Pejabat Penilai */}
              <div className="space-y-3">
                <h4 className="font-bold text-primary uppercase border-b border-outline-variant/40 pb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">security</span>
                  III. Atasan Pejabat Penilai Kinerja
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">Nama Atasan Pejabat Penilai:</label>
                    <input
                      type="text"
                      value={atasanPenilaiProfile.nama}
                      onChange={e => setAtasanPenilaiProfile({ ...atasanPenilaiProfile, nama: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">NPPU / NIP:</label>
                    <input
                      type="text"
                      value={atasanPenilaiProfile.nip}
                      onChange={e => setAtasanPenilaiProfile({ ...atasanPenilaiProfile, nip: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">Pangkat / Gol. Ruang:</label>
                    <input
                      type="text"
                      value={atasanPenilaiProfile.pangkatGol}
                      onChange={e => setAtasanPenilaiProfile({ ...atasanPenilaiProfile, pangkatGol: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-on-surface-variant block mb-1">Jabatan:</label>
                    <input
                      type="text"
                      value={atasanPenilaiProfile.jabatan}
                      onChange={e => setAtasanPenilaiProfile({ ...atasanPenilaiProfile, jabatan: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold text-on-surface-variant block mb-1">Unit Kerja:</label>
                    <input
                      type="text"
                      value={atasanPenilaiProfile.unitKerja}
                      onChange={e => setAtasanPenilaiProfile({ ...atasanPenilaiProfile, unitKerja: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/30 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant/40 text-on-surface font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/20"
                >
                  Terapkan & Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
