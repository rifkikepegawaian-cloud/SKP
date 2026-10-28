'use client'

import { useState, useEffect, useMemo } from 'react'
import { User } from '@/lib/types'
import { generateCascadingFormula } from '@/lib/skpFormulas'
import SearchableUserSelect from './SearchableUserSelect'

export interface AllocationRow {
  userId: string
  target: string | number
  namaTugas?: string
  satuan?: string
  sasaranKinerja?: string
  indikatorKinerjaIndividu?: string
}

interface TargetSplitterModalProps {
  isOpen: boolean
  onClose: () => void
  levelTitle: string
  parentName: string
  parentSubtitle?: string
  parentTarget: string | number
  satuan: string
  requiresTaskName?: boolean // true if Manajer creating Uraian Tugas or SPV creating Sub-Uraian
  taskNameLabel?: string
  taskNamePlaceholder?: string
  taskNameSuggestions?: string[]
  targetRoleLabel?: string
  filterUnitEs2?: string
  allowEditParentTarget?: boolean
  currentCascadingLevel?: 'sukpa' | 'unit' | 'manajer' | 'spv' | 'staff'
  kodeIku?: string
  subordinates: User[]
  onSave: (
    allocations: AllocationRow[], 
    isDirectSync: boolean, 
    updatedParent?: { target: string | number; satuan: string }
  ) => Promise<void>
}

