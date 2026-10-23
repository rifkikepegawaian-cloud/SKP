'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCascading } from '@/context/CascadingContext'
import { ROLE_LABELS, UserRole } from '@/lib/types'
import { ASPEK_BERAKHLAK } from '@/lib/constants/perilakuKerja'
import { ProfileSKP } from '@/lib/constants/skpTemplateRifki'
import { getStructuralSuperiors } from '@/lib/skpHierarchy'
import { createClient } from '@/lib/supabase/client'
import { PolaDistribusiChart, CapaianOrganisasiType } from '@/components/evaluasi/PolaDistribusiChart'
import Swal from 'sweetalert2'

export default function CetakDokumenEvaluasiSKPPage() {
  const {
    user,
    role,
    periode,
    isLoading,
    agreedTasksForSKP,
  } = useCascading()

  // Tab View Mode
  const [viewMode, setViewMode] = useState<'all' | 'formulir' | 'dokumen'>('all')

  // Capaian Kinerja Organisasi (Default: ISTIMEWA - sesuaian PermenPAN-RB No. 6/2022)
  const [capaianOrganisasi, setCapaianOrganisasi] = useState<CapaianOrganisasiType>('ISTIMEWA')

  // Metadata Dokumen & Periode
  const [instansiText, setInstansiText] = useState('UNIVERSITAS DIPONEGORO')
  const [kementerianText, setKementerianText] = useState('KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI')
  const [periodeEvaluasiLabel, setPeriodeEvaluasiLabel] = useState('PERIODE: TRIWULAN I/II/III/IV-AKHIR*')
  const [periodePenilaianText, setPeriodePenilaianText] = useState('03 JANUARI S.D. 31 DESEMBER TAHUN 2025')
  const [tanggalPenetapan, setTanggalPenetapan] = useState('Semarang, 31 Desember 2025')
  const [catatanRekomendasi, setCatatanRekomendasi] = useState('')

  // 1. Identitas Pegawai Yang Dinilai
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

  // 3. Identitas Atasan Pejabat Penilai Kinerja (Atasan dari Pejabat Penilai)
  const [atasanPenilaiProfile, setAtasanPenilaiProfile] = useState<ProfileSKP>(() => ({
    nama: 'Atasan Pejabat Penilai Kinerja',
    nip: '-',
    pangkatGol: '-',
    jabatan: 'Atasan dari Pejabat Penilai Kinerja',
    unitKerja: user?.pegawai?.unit_es2 || '-',
  }))

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Auto-detect profiles from user & hierarchy
  useEffect(() => {
    if (!user) return

    setPegawaiProfile(prev => ({
      ...prev,
      nama: user.pegawai?.nama_lengkap || user.email || prev.nama,
      nip: user.pegawai?.nip || prev.nip,
      pangkatGol: user.pegawai?.pangkat_golongan || prev.pangkatGol,
      jabatan: user.pegawai?.jabatan || (role ? ROLE_LABELS[role] : prev.jabatan),
      unitKerja: user.pegawai?.unit_es2 || prev.unitKerja,
    }))

    // Cek localStorage profil
    const savedProfiles = localStorage.getItem(`skp_profiles_${user.id}`)
    if (savedProfiles) {
      try {
        const parsed = JSON.parse(savedProfiles)
        if (parsed.pegawai) setPegawaiProfile(parsed.pegawai)
        if (parsed.penilai) setPenilaiProfile(parsed.penilai)
        if (parsed.atasanPenilai) setAtasanPenilaiProfile(parsed.atasanPenilai)
      } catch (e) {
        console.error(e)
      }
    } else {
      // Auto-detect hierarchy
      const supabase = createClient()
      getStructuralSuperiors(user, supabase).then(res => {
        setPenilaiProfile(res.pejabatPenilai)
        setAtasanPenilaiProfile(res.atasanPejabatPenilai)
      }).catch(err => {
        console.warn('Gagal mendeteksi atasan struktural:', err)
      })
    }

    // Cek metadata dokumen evaluasi
    const periodeId = periode?.id || '2025'
    const savedMeta = localStorage.getItem(`skp_evaluasi_meta_${user.id}_${periodeId}`)
    if (savedMeta) {
      try {
        const meta = JSON.parse(savedMeta)
        if (meta.capaianOrganisasi) setCapaianOrganisasi(meta.capaianOrganisasi)
        if (meta.instansiText) setInstansiText(meta.instansiText)
        if (meta.kementerianText) setKementerianText(meta.kementerianText)
        if (meta.periodeEvaluasiLabel) setPeriodeEvaluasiLabel(meta.periodeEvaluasiLabel)
        if (meta.periodePenilaianText) setPeriodePenilaianText(meta.periodePenilaianText)
        if (meta.tanggalPenetapan) setTanggalPenetapan(meta.tanggalPenetapan)
        if (meta.catatanRekomendasi !== undefined) setCatatanRekomendasi(meta.catatanRekomendasi)
      } catch (e) {
        console.warn(e)
      }
    }
  }, [user, role, periode])

  // Saved data from Evaluasi Hasil Kerja and Perilaku
  const [customRealisasiMap, setCustomRealisasiMap] = useState<Record<string, number>>({})
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({})
  const [narrativeRealisasiMap, setNarrativeRealisasiMap] = useState<Record<string, string>>({})
  const [perilakuMap, setPerilakuMap] = useState<Record<number, any>>({})

  useEffect(() => {
    if (!user) return
    const periodeId = periode?.id || '2025'
    try {
      const hkSaved = localStorage.getItem(`evaluasi_hasil_kerja_${user.id}_${periodeId}`)
      if (hkSaved) {
        const parsed = JSON.parse(hkSaved)
        if (parsed.realisasi) setCustomRealisasiMap(parsed.realisasi)
        if (parsed.feedback) setFeedbackMap(parsed.feedback)
        if (parsed.realisasiText) setNarrativeRealisasiMap(parsed.realisasiText)
      }
      const pkSaved = localStorage.getItem(`evaluasi_perilaku_${user.id}_${periodeId}`)
      if (pkSaved) {
        const parsedPk = JSON.parse(pkSaved)
        setPerilakuMap(parsedPk)
      }
    } catch (e) {
      console.warn('Error reading saved evaluasi from localStorage', e)
    }
  }, [user, periode])

  // Evaluasi Hasil Kerja Items (Calculates Nilai Angka: 3 = Diatas, 2 = Sesuai, 1 = Dibawah)
  const hasilKerjaList = useMemo(() => {
    return agreedTasksForSKP.map((task) => {
      const targetNum = Number(task.target) || 100
      const approvedVal = task.capaian_approved ?? task.capaian_realisasi ?? 0
      const realisasiNum = customRealisasiMap[task.id] !== undefined
        ? customRealisasiMap[task.id]
        : approvedVal

      let predikat = 'SESUAI EKSPEKTASI'
      let angka = 2

      if (realisasiNum < targetNum) {
        predikat = 'DIBAWAH EKSPEKTASI'
        angka = 1
      } else if (realisasiNum > targetNum) {
        predikat = 'DIATAS EKSPEKTASI'
        angka = 3
      }

      // Narrative Realisasi (e.g. "4 dokumen telah diunggah ke drive tim pembuatan SIMPAK")
      const narrativeRealisasi = narrativeRealisasiMap[task.id] || 
        `${realisasiNum} ${task.satuan || 'dokumen'} telah terlaksana dan bukti dukung telah diunggah sesuai target`

      // Umpan Balik Berkelanjutan (e.g. "baik dan pengelolaan waktu sudah sesuai dengan jadwal")
      const umpanBalik = feedbackMap[task.id] || 'baik dan pengelolaan waktu sudah sesuai dengan jadwal'

      return {
        id: task.id,
        title: task.title,
        parentTitle: task.parentTitle,
        indikatorKinerja: task.indikatorKinerja || `Terprosesnya ${task.title} diproses 100%`,
        jenisKinerja: (task.jenisKinerja || 'utama') as 'utama' | 'tambahan',
        target: targetNum,
        satuan: task.satuan || 'Dokumen',
        realisasi: realisasiNum,
        narrativeRealisasi,
        umpanBalik,
        predikat,
        angka,
      }
    })
  }, [agreedTasksForSKP, customRealisasiMap, feedbackMap, narrativeRealisasiMap])

  // Separated Utama & Tambahan
  const hasilKerjaUtama = useMemo(() => hasilKerjaList.filter(item => item.jenisKinerja === 'utama'), [hasilKerjaList])
  const hasilKerjaTambahan = useMemo(() => hasilKerjaList.filter(item => item.jenisKinerja === 'tambahan'), [hasilKerjaList])

  // Evaluasi Perilaku Kerja Items (7 Aspek BerAKHLAK)
  const perilakuList = useMemo(() => {
    return ASPEK_BERAKHLAK.map(aspek => {
      const saved = perilakuMap[aspek.id]
      let ratingLabel = 'SESUAI EKSPEKTASI'
      let angka = 2

      if (saved?.rating === 'di_atas_ekspektasi' || saved?.rating === 'diatas_ekspektasi') {
        ratingLabel = 'DIATAS EKSPEKTASI'
        angka = 3
      } else if (saved?.rating === 'di_bawah_ekspektasi' || saved?.rating === 'dibawah_ekspektasi') {
        ratingLabel = 'DIBAWAH EKSPEKTASI'
        angka = 1
      }

      return {
        id: aspek.id,
        nama: aspek.nama,
        panduan: aspek.panduan,
        ekspektasi: saved?.ekspektasi_khusus || aspek.defaultEkspektasi,
        rating: ratingLabel,
        angka,
        umpanBalik: saved?.umpan_balik || 'Sudah baik dan sesuai',
      }
    })
  }, [perilakuMap])

  // Rating Hasil Kerja, Rating Perilaku Kerja & Predikat Kinerja Pegawai
  const predikatEvaluasiAkhir = useMemo(() => {
    // 1. Rating Hasil Kerja
    const totalHK = hasilKerjaList.length
    const countDibawahHK = hasilKerjaList.filter(i => i.angka === 1).length
    const countDiatasHK = hasilKerjaList.filter(i => i.angka === 3).length

    let ratingHasilKerja = 'SESUAI EKSPEKTASI'
    let angkaHK = 2
    if (totalHK > 0) {
      if (countDibawahHK > totalHK / 2) {
        ratingHasilKerja = 'DIBAWAH EKSPEKTASI'
        angkaHK = 1
      } else if (countDiatasHK > countDibawahHK) {
        ratingHasilKerja = 'DIATAS EKSPEKTASI'
        angkaHK = 3
      }
    }

    // 2. Rating Perilaku Kerja
    const totalPK = perilakuList.length
    const countDibawahPK = perilakuList.filter(i => i.angka === 1).length
    const countDiatasPK = perilakuList.filter(i => i.angka === 3).length

    let ratingPerilaku = 'SESUAI EKSPEKTASI'
    let angkaPK = 2
    if (totalPK > 0) {
      if (countDibawahPK > totalPK / 2) {
        ratingPerilaku = 'DIBAWAH EKSPEKTASI'
        angkaPK = 1
      } else if (countDiatasPK > countDibawahPK) {
        ratingPerilaku = 'DIATAS EKSPEKTASI'
        angkaPK = 3
      }
    }

    // 3. Predikat Kinerja Pegawai (PermenPAN-RB No. 6 Tahun 2022)
    let predikatKinerjaPegawai = 'BAIK'
    if (ratingHasilKerja === 'DIATAS EKSPEKTASI' && ratingPerilaku === 'DIATAS EKSPEKTASI') {
      predikatKinerjaPegawai = 'SANGAT BAIK'
    } else if (ratingHasilKerja === 'DIBAWAH EKSPEKTASI' || ratingPerilaku === 'DIBAWAH EKSPEKTASI') {
      predikatKinerjaPegawai = 'BUTUH PERBAIKAN'
    }

    return {
      ratingHasilKerja,
      angkaHK,
      ratingPerilaku,
      angkaPK,
      predikatKinerjaPegawai,
    }
  }, [hasilKerjaList, perilakuList])

  const handlePrint = () => {
    window.print()
  }

  // Save Meta to localStorage
  const handleSaveMeta = () => {
    if (!user) return
    const periodeId = periode?.id || '2025'
    localStorage.setItem(`skp_profiles_${user.id}`, JSON.stringify({
      pegawai: pegawaiProfile,
      penilai: penilaiProfile,
      atasanPenilai: atasanPenilaiProfile,
    }))
    localStorage.setItem(`skp_evaluasi_meta_${user.id}_${periodeId}`, JSON.stringify({
      capaianOrganisasi,
      instansiText,
      kementerianText,
      periodeEvaluasiLabel,
      periodePenilaianText,
      tanggalPenetapan,
      catatanRekomendasi,
    }))
    setIsEditModalOpen(false)
    Swal.fire({
      icon: 'success',
      title: 'Data Berhasil Disimpan',
      text: 'Identitas dan pengaturan dokumen evaluasi SKP telah diperbarui.',
      timer: 1600,
      showConfirmButton: false,
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
          <span className="material-symbols-outlined text-2xl">sync</span>
        </div>
        <p className="text-xs font-medium text-on-surface-variant">Memuat dokumen Evaluasi SKP...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* ── Action Toolbar (Hidden during Print) ── */}
      <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Evaluasi Kinerja</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Cetak Dokumen Evaluasi SKP</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Dokumen Evaluasi SKP (PermenPAN-RB No. 6/2022)
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Dokumen evaluasi kinerja pegawai lengkap dengan Capaian Organisasi, Pola Distribusi, Hasil Kerja, Perilaku Kerja, dan Pengesahan 3 Pihak.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Capaian Organisasi Selector */}
          <div className="flex items-center gap-1.5 bg-blue-50/80 border border-blue-200 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-blue-900 uppercase">Capaian Organisasi:</span>
            <select
              value={capaianOrganisasi}
              onChange={e => setCapaianOrganisasi(e.target.value as CapaianOrganisasiType)}
              className="bg-transparent text-xs font-extrabold text-blue-800 outline-none cursor-pointer"
            >
              <option value="ISTIMEWA">ISTIMEWA (Kurva Kanan)</option>
              <option value="BAIK">BAIK (Kurva Normal Simetris)</option>
              <option value="BUTUH PERBAIKAN">BUTUH PERBAIKAN</option>
              <option value="KURANG">KURANG (Kurva Kiri)</option>
              <option value="SANGAT KURANG">SANGAT KURANG</option>
            </select>
          </div>

          {/* Ubah Identitas Button */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold flex items-center gap-1.5 border border-outline-variant/30 transition-all cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Ubah Data & 3 Pihak
          </button>

          {/* Cetak Button */}
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* ── View Mode Selector (Tabs) ── */}
      <div className="print:hidden flex items-center gap-2 bg-surface-container-low p-1.5 rounded-2xl w-fit border border-outline-variant/30">
        <button
          onClick={() => setViewMode('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            viewMode === 'all'
              ? 'bg-white text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">collections_bookmark</span>
          Semua Halaman (Lengkap)
        </button>
        <button
          onClick={() => setViewMode('formulir')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            viewMode === 'formulir'
              ? 'bg-white text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">table_chart</span>
          Formulir Evaluasi (Landscape)
        </button>
        <button
          onClick={() => setViewMode('dokumen')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            viewMode === 'dokumen'
              ? 'bg-white text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">description</span>
          Dokumen Evaluasi (Portrait - Sampul 3 Pihak)
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── BAGIAN 1: FORMULIR EVALUASI KINERJA PEGAWAI (LANDSCAPE) ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {(viewMode === 'all' || viewMode === 'formulir') && (
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-outline-variant/40 shadow-lg text-black font-sans max-w-[1200px] mx-auto print:p-0 print:border-none print:shadow-none print:max-w-none print:m-0 print:break-after-page">
          
          {/* Header Formulir */}
          <div className="text-center pb-3 space-y-0.5">
            <h1 className="text-sm font-extrabold uppercase tracking-wide">
              EVALUASI KINERJA PEGAWAI
            </h1>
            <h2 className="text-xs font-bold uppercase tracking-wide">
              PENDEKATAN HASIL KERJA KUALITATIF
            </h2>
            <h3 className="text-xs font-bold uppercase tracking-wide">
              BAGI PEJABAT ADMINISTRASI DAN PEJABAT FUNGSIONAL
            </h3>
          </div>

          {/* Meta Sub-header: 3 Kolom */}
          <div className="grid grid-cols-3 text-[11px] font-bold py-1.5 border-b border-black">
            <div className="text-left uppercase">
              {instansiText}
            </div>
            <div className="text-center uppercase">
              {periodeEvaluasiLabel}
            </div>
            <div className="text-right uppercase">
              PERIODE PENILAIAN: {periodePenilaianText}
            </div>
          </div>

          {/* 1. Identitas Table (Pegawai yang dinilai & Pejabat Penilai Kinerja) */}
          <table className="w-full text-[11px] border-collapse border-x border-b border-black mt-2">
            <thead>
              <tr className="bg-[#D9E1F2] font-bold divide-x divide-black border-y border-black text-left">
                <th className="p-1.5 w-10 text-center">NO.</th>
                <th className="p-1.5 w-[46%]">PEGAWAI YANG DINILAI</th>
                <th className="p-1.5 w-10 text-center">NO.</th>
                <th className="p-1.5 w-[46%]">PEJABAT PENILAI KINERJA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black text-[11px]">
              <tr className="divide-x divide-black">
                <td className="p-1 text-center font-bold">1</td>
                <td className="p-1">
                  <div className="grid grid-cols-4 gap-1">
                    <span className="font-semibold text-neutral-800">NAMA</span>
                    <span className="col-span-3 font-bold">: {pegawaiProfile.nama}</span>
                  </div>
                </td>
                <td className="p-1 text-center font-bold">1</td>
                <td className="p-1">
                  <div className="grid grid-cols-4 gap-1">
                    <span className="font-semibold text-neutral-800">NAMA</span>
                    <span className="col-span-3 font-bold">: {penilaiProfile.nama}</span>
                  </div>
                </td>
              </tr>
              <tr className="divide-x divide-black">
                <td className="p-1 text-center font-bold">2</td>
                <td className="p-1">
                  <div className="grid grid-cols-4 gap-1">
                    <span className="font-semibold text-neutral-800">NIP / NPPU</span>
                    <span className="col-span-3 font-mono">: {pegawaiProfile.nip}</span>
                  </div>
                </td>
                <td className="p-1 text-center font-bold">2</td>
                <td className="p-1">
                  <div className="grid grid-cols-4 gap-1">
                    <span className="font-semibold text-neutral-800">NPPU / NIP</span>
                    <span className="col-span-3 font-mono">: {penilaiProfile.nip}</span>
                  </div>
                </td>
              </tr>
              <tr className="divide-x divide-black">
                <td className="p-1 text-center font-bold">3</td>
                <td className="p-1">
                  <div className="grid grid-cols-4 gap-1">
                    <span className="font-semibold text-neutral-800">PANGKAT/GOL. RUANG</span>
                    <span className="col-span-3">: {pegawaiProfile.pangkatGol}</span>
                  </div>
                </td>
                <td className="p-1 text-center font-bold">3</td>
                <td className="p-1">
                  <div className="grid grid-cols-4 gap-1">
                    <span className="font-semibold text-neutral-800">PANGKAT/GOL. RUANG</span>
                    <span className="col-span-3">: {penilaiProfile.pangkatGol}</span>
                  </div>
                </td>
              </tr>
              <tr className="divide-x divide-black">
                <td className="p-1 text-center font-bold">4</td>
                <td className="p-1">
                  <div className="grid grid-cols-4 gap-1">
                    <span className="font-semibold text-neutral-800">JABATAN</span>
                    <span className="col-span-3">: {pegawaiProfile.jabatan}</span>
                  </div>
                </td>
                <td className="p-1 text-center font-bold">4</td>
                <td className="p-1">
                  <div className="grid grid-cols-4 gap-1">
                    <span className="font-semibold text-neutral-800">JABATAN</span>
                    <span className="col-span-3">: {penilaiProfile.jabatan}</span>
                  </div>
                </td>
              </tr>
              <tr className="divide-x divide-black">
                <td className="p-1 text-center font-bold">5</td>
                <td className="p-1">
                  <div className="grid grid-cols-4 gap-1">
                    <span className="font-semibold text-neutral-800">UNIT KERJA</span>
                    <span className="col-span-3">: {pegawaiProfile.unitKerja}</span>
                  </div>
                </td>
                <td className="p-1 text-center font-bold">5</td>
                <td className="p-1">
                  <div className="grid grid-cols-4 gap-1">
                    <span className="font-semibold text-neutral-800">INSTANSI</span>
                    <span className="col-span-3">: {penilaiProfile.unitKerja}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 2. Capaian Kinerja Organisasi & Pola Distribusi */}
          <table className="w-full text-[11px] border-collapse border-x border-b border-black">
            <tbody>
              <tr className="bg-[#D9E1F2] border-y border-black">
                <td colSpan={2} className="p-1.5 font-bold uppercase">
                  CAPAIAN KINERJA ORGANISASI*
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="p-1.5 font-extrabold text-xs">
                  {capaianOrganisasi}
                </td>
              </tr>
              <tr className="bg-[#D9E1F2] border-y border-black">
                <td colSpan={2} className="p-1.5 font-bold uppercase">
                  POLA DISTRIBUSI:
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="p-2">
                  <PolaDistribusiChart capaian={capaianOrganisasi} />
                </td>
              </tr>
            </tbody>
          </table>

          {/* 3. Tabel HASIL KERJA */}
          <table className="w-full text-[11px] border-collapse border border-black mt-2 text-left">
            <thead>
              <tr className="border-b border-black text-left">
                <th colSpan={2} className="p-2 border-r border-black font-bold uppercase w-[38%]">
                  HASIL KERJA
                </th>
                <th className="p-2 border-r border-black font-bold uppercase w-[22%] text-center">
                  REALISASI BERDASARKAN BUKTI DUKUNG
                </th>
                <th className="p-2 border-r border-black font-bold uppercase w-[22%] text-center">
                  UMPAN BALIK BERKELANJUTAN BERDASARKAN BUKTI DUKUNG
                </th>
                <th className="p-2 border-r border-black font-bold text-center bg-[#C8E6C9] w-[13%]">
                  <div>HASIL KERJA</div>
                  <div className="text-[9px] font-normal leading-tight mt-0.5">
                    1-Dibawah Ekspektasi<br />
                    2- Sesuai Ekspektasi<br />
                    3- diatas Ekspektasi
                  </div>
                </th>
                <th className="p-2 font-bold text-center bg-[#C8E6C9] w-[5%]">
                  Angka
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {/* Kinerja Utama Header */}
              <tr className="bg-neutral-100 font-bold border-y border-black">
                <td colSpan={6} className="p-1.5">
                  A. UTAMA
                </td>
              </tr>

              {hasilKerjaUtama.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-3 text-center italic text-neutral-500">
                    Belum ada data rencana hasil kerja utama.
                  </td>
                </tr>
              ) : (
                hasilKerjaUtama.map((item, idx) => (
                  <tr key={item.id} className="divide-x divide-black align-top">
                    <td className="p-1.5 text-center font-bold w-8">{idx + 1}</td>
                    <td className="p-1.5">
                      <p className="font-bold">{item.title}</p>
                      <p className="text-[10px] text-neutral-700 mt-1 leading-snug">
                        <span className="font-semibold">Ukuran keberhasilan/ Indikator Kinerja Individu, Target, dan Perspektif :</span>{' '}
                        {item.indikatorKinerja}
                      </p>
                    </td>
                    <td className="p-1.5 text-[10.5px]">
                      {item.narrativeRealisasi}
                    </td>
                    <td className="p-1.5 text-[10.5px]">
                      {item.umpanBalik}
                    </td>
                    <td className="p-1.5 text-center font-bold bg-[#FFFF00] text-[10.5px] align-middle">
                      {item.predikat}
                    </td>
                    <td className="p-1.5 text-center font-bold bg-[#FFFF00] text-xs align-middle">
                      {item.angka}
                    </td>
                  </tr>
                ))
              )}

              {/* Kinerja Tambahan Header (Jika Ada) */}
              {hasilKerjaTambahan.length > 0 && (
                <>
                  <tr className="bg-neutral-100 font-bold border-y border-black">
                    <td colSpan={6} className="p-1.5">
                      B. TAMBAHAN
                    </td>
                  </tr>
                  {hasilKerjaTambahan.map((item, idx) => (
                    <tr key={item.id} className="divide-x divide-black align-top">
                      <td className="p-1.5 text-center font-bold w-8">{idx + 1}</td>
                      <td className="p-1.5">
                        <p className="font-bold">{item.title}</p>
                        <p className="text-[10px] text-neutral-700 mt-1 leading-snug">
                          <span className="font-semibold">Ukuran keberhasilan/ Indikator Kinerja Individu, Target, dan Perspektif :</span>{' '}
                          {item.indikatorKinerja}
                        </p>
                      </td>
                      <td className="p-1.5 text-[10.5px]">
                        {item.narrativeRealisasi}
                      </td>
                      <td className="p-1.5 text-[10.5px]">
                        {item.umpanBalik}
                      </td>
                      <td className="p-1.5 text-center font-bold bg-[#FFFF00] text-[10.5px] align-middle">
                        {item.predikat}
                      </td>
                      <td className="p-1.5 text-center font-bold bg-[#FFFF00] text-xs align-middle">
                        {item.angka}
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {/* Rating Hasil Kerja Footer */}
              <tr className="border-t-2 border-black divide-x divide-black">
                <td colSpan={3} className="p-2 bg-[#D9E1F2]">
                  <p className="font-bold uppercase text-[11px]">RATING HASIL KERJA*</p>
                  <p className="font-black text-xs uppercase mt-0.5">{predikatEvaluasiAkhir.ratingHasilKerja}</p>
                </td>
                <td className="p-2 text-right font-bold align-middle">
                  Rekomendasi
                </td>
                <td className="p-2 text-center font-bold bg-[#FFFF00] text-xs uppercase align-middle">
                  {predikatEvaluasiAkhir.ratingHasilKerja}
                </td>
                <td className="p-2 text-center font-black bg-[#FFFF00] text-xs align-middle">
                  {predikatEvaluasiAkhir.angkaHK}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 4. Tabel PERILAKU KERJA (BerAKHLAK) */}
          <table className="w-full text-[11px] border-collapse border border-black mt-4 text-left">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="p-2 border-r border-black font-bold uppercase w-8 text-center">NO</th>
                <th className="p-2 border-r border-black font-bold uppercase w-[35%]">
                  PERILAKU KERJA
                </th>
                <th className="p-2 border-r border-black font-bold uppercase w-[23%]">
                  Ekspektasi Khusus Pimpinan
                </th>
                <th className="p-2 border-r border-black font-bold uppercase w-[21%]">
                  UMPAN BALIK BERKELANJUTAN
                </th>
                <th className="p-2 border-r border-black font-bold text-center bg-[#C8E6C9] w-[13%]">
                  HASIL
                </th>
                <th className="p-2 font-bold text-center bg-[#C8E6C9] w-[5%]">
                  Angka
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {perilakuList.map((aspek, idx) => (
                <tr key={aspek.id} className="divide-x divide-black align-top">
                  <td className="p-1.5 text-center font-bold">{idx + 1}</td>
                  <td className="p-1.5">
                    <p className="font-bold capitalize">{aspek.nama}</p>
                    <ul className="text-[10px] text-neutral-700 list-disc pl-4 space-y-0.5 mt-0.5">
                      {aspek.panduan.map((p, pIdx) => (
                        <li key={pIdx}>{p}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-1.5 text-[10.5px]">
                    <span className="font-semibold block text-[10px] text-neutral-600 mb-0.5">Ekspektasi Khusus Pimpinan:</span>
                    {aspek.ekspektasi}
                  </td>
                  <td className="p-1.5 text-[10.5px]">
                    {aspek.umpanBalik}
                  </td>
                  <td className="p-1.5 text-center font-bold bg-[#FFFF00] text-[10.5px] align-middle">
                    {aspek.rating}
                  </td>
                  <td className="p-1.5 text-center font-bold bg-[#FFFF00] text-xs align-middle">
                    {aspek.angka}
                  </td>
                </tr>
              ))}

              {/* Rating Perilaku Kerja Footer */}
              <tr className="border-t-2 border-black divide-x divide-black">
                <td colSpan={3} className="p-2 bg-[#D9E1F2]">
                  <p className="font-bold uppercase text-[11px]">RATING PERILAKU KERJA*</p>
                  <p className="font-black text-xs uppercase mt-0.5">{predikatEvaluasiAkhir.ratingPerilaku}</p>
                </td>
                <td className="p-2 text-right font-bold align-middle">
                  Rekomendasi
                </td>
                <td className="p-2 text-center font-bold bg-[#FFFF00] text-xs uppercase align-middle">
                  {predikatEvaluasiAkhir.ratingPerilaku}
                </td>
                <td className="p-2 text-center font-black bg-[#FFFF00] text-xs align-middle">
                  {predikatEvaluasiAkhir.angkaPK}
                </td>
              </tr>

              {/* Predikat Kinerja Pegawai */}
              <tr className="border-t border-black">
                <td colSpan={6} className="p-2 bg-[#D9E1F2]">
                  <p className="font-bold uppercase text-[11px]">PREDIKAT KINERJA PEGAWAI*</p>
                  <p className="font-black text-sm uppercase mt-0.5 tracking-wider">{predikatEvaluasiAkhir.predikatKinerjaPegawai}</p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tanda Tangan Pejabat Penilai Kinerja (Kanan Bawah Sesuai PDF Hal 3) */}
          <div className="mt-8 flex justify-end">
            <div className="text-center text-xs min-w-[280px] space-y-16">
              <div>
                <p>{tanggalPenetapan}</p>
                <p className="font-semibold">Pejabat Penilai Kinerja</p>
              </div>
              <div>
                <p className="font-extrabold underline text-sm">{penilaiProfile.nama}</p>
                <p className="font-mono mt-0.5">NPPU / NIP. {penilaiProfile.nip}</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── BAGIAN 2: DOKUMEN EVALUASI KINERJA PEGAWAI (PORTRAIT - HAL 4) ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {(viewMode === 'all' || viewMode === 'dokumen') && (
        <div className={`bg-white p-8 sm:p-14 rounded-3xl border border-outline-variant/40 shadow-lg text-black font-sans max-w-[850px] mx-auto print:p-0 print:border-none print:shadow-none print:max-w-none print:m-0 ${
          viewMode === 'all' ? 'mt-10 print:break-before-page' : ''
        }`}>
          
          {/* Lambang Garuda Pancasila */}
          <div className="text-center mb-3">
            <div className="w-20 h-20 mx-auto relative flex items-center justify-center">
              <img
                src="/images/garuda.webp"
                alt="Lambang Garuda Pancasila"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Judul Dokumen */}
          <div className="text-center space-y-0.5 pb-4">
            <h1 className="text-sm font-extrabold uppercase tracking-wide">
              DOKUMEN EVALUASI KINERJA PEGAWAI
            </h1>
            <p className="text-[11px] font-bold text-neutral-800 uppercase">
              {periodeEvaluasiLabel}
            </p>
          </div>

          {/* Header Box 2 Kolom (Kementerian & Periode Penilaian) */}
          <table className="w-full text-xs border-collapse border border-black mb-0">
            <tbody>
              <tr className="divide-x divide-black">
                <td className="p-2 w-1/2 font-bold uppercase leading-tight">
                  {kementerianText}
                </td>
                <td className="p-2 w-1/2 font-bold uppercase leading-tight">
                  PERIODE PENILAIAN:<br />
                  <span className="font-normal">{periodePenilaianText}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tabel 3 Pihak & Evaluasi Kinerja */}
          <table className="w-full text-xs border-collapse border-x border-b border-black">
            <tbody>
              
              {/* 1. PEGAWAI YANG DINILAI */}
              <tr className="bg-neutral-100 border-t border-b border-black">
                <td className="p-1.5 w-8 font-bold text-center">1</td>
                <td colSpan={2} className="p-1.5 font-bold uppercase">
                  PEGAWAI YANG DINILAI
                </td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 w-44 font-semibold text-neutral-800">NAMA</td>
                <td className="p-1.5 font-bold">: {pegawaiProfile.nama}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">NPPU / NIP</td>
                <td className="p-1.5 font-mono">: {pegawaiProfile.nip}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">PANGKAT/GOL. RUANG</td>
                <td className="p-1.5">: {pegawaiProfile.pangkatGol}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">JABATAN</td>
                <td className="p-1.5">: {pegawaiProfile.jabatan}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">UNIT KERJA</td>
                <td className="p-1.5">: {pegawaiProfile.unitKerja}</td>
              </tr>

              {/* 2. PEJABAT PENILAI KINERJA */}
              <tr className="bg-neutral-100 border-t border-b border-black">
                <td className="p-1.5 w-8 font-bold text-center">2</td>
                <td colSpan={2} className="p-1.5 font-bold uppercase">
                  PEJABAT PENILAI KINERJA
                </td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">NAMA</td>
                <td className="p-1.5 font-bold">: {penilaiProfile.nama}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">NPPU / NIP</td>
                <td className="p-1.5 font-mono">: {penilaiProfile.nip}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">PANGKAT/GOL. RUANG</td>
                <td className="p-1.5">: {penilaiProfile.pangkatGol}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">JABATAN</td>
                <td className="p-1.5">: {penilaiProfile.jabatan}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">UNIT KERJA</td>
                <td className="p-1.5">: {penilaiProfile.unitKerja}</td>
              </tr>

              {/* 3. ATASAN PEJABAT PENILAI KINERJA */}
              <tr className="bg-neutral-100 border-t border-b border-black">
                <td className="p-1.5 w-8 font-bold text-center">3</td>
                <td colSpan={2} className="p-1.5 font-bold uppercase">
                  ATASAN PEJABAT PENILAI KINERJA
                </td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">NAMA</td>
                <td className="p-1.5 font-bold">: {atasanPenilaiProfile.nama}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">NIP</td>
                <td className="p-1.5 font-mono">: {atasanPenilaiProfile.nip}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">PANGKAT/GOL. RUANG</td>
                <td className="p-1.5">: {atasanPenilaiProfile.pangkatGol}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">JABATAN</td>
                <td className="p-1.5">: {atasanPenilaiProfile.jabatan}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">UNIT KERJA</td>
                <td className="p-1.5">: {atasanPenilaiProfile.unitKerja}</td>
              </tr>

              {/* 4. EVALUASI KINERJA */}
              <tr className="bg-neutral-100 border-t border-b border-black">
                <td className="p-1.5 w-8 font-bold text-center">4</td>
                <td colSpan={2} className="p-1.5 font-bold uppercase">
                  EVALUASI KINERJA
                </td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">CAPAIAN KINERJA ORGANISASI</td>
                <td className="p-1.5 font-extrabold">: {capaianOrganisasi}</td>
              </tr>
              <tr className="border-b border-black">
                <td></td>
                <td className="p-1.5 font-semibold text-neutral-800">PREDIKAT KINERJA PEGAWAI</td>
                <td className="p-1.5 font-extrabold">: {predikatEvaluasiAkhir.predikatKinerjaPegawai}</td>
              </tr>

              {/* 5. CATATAN / REKOMENDASI */}
              <tr className="bg-neutral-100 border-t border-b border-black">
                <td className="p-1.5 w-8 font-bold text-center">5</td>
                <td colSpan={2} className="p-1.5 font-bold uppercase">
                  CATATAN/ REKOMENDASI
                </td>
              </tr>
              <tr>
                <td></td>
                <td colSpan={2} className="p-2 min-h-[50px] italic text-neutral-700">
                  {catatanRekomendasi || '-'}
                </td>
              </tr>

            </tbody>
          </table>

          {/* Tanda Tangan Lembar Dokumen Evaluasi (Kiri: Pegawai, Kanan: Pejabat Penilai Kinerja) */}
          <div className="mt-12 pt-4">
            <div className="grid grid-cols-2 text-xs text-center gap-6">
              
              {/* Kiri: Pegawai yang dinilai */}
              <div className="space-y-16">
                <div>
                  <p>7. {tanggalPenetapan}</p>
                  <p className="font-semibold">Pegawai yang dinilai</p>
                </div>
                <div>
                  <p className="font-extrabold underline text-sm">{pegawaiProfile.nama}</p>
                  <p className="font-mono mt-0.5">NPPU / NIP. {pegawaiProfile.nip}</p>
                </div>
              </div>

              {/* Kanan: Pejabat Penilai Kinerja */}
              <div className="space-y-16">
                <div>
                  <p>6. {tanggalPenetapan}</p>
                  <p className="font-semibold">Pejabat Penilai Kinerja,</p>
                </div>
                <div>
                  <p className="font-extrabold underline text-sm">{penilaiProfile.nama}</p>
                  <p className="font-mono mt-0.5">NPPU / NIP. {penilaiProfile.nip}</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ── MODAL: Ubah Identitas Pegawai / Atasan / Atasan Pejabat Penilai / Capaian ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-5 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-lg">badge</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Sesuaikan Data Dokumen Evaluasi SKP</h3>
                  <p className="text-[11px] text-on-surface-variant">Ubah Capaian Organisasi, Data 3 Pihak, dan Informasi Periode Penilaian</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-outline hover:text-on-surface p-1 rounded-lg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-5 text-xs">
              
              {/* Pengaturan Capaian Organisasi */}
              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                <p className="font-bold text-blue-950 uppercase tracking-wider text-[11px]">Capaian Kinerja Organisasi (Setting Admin)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-blue-900 font-semibold mb-1">Status Capaian Organisasi</label>
                    <select
                      value={capaianOrganisasi}
                      onChange={e => setCapaianOrganisasi(e.target.value as CapaianOrganisasiType)}
                      className="w-full bg-white border border-blue-300 rounded-xl px-3 py-1.5 font-bold text-blue-900"
                    >
                      <option value="ISTIMEWA">ISTIMEWA (Kurva Condong Kanan - Sangat Baik)</option>
                      <option value="BAIK">BAIK (Kurva Normal Simetris - Puncak di Baik)</option>
                      <option value="BUTUH PERBAIKAN">BUTUH PERBAIKAN (Puncak di Butuh Perbaikan)</option>
                      <option value="KURANG">KURANG (Kurva Condong Kiri - Puncak di Kurang)</option>
                      <option value="SANGAT KURANG">SANGAT KURANG (Puncak di Sangat Kurang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-blue-900 font-semibold mb-1">Catatan / Rekomendasi Organisasi</label>
                    <input
                      type="text"
                      value={catatanRekomendasi}
                      onChange={e => setCatatanRekomendasi(e.target.value)}
                      placeholder="Masukkan catatan / rekomendasi evaluasi"
                      className="w-full bg-white border border-blue-300 rounded-xl px-3 py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* 1. Pegawai Dinilai */}
              <div className="p-4 bg-surface-container-low rounded-2xl space-y-3">
                <p className="font-bold text-primary uppercase tracking-wider text-[11px]">1. Identitas Pegawai yang Dinilai</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-outline font-semibold mb-1">Nama Lengkap & Gelar</label>
                    <input
                      type="text"
                      value={pegawaiProfile.nama}
                      onChange={e => setPegawaiProfile({ ...pegawaiProfile, nama: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-semibold mb-1">NIP / NPPU</label>
                    <input
                      type="text"
                      value={pegawaiProfile.nip}
                      onChange={e => setPegawaiProfile({ ...pegawaiProfile, nip: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-semibold mb-1">Pangkat / Golongan Ruang</label>
                    <input
                      type="text"
                      value={pegawaiProfile.pangkatGol}
                      onChange={e => setPegawaiProfile({ ...pegawaiProfile, pangkatGol: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-semibold mb-1">Jabatan</label>
                    <input
                      type="text"
                      value={pegawaiProfile.jabatan}
                      onChange={e => setPegawaiProfile({ ...pegawaiProfile, jabatan: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-outline font-semibold mb-1">Unit Kerja</label>
                    <input
                      type="text"
                      value={pegawaiProfile.unitKerja}
                      onChange={e => setPegawaiProfile({ ...pegawaiProfile, unitKerja: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Pejabat Penilai Kinerja (Atasan Langsung) */}
              <div className="p-4 bg-surface-container-low rounded-2xl space-y-3">
                <p className="font-bold text-primary uppercase tracking-wider text-[11px]">2. Identitas Pejabat Penilai Kinerja (Atasan Langsung)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-outline font-semibold mb-1">Nama Lengkap Atasan</label>
                    <input
                      type="text"
                      value={penilaiProfile.nama}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, nama: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-semibold mb-1">NIP / NPPU</label>
                    <input
                      type="text"
                      value={penilaiProfile.nip}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, nip: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-semibold mb-1">Pangkat / Golongan</label>
                    <input
                      type="text"
                      value={penilaiProfile.pangkatGol}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, pangkatGol: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-semibold mb-1">Jabatan</label>
                    <input
                      type="text"
                      value={penilaiProfile.jabatan}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, jabatan: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-outline font-semibold mb-1">Unit Kerja / Instansi</label>
                    <input
                      type="text"
                      value={penilaiProfile.unitKerja}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, unitKerja: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Atasan Pejabat Penilai Kinerja */}
              <div className="p-4 bg-surface-container-low rounded-2xl space-y-3">
                <p className="font-bold text-primary uppercase tracking-wider text-[11px]">3. Identitas Atasan Pejabat Penilai Kinerja</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-outline font-semibold mb-1">Nama Atasan Pejabat Penilai</label>
                    <input
                      type="text"
                      value={atasanPenilaiProfile.nama}
                      onChange={e => setAtasanPenilaiProfile({ ...atasanPenilaiProfile, nama: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-semibold mb-1">NIP</label>
                    <input
                      type="text"
                      value={atasanPenilaiProfile.nip}
                      onChange={e => setAtasanPenilaiProfile({ ...atasanPenilaiProfile, nip: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-semibold mb-1">Pangkat / Golongan</label>
                    <input
                      type="text"
                      value={atasanPenilaiProfile.pangkatGol}
                      onChange={e => setAtasanPenilaiProfile({ ...atasanPenilaiProfile, pangkatGol: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-semibold mb-1">Jabatan</label>
                    <input
                      type="text"
                      value={atasanPenilaiProfile.jabatan}
                      onChange={e => setAtasanPenilaiProfile({ ...atasanPenilaiProfile, jabatan: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-outline font-semibold mb-1">Unit Kerja</label>
                    <input
                      type="text"
                      value={atasanPenilaiProfile.unitKerja}
                      onChange={e => setAtasanPenilaiProfile({ ...atasanPenilaiProfile, unitKerja: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Tanggal, Instansi, & Teks Periode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline font-semibold mb-1">Instansi / Universitas</label>
                  <input
                    type="text"
                    value={instansiText}
                    onChange={e => setInstansiText(e.target.value)}
                    className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-outline font-semibold mb-1">Kementerian</label>
                  <input
                    type="text"
                    value={kementerianText}
                    onChange={e => setKementerianText(e.target.value)}
                    className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-outline font-semibold mb-1">Label Periode</label>
                  <input
                    type="text"
                    value={periodeEvaluasiLabel}
                    onChange={e => setPeriodeEvaluasiLabel(e.target.value)}
                    className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-outline font-semibold mb-1">Rentang Tanggal Penilaian</label>
                  <input
                    type="text"
                    value={periodePenilaianText}
                    onChange={e => setPeriodePenilaianText(e.target.value)}
                    className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-outline font-semibold mb-1">Tempat & Tanggal Penetapan Tanda Tangan</label>
                  <input
                    type="text"
                    value={tanggalPenetapan}
                    onChange={e => setTanggalPenetapan(e.target.value)}
                    className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                onClick={handleSaveMeta}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 cursor-pointer"
              >
                Simpan & Terapkan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
