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
import { getStructuralSubordinates } from '@/lib/skpHierarchy'
import Swal from 'sweetalert2'

export default function PerilakuKerjaPage() {
  const { user, activeRole } = useAuthStore()
  const role: UserRole = activeRole || (user?.role?.split(',')[0] as UserRole) || 'staff'
  const { periode } = useCascading()

  // Tab State: 'my_behavior' (Pegawai) vs 'subordinate_behavior' (Pimpinan Menilai)
  const isSuperior = role !== 'staff'
  const [activeTab, setActiveTab] = useState<'my_behavior' | 'subordinate_behavior'>('my_behavior')

  // Subordinates list for superior
  const [subordinates, setSubordinates] = useState<User[]>([])
  const [selectedSubordinateId, setSelectedSubordinateId] = useState<string>('')
  const [isLoadingSubordinates, setIsLoadingSubordinates] = useState(false)

  // Perilaku data state
  // Keyed by aspek_id (1..7)
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
  const [showPrintModal, setShowPrintModal] = useState(false)

  // Determine which user's behavior is currently being viewed/edited
  const currentTargetUser = useMemo(() => {
    if (activeTab === 'subordinate_behavior' && selectedSubordinateId) {
      return subordinates.find(s => s.id === selectedSubordinateId) || null
    }
    return user
  }, [activeTab, selectedSubordinateId, subordinates, user])

  // 1. Fetch subordinates if role is a superior
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
        console.error('Error fetching subordinates:', err)
      } finally {
        setIsLoadingSubordinates(false)
      }
    }

    fetchSubordinates()
  }, [isSuperior, role, user])

  // 2. Fetch behavior data for currentTargetUser
  useEffect(() => {
    if (!currentTargetUser) return

    const loadBehaviorData = async () => {
      setIsLoadingData(true)
      const targetUserId = currentTargetUser.id
      const periodeId = periode?.id || 'default_periode'

      // Local storage fallback key
      const storageKey = `skp_perilaku_${periodeId}_${targetUserId}`

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
            // Defaults from document template
            const defaults: Record<number, NilaiPerilakuItem> = {}
            ASPEK_BERAKHLAK.forEach(aspek => {
              defaults[aspek.id] = {
                aspek_id: aspek.id,
                ekspektasi_khusus: aspek.defaultEkspektasi,
                rating: 'sesuai_ekspektasi',
                umpan_balik: '',
              }
            })
            setItems(defaults)
          }
        }
      } catch (err) {
        console.warn('Fallback to localStorage for perilaku kerja:', err)
        const localSaved = localStorage.getItem(storageKey)
        if (localSaved) {
          setItems(JSON.parse(localSaved))
        }
      } finally {
        setIsLoadingData(false)
      }
    }

    loadBehaviorData()
  }, [currentTargetUser, periode?.id])

  // Handle field change
  const handleItemChange = (aspekId: number, field: keyof NilaiPerilakuItem, value: any) => {
    setItems(prev => ({
      ...prev,
      [aspekId]: {
        ...prev[aspekId],
        [field]: value,
      },
    }))
  }

  // Quick Action: Reset to standard UNDIP template
  const handleApplyStandardTemplate = () => {
    Swal.fire({
      title: 'Terapkan Ekspektasi Standar?',
      text: 'Ekspektasi khusus pimpinan untuk seluruh 7 aspek BerAKHLAK akan diisi dengan rumusan standar resmi SKP UNDIP.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0059bb',
      cancelButtonColor: '#717786',
      confirmButtonText: 'Ya, Terapkan',
      cancelButtonText: 'Batal',
    }).then(res => {
      if (res.isConfirmed) {
        setItems(prev => {
          const updated = { ...prev }
          ASPEK_BERAKHLAK.forEach(aspek => {
            updated[aspek.id] = {
              ...updated[aspek.id],
              ekspektasi_khusus: aspek.defaultEkspektasi,
            }
          })
          return updated
        })
        Swal.fire({
          icon: 'success',
          title: 'Template Berhasil Diterapkan',
          timer: 1500,
          showConfirmButton: false,
        })
      }
    })
  }

  // Quick Action: Batch set rating
  const handleBatchSetRating = (rating: RatingPerilaku) => {
    setItems(prev => {
      const updated = { ...prev }
      ASPEK_BERAKHLAK.forEach(aspek => {
        updated[aspek.id] = {
          ...updated[aspek.id],
          rating,
        }
      })
      return updated
    })
    Swal.fire({
      icon: 'info',
      title: 'Rating Diperbarui',
      text: `Seluruh aspek perilaku diatur ke: ${RATING_PERILAKU_CONFIG[rating].label}`,
      timer: 1200,
      showConfirmButton: false,
    })
  }

  // Save changes
  const handleSave = async () => {
    if (!currentTargetUser || !user) return
    setIsSaving(true)

    const periodeId = periode?.id || 'default_periode'
    const targetUserId = currentTargetUser.id
    const storageKey = `skp_perilaku_${periodeId}_${targetUserId}`

    try {
      // 1. Save to localStorage immediately
      localStorage.setItem(storageKey, JSON.stringify(items))

      // 2. Try saving to Supabase if table exists
      const supabase = createClient()
      const payload: SKPPerilakuKerja[] = ASPEK_BERAKHLAK.map(aspek => ({
        periode_id: periodeId,
        user_id: targetUserId,
        penilai_user_id: user.id,
        aspek_id: aspek.id,
        aspek_nama: aspek.nama,
        ekspektasi_khusus: items[aspek.id]?.ekspektasi_khusus || aspek.defaultEkspektasi,
        rating: items[aspek.id]?.rating || 'sesuai_ekspektasi',
        umpan_balik: items[aspek.id]?.umpan_balik || '',
      }))

      const { error } = await supabase
        .from('skp_perilaku_kerja')
        .upsert(payload, { onConflict: 'periode_id,user_id,aspek_id' })

      if (error) {
        console.warn('Supabase upsert skp_perilaku_kerja:', error.message)
      }

      Swal.fire({
        icon: 'success',
        title: 'Perubahan Tersimpan!',
        text: 'Penilaian perilaku kerja dan ekspektasi pimpinan telah berhasil diperbarui.',
        confirmButtonColor: '#0059bb',
      })
    } catch (err: any) {
      console.error('Save error:', err)
      Swal.fire({
        icon: 'success',
        title: 'Tersimpan di Sesi Lokal',
        text: 'Data perilaku kerja tersimpan aman di perangkat Anda.',
        confirmButtonColor: '#0059bb',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Aggregated Rating Summary
  const aggregateRating = useMemo(() => {
    const ratings = Object.values(items).map(i => i.rating)
    const above = ratings.filter(r => r === 'di_atas_ekspektasi').length
    const below = ratings.filter(r => r === 'di_bawah_ekspektasi').length

    if (below >= 2) return 'di_bawah_ekspektasi'
    if (above >= 4 && below === 0) return 'di_atas_ekspektasi'
    return 'sesuai_ekspektasi'
  }, [items])

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. PAGE HEADER                                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <Link href="/cascading" className="font-semibold text-primary hover:underline">
              Cascading & Rencana SKP
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-on-surface font-medium">Perilaku Kerja (Core Values BerAKHLAK)</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Penilaian Perilaku Kerja & Ekspektasi Pimpinan
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Panduan perilaku 7 Core Values ASN BerAKHLAK, penetapan ekspektasi khusus pimpinan, dan umpan balik berkelanjutan (PermenPAN-RB No. 6 Tahun 2022).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 text-on-surface text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-primary">print</span>
            Format Cetak SKP
          </button>

          {activeTab === 'subordinate_behavior' && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">
                {isSaving ? 'sync' : 'save'}
              </span>
              {isSaving ? 'Menyimpan...' : 'Simpan Penilaian & Ekspektasi'}
            </button>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. TAB SWITCHER (FOR SUPERIORS)                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      {isSuperior && (
        <div className="flex border-b border-outline-variant/30 gap-6 text-sm font-bold print:hidden">
          <button
            onClick={() => setActiveTab('my_behavior')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'my_behavior'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">person</span>
            Perilaku Kerja Saya
          </button>

          <button
            onClick={() => setActiveTab('subordinate_behavior')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'subordinate_behavior'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">supervised_user_circle</span>
            Penilaian & Ekspektasi Bawahan
            <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary">
              {subordinates.length} Pegawai
            </span>
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. SUBORDINATE SELECTOR BAR (WHEN IN SUBORDINATE TAB)        */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'subordinate_behavior' && isSuperior && (
        <div className="p-5 rounded-3xl bg-white border border-outline-variant/30 shadow-xs space-y-4 print:hidden animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-lg">manage_accounts</span>
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface">Pilih Pegawai Bawahan yang Dinilai:</p>
                <p className="text-[11px] text-on-surface-variant">
                  Tentukan ekspektasi khusus pimpinan dan berikan evaluasi berkala perilaku BerAKHLAK.
                </p>
              </div>
            </div>

            {/* Quick Action Tools */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleApplyStandardTemplate}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-[11px] font-bold text-primary flex items-center gap-1 transition-colors cursor-pointer"
                title="Terapkan teks ekspektasi baku sesuai scan dokumen SKP"
              >
                <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                Template Standar UNDIP
              </button>

              <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-xl border border-outline-variant/30 text-[11px]">
                <span className="text-on-surface-variant px-1.5 text-[10px] font-semibold">Set Semua:</span>
                <button
                  type="button"
                  onClick={() => handleBatchSetRating('sesuai_ekspektasi')}
                  className="px-2 py-0.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold transition-colors"
                >
                  Sesuai
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchSetRating('di_atas_ekspektasi')}
                  className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold transition-colors"
                >
                  Di Atas
                </button>
              </div>
            </div>
          </div>

          {/* Subordinates Dropdown / Pills */}
          {isLoadingSubordinates ? (
            <div className="py-2 text-xs text-on-surface-variant animate-pulse">Memuat daftar pegawai bawahan...</div>
          ) : subordinates.length === 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 text-amber-900 text-xs">
              Belum ada data pegawai bawahan langsung yang terdaftar pada unit ini.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {subordinates.map(sub => {
                const isSelected = sub.id === selectedSubordinateId
                const nama = sub.pegawai?.nama_lengkap || sub.email
                const nip = sub.pegawai?.nip || ''
                const roleBadge = ROLE_LABELS[sub.role as UserRole] || sub.role

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubordinateId(sub.id)}
                    className={`px-3.5 py-2 rounded-2xl text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/25 scale-[1.01]'
                        : 'bg-surface-container-lowest hover:bg-surface-container-low border-outline-variant/30 text-on-surface'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      {nama.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">{nama}</p>
                      <p className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-on-surface-variant'}`}>
                        {roleBadge} {nip ? `• ${nip}` : ''}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. SUMMARY BANNER (PREDIKAT PERILAKU KERJA)                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary/10 via-white to-primary/5 border border-primary/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-2xl">psychology</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                {activeTab === 'my_behavior' ? 'Evaluasi Perilaku Kerja Anda' : 'Evaluasi Perilaku Pegawai Terpilih'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${RATING_PERILAKU_CONFIG[aggregateRating].badgeClass}`}>
                {RATING_PERILAKU_CONFIG[aggregateRating].label}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-on-surface mt-0.5">
              {currentTargetUser?.pegawai?.nama_lengkap || currentTargetUser?.email || 'Pegawai'}
            </h3>
            <p className="text-xs text-on-surface-variant">
              NIP: {currentTargetUser?.pegawai?.nip || '-'} • Unit: {currentTargetUser?.pegawai?.unit_es2 || 'Universitas Diponegoro'}
            </p>
          </div>
        </div>

        <div className="text-xs text-on-surface-variant md:text-right">
          <p className="font-semibold text-on-surface">Pedoman Penilaian PermenPAN-RB No. 6/2022</p>
          <p className="text-[11px] text-on-surface-variant/80">
            Nilai perilaku disandingkan dengan hasil capaian kinerja untuk menetapkan Predikat Kinerja Akhir.
          </p>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. SEVEN CORE VALUES LIST (BERAKHLAK)                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      {isLoadingData ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3">
          <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
            <span className="material-symbols-outlined text-xl">sync</span>
          </div>
          <p className="text-xs font-medium text-on-surface-variant">Memuat data perilaku kerja & ekspektasi...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ASPEK_BERAKHLAK.map(aspek => {
            const currentItem = items[aspek.id] || {
              aspek_id: aspek.id,
              ekspektasi_khusus: aspek.defaultEkspektasi,
              rating: 'sesuai_ekspektasi',
              umpan_balik: '',
            }

            const canEdit = activeTab === 'subordinate_behavior' && isSuperior

            return (
              <div
                key={aspek.id}
                className="bg-white rounded-3xl border border-outline-variant/30 shadow-xs hover:border-primary/30 transition-all p-6 md:p-7 space-y-5"
              >
                {/* Header Aspek */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
                      {aspek.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-on-surface capitalize">
                          {aspek.nama}
                        </h4>
                        <span className="material-symbols-outlined text-sm text-primary">
                          {aspek.icon}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {aspek.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Rating Indicator */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-on-surface-variant">Status Penilaian:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                      RATING_PERILAKU_CONFIG[currentItem.rating].badgeClass
                    }`}>
                      <span className="material-symbols-outlined text-xs">
                        {RATING_PERILAKU_CONFIG[currentItem.rating].icon}
                      </span>
                      {RATING_PERILAKU_CONFIG[currentItem.rating].label}
                    </span>
                  </div>
                </div>

                {/* Content Grid: 3 Panduan Perilaku VS Ekspektasi Khusus Pimpinan */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
                  {/* Left Column (5 cols): 3 Panduan Perilaku Baku */}
                  <div className="lg:col-span-5 space-y-2.5 p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                      Panduan Perilaku (Indikator Baku):
                    </span>
                    <ul className="space-y-2 text-on-surface">
                      {aspek.panduan.map((p, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5 shrink-0">
                            check_small
                          </span>
                          <span className="leading-relaxed font-medium">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right Column (7 cols): Ekspektasi Khusus Pimpinan & Umpan Balik */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Box: Ekspektasi Khusus Pimpinan */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">assignment_turned_in</span>
                          Ekspektasi Khusus Pimpinan:
                        </label>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleItemChange(aspek.id, 'ekspektasi_khusus', aspek.defaultEkspektasi)}
                            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            Reset Standar
                          </button>
                        )}
                      </div>

                      {canEdit ? (
                        <textarea
                          rows={2}
                          value={currentItem.ekspektasi_khusus}
                          onChange={e => handleItemChange(aspek.id, 'ekspektasi_khusus', e.target.value)}
                          placeholder="Tuliskan ekspektasi kualitatif pimpinan terhadap perilaku pegawai ini..."
                          className="w-full px-3.5 py-2.5 rounded-2xl border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary text-xs bg-white text-on-surface placeholder:text-on-surface-variant/40 leading-relaxed"
                        />
                      ) : (
                        <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-on-surface font-medium leading-relaxed">
                          {currentItem.ekspektasi_khusus || (
                            <span className="italic text-on-surface-variant">Belum ada ekspektasi khusus yang dicatat.</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Box: Penilaian Rating & Umpan Balik Berkelanjutan */}
                    {canEdit ? (
                      <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-on-surface">
                            Penilaian Pimpinan:
                          </span>
                          <div className="flex items-center gap-1.5">
                            {(['di_atas_ekspektasi', 'sesuai_ekspektasi', 'di_bawah_ekspektasi'] as RatingPerilaku[]).map(r => {
                              const cfg = RATING_PERILAKU_CONFIG[r]
                              const isSelected = currentItem.rating === r
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => handleItemChange(aspek.id, 'rating', r)}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                    isSelected
                                      ? `${cfg.badgeClass} scale-105 shadow-xs`
                                      : 'bg-white text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-low'
                                  }`}
                                >
                                  {cfg.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                            Umpan Balik Berkelanjutan (Ongoing Feedback / Catatan Pembinaan):
                          </label>
                          <input
                            type="text"
                            value={currentItem.umpan_balik || ''}
                            onChange={e => handleItemChange(aspek.id, 'umpan_balik', e.target.value)}
                            placeholder="Contoh: Sangat cekatan dalam merespons pertanyaan mahasiswa, pertahankan!"
                            className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 focus:border-primary text-xs bg-white text-on-surface"
                          />
                        </div>
                      </div>
                    ) : (
                      currentItem.umpan_balik && (
                        <div className="p-3 rounded-2xl bg-sky-50/80 border border-sky-200/80 flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-sky-600 text-base mt-0.5">comment</span>
                          <div>
                            <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wide block">
                              Umpan Balik Berkelanjutan dari Pimpinan:
                            </span>
                            <p className="text-xs text-sky-950 font-medium leading-relaxed">
                              "{currentItem.umpan_balik}"
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 6. MODAL FORMAT CETAK SKP PERILAKU KERJA (PERSIS SCAN RESMI) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:static">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-outline-variant/30 overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none">
            {/* Header Dialog (Print Controls) */}
            <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">description</span>
                <span className="font-bold text-sm text-on-surface">Format Dokumen Perilaku Kerja Resmi</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                  PermenPAN-RB No. 6/2022
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Cetak (Print / PDF)
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Document Body (Table Matching Uploaded Scan) */}
            <div className="p-8 md:p-12 overflow-y-auto space-y-6 text-on-surface font-sans print:p-0 print:overflow-visible">
              <div className="text-center space-y-1 pb-2 border-b border-on-surface/20">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-on-surface-variant">
                  UNIVERSITAS DIPONEGORO
                </h3>
                <h2 className="text-base font-black uppercase tracking-wider text-on-surface" style={{ fontFamily: 'Manrope' }}>
                  LAMPIRAN PERILAKU KERJA SASARAN KINERJA PEGAWAI (SKP)
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Pegawai: <b>{currentTargetUser?.pegawai?.nama_lengkap || currentTargetUser?.email}</b> (NIP: {currentTargetUser?.pegawai?.nip || '-'})
                </p>
              </div>

              {/* Exact Table Format from User Image */}
              <div className="border border-on-surface text-xs">
                {/* Header Table */}
                <div className="bg-[#c2d7f2] font-black p-2 border-b border-on-surface text-black tracking-wide">
                  PERILAKU KERJA*
                </div>

                <table className="w-full text-left border-collapse">
                  <tbody>
                    {ASPEK_BERAKHLAK.map((aspek, idx) => {
                      const itemData = items[aspek.id]
                      const ekspektasi = itemData?.ekspektasi_khusus || aspek.defaultEkspektasi

                      return (
                        <tr key={aspek.id} className="border-b border-on-surface">
                          {/* Col 1: Number */}
                          <td className="w-8 p-2.5 text-center align-top border-r border-on-surface font-bold">
                            {idx + 1}
                          </td>

                          {/* Col 2: Aspek & Panduan Perilaku */}
                          <td className="p-2.5 align-top border-r border-on-surface w-1/2">
                            <p className="font-bold text-on-surface capitalize mb-1">
                              {aspek.nama}
                            </p>
                            <ul className="space-y-0.5 text-on-surface text-[11px]">
                              {aspek.panduan.map((pd, pIndex) => (
                                <li key={pIndex} className="flex items-start">
                                  <span className="mr-1.5">-</span>
                                  <span>{pd}</span>
                                </li>
                              ))}
                            </ul>
                          </td>

                          {/* Col 3: Ekspektasi Khusus Pimpinan */}
                          <td className="p-2.5 align-top w-1/2 space-y-1">
                            <p className="font-bold text-on-surface text-[11px]">
                              Ekspektasi Khusus Pimpinan:
                            </p>
                            <p className="text-on-surface font-medium text-[11px] leading-relaxed">
                              {ekspektasi}
                            </p>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Note PermenPAN-RB */}
              <p className="text-[10px] text-on-surface-variant italic">
                * Sesuai Format Lampiran PermenPAN-RB No. 6 Tahun 2022 tentang Pengelolaan Kinerja Pegawai Aparatur Sipil Negara.
              </p>

              {/* Tanda Tangan */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-center border-t border-on-surface/20">
                <div className="space-y-14">
                  <p className="text-on-surface-variant">Pegawai yang Dinilai,</p>
                  <div>
                    <p className="font-bold underline text-on-surface">
                      {currentTargetUser?.pegawai?.nama_lengkap || currentTargetUser?.email}
                    </p>
                    <p className="text-[11px] text-on-surface-variant font-mono">
                      NIP. {currentTargetUser?.pegawai?.nip || '..............................'}
                    </p>
                  </div>
                </div>

                <div className="space-y-14">
                  <div>
                    <p className="text-on-surface-variant">
                      Semarang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-on-surface-variant">Pejabat Penilai Kinerja,</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-on-surface">
                      {user?.pegawai?.nama_lengkap || user?.email || '(Nama Pejabat Penilai)'}
                    </p>
                    <p className="text-[11px] text-on-surface-variant font-mono">
                      NIP. {user?.pegawai?.nip || '..............................'}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
