'use client'

import { useState } from 'react'

interface SanggahanModalProps {
  isOpen: boolean
  onClose: () => void
  taskTitle: string
  currentSatuan: string
  currentTarget: string | number
  assignedByName?: string
  onSubmit: (catatan: string, targetUsulan?: string) => Promise<void>
}

export default function SanggahanModal({
  isOpen,
  onClose,
  taskTitle,
  currentSatuan,
  currentTarget,
  assignedByName,
  onSubmit,
}: SanggahanModalProps) {
  const [catatan, setCatatan] = useState('')
  const [targetUsulan, setTargetUsulan] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catatan.trim()) {
      setErrorMsg('Alasan atau catatan sanggahan wajib diisi.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMsg(null)
      await onSubmit(catatan, targetUsulan.trim() || undefined)
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengirim sanggahan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg flex flex-col rounded-3xl bg-white shadow-2xl border border-outline-variant/30 overflow-hidden"
        style={{ animation: 'scaleUp 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">gavel</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-base font-bold text-on-surface">
                Ajukan Sanggahan Tugas & Target
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Dialog Kinerja &bull; Kirim Catatan ke Pimpinan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Detail Tugas Asal */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>Pemberi Tugas: <b>{assignedByName || 'Atasan Langsung'}</b></span>
              <span className="font-bold px-2 py-0.5 rounded-lg bg-surface-container text-on-surface">
                Target: {currentTarget} {currentSatuan}
              </span>
            </div>
            <p className="font-title-md text-xs font-semibold text-on-surface leading-snug">
              {taskTitle}
            </p>
          </div>

          {/* Catatan Sanggahan */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-on-surface">
              Alasan / Pertimbangan Sanggahan <span className="text-error">*</span>
            </label>
            <textarea
              rows={4}
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Jelaskan kendala, analisis beban kerja, atau alasan mengapa target/uraian tugas ini perlu disesuaikan..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:outline-none transition-colors leading-relaxed resize-none"
              required
            />
          </div>

          {/* Usulan Target Baru (Opsional) */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-on-surface">
              Usulan Target Baru ({currentSatuan}) <span className="text-on-surface-variant font-normal">(Opsional)</span>
            </label>
            <input
              type="text"
              value={targetUsulan}
              onChange={e => setTargetUsulan(e.target.value)}
              placeholder={typeof currentTarget === 'string' && currentTarget.includes(':') ? 'Contoh: 1:60' : 'Contoh: 80 atau 1:60'}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:outline-none font-bold text-on-surface"
            />
            <p className="text-[10px] text-on-surface-variant">
              Biarkan kosong jika keberatan Anda berfokus pada substansi uraian tugas daripada angka target.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !catatan.trim()}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Mengirimkan...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  Kirimkan Sanggahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
