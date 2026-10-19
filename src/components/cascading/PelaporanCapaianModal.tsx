'use client'

import { useState } from 'react'
import { uploadToGoogleDrive } from '@/lib/uploadToGoogleDrive'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { CascadingLevel } from '@/lib/types'

interface PelaporanCapaianModalProps {
  isOpen: boolean
  onClose: () => void
  task: {
    id: string
    title: string
    target: string | number
    satuan: string
    level: CascadingLevel
    capaianSaatIni?: number
  }
  onSuccess: () => void
}

export default function PelaporanCapaianModal({
  isOpen,
  onClose,
  task,
  onSuccess,
}: PelaporanCapaianModalProps) {
  const { user } = useAuthStore()
  const [capaian, setCapaian] = useState<string>('')
  const [keterangan, setKeterangan] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const targetAngka = typeof task.target === 'number' ? task.target : (parseFloat(String(task.target)) || 0)
  const capaianAngka = parseFloat(capaian) || 0
  const totalPrediksi = (task.capaianSaatIni || 0) + capaianAngka
  const percentPrediksi = targetAngka > 0 ? (totalPrediksi / targetAngka) * 100 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setErrorMsg('Pengguna tidak terautentikasi.')
      return
    }

    if (capaianAngka <= 0) {
      setErrorMsg('Angka capaian harus lebih besar dari 0.')
      return
    }

    if (!keterangan.trim()) {
      setErrorMsg('Keterangan pengerjaan wajib diisi.')
      return
    }

    try {
      setIsUploading(true)
      setErrorMsg(null)

      let evidenceUrl: string | undefined = undefined
      let evidenceName: string | undefined = undefined

      // 1. Upload evidence to Google Drive via GAS if attached
      if (file) {
        try {
          const uploadRes = await uploadToGoogleDrive(file, `evidence_${task.level}`)
          evidenceUrl = uploadRes.viewUrl || uploadRes.url
          evidenceName = uploadRes.fileName || file.name
        } catch (uploadErr: any) {
          console.warn('Google Drive upload error, continuing without file link:', uploadErr)
          setErrorMsg(`Gagal mengunggah bukti ke Google Drive: ${uploadErr?.message || 'Koneksi bermasalah'}.`)
          setIsUploading(false)
          return
        }
      }

      // 2. Insert into cascading_laporan_kerja
      const supabase = createClient()
      const { error } = await supabase.from('cascading_laporan_kerja').insert([
        {
          level: task.level,
          ref_id: task.id,
          user_id: user.id,
          capaian: capaianAngka,
          keterangan: keterangan.trim(),
          evidence_url: evidenceUrl || null,
          evidence_name: evidenceName || null,
          status: 'pending',
          tanggal_laporan: new Date().toISOString().split('T')[0],
        }
      ])

      if (error) throw error

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving laporan:', err)
      setErrorMsg(err?.message || 'Gagal menyimpan laporan capaian.')
    } finally {
      setIsUploading(false)
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
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">upload_file</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-base font-bold text-on-surface">
                Laporkan Capaian & Unggah Bukti
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Laporan akan diverifikasi oleh atasan langsung
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Target Task Summary Card */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span className="uppercase tracking-wider font-semibold">Tugas Terkait</span>
              <span className="font-bold text-primary">
                Target: {task.target} {task.satuan}
              </span>
            </div>
            <p className="font-title-md text-xs font-semibold text-on-surface leading-snug">
              {task.title}
            </p>

            <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
              <span>Capaian Terverifikasi Saat Ini:</span>
              <b>{task.capaianSaatIni || 0} {task.satuan}</b>
            </div>
          </div>

          {/* Angka Capaian Yang Dicapai */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-on-surface">
                Angka Capaian yang Dilaporkan <span className="text-error">*</span>
              </label>
              {capaianAngka > 0 && (
                <span className="text-[11px] font-bold text-success">
                  Total baru: {totalPrediksi} / {task.target} ({percentPrediksi.toFixed(1)}%)
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                value={capaian}
                onChange={e => setCapaian(e.target.value)}
                placeholder="Contoh: 10"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:outline-none font-bold text-on-surface pr-16"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-on-surface-variant font-medium pointer-events-none">
                {task.satuan}
              </span>
            </div>
          </div>

          {/* Keterangan Pengerjaan */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-on-surface">
              Keterangan Pengerjaan / Hasil Kerja <span className="text-error">*</span>
            </label>
            <textarea
              rows={3}
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              placeholder="Jelaskan aktivitas, kegiatan, atau dokumen yang telah diselesaikan untuk mencapai target tersebut..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:outline-none transition-colors leading-relaxed resize-none"
              required
            />
          </div>

          {/* Upload Bukti Evidence ke Google Drive via GAS */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-on-surface">
              Unggah Bukti Dukung (Evidence)
            </label>
            <div className="p-4 rounded-2xl border-2 border-dashed border-outline-variant/60 hover:border-primary/60 bg-surface-container/50 text-center transition-all cursor-pointer">
              <input
                type="file"
                id="evidenceFileInput"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="evidenceFileInput" className="cursor-pointer space-y-1 block">
                <span className="material-symbols-outlined text-2xl text-primary">cloud_upload</span>
                <p className="text-xs font-bold text-on-surface">
                  {file ? file.name : 'Klik untuk memilih berkas bukti'}
                </p>
                <p className="text-[10px] text-on-surface-variant">
                  {file 
                    ? `${(file.size / 1024).toFixed(1)} KB &bull; Otomatis diunggah ke Google Drive` 
                    : 'PDF, JPG, PNG, DOCX (Maks 15 MB) &bull; Tersimpan ke Google Drive via GAS'}
                </p>
              </label>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
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
              disabled={isUploading || capaianAngka <= 0 || !keterangan.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Mengunggah Bukti & Menyimpan...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  Kirim Laporan ke Atasan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
