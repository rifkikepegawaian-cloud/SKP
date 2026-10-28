'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useCascading } from '@/context/CascadingContext'
import { ROLE_LABELS, UserRole, User } from '@/lib/types'
import Swal from 'sweetalert2'

export type KategoriHasilKerja = 'dibawah_ekspektasi' | 'sesuai_ekspektasi' | 'diatas_ekspektasi'

export interface ItemEvaluasiHasilKerja {
  id: string
  title: string
  sasaranKinerja?: string
  indikatorKinerjaIndividu?: string
  parentTitle?: string
  indikatorKinerja?: string
  jenisKinerja: 'utama' | 'tambahan'
  target: number
  satuan: string
  realisasi: number
  persentase: number
  predikat: KategoriHasilKerja
  angka: number
  umpanBalikPimpinan?: string
  buktiDukung?: string
  narrativeRealisasi?: string
}

export default function EvaluasiHasilKerjaPage() {
  const {
    user,
    role,
    periode,
    isLoading,
    agreedTasksForSKP,
    subordinates,
    groupedIkuList,
    myAssignedTasks,
  } = useCascading()

  const isSuperior = role !== 'staff'
  const [viewMode, setViewMode] = useState<'my_results' | 'subordinate_results'>('my_results')
  const [selectedSubordinateId, setSelectedSubordinateId] = useState<string>('')
  const [periodeFilter, setPeriodeFilter] = useState<'tahunan' | 'triwulan_1' | 'triwulan_2' | 'triwulan_3' | 'triwulan_4'>('tahunan')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPredikat, setFilterPredikat] = useState<string>('all')

  // Realisasi overrides and feedback state (persisted in localStorage)
  const [customRealisasiMap, setCustomRealisasiMap] = useState<Record<string, number>>({})
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({})
  const [narrativeRealisasiMap, setNarrativeRealisasiMap] = useState<Record<string, string>>({})

  // Modal edit realisasi / feedback
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<ItemEvaluasiHasilKerja | null>(null)
  const [editRealisasiVal, setEditRealisasiVal] = useState<number>(0)
  const [editNarrativeVal, setEditNarrativeVal] = useState<string>('')
  const [editFeedbackVal, setEditFeedbackVal] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Subordinate target user
  const targetUser = useMemo(() => {
    if (viewMode === 'subordinate_results' && selectedSubordinateId) {
      return subordinates.find(s => s.id === selectedSubordinateId) || null
    }
    return user
  }, [viewMode, selectedSubordinateId, subordinates, user])

  // Key for storage based on user and periode
  const storageKey = useMemo(() => {
    const uid = targetUser?.id || 'anon'
    return `evaluasi_hasil_kerja_${uid}_${periode?.id || '2026'}`
  }, [targetUser, periode])

  // Load custom realisasi, feedback, and narrative realisasi
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.realisasi) setCustomRealisasiMap(parsed.realisasi)
        if (parsed.feedback) setFeedbackMap(parsed.feedback)
        if (parsed.realisasiText) setNarrativeRealisasiMap(parsed.realisasiText)
      } else {
        setCustomRealisasiMap({})
        setFeedbackMap({})
        setNarrativeRealisasiMap({})
      }
    } catch (e) {
      console.warn('Error reading evaluasi from localStorage', e)
    }
  }, [storageKey])

  // Automatically select first subordinate if switching to subordinate view
  useEffect(() => {
    if (viewMode === 'subordinate_results' && subordinates.length > 0 && !selectedSubordinateId) {
      setSelectedSubordinateId(subordinates[0].id)
    }
  }, [viewMode, subordinates, selectedSubordinateId])

  // Prepare raw list based on active view mode and role
  const rawEvaluasiItems: ItemEvaluasiHasilKerja[] = useMemo(() => {
    // 1. If subordinate mode is active
    if (viewMode === 'subordinate_results') {
      if (!selectedSubordinateId) return []

      // Filter myAssignedTasks for this subordinate
      const subTasks = myAssignedTasks.filter((t: any) => {
        const subId =
          t.staff_user_id ||
          t.spv_user_id ||
          t.manajer_user_id ||
          t.unit_user_id ||
          t.sukpa_user_id ||
          t.staff_user?.id ||
          t.spv_user?.id ||
          t.manajer_user?.id ||
          t.unit_user?.id ||
          t.sukpa_user?.id
        return subId === selectedSubordinateId && (t.status === 'agreed' || !t.status)
      })

      return subTasks.map((item: any) => {
        const title =
          item.nama_sub_uraian ||
          item.nama_uraian ||
          item.nama_output ||
          item.parent_unit?.parent_sukpa?.iku?.nama_iku ||
          item.parent_sukpa?.iku?.nama_iku ||
          item.iku?.nama_iku ||
          'Rencana Hasil Kerja'

        const parentTitle =
          item.parent_uraian?.nama_uraian ||
          item.parent_output?.nama_output ||
          item.parent_unit?.parent_sukpa?.iku?.nama_iku ||
          item.parent_sukpa?.iku?.nama_iku ||
          item.iku?.nama_iku ||
          `Sasaran Pimpinan ${ROLE_LABELS[role] || 'Atasan'}`

        const targetNum = Number(item.target) || 100
        const satuan = item.satuan || 'Dokumen'
        const approvedRealisasi = item.capaian_approved ?? item.capaian_realisasi ?? 0
        const realisasiNum = customRealisasiMap[item.id] !== undefined
          ? customRealisasiMap[item.id]
          : approvedRealisasi

        const pct = targetNum > 0 ? Math.round((realisasiNum / targetNum) * 100) : 0
        let predikat: KategoriHasilKerja = 'sesuai_ekspektasi'
        let angka = 2
        if (realisasiNum < targetNum) {
          predikat = 'dibawah_ekspektasi'
          angka = 1
        } else if (realisasiNum > targetNum) {
          predikat = 'diatas_ekspektasi'
          angka = 3
        }

        const narrativeRealisasi = narrativeRealisasiMap[item.id] ||
          `${realisasiNum} ${satuan} telah terlaksana dan bukti dukung telah diunggah sesuai target`

        return {
          id: item.id,
          title,
          parentTitle,
          indikatorKinerja: `Terlaksananya ${title} sejumlah ${targetNum} ${satuan} (100%)`,
          jenisKinerja: (item.jenis_kinerja || 'utama') as 'utama' | 'tambahan',
          target: targetNum,
          satuan,
          realisasi: realisasiNum,
          persentase: pct,
          predikat,
          angka,
          umpanBalikPimpinan: feedbackMap[item.id] || 'baik dan pengelolaan waktu sudah sesuai dengan jadwal',
          buktiDukung: 'Laporan Progres & Berkas Administrasi',
          narrativeRealisasi,
        }
      })
    }

    // 2. Personal Mode (Hasil Kerja Saya)
    // Strictly map agreedTasksForSKP - no mock fallback!
    return agreedTasksForSKP.map((task) => {
      const targetNum = Number(task.target) || 100
      const satuan = task.satuan || 'Dokumen'
      const approvedRealisasi = task.capaian_approved ?? task.capaian_realisasi ?? 0
      const realisasiNum = customRealisasiMap[task.id] !== undefined
        ? customRealisasiMap[task.id]
        : approvedRealisasi

      const pct = targetNum > 0 ? Math.round((realisasiNum / targetNum) * 100) : 0
      let predikat: KategoriHasilKerja = 'sesuai_ekspektasi'
      let angka = 2
      if (realisasiNum < targetNum) {
        predikat = 'dibawah_ekspektasi'
        angka = 1
      } else if (realisasiNum > targetNum) {
        predikat = 'diatas_ekspektasi'
        angka = 3
      }

      const narrativeRealisasi = narrativeRealisasiMap[task.id] ||
        `${realisasiNum} ${satuan} telah terlaksana dan bukti dukung telah diunggah sesuai target`

      return {
        id: task.id,
        title: task.title,
        sasaranKinerja: task.sasaranKinerja,
        indikatorKinerjaIndividu: task.indikatorKinerjaIndividu,
        parentTitle: task.parentTitle,
        indikatorKinerja: task.indikatorKinerjaIndividu || task.indikatorKinerja,
        jenisKinerja: task.jenisKinerja || 'utama',
        target: targetNum,
        satuan,
        realisasi: realisasiNum,
        persentase: pct,
        predikat,
        angka,
        umpanBalikPimpinan: feedbackMap[task.id] || 'baik dan pengelolaan waktu sudah sesuai dengan jadwal',
        buktiDukung: 'Link Google Drive / Dokumen Tersimpan',
        narrativeRealisasi,
      }
    })
  }, [viewMode, selectedSubordinateId, myAssignedTasks, role, agreedTasksForSKP, customRealisasiMap, feedbackMap, narrativeRealisasiMap])

  // Filtered list by query and predikat
  const filteredItems = useMemo(() => {
    return rawEvaluasiItems.filter(item => {
      const matchQuery = [item.title, item.parentTitle, item.indikatorKinerja, item.satuan]
        .some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchPredikat = filterPredikat === 'all' || item.predikat === filterPredikat
      return matchQuery && matchPredikat
    })
  }, [rawEvaluasiItems, searchQuery, filterPredikat])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = rawEvaluasiItems.length
    if (total === 0) {
      return {
        total: 0,
        avgPersentase: 0,
        countDiatas: 0,
        countSesuai: 0,
        countDibawah: 0,
        predikatAkhir: 'Sesuai Ekspektasi',
        predikatColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      }
    }

    const sumPct = rawEvaluasiItems.reduce((acc, curr) => acc + curr.persentase, 0)
    const avgPersentase = Math.round(sumPct / total)

    const countDiatas = rawEvaluasiItems.filter(i => i.predikat === 'diatas_ekspektasi').length
    const countSesuai = rawEvaluasiItems.filter(i => i.predikat === 'sesuai_ekspektasi').length
    const countDibawah = rawEvaluasiItems.filter(i => i.predikat === 'dibawah_ekspektasi').length

    let predikatAkhir = 'Sesuai Ekspektasi'
    let predikatColor = 'text-emerald-700 bg-emerald-50 border-emerald-200'

    if (countDibawah > total / 2 || avgPersentase < 80) {
      predikatAkhir = 'Dibawah Ekspektasi'
      predikatColor = 'text-rose-700 bg-rose-50 border-rose-200'
    } else if (countDiatas > countDibawah && avgPersentase >= 100) {
      predikatAkhir = 'Diatas Ekspektasi'
      predikatColor = 'text-purple-700 bg-purple-50 border-purple-200'
    }

    return {
      total,
      avgPersentase,
      countDiatas,
      countSesuai,
      countDibawah,
      predikatAkhir,
      predikatColor,
    }
  }, [rawEvaluasiItems])

  // Open Edit Realisasi / Feedback Modal
  const openEditModal = (item: ItemEvaluasiHasilKerja) => {
    setSelectedItemForEdit(item)
    setEditRealisasiVal(item.realisasi)
    setEditNarrativeVal(item.narrativeRealisasi || '')
    setEditFeedbackVal(item.umpanBalikPimpinan || '')
    setIsModalOpen(true)
  }

  // Save Edit Realisasi / Feedback / Narrative
  const handleSaveEdit = () => {
    if (!selectedItemForEdit) return

    const newRealisasiMap = { ...customRealisasiMap, [selectedItemForEdit.id]: editRealisasiVal }
    const newFeedbackMap = { ...feedbackMap, [selectedItemForEdit.id]: editFeedbackVal }
    const newNarrativeMap = { ...narrativeRealisasiMap, [selectedItemForEdit.id]: editNarrativeVal }

    setCustomRealisasiMap(newRealisasiMap)
    setFeedbackMap(newFeedbackMap)
    setNarrativeRealisasiMap(newNarrativeMap)

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        realisasi: newRealisasiMap,
        feedback: newFeedbackMap,
        realisasiText: newNarrativeMap,
      }))
    } catch (e) {
      console.warn('Failed saving to localStorage', e)
    }

    setIsModalOpen(false)
    Swal.fire({
      icon: 'success',
      title: 'Tersimpan!',
      text: `Realisasi capaian, bukti dukung, dan umpan balik pimpinan berhasil diperbarui.`,
      timer: 1800,
      showConfirmButton: false,
    })
  }

  // Helper badge for Predikat with Angka (3: Diatas, 2: Sesuai, 1: Dibawah)
  const renderPredikatBadge = (predikat: KategoriHasilKerja) => {
    switch (predikat) {
      case 'diatas_ekspektasi':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
            <span className="material-symbols-outlined text-[15px] text-purple-600">military_tech</span>
            Diatas Ekspektasi
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-purple-200 text-[10px] font-black text-purple-900">
              Angka 3
            </span>
          </span>
        )
      case 'sesuai_ekspektasi':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
            Sesuai Ekspektasi
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-200 text-[10px] font-black text-emerald-900">
              Angka 2
            </span>
          </span>
        )
      case 'dibawah_ekspektasi':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <span className="material-symbols-outlined text-[15px] text-amber-600">trending_down</span>
            Dibawah Ekspektasi
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-200 text-[10px] font-black text-amber-900">
              Angka 1
            </span>
          </span>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
          <span className="material-symbols-outlined text-2xl">sync</span>
        </div>
        <p className="text-xs font-medium text-on-surface-variant">Memuat data Evaluasi Hasil Kerja...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Evaluasi Kinerja</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Evaluasi Hasil Kerja</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Evaluasi Hasil Kerja Pegawai
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Penilaian capaian rencana kinerja (IKU / Output / Uraian / Sub Uraian) beserta perhitungan persentase dan kategori ekspektasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Periode Selector */}
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
            <select
              value={periodeFilter}
              onChange={e => setPeriodeFilter(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-on-surface outline-none cursor-pointer"
            >
              <option value="tahunan">Periode: Tahunan 2026</option>
              <option value="triwulan_1">Periode: Triwulan I</option>
              <option value="triwulan_2">Periode: Triwulan II</option>
              <option value="triwulan_3">Periode: Triwulan III</option>
              <option value="triwulan_4">Periode: Triwulan IV</option>
            </select>
          </div>

          {/* Cetak SKP Link */}
          <Link
            href="/evaluasi-kinerja/cetak"
            className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold flex items-center gap-1.5 border border-outline-variant/30 transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Cetak Evaluasi SKP
          </Link>
        </div>
      </div>

      {/* ── Superior Mode Switcher (Pegawai Saya vs Bawahan) ── */}
      {isSuperior && (
        <div className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('my_results')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'my_results'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-sm">person</span>
              Hasil Kerja Saya ({ROLE_LABELS[role] || role})
            </button>
            <button
              onClick={() => setViewMode('subordinate_results')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'subordinate_results'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-sm">groups</span>
              Evaluasi Hasil Kerja Bawahan
            </button>
          </div>

          {/* Subordinate Selector */}
          {viewMode === 'subordinate_results' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-on-surface-variant">Pilih Bawahan:</span>
              <select
                value={selectedSubordinateId}
                onChange={e => setSelectedSubordinateId(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              >
                {subordinates.length === 0 ? (
                  <option value="">-- Belum ada bawahan --</option>
                ) : (
                  subordinates.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.pegawai?.nama_lengkap || sub.email} — {sub.pegawai?.jabatan || sub.pegawai?.nip || sub.role}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Summary KPI Widgets ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Indikator */}
        <div className="glass-card rounded-2xl p-4 border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Hasil Kerja</span>
            <span className="material-symbols-outlined text-lg text-primary">format_list_bulleted</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-on-surface">{summaryMetrics.total}</p>
            <p className="text-[11px] text-secondary mt-0.5">Rencana Kinerja Aktif</p>
          </div>
        </div>

        {/* Card 2: Rata-rata Capaian */}
        <div className="glass-card rounded-2xl p-4 border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rata-Rata Capaian</span>
            <span className="material-symbols-outlined text-lg text-primary">query_stats</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-primary">{summaryMetrics.avgPersentase}%</p>
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden mt-1.5">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summaryMetrics.avgPersentase)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Diatas Ekspektasi */}
        <div className="glass-card rounded-2xl p-4 border border-purple-200 bg-purple-50/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Diatas Ekspektasi</span>
            <span className="material-symbols-outlined text-lg text-purple-600">military_tech</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-purple-800">{summaryMetrics.countDiatas}</p>
            <p className="text-[11px] text-purple-700 mt-0.5">Realisasi &gt; Target (&gt;100%)</p>
          </div>
        </div>

        {/* Card 4: Sesuai Ekspektasi */}
        <div className="glass-card rounded-2xl p-4 border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sesuai Ekspektasi</span>
            <span className="material-symbols-outlined text-lg text-emerald-600">check_circle</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-emerald-800">{summaryMetrics.countSesuai}</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Realisasi = Target (100%)</p>
          </div>
        </div>

        {/* Card 5: Dibawah Ekspektasi */}
        <div className="glass-card rounded-2xl p-4 border border-amber-200 bg-amber-50/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dibawah Ekspektasi</span>
            <span className="material-symbols-outlined text-lg text-amber-600">trending_down</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-amber-800">{summaryMetrics.countDibawah}</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Realisasi &lt; Target (&lt;100%)</p>
          </div>
        </div>
      </div>

      {/* ── Banner Aturan Perhitungan Sesuai PermenPAN-RB ── */}
      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-body-sm text-blue-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-lg">info</span>
          </div>
          <div className="text-xs">
            <p className="font-bold text-blue-950">Mekanisme Predikat Hasil Kerja Kinerja Pegawai:</p>
            <p className="text-blue-800 mt-0.5">
              • <strong>Dibawah Ekspektasi:</strong> Capaian riil &lt; Target (Persentase &lt; 100%) | 
              • <strong>Sesuai Ekspektasi:</strong> Capaian riil = Target (Persentase 100%) | 
              • <strong>Diatas Ekspektasi:</strong> Capaian riil &gt; Target (Persentase &gt; 100%).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
          <span className="text-xs font-semibold text-blue-950">Predikat Keseluruhan:</span>
          <span className={`px-3 py-1 rounded-xl text-xs font-black border shadow-2xs ${summaryMetrics.predikatColor}`}>
            {summaryMetrics.predikatAkhir}
          </span>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-outline-variant/30 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
          <input
            type="text"
            placeholder="Cari rencana hasil kerja, IKU, output, uraian..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-on-surface-variant">Filter Predikat:</span>
          <select
            value={filterPredikat}
            onChange={e => setFilterPredikat(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface outline-none cursor-pointer"
          >
            <option value="all">Semua Predikat</option>
            <option value="diatas_ekspektasi">Diatas Ekspektasi</option>
            <option value="sesuai_ekspektasi">Sesuai Ekspektasi</option>
            <option value="dibawah_ekspektasi">Dibawah Ekspektasi</option>
          </select>
        </div>
      </div>

      {/* ── List of Hasil Kerja Items ── */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-outline-variant/30 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline/50 mb-2">assignment_late</span>
            <p className="font-semibold text-on-surface">Tidak ada data hasil kerja yang cocok dengan filter.</p>
            <p className="mt-1">Silakan sesuaikan pencarian atau pastikan penugasan target SKP telah disepakati.</p>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isUtama = item.jenisKinerja === 'utama'

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-outline-variant/30 p-6 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                {/* Item Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-3 border-b border-outline-variant/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isUtama ? 'bg-primary/10 text-primary' : 'bg-secondary-container text-on-secondary-container'
                      }`}>
                        Kinerja {isUtama ? 'Utama' : 'Tambahan'} #{idx + 1}
                      </span>
                      {item.parentTitle && (
                        <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-outline">account_tree</span>
                          Induk: {item.parentTitle}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-on-surface leading-snug">
                      {item.sasaranKinerja || item.title}
                    </h3>
                    {item.sasaranKinerja && item.title && item.sasaranKinerja !== item.title && (
                      <p className="text-[11px] text-on-surface-variant italic">
                        Lingkup Tugas: {item.title}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
                    {renderPredikatBadge(item.predikat)}
                  </div>
                </div>

                {/* Target vs Realisasi Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/20">
                  <div>
                    <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Target Rencana</p>
                    <p className="text-base font-extrabold text-on-surface mt-0.5">
                      {item.target} <span className="text-xs font-semibold text-secondary">{item.satuan}</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Realisasi Capaian</p>
                    <p className="text-base font-extrabold text-primary mt-0.5">
                      {item.realisasi} <span className="text-xs font-semibold text-secondary">{item.satuan}</span>
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Persentase Capaian</span>
                      <span className="font-extrabold text-primary">{item.persentase}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.persentase > 100
                            ? 'bg-purple-600'
                            : item.persentase === 100
                            ? 'bg-emerald-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, item.persentase)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-on-surface-variant flex items-center justify-between pt-0.5">
                      <span>Formula: ({item.realisasi} / {item.target}) × 100%</span>
                      <span className="font-semibold text-on-surface">Hasil: {item.predikat.replace('_', ' ').toUpperCase()}</span>
                    </p>
                  </div>
                </div>

                {/* Indikator Kinerja & Bukti Dukung */}
                {(item.indikatorKinerjaIndividu || item.indikatorKinerja) && (
                  <div className="text-xs text-on-surface-variant">
                    <span className="font-semibold text-on-surface">Ukuran Keberhasilan / Indikator Kinerja Individu (IKI):</span>{' '}
                    <span>{item.indikatorKinerjaIndividu || item.indikatorKinerja}</span>
                  </div>
                )}

                {/* Umpan Balik Berkala Pimpinan */}
                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-600">comment</span>
                      Umpan Balik Berkala Berdasarkan Bukti Dukung:
                    </p>
                    <p className="text-amber-900 italic pl-5">
                      "{item.umpanBalikPimpinan || 'Belum ada catatan umpan balik khusus dari pimpinan.'}"
                    </p>
                  </div>

                  <button
                    onClick={() => openEditModal(item)}
                    className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    {isSuperior ? 'Beri Umpan Balik & Sesuaikan Realisasi' : 'Update Angka Capaian'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── MODAL: Sesuaikan Realisasi & Umpan Balik ── */}
      {isModalOpen && selectedItemForEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-lg">assessment</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Penilaian Evaluasi Hasil Kerja</h3>
                  <p className="text-[11px] text-on-surface-variant">Update angka realisasi & umpan balik berkala pimpinan</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-outline hover:text-on-surface p-1 rounded-lg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-on-surface mb-1">Rencana Kinerja</label>
                <p className="p-3 bg-surface-container-low rounded-xl text-on-surface font-medium leading-relaxed">
                  {selectedItemForEdit.title}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-outline uppercase tracking-wider mb-1">Target Rencana</label>
                  <div className="p-2.5 bg-surface-container-low rounded-xl font-bold text-on-surface">
                    {selectedItemForEdit.target} {selectedItemForEdit.satuan}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-primary uppercase tracking-wider mb-1">Realisasi Capaian Baru</label>
                  <input
                    type="number"
                    min={0}
                    value={editRealisasiVal}
                    onChange={e => setEditRealisasiVal(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-outline-variant/60 rounded-xl px-3 py-2 font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Dynamic Preview Calculation */}
              {(() => {
                const target = selectedItemForEdit.target || 1
                const pct = Math.round((editRealisasiVal / target) * 100)
                let pred: KategoriHasilKerja = 'sesuai_ekspektasi'
                if (editRealisasiVal < target) pred = 'dibawah_ekspektasi'
                else if (editRealisasiVal > target) pred = 'diatas_ekspektasi'

                return (
                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-on-surface-variant font-medium">Kalkulasi Otomatis:</p>
                      <p className="text-base font-extrabold text-primary">{pct}% Capaian</p>
                    </div>
                    <div>
                      {renderPredikatBadge(pred)}
                    </div>
                  </div>
                )
              })()}

              <div>
                <label className="block font-bold text-on-surface mb-1">
                  Realisasi Berdasarkan Bukti Dukung (Deskripsi Narasi Dokumen)
                </label>
                <textarea
                  rows={2}
                  value={editNarrativeVal}
                  onChange={e => setEditNarrativeVal(e.target.value)}
                  placeholder="Contoh: 4 dokumen telah diunggah ke drive tim pembuatan SIMPAK..."
                  className="w-full bg-white border border-outline-variant/60 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[10px] text-on-surface-variant mt-1">
                  Teks narasi ini akan dicetak langsung pada kolom "REALISASI BERDASARKAN BUKTI DUKUNG" formulir evaluasi SKP.
                </p>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Umpan Balik Berkelanjutan Berdasarkan Bukti Dukung (Pimpinan)</label>
                <textarea
                  rows={3}
                  value={editFeedbackVal}
                  onChange={e => setEditFeedbackVal(e.target.value)}
                  placeholder="Masukkan arahan atau apresiasi pimpinan terkait pencapaian hasil kerja ini..."
                  className="w-full bg-white border border-outline-variant/60 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
              >
                Simpan Penilaian
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
