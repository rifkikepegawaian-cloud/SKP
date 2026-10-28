'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useCascading } from '@/context/CascadingContext'
import {
  User,
  UserRole,
  ROLE_LABELS,
  RatingPerilaku,
  NilaiPerilakuItem,
  SKPPerilakuKerja,
} from '@/lib/types'
import {
  ASPEK_BERAKHLAK,
  RATING_PERILAKU_CONFIG,
} from '@/lib/constants/perilakuKerja'
import {
  RUBRIK_PERILAKU_TENDIK,
  LevelPilihan,
  JawabanIndikator,
  skorToRating,
  generateFeedbackAspek,
} from '@/lib/constants/rubrikPerilakuTendik'
import { getStructuralSuperiors, getStructuralSubordinates, StructuralSuperiors } from '@/lib/skpHierarchy'
import Swal from 'sweetalert2'

export default function EvaluasiPerilakuKerjaPage() {
  const { user, activeRole } = useAuthStore()
  const role: UserRole = activeRole || (user?.role?.split(',')[0] as UserRole) || 'staff'
  const { periode } = useCascading()

  const isSuperior = role !== 'staff'
  const [activeTab, setActiveTab] = useState<'subordinate_assessment' | 'my_assessment'>(
    isSuperior ? 'subordinate_assessment' : 'my_assessment'
  )

  // Subordinates list for superior
  const [subordinates, setSubordinates] = useState<User[]>([])
  const [selectedSubordinateId, setSelectedSubordinateId] = useState<string>('')
  const [isLoadingSubordinates, setIsLoadingSubordinates] = useState(false)

  // Structural Superiors (Pejabat Penilai & Atasan Pejabat Penilai)
  const [structuralSuperiors, setStructuralSuperiors] = useState<StructuralSuperiors | null>(null)

  // Questionnaire answers per indicator (keyed by ind.id e.g. '1.1' .. '7.3')
  const [jawabanKuesioner, setJawabanKuesioner] = useState<Record<string, JawabanIndikator>>(() => {
    const initial: Record<string, JawabanIndikator> = {}
    RUBRIK_PERILAKU_TENDIK.forEach(aspek => {
      aspek.indikatorList.forEach(ind => {
        initial[ind.id] = {
          level: 'sesuai_ekspektasi',
          skor: ind.sesuai.skorDefault,
        }
      })
    })
    return initial
  })

  // Perilaku data state (keyed by aspek_id: 1..7)
  const [items, setItems] = useState<Record<number, NilaiPerilakuItem>>(() => {
    const initial: Record<number, NilaiPerilakuItem> = {}
    RUBRIK_PERILAKU_TENDIK.forEach(aspek => {
      initial[aspek.id] = {
        aspek_id: aspek.id,
        ekspektasi_khusus: ASPEK_BERAKHLAK.find(a => a.id === aspek.id)?.defaultEkspektasi || '',
        rating: 'sesuai_ekspektasi',
        umpan_balik: 'Menunjukkan komitmen dan integritas yang konsisten dalam bekerja.',
      }
    })
    return initial
  })

  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Target user being evaluated
  const currentTargetUser = useMemo(() => {
    if (activeTab === 'subordinate_assessment' && selectedSubordinateId) {
      return subordinates.find(s => s.id === selectedSubordinateId) || null
    }
    return user
  }, [activeTab, selectedSubordinateId, subordinates, user])

  // Resolve structural superiors for currentTargetUser
  useEffect(() => {
    if (!currentTargetUser) return
    const supabase = createClient()
    getStructuralSuperiors(currentTargetUser, supabase).then(res => {
      setStructuralSuperiors(res)
    }).catch(err => {
      console.warn('Gagal memuat atasan struktural di evaluasi perilaku:', err)
    })
  }, [currentTargetUser])

  // 1. Fetch Subordinates if user is a superior
  useEffect(() => {
    if (!isSuperior || !user) return

    const fetchSubordinates = async () => {
      setIsLoadingSubordinates(true)
      const supabase = createClient()
      try {
        const subs = await getStructuralSubordinates(user, role, supabase)
        setSubordinates(subs)
        if (subs.length > 0) {
          if (!selectedSubordinateId || !subs.some(s => s.id === selectedSubordinateId)) {
            setSelectedSubordinateId(subs[0].id)
          }
        }
      } catch (err) {
        console.warn('Error fetching subordinates:', err)
      } finally {
        setIsLoadingSubordinates(false)
      }
    }

    fetchSubordinates()
  }, [isSuperior, role, user, selectedSubordinateId])

  // 2. Fetch or load Perilaku Evaluation & Questionnaire answers for current target user
  useEffect(() => {
    const fetchPerilaku = async () => {
      if (!currentTargetUser) {
        setIsLoadingData(false)
        return
      }

      setIsLoadingData(true)
      const targetUserId = currentTargetUser.id
      const periodeId = periode?.id || '2026'
      const storageKey = `evaluasi_perilaku_${targetUserId}_${periodeId}`
      const kuesionerKey = `kuesioner_rubrik_${targetUserId}_${periodeId}`

      // 1. Load saved questionnaire answers from localStorage
      let currentJawaban: Record<string, JawabanIndikator> = {}
      const savedKuesioner = localStorage.getItem(kuesionerKey)
      if (savedKuesioner) {
        try {
          const parsed = JSON.parse(savedKuesioner)
          if (parsed.jawaban) currentJawaban = parsed.jawaban
        } catch (e) {
          console.warn('Gagal membaca saved kuesioner:', e)
        }
      }

      // Default missing indicators
      RUBRIK_PERILAKU_TENDIK.forEach(aspek => {
        aspek.indikatorList.forEach(ind => {
          if (!currentJawaban[ind.id]) {
            currentJawaban[ind.id] = {
              level: 'sesuai_ekspektasi',
              skor: ind.sesuai.skorDefault,
            }
          }
        })
      })
      setJawabanKuesioner(currentJawaban)

      // 2. Fetch existing saved items from Supabase or localStorage
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('skp_perilaku_kerja')
          .select('*')
          .eq('periode_id', periodeId)
          .eq('user_id', targetUserId)

        const loaded: Record<number, NilaiPerilakuItem> = {}
        const localSaved = localStorage.getItem(storageKey)
        const parsedLocal = localSaved ? JSON.parse(localSaved) : null

        RUBRIK_PERILAKU_TENDIK.forEach(aspek => {
          const row = (!error && data) ? (data as SKPPerilakuKerja[]).find(r => r.aspek_id === aspek.id) : null
          const localItem = parsedLocal ? parsedLocal[aspek.id] : null

          // Compute rating strictly based on currentJawaban
          const scores = aspek.indikatorList.map(ind => currentJawaban[ind.id]?.skor || 85)
          const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          const computedRating = skorToRating(avg)
          const autoFeedback = generateFeedbackAspek(aspek, currentJawaban)

          const defaultEksp = ASPEK_BERAKHLAK.find(a => a.id === aspek.id)?.defaultEkspektasi || ''

          loaded[aspek.id] = {
            aspek_id: aspek.id,
            ekspektasi_khusus: row?.ekspektasi_khusus || localItem?.ekspektasi_khusus || defaultEksp,
            rating: computedRating,
            umpan_balik: row?.umpan_balik || localItem?.umpan_balik || autoFeedback,
          }
        })

        setItems(loaded)
      } catch (err) {
        console.warn('Fallback to local items for perilaku evaluation:', err)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchPerilaku()
  }, [currentTargetUser, periode])

  // Handle option selection for an indicator question
  const handleSelectIndikatorOption = (
    indId: string,
    level: LevelPilihan,
    skorDefault: number,
    aspekId: number
  ) => {
    const updatedJawaban = {
      ...jawabanKuesioner,
      [indId]: { level, skor: skorDefault },
    }
    setJawabanKuesioner(updatedJawaban)

    // Calculate new aspect score & rating
    const aspekDef = RUBRIK_PERILAKU_TENDIK.find(a => a.id === aspekId)
    if (aspekDef) {
      const scores = aspekDef.indikatorList.map(ind => updatedJawaban[ind.id]?.skor || 85)
      const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      const newRating = skorToRating(avg)

      setItems(prev => {
        const currentItem = prev[aspekId]
        const nextItems = {
          ...prev,
          [aspekId]: {
            ...currentItem,
            rating: newRating,
          },
        }

        if (currentTargetUser) {
          const targetUserId = currentTargetUser.id
          const periodeId = periode?.id || '2026'
          localStorage.setItem(`evaluasi_perilaku_${targetUserId}_${periodeId}`, JSON.stringify(nextItems))
        }

        return nextItems
      })
    }

    // Persist questionnaire answers in localStorage immediately
    if (currentTargetUser) {
      const targetUserId = currentTargetUser.id
      const periodeId = periode?.id || '2026'
      localStorage.setItem(`kuesioner_rubrik_${targetUserId}_${periodeId}`, JSON.stringify({ jawaban: updatedJawaban }))
    }
  }

  // Handle auto-apply recommended narrative based on current answers
  const handleApplyRecommendedFeedback = (aspekId: number) => {
    const aspekDef = RUBRIK_PERILAKU_TENDIK.find(a => a.id === aspekId)
    if (!aspekDef) return
    const rec = generateFeedbackAspek(aspekDef, jawabanKuesioner)
    handleUmpanBalikChange(aspekId, rec)
  }

  // Handle umpan balik change
  const handleUmpanBalikChange = (aspekId: number, umpan_balik: string) => {
    setItems(prev => {
      const next = {
        ...prev,
        [aspekId]: {
          ...prev[aspekId],
          umpan_balik,
        },
      }
      if (currentTargetUser) {
        const targetUserId = currentTargetUser.id
        const periodeId = periode?.id || '2026'
        localStorage.setItem(`evaluasi_perilaku_${targetUserId}_${periodeId}`, JSON.stringify(next))
      }
      return next
    })
  }

  // Handle ekspektasi khusus change
  const handleEkspektasiChange = (aspekId: number, ekspektasi_khusus: string) => {
    setItems(prev => {
      const next = {
        ...prev,
        [aspekId]: {
          ...prev[aspekId],
          ekspektasi_khusus,
        },
      }
      if (currentTargetUser) {
        const targetUserId = currentTargetUser.id
        const periodeId = periode?.id || '2026'
        localStorage.setItem(`evaluasi_perilaku_${targetUserId}_${periodeId}`, JSON.stringify(next))
      }
      return next
    })
  }

  // 3. Save Evaluation to Supabase & localStorage
  const handleSaveAssessment = async () => {
    if (!currentTargetUser) return

    setIsSaving(true)
    const targetUserId = currentTargetUser.id
    const periodeId = periode?.id || '2026'
    const storageKey = `evaluasi_perilaku_${targetUserId}_${periodeId}`
    const kuesionerKey = `kuesioner_rubrik_${targetUserId}_${periodeId}`

    try {
      // 1. Save to localStorage immediately
      localStorage.setItem(storageKey, JSON.stringify(items))
      localStorage.setItem(kuesionerKey, JSON.stringify({ jawaban: jawabanKuesioner }))

      // 2. Upsert to Supabase
      const supabase = createClient()
      const payload = Object.values(items).map(item => ({
        user_id: targetUserId,
        periode_id: periodeId,
        aspek_id: item.aspek_id,
        ekspektasi_khusus: item.ekspektasi_khusus,
        rating: item.rating,
        umpan_balik: item.umpan_balik,
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('skp_perilaku_kerja')
        .upsert(payload, { onConflict: 'user_id,periode_id,aspek_id' })

      if (error) {
        console.warn('Supabase upsert skp_perilaku_kerja note:', error.message)
      }

      Swal.fire({
        icon: 'success',
        title: 'Penilaian Kuesioner Berhasil Disimpan!',
        text: `Evaluasi perilaku untuk ${currentTargetUser.pegawai?.nama_lengkap || currentTargetUser.email} telah tersimpan berdasarkan hasil kuesioner rubrik.`,
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan sistem saat menyimpan evaluasi.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate Overall Predikat Perilaku & Average Score
  const perilakuMetrics = useMemo(() => {
    const list = Object.values(items)
    const countDiatas = list.filter(i => i.rating === 'di_atas_ekspektasi').length
    const countSesuai = list.filter(i => i.rating === 'sesuai_ekspektasi').length
    const countDibawah = list.filter(i => i.rating === 'di_bawah_ekspektasi').length

    let totalScore = 0
    let totalCount = 0
    Object.values(jawabanKuesioner).forEach(j => {
      totalScore += j.skor
      totalCount++
    })
    const avgScore = totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : 85

    let predikat = 'Sesuai Ekspektasi'
    let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'

    if (countDibawah >= 3) {
      predikat = 'Di Bawah Ekspektasi'
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200'
    } else if (countDiatas >= 4 && countDibawah === 0) {
      predikat = 'Di Atas Ekspektasi'
      badgeClass = 'bg-purple-50 text-purple-700 border-purple-200'
    }

    return {
      countDiatas,
      countSesuai,
      countDibawah,
      avgScore,
      predikat,
      badgeClass,
    }
  }, [items, jawabanKuesioner])

  const isEditable = activeTab === 'subordinate_assessment' && isSuperior

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Evaluasi Kinerja</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Evaluasi Perilaku Kerja</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Evaluasi Perilaku Kerja (Kuesioner Rubrik BerAKHLAK)
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Penilaian 7 nilai dasar BerAKHLAK berbasis instrumen kuesioner rubrik objektif 21 butir indikator standar tenaga kependidikan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/evaluasi-kinerja/hasil-kerja"
            className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold flex items-center gap-1.5 border border-outline-variant/30 transition-all"
          >
            <span className="material-symbols-outlined text-base text-primary">assessment</span>
            Lihat Hasil Kerja
          </Link>
          <Link
            href="/evaluasi-kinerja/cetak"
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Cetak Evaluasi SKP
          </Link>
        </div>
      </div>

      {/* ── Tab Switcher: Penilaian Bawahan (Atasan) vs Evaluasi Saya ── */}
      <div className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isSuperior && (
            <button
              onClick={() => setActiveTab('subordinate_assessment')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'subordinate_assessment'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-sm">rate_review</span>
              Penilaian Perilaku Bawahan (Oleh Atasan)
            </button>
          )}
          <button
            onClick={() => setActiveTab('my_assessment')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'my_assessment'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-sm">psychology</span>
            {isSuperior ? 'Evaluasi Perilaku Saya' : 'Hasil Penilaian Perilaku Saya (Dari Atasan)'}
          </button>
        </div>

        {/* Subordinate Selector when assessing subordinates */}
        {activeTab === 'subordinate_assessment' && isSuperior && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-on-surface-variant">Pegawai Dinilai:</span>
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

      {/* ── Pegawai Profile & Overall Evaluation Summary Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Pegawai Info */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-outline-variant/30 p-6 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-inner">
              {(currentTargetUser?.pegawai?.nama_lengkap || currentTargetUser?.email || 'P')
                .split(' ')
                .slice(0, 2)
                .map(n => n[0])
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                  Pegawai Yang Dinilai
                </span>
                <span className="text-[11px] text-outline font-mono">
                  NIP: {currentTargetUser?.pegawai?.nip || '-'}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-on-surface mt-0.5">
                {currentTargetUser?.pegawai?.nama_lengkap || currentTargetUser?.email || '-'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {currentTargetUser?.pegawai?.jabatan || (currentTargetUser?.role ? ROLE_LABELS[currentTargetUser.role.split(',')[0] as UserRole] : '-') || '-'} • {currentTargetUser?.pegawai?.unit_es2 || '-'}
              </p>
            </div>
          </div>

          <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary">verified_user</span>
              Pejabat Penilai: <strong className="text-on-surface">{structuralSuperiors?.pejabatPenilai.nama || 'Atasan Langsung'}</strong>
            </span>
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-secondary">security</span>
              Atasan Pejabat Penilai: <strong className="text-on-surface">{structuralSuperiors?.atasanPejabatPenilai.nama || 'Atasan Pejabat Penilai'}</strong>
            </span>
            <span className="text-on-surface-variant">
              Periode: <strong className="text-on-surface">Tahun 2026</strong>
            </span>
          </div>
        </div>

        {/* Predikat Perilaku Summary */}
        <div className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 rounded-3xl border border-indigo-200/80 p-6 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-indigo-900 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Predikat Kumulatif Perilaku</span>
              <span className="material-symbols-outlined text-lg text-indigo-600">psychology_alt</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-indigo-950">
                {perilakuMetrics.predikat}
              </p>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                Skor: {perilakuMetrics.avgScore} / 100
              </span>
            </div>
            <p className="text-xs text-indigo-800/80 mt-1">
              Dihitung otomatis dari total 21 butir kuesioner rubrik BerAKHLAK.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-indigo-200/60 text-center text-xs">
            <div className="p-2 rounded-xl bg-white/70 shadow-2xs">
              <p className="text-[10px] text-purple-700 font-bold uppercase">Di Atas</p>
              <p className="text-base font-black text-purple-900 mt-0.5">{perilakuMetrics.countDiatas}</p>
            </div>
            <div className="p-2 rounded-xl bg-white/70 shadow-2xs">
              <p className="text-[10px] text-emerald-700 font-bold uppercase">Sesuai</p>
              <p className="text-base font-black text-emerald-900 mt-0.5">{perilakuMetrics.countSesuai}</p>
            </div>
            <div className="p-2 rounded-xl bg-white/70 shadow-2xs">
              <p className="text-[10px] text-amber-700 font-bold uppercase">Di Bawah</p>
              <p className="text-base font-black text-amber-900 mt-0.5">{perilakuMetrics.countDibawah}</p>
            </div>
          </div>
        </div>

      </div>

      {/* ── Section Title & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 pt-2">
        <div>
          <h3 className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            7 Aspek Penilaian Perilaku Kerja BerAKHLAK (Kuesioner 21 Butir)
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Rating tiap aspek dikalkulasikan secara otomatis berdasarkan opsi indikator yang dipilih atasan.
          </p>
        </div>

        {isEditable && (
          <button
            onClick={handleSaveAssessment}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto shrink-0"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">save</span>
                Simpan Seluruh Penilaian
              </>
            )}
          </button>
        )}
      </div>

      {/* ── 7 Aspek BerAKHLAK Inline Questionnaire Cards ── */}
      <div className="space-y-6">
        {RUBRIK_PERILAKU_TENDIK.map(aspek => {
          const item = items[aspek.id] || {
            aspek_id: aspek.id,
            ekspektasi_khusus: ASPEK_BERAKHLAK.find(a => a.id === aspek.id)?.defaultEkspektasi || '',
            rating: 'sesuai_ekspektasi' as RatingPerilaku,
            umpan_balik: '',
          }

          // Compute aspect score from its 3 indicators
          const scores = aspek.indikatorList.map(ind => jawabanKuesioner[ind.id]?.skor || 85)
          const aspekAvgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          const computedRating = skorToRating(aspekAvgScore)
          const ratingConfig = RATING_PERILAKU_CONFIG[computedRating]

          return (
            <div
              key={aspek.id}
              className="bg-white rounded-3xl border border-outline-variant/30 p-6 md:p-7 shadow-xs hover:shadow-md transition-all space-y-6"
            >
              {/* Aspect Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0 shadow-inner">
                    {aspek.id}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-on-surface">
                        {aspek.nama}
                      </h4>
                      <span className="material-symbols-outlined text-sm text-primary">
                        {aspek.icon}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant italic leading-relaxed">
                      &ldquo;{aspek.definisi}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Aspect Calculated Rating Info Card (Read-only, derived strictly from questionnaire) */}
                <div className="flex items-center gap-3 self-start md:self-auto bg-slate-50 px-4 py-2.5 rounded-2xl border border-outline-variant/30 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-outline uppercase font-bold tracking-wider">
                      Rata-rata Skor
                    </div>
                    <div className="text-base font-black font-mono text-primary leading-tight">
                      {aspekAvgScore} <span className="text-[10px] text-outline font-normal">/ 100</span>
                    </div>
                  </div>
                  <div className="h-7 w-px bg-outline-variant/30" />
                  <div>
                    <div className="text-[10px] text-outline uppercase font-bold tracking-wider mb-0.5">
                      Rating Kuesioner
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs ${ratingConfig.badgeClass}`}>
                      <span className="material-symbols-outlined text-xs">{ratingConfig.icon}</span>
                      {ratingConfig.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Questionnaire Form: 3 Indicator Questions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-indigo-600">quiz</span>
                    Kuesioner Rubrik Penilaian (3 Butir Indikator):
                  </span>
                  <span className="text-[11px] text-on-surface-variant italic hidden sm:inline">
                    {isEditable ? '*Pilih deskripsi yang paling menggambarkan perilaku kerja pegawai' : '*Hasil penilaian rubrik oleh atasan'}
                  </span>
                </div>

                {aspek.indikatorList.map(ind => {
                  const currentAns = jawabanKuesioner[ind.id] || {
                    level: 'sesuai_ekspektasi',
                    skor: ind.sesuai.skorDefault,
                  }

                  return (
                    <div
                      key={ind.id}
                      className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-3.5 shadow-2xs"
                    >
                      {/* Indicator Title & Score */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-outline-variant/15">
                        <div className="flex items-start sm:items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex-shrink-0 shadow-2xs">
                            Butir {ind.id}
                          </span>
                          <p className="text-xs font-bold text-on-surface leading-snug">
                            {ind.kriteria}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <span className="text-[10px] text-on-surface-variant font-medium">Skor Pilihan:</span>
                          <span className="text-xs font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                            {currentAns.skor}
                          </span>
                        </div>
                      </div>

                      {/* 3 Option Rubric Radios */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0.5">
                        
                        {/* Option 1: Di Bawah Ekspektasi */}
                        <div
                          onClick={() => {
                            if (isEditable) {
                              handleSelectIndikatorOption(
                                ind.id,
                                'di_bawah_ekspektasi',
                                ind.diBawah.skorDefault,
                                aspek.id
                              )
                            }
                          }}
                          className={`p-3.5 rounded-2xl border text-xs transition-all flex flex-col justify-between gap-2.5 ${
                            isEditable ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            currentAns.level === 'di_bawah_ekspektasi'
                              ? 'bg-amber-50/90 border-amber-500 shadow-sm ring-2 ring-amber-500/30'
                              : 'bg-white border-outline-variant/30 hover:border-amber-300 hover:bg-amber-50/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`material-symbols-outlined text-base ${
                                currentAns.level === 'di_bawah_ekspektasi' ? 'text-amber-700' : 'text-slate-300'
                              }`}>
                                {currentAns.level === 'di_bawah_ekspektasi' ? 'radio_button_checked' : 'radio_button_unchecked'}
                              </span>
                              <span className="font-bold text-[11px] text-amber-900">
                                Di Bawah Ekspektasi
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100/70 text-amber-800 font-bold">
                              0–75
                            </span>
                          </div>
                          <p className="text-on-surface-variant leading-relaxed text-[11px]">
                            {ind.diBawah.deskripsi}
                          </p>
                        </div>

                        {/* Option 2: Sesuai Ekspektasi */}
                        <div
                          onClick={() => {
                            if (isEditable) {
                              handleSelectIndikatorOption(
                                ind.id,
                                'sesuai_ekspektasi',
                                ind.sesuai.skorDefault,
                                aspek.id
                              )
                            }
                          }}
                          className={`p-3.5 rounded-2xl border text-xs transition-all flex flex-col justify-between gap-2.5 ${
                            isEditable ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            currentAns.level === 'sesuai_ekspektasi'
                              ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                              : 'bg-white border-outline-variant/30 hover:border-emerald-300 hover:bg-emerald-50/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`material-symbols-outlined text-base ${
                                currentAns.level === 'sesuai_ekspektasi' ? 'text-emerald-700' : 'text-slate-300'
                              }`}>
                                {currentAns.level === 'sesuai_ekspektasi' ? 'radio_button_checked' : 'radio_button_unchecked'}
                              </span>
                              <span className="font-bold text-[11px] text-emerald-900">
                                Sesuai Ekspektasi
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-800 font-bold">
                              76–90
                            </span>
                          </div>
                          <p className="text-on-surface-variant leading-relaxed text-[11px]">
                            {ind.sesuai.deskripsi}
                          </p>
                        </div>

                        {/* Option 3: Di Atas Ekspektasi */}
                        <div
                          onClick={() => {
                            if (isEditable) {
                              handleSelectIndikatorOption(
                                ind.id,
                                'di_atas_ekspektasi',
                                ind.diAtas.skorDefault,
                                aspek.id
                              )
                            }
                          }}
                          className={`p-3.5 rounded-2xl border text-xs transition-all flex flex-col justify-between gap-2.5 ${
                            isEditable ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            currentAns.level === 'di_atas_ekspektasi'
                              ? 'bg-purple-50/90 border-purple-500 shadow-sm ring-2 ring-purple-500/30'
                              : 'bg-white border-outline-variant/30 hover:border-purple-300 hover:bg-purple-50/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`material-symbols-outlined text-base ${
                                currentAns.level === 'di_atas_ekspektasi' ? 'text-purple-700' : 'text-slate-300'
                              }`}>
                                {currentAns.level === 'di_atas_ekspektasi' ? 'radio_button_checked' : 'radio_button_unchecked'}
                              </span>
                              <span className="font-bold text-[11px] text-purple-900">
                                Di Atas Ekspektasi
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100/70 text-purple-800 font-bold">
                              91–100
                            </span>
                          </div>
                          <p className="text-on-surface-variant leading-relaxed text-[11px]">
                            {ind.diAtas.deskripsi}
                          </p>
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Form Ekspektasi Khusus & Umpan Balik Berkala Pimpinan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-outline-variant/20">
                {/* Ekspektasi Khusus Pimpinan */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-indigo-600">psychology</span>
                    Ekspektasi Khusus Pimpinan:
                  </label>
                  {isEditable ? (
                    <textarea
                      rows={3}
                      value={item.ekspektasi_khusus}
                      onChange={e => handleEkspektasiChange(aspek.id, e.target.value)}
                      className="w-full bg-white border border-outline-variant/50 rounded-2xl p-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                      placeholder="Tuliskan ekspektasi spesifik pimpinan terhadap perilaku pegawai ini..."
                    />
                  ) : (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-200/50 rounded-2xl text-xs text-indigo-950 italic leading-relaxed min-h-[76px]">
                      &ldquo;{item.ekspektasi_khusus || 'Lebih mengutamakan pelayanan dan kepentingan institusi.'}&rdquo;
                    </div>
                  )}
                </div>

                {/* Umpan Balik Berkala Berdasarkan Bukti Dukung (Atasan) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-600">forum</span>
                      Umpan Balik Berkala (Atasan):
                    </label>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => handleApplyRecommendedFeedback(aspek.id)}
                        className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Terapkan narasi rekomendasi otomatis berdasarkan opsi kuesioner terpilih"
                      >
                        <span className="material-symbols-outlined text-xs text-indigo-600">auto_fix_high</span>
                        Gunakan Narasi Kuesioner
                      </button>
                    )}
                  </div>
                  {isEditable ? (
                    <textarea
                      rows={3}
                      value={item.umpan_balik}
                      onChange={e => handleUmpanBalikChange(aspek.id, e.target.value)}
                      className="w-full bg-white border border-outline-variant/50 rounded-2xl p-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                      placeholder="Masukkan catatan penilaian berkala / apresiasi atau perbaikan yang harus dilakukan..."
                    />
                  ) : (
                    <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-2xl text-xs text-amber-950 italic leading-relaxed min-h-[76px]">
                      &ldquo;{item.umpan_balik || 'Menunjukkan komitmen dan integritas yang konsisten dalam bekerja.'}&rdquo;
                    </div>
                  )}
                </div>
              </div>

            </div>
          )
        })}
      </div>

      {/* ── Bottom Save Action ── */}
      {isEditable && (
        <div className="flex justify-end p-5 bg-white rounded-3xl border border-outline-variant/30 shadow-xs">
          <button
            onClick={handleSaveAssessment}
            disabled={isSaving}
            className="px-8 py-3 rounded-2xl bg-primary text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan Penilaian...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">save</span>
                Simpan Seluruh Penilaian Perilaku Atasan
              </>
            )}
          </button>
        </div>
      )}

    </div>
  )
}