export default function TargetSplitterModal({
  isOpen,
  onClose,
  levelTitle,
  parentName,
  parentSubtitle,
  parentTarget,
  satuan,
  requiresTaskName = false,
  taskNameLabel = 'Nama Uraian Tugas',
  taskNamePlaceholder = 'Contoh: Penyusunan Laporan Evaluasi Kinerja...',
  taskNameSuggestions,
  targetRoleLabel = 'Pejabat / Pegawai Bawahan',
  filterUnitEs2,
  allowEditParentTarget = true,
  currentCascadingLevel = 'staff',
  kodeIku,
  subordinates,
  onSave,
}: TargetSplitterModalProps) {
  // State target induk lokal (agar bisa disesuaikan langsung oleh Rektor / Unit)
  const [currentTarget, setCurrentTarget] = useState<string | number>(parentTarget)
  const [currentSatuan, setCurrentSatuan] = useState<string>(satuan)
  const [isEditingParent, setIsEditingParent] = useState(allowEditParentTarget)

  const [rows, setRows] = useState<AllocationRow[]>([
    { userId: '', target: parentTarget, namaTugas: '', satuan: satuan || 'Laporan' }
  ])
  const [isDirectSync, setIsDirectSync] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Deteksi cerdas apakah target bertipe Rasio atau Kualitatif (misal '1:50', 'Rasio', '1:20')
  const isRatioOrText = useMemo(() => {
    const s = String(currentSatuan || '').toLowerCase().trim()
    const t = String(currentTarget || '').trim()
    return s === 'rasio' || s.includes('rasio') || t.includes(':') || (isNaN(Number(t)) && t.length > 0)
  }, [currentSatuan, currentTarget])

  const handleParentTargetChange = (val: string) => {
    setCurrentTarget(val)
    if (rows.length === 1 && !requiresTaskName) {
      setRows([{ ...rows[0], target: val }])
    }
  }

  useEffect(() => {
    if (isOpen) {
      setCurrentTarget(parentTarget)
      setCurrentSatuan(satuan)
      setIsEditingParent(allowEditParentTarget)

      const initialFormula = generateCascadingFormula({
        level: currentCascadingLevel,
        parentTitle: parentName,
        taskName: '',
        satuan,
        kodeIku,
      })

      const defaultSubordinate = subordinates.find(s => s.pegawai?.nama_lengkap) || subordinates[0]
      setRows([
        { 
          userId: defaultSubordinate?.id || '', 
          target: requiresTaskName ? '1' : parentTarget, 
          namaTugas: '',
          satuan: satuan || 'Laporan',
          sasaranKinerja: initialFormula.sasaranKinerja,
          indikatorKinerjaIndividu: initialFormula.indikatorKinerjaIndividu,
        }
      ])
      setIsDirectSync(false)
      setErrorMsg(null)
    }
  }, [isOpen, parentTarget, satuan, subordinates, allowEditParentTarget, requiresTaskName, currentCascadingLevel, parentName, kodeIku])

  // Perhitungan numerik untuk mode persentase/kumulatif (hanya jika BUKAN uraian operasional)
  const numericParentTarget = Number(currentTarget) || 100
  const totalAllocated = rows.reduce((acc, r) => acc + (Number(r.target) || 0), 0)
  const remainingTarget = numericParentTarget - totalAllocated
  const percentAllocated = numericParentTarget > 0 ? (totalAllocated / numericParentTarget) * 100 : 0
  const isExact100 = Math.abs(numericParentTarget - totalAllocated) < 0.001

  // Status validasi mode rasio: semua bawahan wajib memiliki target terisi
  const isRatioValid = rows.length > 0 && rows.every(r => String(r.target).trim().length > 0 && !!r.userId)

  // Validasi mode uraian tugas operasional (Manajer -> SPV, SPV -> Staff):
  // Setiap baris wajib memilih bawahan, nama tugas terisi, dan target terisi
  const isOperationalValid = rows.length > 0 && rows.every(
    r => !!r.userId && !!r.namaTugas?.trim() && String(r.target).trim().length > 0
  )

  const isFormValid = requiresTaskName ? isOperationalValid : (isRatioOrText ? isRatioValid : isExact100)

  if (!isOpen) return null

  const handleAddRow = () => {
    // Pada mode uraian operasional, bawahan bisa dipilih berkali-kali untuk uraian tugas berbeda
    const defaultNewTarget = requiresTaskName ? '1' : (isRatioOrText ? currentTarget : (remainingTarget > 0 ? remainingTarget : 0))
    const defaultSub = subordinates.find(s => s.pegawai?.nama_lengkap) || subordinates[0]
    const nextSubordinate = requiresTaskName 
      ? (defaultSub?.id || '') 
      : (subordinates.find(s => !rows.some(r => r.userId === s.id))?.id || defaultSub?.id || '')

    const formula = generateCascadingFormula({
      level: currentCascadingLevel,
      parentTitle: parentName,
      taskName: '',
      satuan: currentSatuan || 'Laporan',
      kodeIku,
    })

    setRows([
      ...rows,
      {
        userId: nextSubordinate,
        target: defaultNewTarget,
        namaTugas: '',
        satuan: currentSatuan || 'Laporan',
        sasaranKinerja: formula.sasaranKinerja,
        indikatorKinerjaIndividu: formula.indikatorKinerjaIndividu,
      }
    ])
  }

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return
    setRows(rows.filter((_, i) => i !== index))
  }

  const handleRowChange = (index: number, field: keyof AllocationRow, value: any) => {
    setRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleFillRemaining = (index: number) => {
    if (isRatioOrText) {
      handleRowChange(index, 'target', currentTarget)
      return
    }
    const otherSum = rows.reduce((acc, r, i) => i === index ? acc : acc + (Number(r.target) || 0), 0)
    const available = Math.max(0, numericParentTarget - otherSum)
    handleRowChange(index, 'target', available)
  }

  const handleApplyParentTargetToAll = () => {
    setRows(prev => prev.map(r => ({ ...r, target: currentTarget })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (subordinates.length === 0) {
      setErrorMsg(`Tidak dapat membagi penugasan karena belum ada akun dengan role ${targetRoleLabel} di sistem. Silakan atur role di Manajemen User terlebih dahulu.`)
      return
    }

    if (requiresTaskName) {
      for (let i = 0; i < rows.length; i++) {
        if (!rows[i].userId) {
          setErrorMsg(`Pilih ${targetRoleLabel} pada baris ke-${i + 1}.`)
          return
        }
        if (!rows[i].namaTugas?.trim()) {
          setErrorMsg(`${taskNameLabel} pada baris ke-${i + 1} wajib diisi.`)
          return
        }
        if (!String(rows[i].target).trim()) {
          setErrorMsg(`Target pada baris ke-${i + 1} wajib diisi.`)
          return
        }
      }
    } else {
      if (!isRatioOrText && !isExact100) {
        setErrorMsg(`Alokasi target belum tepat 100%. Total dialokasikan: ${totalAllocated} / ${numericParentTarget} ${currentSatuan}.`)
        return
      }

      for (let i = 0; i < rows.length; i++) {
        if (!rows[i].userId) {
          setErrorMsg(`Pilih ${targetRoleLabel} pada baris ke-${i + 1}.`)
          return
        }
        if (!isRatioOrText && Number(rows[i].target) <= 0) {
          setErrorMsg(`Target pada baris ke-${i + 1} harus lebih besar dari 0.`)
          return
        }
        if (isRatioOrText && !String(rows[i].target).trim()) {
          setErrorMsg(`Target rasio pada baris ke-${i + 1} tidak boleh kosong.`)
          return
        }
      }
    }

    try {
      setIsSubmitting(true)
      const hasParentChanged = currentTarget !== parentTarget || currentSatuan !== satuan
      const updatedParent = hasParentChanged ? { target: currentTarget, satuan: currentSatuan } : undefined

      await onSave(rows, isDirectSync, updatedParent)
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan penugasan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-outline-variant/30 overflow-hidden"
        style={{ animation: 'scaleUp 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">call_split</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                Penugasan & Pembagian Target (Cascading)
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant">
                {levelTitle} &bull; {requiresTaskName ? 'Penetapan Uraian Tugas & Target Operasional' : (isRatioOrText ? 'Penetapan Target Rasio Kinerja' : 'Wajib 100% Target Dialokasikan')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Parent Item Card (Target Induk & Pengaturan Satuan) */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 space-y-3">
            <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
              <span className="uppercase tracking-wider font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">flag</span>
                {allowEditParentTarget ? 'Target & Satuan Output Kinerja' : 'Target Induk Kinerja'}
              </span>
              {allowEditParentTarget && (
                <span className="text-[10px] text-on-surface-variant/70 font-medium">
                  Satuan dapat disesuaikan bebas (bisa berbeda dengan IKU)
                </span>
              )}
            </div>

            <div>
              <p className="font-title-md text-sm font-bold text-on-surface leading-snug">
                {parentName}
              </p>
              {parentSubtitle && (
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                  {parentSubtitle}
                </p>
              )}
            </div>

            {/* Quick Badge / Form Editor for Parent Target */}
            {!allowEditParentTarget ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-3 py-1 rounded-xl bg-primary text-white font-bold text-xs shadow-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">track_changes</span>
                  Target Induk: <b>{currentTarget} {currentSatuan}</b>
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                  requiresTaskName 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : isRatioOrText 
                      ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {requiresTaskName 
                    ? 'Mode: Pembuatan Uraian Tugas Operasional'
                    : (isRatioOrText ? 'Mode: Rasio / Perbandingan' : 'Mode: Persentase / Akumulasi')}
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/40 space-y-3 animate-fade-in">
                <div className="text-[11px] text-on-surface-variant">
                  Tentukan target output dan satuannya yang akan dialokasikan kepada Manajer Bagian:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Nilai Target Output <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentTarget}
                      onChange={e => handleParentTargetChange(e.target.value)}
                      placeholder="Contoh: 1, 10, 100, atau 1:50"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Satuan Output (Fleksibel) <span className="text-error">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={['Dokumen', 'Laporan', 'Berkas', 'Kegiatan', 'Orang', '%', 'Rasio', 'Indeks', 'Paket'].includes(currentSatuan) ? currentSatuan : 'Lainnya'}
                        onChange={e => {
                          if (e.target.value !== 'Lainnya') {
                            setCurrentSatuan(e.target.value)
                          }
                        }}
                        className="w-1/2 px-2 py-1.5 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none font-semibold cursor-pointer"
                      >
                        <option value="Dokumen">Dokumen</option>
                        <option value="Laporan">Laporan</option>
                        <option value="Berkas">Berkas</option>
                        <option value="Kegiatan">Kegiatan</option>
                        <option value="Orang">Orang / Dosen</option>
                        <option value="%">Persen (%)</option>
                        <option value="Rasio">Rasio</option>
                        <option value="Indeks">Indeks</option>
                        <option value="Paket">Paket</option>
                        <option value="Lainnya">Lainnya...</option>
                      </select>
                      <input
                        type="text"
                        value={currentSatuan}
                        onChange={e => setCurrentSatuan(e.target.value)}
                        placeholder="Satuan manual..."
                        className="w-1/2 px-2.5 py-1.5 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Allocation Progress / Ratio / Operational Tasks Status */}
          <div className="space-y-2">
            {requiresTaskName ? (
              // Mode Operasional (Uraian Tugas): Tidak membatasi 100% kumulatif
              <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200/80 flex items-start gap-3.5 animate-fade-in">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-xl">playlist_add_check</span>
                </div>
                <div className="space-y-1 text-xs text-sky-950">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Target Induk Output yang Disepakati:</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-sky-600 text-white font-bold text-[11px] shadow-sm">
                      {currentTarget} {currentSatuan}
                    </span>
                  </div>
                  <p className="text-sky-800 leading-relaxed text-[11px]">
                    Sesuai Output IKU di atas, buat rincian <b>Uraian Tugas</b>, <b>Target</b>, dan <b>Satuan</b> kerja operasional yang akan ditugaskan kepada {targetRoleLabel}. Satu Output IKU dapat dibagi menjadi beberapa Uraian Tugas.
                  </p>
                </div>
              </div>
            ) : !isRatioOrText ? (
              // Mode 1: Persentase / Numerik Kumulatif (Wajib 100%)
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">pie_chart</span>
                    Keterpenuhan Alokasi:
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                    isExact100 
                      ? 'bg-success/10 text-success' 
                      : totalAllocated > numericParentTarget 
                        ? 'bg-error/10 text-error' 
                        : 'bg-warning/15 text-amber-700'
                  }`}>
                    {totalAllocated.toLocaleString('id-ID')} / {numericParentTarget.toLocaleString('id-ID')} {currentSatuan} ({percentAllocated.toFixed(1)}%)
                  </span>
                </div>

                <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      isExact100 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                        : totalAllocated > numericParentTarget 
                          ? 'bg-gradient-to-r from-rose-500 to-red-600' 
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, percentAllocated)}%` }}
                  />
                </div>

                {isExact100 ? (
                  <p className="text-xs text-success flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Alokasi target 100% tepat terpenuhi! Siap ditugaskan ke bawahan.
                  </p>
                ) : totalAllocated < numericParentTarget ? (
                  <p className="text-xs text-amber-700 flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Sisa target yang belum dialokasikan: <b>{remainingTarget.toLocaleString('id-ID')} {currentSatuan}</b>.
                  </p>
                ) : (
                  <p className="text-xs text-error flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-sm">error</span>
                    Alokasi melebihi target induk sebesar <b>{(totalAllocated - numericParentTarget).toLocaleString('id-ID')} {currentSatuan}</b>.
                  </p>
                )}
              </>
            ) : (
              // Mode 2: Rasio / Perbandingan (Misal 1:50)
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-purple-700 text-lg mt-0.5">percent</span>
                  <div className="text-xs text-purple-900">
                    <p className="font-bold">Mode Target Rasio / Standar Kinerja</p>
                    <p className="text-purple-700 mt-0.5">
                      Target berupa perbandingan/rasio (contoh <b>{currentTarget}</b>). Masing-masing {targetRoleLabel} dapat diberikan target rasio yang sama atau disesuaikan.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyParentTargetToAll}
                  className="px-2.5 py-1 rounded-xl bg-purple-600 text-white font-bold text-[10px] hover:bg-purple-700 transition-colors shrink-0 shadow-sm cursor-pointer"
                  title="Terapkan target induk ke semua baris bawahan"
                >
                  Samakan Semua ke {currentTarget}
                </button>
              </div>
            )}
          </div>

          {/* Allocation Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-title-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">
                {requiresTaskName ? `Daftar Uraian Tugas untuk ${targetRoleLabel}` : `Daftar Penugasan ${targetRoleLabel}`}
              </h4>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                {requiresTaskName ? 'Tambah Uraian Tugas' : `Tambah ${targetRoleLabel}`}
              </button>
            </div>

            {subordinates.length === 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-800">
                <span className="material-symbols-outlined text-amber-600 text-lg mt-0.5">warning</span>
                <div>
                  <p className="font-bold">Belum Ada Akun {targetRoleLabel}</p>
                  <p className="mt-0.5 text-amber-700">
                    Tidak ditemukan pegawai dengan role <b>{targetRoleLabel}</b>. Silakan atur hak akses pegawai melalui menu <b>Manajemen User</b> terlebih dahulu.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {rows.map((row, idx) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest/80 space-y-3 transition-all hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-on-surface-variant px-2 py-0.5 rounded-lg bg-surface-container">
                      {requiresTaskName ? `Uraian Tugas #${idx + 1}` : `${targetRoleLabel} #${idx + 1}`}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-error hover:bg-error/10 p-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Hapus baris"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    {/* Subordinate Selection */}
                    <div className={requiresTaskName ? 'md:col-span-4' : 'md:col-span-7'}>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">
                        Pilih {targetRoleLabel} <span className="text-error">*</span>
                      </label>
                      <SearchableUserSelect
                        value={row.userId}
                        onChange={val => handleRowChange(idx, 'userId', val)}
                        users={subordinates}
                        placeholder={`Cari nama atau NIP ${targetRoleLabel}...`}
                        targetRoleLabel={targetRoleLabel}
                        filterUnitEs2={filterUnitEs2}
                        disabled={false}
                        required
                      />
                    </div>

                    {/* Task Description (if applicable) */}
                    {requiresTaskName && (
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">
                          {taskNameLabel} <span className="text-error">*</span>
                        </label>
                        <input
                          type="text"
                          list={`suggestions-${idx}`}
                          value={row.namaTugas || ''}
                          onChange={e => handleRowChange(idx, 'namaTugas', e.target.value)}
                          placeholder={taskNamePlaceholder}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-on-surface-variant/40 text-on-surface hover:border-outline-variant"
                          required
                        />
                        {taskNameSuggestions && taskNameSuggestions.length > 0 && (
                          <datalist id={`suggestions-${idx}`}>
                            {taskNameSuggestions.map((sug, sIdx) => (
                              <option key={sIdx} value={sug} />
                            ))}
                          </datalist>
                        )}
                      </div>
                    )}

                    {/* Target Allocation */}
                    <div className={requiresTaskName ? 'md:col-span-2' : 'md:col-span-5'}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-on-surface-variant">
                          Target <span className="text-error">*</span>
                        </label>
                        {!requiresTaskName && (
                          <button
                            type="button"
                            onClick={() => handleFillRemaining(idx)}
                            className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                            title={isRatioOrText ? 'Gunakan target induk' : 'Isi dengan sisa target yang belum terbagi'}
                          >
                            {isRatioOrText ? 'Set ke Induk' : 'Isi Sisa'}
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        {isRatioOrText && !requiresTaskName ? (
                          <input
                            type="text"
                            value={row.target}
                            onChange={e => handleRowChange(idx, 'target', e.target.value)}
                            placeholder="Contoh: 1:50"
                            className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none font-bold text-on-surface pr-14 transition-all placeholder:text-on-surface-variant/40 hover:border-outline-variant"
                            required
                          />
                        ) : requiresTaskName ? (
                          <input
                            type="text"
                            value={row.target}
                            onChange={e => handleRowChange(idx, 'target', e.target.value)}
                            placeholder="Target..."
                            className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none font-bold text-on-surface transition-all placeholder:text-on-surface-variant/40 hover:border-outline-variant"
                            required
                          />
                        ) : (
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={row.target}
                            onChange={e => handleRowChange(idx, 'target', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none font-bold text-on-surface pr-14 transition-all hover:border-outline-variant"
                            required
                          />
                        )}
                        {!requiresTaskName && (
                          <span className="absolute right-3 top-2 text-[11px] text-on-surface-variant/70 pointer-events-none font-semibold">
                            {currentSatuan}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Satuan input if requiresTaskName */}
                    {requiresTaskName && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">
                          Satuan <span className="text-error">*</span>
                        </label>
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={row.satuan || ''}
                            onChange={e => handleRowChange(idx, 'satuan', e.target.value)}
                            placeholder="Contoh: Berkas, Laporan..."
                            list={`satuan-suggestions-${idx}`}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none font-semibold text-on-surface transition-all placeholder:text-on-surface-variant/40 hover:border-outline-variant"
                            required
                          />
                          <datalist id={`satuan-suggestions-${idx}`}>
                            <option value="Berkas" />
                            <option value="Laporan" />
                            <option value="Dokumen" />
                            <option value="Kegiatan" />
                            <option value="Orang" />
                            <option value="Paket" />
                            <option value="SK" />
                            <option value="Persen (%)" />
                          </datalist>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Formulasi Baku PermenPAN-RB No. 6/2022: Sasaran Kinerja & IKI */}
                  <div className="pt-3 border-t border-outline-variant/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-sm">psychology</span>
                        Kaidah PermenPAN-RB No. 6/2022
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const formula = generateCascadingFormula({
                            level: currentCascadingLevel,
                            parentTitle: parentName,
                            taskName: row.namaTugas,
                            satuan: row.satuan || currentSatuan,
                            kodeIku,
                          })
                          handleRowChange(idx, 'sasaranKinerja', formula.sasaranKinerja)
                          handleRowChange(idx, 'indikatorKinerjaIndividu', formula.indikatorKinerjaIndividu)
                        }}
                        className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        title="Otomatis sesuaikan formulasi kalimat Sasaran Kinerja (Ter...) & IKI dengan nama tugas/output"
                      >
                        <span className="material-symbols-outlined text-xs">magic_button</span>
                        Rekomendasikan Kalimat Baku
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-on-surface">
                            Sasaran Kinerja (Hasil yang Diharapkan)
                          </label>
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            Kaidah: &quot;Ter...&quot;
                          </span>
                        </div>
                        <input
                          type="text"
                          value={row.sasaranKinerja || ''}
                          onChange={e => handleRowChange(idx, 'sasaranKinerja', e.target.value)}
                          placeholder="Contoh: Terlaksananya proses verifikasi..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:bg-white focus:border-primary focus:outline-none transition-all text-on-surface"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-on-surface">
                            Indikator Kinerja Individu (IKI)
                          </label>
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            Tolok Ukur / Output
                          </span>
                        </div>
                        <input
                          type="text"
                          value={row.indikatorKinerjaIndividu || ''}
                          onChange={e => handleRowChange(idx, 'indikatorKinerjaIndividu', e.target.value)}
                          placeholder="Contoh: Jumlah berkas usulan / Output..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:bg-white focus:border-primary focus:outline-none transition-all text-on-surface"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Sync Option Toggle */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 flex items-start gap-3">
            <input
              type="checkbox"
              id="directSyncToggle"
              checked={isDirectSync}
              onChange={e => setIsDirectSync(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant cursor-pointer"
            />
            <label htmlFor="directSyncToggle" className="cursor-pointer space-y-1">
              <span className="text-xs font-bold text-on-surface block">
                Sinkronisasi Capaian Langsung (Direct Sync)
              </span>
              <span className="text-[11px] text-on-surface-variant block leading-relaxed">
                Jika diaktifkan, capaian dari bawahan yang telah disetujui akan <b>otomatis menjadi angka dan evidence realisasi Anda</b>. 
                Jika dinonaktifkan, data bawahan hanya tampil sebagai rekomendasi rujukan.
              </span>
            </label>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-white shadow-lg transition-all ${
              isFormValid && !isSubmitting
                ? 'bg-primary hover:bg-primary/90 shadow-primary/20 cursor-pointer'
                : 'bg-outline-variant/60 cursor-not-allowed text-on-surface-variant/50'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Menyimpan Penugasan...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">send</span>
                Kirim Penugasan Cascading
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
