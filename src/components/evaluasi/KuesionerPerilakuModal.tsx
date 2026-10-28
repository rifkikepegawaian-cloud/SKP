'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  RUBRIK_PERILAKU_TENDIK,
  RubrikAspekDef,
  LevelPilihan,
  JawabanIndikator,
  skorToRating,
  generateFeedbackAspek,
} from '@/lib/constants/rubrikPerilakuTendik'
import { RatingPerilaku } from '@/lib/types'
import { RATING_PERILAKU_CONFIG } from '@/lib/constants/perilakuKerja'
import Swal from 'sweetalert2'

export interface KuesionerModalProps {
  isOpen: boolean
  onClose: () => void
  targetPegawai: {
    id: string
    nama: string
    nip?: string
    jabatan?: string
  } | null
  periodeId?: string
  initialAspekId?: number
  onApplyResult: (
    results: Record<
      number,
      {
        rating: RatingPerilaku
        umpanBalik: string
        averageScore: number
        answersSummary: Record<string, JawabanIndikator>
      }
    >
  ) => void
}

export default function KuesionerPerilakuModal({
  isOpen,
  onClose,
  targetPegawai,
  periodeId = '2026',
  initialAspekId = 1,
  onApplyResult,
}: KuesionerModalProps) {
  const [activeAspekId, setActiveAspekId] = useState<number>(initialAspekId)
  const [viewAllMode, setViewAllMode] = useState<boolean>(false)

  // Storage key for answers
  const storageKey = targetPegawai
    ? `kuesioner_rubrik_${targetPegawai.id}_${periodeId}`
    : null

  // State answers per indicator (e.g. { '1.1': { level: 'sesuai_ekspektasi', skor: 85 } })
  const [jawaban, setJawaban] = useState<Record<string, JawabanIndikator>>(() => {
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

  // Custom feedback text per aspect
  const [feedbackOverrides, setFeedbackOverrides] = useState<Record<number, string>>({})

  // Load saved answers from localStorage when modal opens or target changes
  useEffect(() => {
    if (!isOpen || !storageKey) return

    setActiveAspekId(initialAspekId || 1)

    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.jawaban) setJawaban(parsed.jawaban)
        if (parsed.feedbacks) setFeedbackOverrides(parsed.feedbacks)
        return
      } catch (e) {
        console.warn('Gagal membaca saved kuesioner:', e)
      }
    }

    // Default if not saved
    const defaults: Record<string, JawabanIndikator> = {}
    RUBRIK_PERILAKU_TENDIK.forEach(aspek => {
      aspek.indikatorList.forEach(ind => {
        defaults[ind.id] = {
          level: 'sesuai_ekspektasi',
          skor: ind.sesuai.skorDefault,
        }
      })
    })
    setJawaban(defaults)
  }, [isOpen, storageKey, initialAspekId])

  // Select an option for an indicator
  const handleSelectOption = (
    indId: string,
    level: LevelPilihan,
    defaultScore: number,
    aspekId: number
  ) => {
    const updated = {
      ...jawaban,
      [indId]: { level, skor: defaultScore },
    }
    setJawaban(updated)

    // Also persist in localStorage
    if (storageKey) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ jawaban: updated, feedbacks: feedbackOverrides })
      )
    }

    // Auto-update feedback for this aspect if not manually edited
    const aspekDef = RUBRIK_PERILAKU_TENDIK.find(a => a.id === aspekId)
    if (aspekDef) {
      const newFeedback = generateFeedbackAspek(aspekDef, updated)
      setFeedbackOverrides(prev => ({
        ...prev,
        [aspekId]: newFeedback,
      }))
    }
  }

  // Active aspect definition
  const currentAspek = useMemo(() => {
    return (
      RUBRIK_PERILAKU_TENDIK.find(a => a.id === activeAspekId) ||
      RUBRIK_PERILAKU_TENDIK[0]
    )
  }, [activeAspekId])

  // Compute metrics per aspect
  const aspekMetrics = useMemo(() => {
    const result: Record<
      number,
      {
        avgScore: number
        rating: RatingPerilaku
        countAnswered: number
        feedback: string
      }
    > = {}

    RUBRIK_PERILAKU_TENDIK.forEach(aspek => {
      let totalSkor = 0
      let count = 0
      aspek.indikatorList.forEach(ind => {
        if (jawaban[ind.id]) {
          totalSkor += jawaban[ind.id].skor
          count++
        }
      })
      const avg = count > 0 ? Math.round((totalSkor / count) * 10) / 10 : 85
      const rating = skorToRating(avg)
      const autoFeedback = generateFeedbackAspek(aspek, jawaban)
      const feedback = feedbackOverrides[aspek.id] || autoFeedback

      result[aspek.id] = {
        avgScore: avg,
        rating,
        countAnswered: count,
        feedback,
      }
    })

    return result
  }, [jawaban, feedbackOverrides])

  // Compute Overall Metric across all 7 aspects
  const overallMetrics = useMemo(() => {
    let totalScoreAll = 0
    let countTotal = 0
    let countDiAtas = 0
    let countSesuai = 0
    let countDiBawah = 0

    RUBRIK_PERILAKU_TENDIK.forEach(aspek => {
      const metric = aspekMetrics[aspek.id]
      if (metric) {
        totalScoreAll += metric.avgScore
        countTotal++
        if (metric.rating === 'di_atas_ekspektasi') countDiAtas++
        else if (metric.rating === 'sesuai_ekspektasi') countSesuai++
        else countDiBawah++
      }
    })

    const overallAvg =
      countTotal > 0 ? Math.round((totalScoreAll / countTotal) * 10) / 10 : 85

    let predikat = 'Sesuai Ekspektasi'
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300'

    if (countDiBawah >= 3) {
      predikat = 'Di Bawah Ekspektasi'
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300'
    } else if (countDiAtas >= 4 && countDiBawah === 0) {
      predikat = 'Di Atas Ekspektasi'
      badgeClass = 'bg-purple-100 text-purple-800 border-purple-300'
    }

    return {
      overallAvg,
      predikat,
      badgeClass,
      countDiAtas,
      countSesuai,
      countDiBawah,
    }
  }, [aspekMetrics])

  // Apply to page
  const handleApply = (applyOnlyCurrent: boolean = false) => {
    const payload: Record<
      number,
      {
        rating: RatingPerilaku
        umpanBalik: string
        averageScore: number
        answersSummary: Record<string, JawabanIndikator>
      }
    > = {}

    const aspectsToApply = applyOnlyCurrent
      ? [currentAspek]
      : RUBRIK_PERILAKU_TENDIK

    aspectsToApply.forEach(aspek => {
      const metric = aspekMetrics[aspek.id]
      payload[aspek.id] = {
        rating: metric.rating,
        umpanBalik: metric.feedback,
        averageScore: metric.avgScore,
        answersSummary: jawaban,
      }
    })

    // Save state
    if (storageKey) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ jawaban, feedbacks: feedbackOverrides })
      )
    }

    onApplyResult(payload)

    Swal.fire({
      icon: 'success',
      title: applyOnlyCurrent
        ? `Hasil Kuesioner Aspek ${currentAspek.singkatan} Diterapkan!`
        : 'Seluruh Hasil Kuesioner (7 Aspek) Diterapkan!',
      text: applyOnlyCurrent
        ? `Nilai rating & umpan balik untuk aspek ${currentAspek.nama} berhasil disesuaikan.`
        : `Nilai rating & narasi umpan balik untuk 7 aspek berhasil diterapkan pada evaluasi perilaku.`,
      timer: 1800,
      showConfirmButton: false,
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-outline-variant/30 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* ── Modal Header ── */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">quiz</span>
                Instrumen Kuesioner BerAKHLAK
              </span>
              <span className="text-xs text-white/70">
                Standar Tenaga Kependidikan
              </span>
            </div>
            <h3 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              Rubrik Penilaian Perilaku Kerja Pegawai
            </h3>
            <p className="text-xs text-white/80">
              Pegawai Dinilai:{' '}
              <strong className="text-white">
                {targetPegawai?.nama || 'Pegawai'}
              </strong>{' '}
              {targetPegawai?.nip ? `(NIP: ${targetPegawai.nip})` : ''} —{' '}
              <span className="text-white/70">
                {targetPegawai?.jabatan || 'Tenaga Kependidikan'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* View Mode Toggle */}
            <button
              onClick={() => setViewAllMode(!viewAllMode)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer text-white border border-white/20"
              title="Ganti tampilan satu per satu aspek atau semua aspek sekaligus"
            >
              <span className="material-symbols-outlined text-sm">
                {viewAllMode ? 'view_carousel' : 'view_agenda'}
              </span>
              {viewAllMode ? 'Mode Per Aspek' : 'Tampilkan Semua Aspek'}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* ── Overall Metric & Rubric Guide Bar ── */}
        <div className="bg-surface-container-low px-6 py-3 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant font-medium">Predikat Kumulatif:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs border ${overallMetrics.badgeClass}`}>
                {overallMetrics.predikat}
              </span>
            </div>
            <div className="text-on-surface-variant">
              Rata-rata Skor: <strong className="text-on-surface">{overallMetrics.overallAvg}</strong> / 100
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-on-surface-variant">
              <span>(Di Atas: <strong className="text-purple-700">{overallMetrics.countDiAtas}</strong>,</span>
              <span>Sesuai: <strong className="text-emerald-700">{overallMetrics.countSesuai}</strong>,</span>
              <span>Di Bawah: <strong className="text-amber-700">{overallMetrics.countDiBawah}</strong>)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
            <span className="font-semibold text-primary">Rentang Rubrik:</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">0–75 Di Bawah</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">76–90 Sesuai</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">91–100 Di Atas</span>
          </div>
        </div>

        {/* ── Aspek Navigation Pills (When not in View All mode) ── */}
        {!viewAllMode && (
          <div className="flex items-center gap-1.5 px-6 py-2.5 bg-white border-b border-outline-variant/20 overflow-x-auto no-scrollbar">
            {RUBRIK_PERILAKU_TENDIK.map(aspek => {
              const isActive = aspek.id === activeAspekId
              const metric = aspekMetrics[aspek.id]
              return (
                <button
                  key={aspek.id}
                  onClick={() => setActiveAspekId(aspek.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/20'
                  }`}
                >
                  <span className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-black">
                    {aspek.id}
                  </span>
                  <span>{aspek.singkatan}</span>
                  {metric && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/30 text-white'
                          : metric.rating === 'di_atas_ekspektasi'
                          ? 'bg-purple-100 text-purple-800'
                          : metric.rating === 'di_bawah_ekspektasi'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {metric.avgScore}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Modal Body (Scrollable Questionnaire Content) ── */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-surface-container-lowest/50">
          {(viewAllMode ? RUBRIK_PERILAKU_TENDIK : [currentAspek]).map(aspek => {
            const metric = aspekMetrics[aspek.id]
            const ratingConfig = RATING_PERILAKU_CONFIG[metric.rating]

            return (
              <div
                key={aspek.id}
                className="bg-white rounded-3xl border border-outline-variant/30 p-6 shadow-xs space-y-5"
              >
                {/* Aspek Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/20">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                        {aspek.id}
                      </span>
                      <h4 className="text-base font-extrabold text-on-surface">
                        {aspek.nama}
                      </h4>
                    </div>
                    <p className="text-xs text-on-surface-variant italic pl-9">
                      "{aspek.definisi}"
                    </p>
                  </div>

                  {/* Aspek Metric Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto pl-9 sm:pl-0">
                    <div className="text-right">
                      <div className="text-[10px] text-outline uppercase font-bold">
                        Skor Aspek: {metric.avgScore}
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${ratingConfig.badgeClass}`}>
                        <span className="material-symbols-outlined text-xs">{ratingConfig.icon}</span>
                        {ratingConfig.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 Indicators Questionnaire Form */}
                <div className="space-y-4">
                  {aspek.indikatorList.map((ind, idx) => {
                    const currentAns = jawaban[ind.id] || {
                      level: 'sesuai_ekspektasi',
                      skor: ind.sesuai.skorDefault,
                    }

                    return (
                      <div
                        key={ind.id}
                        className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-on-surface font-bold text-xs flex-shrink-0">
                              Butir {ind.id}
                            </span>
                            <p className="text-xs font-bold text-on-surface leading-snug">
                              {ind.kriteria}
                            </p>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-primary flex-shrink-0">
                            Skor: {currentAns.skor}
                          </span>
                        </div>

                        {/* 3 Option Rubric Radios */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                          
                          {/* Option 1: Di Bawah Ekspektasi */}
                          <div
                            onClick={() =>
                              handleSelectOption(
                                ind.id,
                                'di_bawah_ekspektasi',
                                ind.diBawah.skorDefault,
                                aspek.id
                              )
                            }
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                              currentAns.level === 'di_bawah_ekspektasi'
                                ? 'bg-amber-50/90 border-amber-500 shadow-sm ring-1 ring-amber-500'
                                : 'bg-white border-outline-variant/30 hover:border-amber-300 hover:bg-amber-50/30'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[11px] text-amber-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">warning</span>
                                Di Bawah Ekspektasi (0–75)
                              </span>
                              {currentAns.level === 'di_bawah_ekspektasi' && (
                                <span className="material-symbols-outlined text-sm text-amber-700">check_circle</span>
                              )}
                            </div>
                            <p className="text-on-surface-variant leading-relaxed text-[11px]">
                              {ind.diBawah.deskripsi}
                            </p>
                          </div>

                          {/* Option 2: Sesuai Ekspektasi */}
                          <div
                            onClick={() =>
                              handleSelectOption(
                                ind.id,
                                'sesuai_ekspektasi',
                                ind.sesuai.skorDefault,
                                aspek.id
                              )
                            }
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                              currentAns.level === 'sesuai_ekspektasi'
                                ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                                : 'bg-white border-outline-variant/30 hover:border-emerald-300 hover:bg-emerald-50/30'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[11px] text-emerald-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Sesuai Ekspektasi (76–90)
                              </span>
                              {currentAns.level === 'sesuai_ekspektasi' && (
                                <span className="material-symbols-outlined text-sm text-emerald-700">check_circle</span>
                              )}
                            </div>
                            <p className="text-on-surface-variant leading-relaxed text-[11px]">
                              {ind.sesuai.deskripsi}
                            </p>
                          </div>

                          {/* Option 3: Di Atas Ekspektasi */}
                          <div
                            onClick={() =>
                              handleSelectOption(
                                ind.id,
                                'di_atas_ekspektasi',
                                ind.diAtas.skorDefault,
                                aspek.id
                              )
                            }
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                              currentAns.level === 'di_atas_ekspektasi'
                                ? 'bg-purple-50/90 border-purple-500 shadow-sm ring-1 ring-purple-500'
                                : 'bg-white border-outline-variant/30 hover:border-purple-300 hover:bg-purple-50/30'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[11px] text-purple-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">star</span>
                                Di Atas Ekspektasi (91–100)
                              </span>
                              {currentAns.level === 'di_atas_ekspektasi' && (
                                <span className="material-symbols-outlined text-sm text-purple-700">check_circle</span>
                              )}
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

                {/* Rekomendasi Umpan Balik Berkala Berdasarkan Pilihan Rubrik */}
                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-200/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-indigo-600">auto_fix_high</span>
                      Rekomendasi Narasi Umpan Balik Berdasarkan Jawaban Rubrik:
                    </label>
                    <button
                      onClick={() => {
                        const rec = generateFeedbackAspek(aspek, jawaban)
                        setFeedbackOverrides(prev => ({
                          ...prev,
                          [aspek.id]: rec,
                        }))
                      }}
                      className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer"
                    >
                      Reset ke Rekomendasi Otomatis
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={metric.feedback}
                    onChange={e =>
                      setFeedbackOverrides(prev => ({
                        ...prev,
                        [aspek.id]: e.target.value,
                      }))
                    }
                    className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:ring-2 focus:ring-indigo-300 leading-relaxed"
                    placeholder="Narasi umpan balik yang akan otomatis dimasukkan ke evaluasi perilaku..."
                  />
                  <p className="text-[10px] text-indigo-900/70">
                    💡 Atasan dapat menyesuaikan catatan narasi di atas sesuai situasi nyata pegawai sebelum diterapkan.
                  </p>
                </div>

              </div>
            )
          })}
        </div>

        {/* ── Modal Footer ── */}
        <div className="p-5 bg-white border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {!viewAllMode && (
              <>
                <button
                  disabled={activeAspekId <= 1}
                  onClick={() => setActiveAspekId(prev => Math.max(1, prev - 1))}
                  className="px-3.5 py-2 rounded-xl border border-outline-variant/40 text-xs font-bold text-on-surface hover:bg-surface-container transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Aspek Sebelumnya
                </button>
                <button
                  disabled={activeAspekId >= 7}
                  onClick={() => setActiveAspekId(prev => Math.min(7, prev + 1))}
                  className="px-3.5 py-2 rounded-xl border border-outline-variant/40 text-xs font-bold text-on-surface hover:bg-surface-container transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  Aspek Berikutnya
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
            >
              Batal
            </button>

            {!viewAllMode && (
              <button
                onClick={() => handleApply(true)}
                className="px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-sm text-primary">done</span>
                Terapkan Aspek {currentAspek.singkatan} Ini Saja
              </button>
            )}

            <button
              onClick={() => handleApply(false)}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              Terapkan Seluruh Hasil Kuesioner (7 Aspek)
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
