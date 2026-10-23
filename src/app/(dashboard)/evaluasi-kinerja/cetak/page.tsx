'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useCascading } from '@/context/CascadingContext'
import { ROLE_LABELS, UserRole } from '@/lib/types'
import { ASPEK_BERAKHLAK } from '@/lib/constants/perilakuKerja'
import { ProfileSKP } from '@/lib/constants/skpTemplateRifki'
import Swal from 'sweetalert2'

export default function CetakDokumenEvaluasiSKPPage() {
  const {
    user,
    role,
    periode,
    isLoading,
    agreedTasksForSKP,
  } = useCascading()

  // Periode Evaluasi state
  const [periodeText, setPeriodeText] = useState('1 Januari 2026 s.d. 31 Desember 2026')
  const [tanggalPenetapan, setTanggalPenetapan] = useState('Semarang, 31 Desember 2026')

  // Identitas Pegawai Yang Dinilai (Data Riil)
  const [pegawaiProfile, setPegawaiProfile] = useState<ProfileSKP>(() => ({
    nama: user?.pegawai?.nama_lengkap || user?.email || '-',
    nip: user?.pegawai?.nip || '-',
    pangkatGol: user?.pegawai?.pangkat_golongan || '-',
    jabatan: user?.pegawai?.jabatan || (role ? ROLE_LABELS[role] : '-'),
    unitKerja: user?.pegawai?.unit_es2 || '-',
  }))

  // Identitas Pejabat Penilai Kinerja (Atasan Langsung)
  const [penilaiProfile, setPenilaiProfile] = useState<ProfileSKP>(() => ({
    nama: 'Pejabat Penilai Kinerja',
    nip: '-',
    pangkatGol: '-',
    jabatan: 'Atasan Langsung',
    unitKerja: user?.pegawai?.unit_es2 || '-',
  }))

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Auto-detect profile from user and superior
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

    const firstAssignedByUser = agreedTasksForSKP.find(t => t.assignedByUser)?.assignedByUser
    if (firstAssignedByUser?.pegawai) {
      setPenilaiProfile({
        nama: firstAssignedByUser.pegawai.nama_lengkap || firstAssignedByUser.email || '-',
        nip: firstAssignedByUser.pegawai.nip || '-',
        pangkatGol: firstAssignedByUser.pegawai.pangkat_golongan || '-',
        jabatan: firstAssignedByUser.pegawai.jabatan || ROLE_LABELS[firstAssignedByUser.role as UserRole] || 'Atasan Langsung',
        unitKerja: firstAssignedByUser.pegawai.unit_es2 || user.pegawai?.unit_es2 || '-',
      })
    }
  }, [user, role, agreedTasksForSKP])

  // Saved data from Evaluasi Hasil Kerja and Perilaku
  const [customRealisasiMap, setCustomRealisasiMap] = useState<Record<string, number>>({})
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({})
  const [perilakuMap, setPerilakuMap] = useState<Record<number, any>>({})

  useEffect(() => {
    if (!user) return
    const periodeId = periode?.id || '2026'
    try {
      const hkSaved = localStorage.getItem(`evaluasi_hasil_kerja_${user.id}_${periodeId}`)
      if (hkSaved) {
        const parsed = JSON.parse(hkSaved)
        if (parsed.realisasi) setCustomRealisasiMap(parsed.realisasi)
        if (parsed.feedback) setFeedbackMap(parsed.feedback)
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

  // Evaluasi Hasil Kerja Items (Pure Real Data)
  const hasilKerjaList = useMemo(() => {
    return agreedTasksForSKP.map((task) => {
      const targetNum = Number(task.target) || 100
      const approvedVal = task.capaian_approved ?? task.capaian_realisasi ?? 0
      const realisasiNum = customRealisasiMap[task.id] !== undefined
        ? customRealisasiMap[task.id]
        : approvedVal
      const pct = targetNum > 0 ? Math.round((realisasiNum / targetNum) * 100) : 0
      let predikat = 'Sesuai Ekspektasi'
      if (realisasiNum < targetNum) predikat = 'Dibawah Ekspektasi'
      else if (realisasiNum > targetNum) predikat = 'Diatas Ekspektasi'

      return {
        id: task.id,
        title: task.title,
        parentTitle: task.parentTitle || 'Sasaran Strategis Universitas Diponegoro',
        indikatorKinerja: task.indikatorKinerja || `Tercapainya target ${task.title} diproses 100%`,
        jenisKinerja: task.jenisKinerja || 'utama',
        target: targetNum,
        satuan: task.satuan || 'Dokumen',
        realisasi: realisasiNum,
        persentase: pct,
        predikat,
        umpanBalik: feedbackMap[task.id] || 'Bukti dukung lengkap dan sesuai target rencana kerja berkala.',
      }
    })
  }, [agreedTasksForSKP, customRealisasiMap, feedbackMap])

  // Evaluasi Perilaku Kerja Items
  const perilakuList = useMemo(() => {
    return ASPEK_BERAKHLAK.map(aspek => {
      const saved = perilakuMap[aspek.id]
      const ratingLabel = saved?.rating === 'diatas_ekspektasi'
        ? 'Diatas Ekspektasi'
        : saved?.rating === 'dibawah_ekspektasi'
        ? 'Dibawah Ekspektasi'
        : 'Sesuai Ekspektasi'

      return {
        id: aspek.id,
        nama: aspek.nama,
        definisi: aspek.tagline,
        panduan: aspek.panduan,
        ekspektasi: saved?.ekspektasi_khusus || aspek.defaultEkspektasi,
        rating: ratingLabel,
        umpanBalik: saved?.umpan_balik || 'Menunjukkan komitmen dan integritas yang konsisten dalam bekerja.',
      }
    })
  }, [perilakuMap])

  // Predikat Akhir Perhitungan (Hasil Kerja x Perilaku)
  const predikatEvaluasiAkhir = useMemo(() => {
    // Hasil Kerja
    const totalHK = hasilKerjaList.length
    const countDibawahHK = hasilKerjaList.filter(i => i.predikat === 'Dibawah Ekspektasi').length
    const countDiatasHK = hasilKerjaList.filter(i => i.predikat === 'Diatas Ekspektasi').length

    let ratingHasilKerja: string = 'Sesuai Ekspektasi'
    if (totalHK > 0) {
      if (countDibawahHK > totalHK / 2) ratingHasilKerja = 'Dibawah Ekspektasi'
      else if (countDiatasHK > countDibawahHK) ratingHasilKerja = 'Diatas Ekspektasi'
    }

    // Perilaku Kerja
    const totalPK = perilakuList.length
    const countDibawahPK = perilakuList.filter(i => i.rating === 'Dibawah Ekspektasi').length
    const countDiatasPK = perilakuList.filter(i => i.rating === 'Diatas Ekspektasi').length

    let ratingPerilaku: string = 'Sesuai Ekspektasi'
    if (totalPK > 0) {
      if (countDibawahPK > totalPK / 2) ratingPerilaku = 'Dibawah Ekspektasi'
      else if (countDiatasPK > countDibawahPK) ratingPerilaku = 'Diatas Ekspektasi'
    }

    // Kuadran Kinerja
    let predikatKinerjaPegawai = 'BAIK'
    if (ratingHasilKerja === 'Diatas Ekspektasi' && ratingPerilaku === 'Diatas Ekspektasi') {
      predikatKinerjaPegawai = 'SANGAT BAIK'
    } else if (ratingHasilKerja === 'Dibawah Ekspektasi' || ratingPerilaku === 'Dibawah Ekspektasi') {
      predikatKinerjaPegawai = 'BUTUH PERBAIKAN'
    }

    return {
      ratingHasilKerja,
      ratingPerilaku,
      predikatKinerjaPegawai,
    }
  }, [hasilKerjaList, perilakuList])

  const handlePrint = () => {
    window.print()
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
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Evaluasi Kinerja</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Cetak Dokumen Evaluasi SKP</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Pratinjau & Cetak Dokumen Evaluasi SKP
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Format resmi Dokumen Evaluasi Kinerja Pegawai berdasarkan PermenPAN-RB No. 6 Tahun 2022.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold flex items-center gap-1.5 border border-outline-variant/30 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Ubah Identitas Pegawai / Atasan
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Cetak Dokumen / Simpan PDF
          </button>
        </div>
      </div>

      {/* ── Banner: Dokumen Template Resmi ── */}
      <div className="print:hidden p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-3">
        <span className="material-symbols-outlined text-xl text-amber-600 flex-shrink-0">info</span>
        <div>
          <span className="font-bold text-amber-950">Informasi Format Dokumen Evaluasi:</span>
          <p className="text-amber-800 mt-0.5">
            Halaman ini menampilkan pratinjau Dokumen Evaluasi Kinerja Pegawai berstandar nasional. Format layout akan kami sesuaikan secara presisi begitu contoh dokumen evaluasi resmi dari Anda telah dikirimkan.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── PRINTABLE SHEET CONTAINER (A4 Standard Form Layout) ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-8 sm:p-12 md:p-16 rounded-3xl border border-outline-variant/40 shadow-lg text-black font-sans max-w-5xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-none print:m-0">
        
        {/* Document Header */}
        <div className="text-center pb-6 border-b-2 border-black space-y-1">
          <h3 className="text-xs uppercase tracking-wider font-semibold">
            KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI
          </h3>
          <h2 className="text-sm font-extrabold tracking-wide uppercase">
            UNIVERSITAS DIPONEGORO
          </h2>
          <h1 className="text-base font-black uppercase pt-2 tracking-tight">
            DOKUMEN EVALUASI KINERJA PEGAWAI
          </h1>
          <p className="text-xs font-semibold text-neutral-800">
            PERIODE: {periodeText.toUpperCase()}
          </p>
        </div>

        {/* Section 1: Identitas Pegawai & Pejabat Penilai Kinerja */}
        <div className="mt-6 border border-black">
          <div className="grid grid-cols-2 text-xs divide-x divide-black">
            {/* Pegawai Dinilai */}
            <div>
              <div className="bg-neutral-100 p-2 font-bold uppercase border-b border-black text-center">
                1. PEGAWAI YANG DINILAI
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-neutral-600">Nama</span>
                  <span className="col-span-2 font-bold">: {pegawaiProfile.nama}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-neutral-600">NIP</span>
                  <span className="col-span-2 font-mono font-medium">: {pegawaiProfile.nip}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-neutral-600">Pangkat / Gol.</span>
                  <span className="col-span-2">: {pegawaiProfile.pangkatGol}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-neutral-600">Jabatan</span>
                  <span className="col-span-2">: {pegawaiProfile.jabatan}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-neutral-600">Unit Kerja</span>
                  <span className="col-span-2">: {pegawaiProfile.unitKerja}</span>
                </div>
              </div>
            </div>

            {/* Pejabat Penilai Kinerja */}
            <div>
              <div className="bg-neutral-100 p-2 font-bold uppercase border-b border-black text-center">
                2. PEJABAT PENILAI KINERJA
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-neutral-600">Nama</span>
                  <span className="col-span-2 font-bold">: {penilaiProfile.nama}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-neutral-600">NIP</span>
                  <span className="col-span-2 font-mono font-medium">: {penilaiProfile.nip}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-neutral-600">Pangkat / Gol.</span>
                  <span className="col-span-2">: {penilaiProfile.pangkatGol}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-neutral-600">Jabatan</span>
                  <span className="col-span-2">: {penilaiProfile.jabatan}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-neutral-600">Unit Kerja</span>
                  <span className="col-span-2">: {penilaiProfile.unitKerja}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Evaluasi Hasil Kerja Table */}
        <div className="mt-8 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wide">
              I. HASIL KERJA
            </h4>
            <span className="text-[11px] font-semibold text-neutral-600">
              Kategori Hasil Kerja: <strong>{predikatEvaluasiAkhir.ratingHasilKerja.toUpperCase()}</strong>
            </span>
          </div>

          <table className="w-full text-[11px] border-collapse border border-black text-left">
            <thead>
              <tr className="bg-neutral-100 text-center font-bold divide-x divide-black border-b border-black">
                <th className="p-2 w-8">No</th>
                <th className="p-2 w-1/4">Rencana Kinerja & Indikator</th>
                <th className="p-2 w-16">Target</th>
                <th className="p-2 w-16">Realisasi</th>
                <th className="p-2 w-14">Capaian (%)</th>
                <th className="p-2 w-28">Kategori Evaluasi</th>
                <th className="p-2">Umpan Balik Berkala Berdasarkan Bukti Dukung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {hasilKerjaList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center italic text-neutral-500 text-xs">
                    Belum ada rencana hasil kerja yang disepakati untuk periode ini.
                  </td>
                </tr>
              ) : (
                hasilKerjaList.map((item, idx) => (
                  <tr key={item.id} className="divide-x divide-black align-top">
                    <td className="p-2 text-center font-bold">{idx + 1}</td>
                    <td className="p-2">
                      <p className="font-bold">{item.title}</p>
                      {item.indikatorKinerja && (
                        <p className="text-[10px] text-neutral-600 mt-0.5">
                          Indikator: {item.indikatorKinerja}
                        </p>
                      )}
                    </td>
                    <td className="p-2 text-center font-semibold">{item.target} {item.satuan}</td>
                    <td className="p-2 text-center font-bold">{item.realisasi} {item.satuan}</td>
                    <td className="p-2 text-center font-bold">{item.persentase}%</td>
                    <td className="p-2 text-center font-bold">
                      <span className="px-1.5 py-0.5 rounded text-[10px]">
                        {item.predikat}
                      </span>
                    </td>
                    <td className="p-2 italic text-neutral-800">
                      "{item.umpanBalik}"
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Section 3: Evaluasi Perilaku Kerja Table */}
        <div className="mt-8 space-y-2 page-break-inside-avoid">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wide">
              II. PERILAKU KERJA (BerAKHLAK)
            </h4>
            <span className="text-[11px] font-semibold text-neutral-600">
              Kategori Perilaku: <strong>{predikatEvaluasiAkhir.ratingPerilaku.toUpperCase()}</strong>
            </span>
          </div>

          <table className="w-full text-[11px] border-collapse border border-black text-left">
            <thead>
              <tr className="bg-neutral-100 text-center font-bold divide-x divide-black border-b border-black">
                <th className="p-2 w-8">No</th>
                <th className="p-2 w-1/4">Nilai Dasar ASN</th>
                <th className="p-2 w-1/3">Ekspektasi Khusus Pimpinan</th>
                <th className="p-2 w-28">Rating Perilaku</th>
                <th className="p-2">Umpan Balik Berkala Berdasarkan Bukti Dukung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {perilakuList.map((aspek, idx) => (
                <tr key={aspek.id} className="divide-x divide-black align-top">
                  <td className="p-2 text-center font-bold">{idx + 1}</td>
                  <td className="p-2">
                    <p className="font-bold">{aspek.nama}</p>
                    <p className="text-[10px] text-neutral-600 mt-0.5">{aspek.definisi}</p>
                  </td>
                  <td className="p-2 leading-relaxed">
                    {aspek.ekspektasi}
                  </td>
                  <td className="p-2 text-center font-bold">
                    {aspek.rating}
                  </td>
                  <td className="p-2 italic text-neutral-800">
                    "{aspek.umpanBalik}"
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Predikat Kinerja Akhir Pegawai (Kuadran Kinerja) */}
        <div className="mt-8 p-4 border-2 border-black bg-neutral-50/60 rounded-xl space-y-2 page-break-inside-avoid">
          <div className="text-center space-y-1">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-black">
              III. PREDIKAT KINERJA PEGAWAI
            </h4>
            <div className="inline-block px-6 py-2 bg-black text-white font-black text-base tracking-widest rounded-lg mt-1">
              {predikatEvaluasiAkhir.predikatKinerjaPegawai}
            </div>
            <p className="text-[11px] text-neutral-700 mt-1">
              (Hasil Kerja: <strong>{predikatEvaluasiAkhir.ratingHasilKerja}</strong> | Perilaku Kerja: <strong>{predikatEvaluasiAkhir.ratingPerilaku}</strong>)
            </p>
          </div>
        </div>

        {/* Section 5: Lembar Tanda Tangan Pengesahan */}
        <div className="mt-12 pt-6 page-break-inside-avoid">
          <div className="text-right text-xs mb-8 pr-12 font-medium">
            {tanggalPenetapan}
          </div>

          <div className="grid grid-cols-2 text-xs text-center">
            {/* Pegawai Dinilai */}
            <div className="space-y-20">
              <p className="font-semibold">Pegawai yang Dinilai,</p>
              <div>
                <p className="font-extrabold underline text-sm">{pegawaiProfile.nama}</p>
                <p className="font-mono mt-0.5">NIP. {pegawaiProfile.nip}</p>
              </div>
            </div>

            {/* Pejabat Penilai Kinerja */}
            <div className="space-y-20">
              <p className="font-semibold">Pejabat Penilai Kinerja,</p>
              <div>
                <p className="font-extrabold underline text-sm">{penilaiProfile.nama}</p>
                <p className="font-mono mt-0.5">NIP. {penilaiProfile.nip}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── MODAL: Ubah Identitas Pegawai / Atasan ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-lg">badge</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Sesuaikan Identitas Dokumen Evaluasi</h3>
                  <p className="text-[11px] text-on-surface-variant">Ubah identitas pegawai dan pejabat penilai kinerja</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-outline hover:text-on-surface p-1 rounded-lg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-5 text-xs">
              {/* Pegawai Dinilai */}
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
                    <label className="block text-outline font-semibold mb-1">NIP</label>
                    <input
                      type="text"
                      value={pegawaiProfile.nip}
                      onChange={e => setPegawaiProfile({ ...pegawaiProfile, nip: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-semibold mb-1">Pangkat / Golongan</label>
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

              {/* Pejabat Penilai Kinerja */}
              <div className="p-4 bg-surface-container-low rounded-2xl space-y-3">
                <p className="font-bold text-primary uppercase tracking-wider text-[11px]">2. Identitas Pejabat Penilai Kinerja (Atasan)</p>
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
                    <label className="block text-outline font-semibold mb-1">NIP Atasan</label>
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
                    <label className="block text-outline font-semibold mb-1">Jabatan Atasan</label>
                    <input
                      type="text"
                      value={penilaiProfile.jabatan}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, jabatan: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-outline font-semibold mb-1">Unit Kerja Atasan</label>
                    <input
                      type="text"
                      value={penilaiProfile.unitKerja}
                      onChange={e => setPenilaiProfile({ ...penilaiProfile, unitKerja: e.target.value })}
                      className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Tanggal & Tempat Penetapan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline font-semibold mb-1">Teks Periode Penilaian</label>
                  <input
                    type="text"
                    value={periodeText}
                    onChange={e => setPeriodeText(e.target.value)}
                    className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-outline font-semibold mb-1">Tempat & Tanggal Penetapan</label>
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
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90"
              >
                Tutup & Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
