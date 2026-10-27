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

  // Perilaku data state (keyed by aspek_id: 1..7)
  const [items, setItems] = useState<Record<number, NilaiPerilakuItem>>(() => {
    const initial: Record<number, NilaiPerilakuItem> = {}
    ASPEK_BERAKHLAK.forEach(aspek => {
      initial[aspek.id] = {
        aspek_id: aspek.id,
        ekspektasi_khusus: aspek.defaultEkspektasi,
        rating: 'sesuai_ekspektasi',
        umpan_balik: '',
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

  // 2. Fetch or load Perilaku Evaluation data for current target user
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

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('skp_perilaku_kerja')
          .select('*')
          .eq('periode_id', periodeId)
          .eq('user_id', targetUserId)

        if (!error && data && data.length > 0) {
          const loaded: Record<number, NilaiPerilakuItem> = {}
          ASPEK_BERAKHLAK.forEach(aspek => {
            const row = (data as SKPPerilakuKerja[]).find(r => r.aspek_id === aspek.id)
            loaded[aspek.id] = {
              aspek_id: aspek.id,
              ekspektasi_khusus: row?.ekspektasi_khusus || aspek.defaultEkspektasi,
              rating: (row?.rating as RatingPerilaku) || 'sesuai_ekspektasi',
              umpan_balik: row?.umpan_balik || '',
            }
          })
          setItems(loaded)
        } else {
          // Check localStorage fallback
          const localSaved = localStorage.getItem(storageKey)
          if (localSaved) {
            setItems(JSON.parse(localSaved))
          } else {
            // Default configuration
            const defaults: Record<number, NilaiPerilakuItem> = {}
            ASPEK_BERAKHLAK.forEach(aspek => {
              defaults[aspek.id] = {
                aspek_id: aspek.id,
                ekspektasi_khusus: aspek.defaultEkspektasi,
                rating: 'sesuai_ekspektasi',
                umpan_balik: 'Menunjukkan komitmen dan integritas yang konsisten dalam bekerja.',
              }
            })
            setItems(defaults)
          }
        }
      } catch (err) {
        console.warn('Fallback to localStorage for perilaku evaluation:', err)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchPerilaku()
  }, [currentTargetUser, periode])

  // Handle rating change
  const handleRatingChange = (aspekId: number, rating: RatingPerilaku) => {
    setItems(prev => ({
      ...prev,
      [aspekId]: {
        ...prev[aspekId],
        rating,
      },
    }))
  }

  // Handle umpan balik change
  const handleUmpanBalikChange = (aspekId: number, umpan_balik: string) => {
    setItems(prev => ({
      ...prev,
      [aspekId]: {
        ...prev[aspekId],
        umpan_balik,
      },
    }))
  }

  // Handle ekspektasi khusus change
  const handleEkspektasiChange = (aspekId: number, ekspektasi_khusus: string) => {
    setItems(prev => ({
      ...prev,
      [aspekId]: {
        ...prev[aspekId],
        ekspektasi_khusus,
      },
    }))
  }

  // 3. Save Evaluation
  const handleSaveAssessment = async () => {
    if (!currentTargetUser) return

    setIsSaving(true)
    const targetUserId = currentTargetUser.id
    const periodeId = periode?.id || '2026'
    const storageKey = `evaluasi_perilaku_${targetUserId}_${periodeId}`

    try {
      // 1. Save to localStorage immediately
      localStorage.setItem(storageKey, JSON.stringify(items))

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
        title: 'Penilaian Berhasil Disimpan!',
        text: `Evaluasi perilaku untuk ${currentTargetUser.pegawai?.nama_lengkap || currentTargetUser.email} telah tersimpan.`,
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

  // Calculate Overall Predikat Perilaku
  const perilakuMetrics = useMemo(() => {
    const list = Object.values(items)
    const countDiatas = list.filter(i => i.rating === 'di_atas_ekspektasi').length
    const countSesuai = list.filter(i => i.rating === 'sesuai_ekspektasi').length
    const countDibawah = list.filter(i => i.rating === 'di_bawah_ekspektasi').length

    let predikat = 'Sesuai Ekspektasi'
    let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'

    if (countDibawah >= 3) {
      predikat = 'Dibawah Ekspektasi'
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200'
    } else if (countDiatas >= 4 && countDibawah === 0) {
      predikat = 'Diatas Ekspektasi'
      badgeClass = 'bg-purple-50 text-purple-700 border-purple-200'
    }

    return {
      countDiatas,
      countSesuai,
      countDibawah,
      predikat,
      badgeClass,
    }
  }, [items])

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Evaluasi Kinerja</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Evaluasi Perilaku Kerja</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Evaluasi Perilaku Kerja (Core Values BerAKHLAK)
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Penilaian 7 aspek standar perilaku kerja ASN yang dinilai langsung oleh pimpinan/atasan disertai umpan balik berkala.
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
          <div className="flex items-center gap-2">
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
              Pejabat Penilai (Atasan Langsung): <strong className="text-on-surface">{structuralSuperiors?.pejabatPenilai.nama || 'Atasan Langsung'}</strong>
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
        <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/50 rounded-3xl border border-indigo-200/80 p-6 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-indigo-900 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Predikat Perilaku</span>
              <span className="material-symbols-outlined text-lg text-indigo-600">psychology_alt</span>
            </div>
            <p className="text-2xl font-black text-indigo-950 mt-1">
              {perilakuMetrics.predikat}
            </p>
            <p className="text-xs text-indigo-800/80 mt-1">
              Berdasarkan evaluasi kumulatif 7 nilai dasar BerAKHLAK.
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

      {/* ── 7 Aspek BerAKHLAK Evaluation Cards ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            7 Aspek Penilaian Perilaku Kerja BerAKHLAK
          </h3>
          {activeTab === 'subordinate_assessment' && isSuperior && (
            <button
              onClick={handleSaveAssessment}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  Simpan Penilaian Atasan
                </>
              )}
            </button>
          )}
        </div>

        {ASPEK_BERAKHLAK.map(aspek => {
          const item = items[aspek.id] || {
            aspek_id: aspek.id,
            ekspektasi_khusus: aspek.defaultEkspektasi,
            rating: 'sesuai_ekspektasi' as RatingPerilaku,
            umpan_balik: '',
          }
          const isEditable = activeTab === 'subordinate_assessment' && isSuperior

          return (
            <div
              key={aspek.id}
              className="bg-white rounded-3xl border border-outline-variant/30 p-6 shadow-xs hover:shadow-md transition-all space-y-5"
            >
              {/* Header Aspek */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-outline-variant/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                      {aspek.id}
                    </span>
                    <h4 className="text-base font-bold text-on-surface">
                      {aspek.nama}
                    </h4>
                  </div>
                  <p className="text-xs text-on-surface-variant pl-9">
                    {aspek.tagline}
                  </p>
                </div>

                {/* Rating Selector / Display */}
                <div className="self-start md:self-auto flex-shrink-0">
                  <div className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1.5 md:text-right">
                    Rating Penilaian Atasan:
                  </div>

                  {isEditable ? (
                    <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/30">
                      {(['di_bawah_ekspektasi', 'sesuai_ekspektasi', 'di_atas_ekspektasi'] as RatingPerilaku[]).map(r => {
                        const isSelected = item.rating === r
                        const config = RATING_PERILAKU_CONFIG[r]
                        return (
                          <button
                            key={r}
                            onClick={() => handleRatingChange(aspek.id, r)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? r === 'di_atas_ekspektasi'
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : r === 'sesuai_ekspektasi'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-amber-600 text-white shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface hover:bg-white/60'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">{config.icon}</span>
                            <span>{config.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div>
                      {(() => {
                        const config = RATING_PERILAKU_CONFIG[item.rating]
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs ${config.badgeClass}`}>
                            <span className="material-symbols-outlined text-sm">{config.icon}</span>
                            {config.label}
                          </span>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Panduan Perilaku (Standar ASN) */}
              <div className="p-3.5 bg-surface-container-low/40 rounded-2xl border border-outline-variant/20 text-xs space-y-1.5">
                <p className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">rule</span>
                  Panduan Perilaku Standar:
                </p>
                <ul className="list-disc list-inside space-y-1 text-on-surface-variant pl-2">
                  {aspek.panduan.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>

              {/* Form Ekspektasi Khusus & Umpan Balik Berkala Pimpinan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      "{item.ekspektasi_khusus || aspek.defaultEkspektasi}"
                    </div>
                  )}
                </div>

                {/* Umpan Balik Berkala Berkelanjutan Berdasarkan Bukti Dukung */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-amber-600">forum</span>
                    Umpan Balik Berkala Berdasarkan Bukti Dukung (Atasan):
                  </label>
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
                      "{item.umpan_balik || 'Menunjukkan komitmen dan integritas yang konsisten dalam bekerja.'}"
                    </div>
                  )}
                </div>
              </div>

            </div>
          )
        })}

        {/* Bottom Save Action */}
        {activeTab === 'subordinate_assessment' && isSuperior && (
          <div className="flex justify-end p-4 bg-white rounded-3xl border border-outline-variant/30 shadow-xs">
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

    </div>
  )
}
