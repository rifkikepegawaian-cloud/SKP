'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { SKPPlan, ActivityLog } from '@/lib/types'
import { uploadToGoogleDrive } from '@/lib/uploadToGoogleDrive'
import Swal from 'sweetalert2'

export default function LogbookPage() {
  const user = useAuthStore(state => state.user)
  const supabase = createClient()

  const [approvedSKPs, setApprovedSKPs] = useState<SKPPlan[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filter state
  const [selectedSkpFilter, setSelectedSkpFilter] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<any | null>(null)

  // Form state — capaian = angka realisasi hari ini (bukan %)
  const [formSkpId, setFormSkpId] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0])
  const [formCapaian, setFormCapaian] = useState<number | ''>('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // PDF preview modal
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [pdfPreviewName, setPdfPreviewName] = useState<string>('')

  useEffect(() => {
    if (user?.id) {
      fetchData()
    }
  }, [user?.id])

  const fetchData = async () => {
    setLoading(true)
    // Fetch approved SKPs first
    const { data: skpData } = await supabase
      .from('skp_plans')
      .select('*, iku_item:iku_pengajuan_item(iku:master_iku(*)), parent_skp:skp_plans!parent_skp_id(rencana_aksi)')
      .eq('user_id', user!.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    setApprovedSKPs((skpData as any) || [])

    // Then fetch all logs
    const { data: logData } = await supabase
      .from('activity_logs')
      .select('*, skp:skp_plans(*, iku_item:iku_pengajuan_item(iku:master_iku(*)), parent_skp:skp_plans!parent_skp_id(rencana_aksi))')
      .eq('user_id', user!.id)
      .order('tanggal', { ascending: false })

    setLogs((logData as any) || [])
    setLoading(false)
  }

  // Hitung total capaian (angka) per SKP dari seluruh log
  const getTotalCapaian = (skpId: string) => {
    return logs
      .filter(l => l.skp_id === skpId)
      .reduce((sum, l) => sum + (Number(l.capaian) || 0), 0)
  }

  // Hitung % ketercapaian berdasarkan angka capaian vs target
  const getPercentage = (skpId: string): number => {
    const skp = approvedSKPs.find(s => s.id === skpId) as any
    if (!skp || !skp.target_individual) return 0
    const total = getTotalCapaian(skpId)
    return Math.round((total / skp.target_individual) * 100 * 10) / 10 // 1 decimal
  }

  const openAddModal = () => {
    setEditingLog(null)
    setFormSkpId('')
    setFormDescription('')
    setFormTanggal(new Date().toISOString().split('T')[0])
    setFormCapaian('')
    setFormFile(null)
    setShowModal(true)
  }

  const openEditModal = (log: any) => {
    setEditingLog(log)
    setFormSkpId(log.skp_id)
    setFormDescription(log.description)
    setFormTanggal(log.tanggal)
    setFormCapaian(log.capaian ?? '')
    setFormFile(null)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Logbook?',
      text: 'Data yang dihapus tidak dapat dikembalikan',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    })
    if (!result.isConfirmed) return
    const { error } = await supabase.from('activity_logs').delete().eq('id', id)
    if (error) {
      Swal.fire('Error', 'Gagal menghapus logbook', 'error')
    } else {
      Swal.fire('Terhapus', 'Logbook berhasil dihapus', 'success')
      fetchData()
    }
  }

  const handleSubmit = async () => {
    if (!formSkpId) { Swal.fire('Peringatan', 'Pilih rencana SKP terlebih dahulu', 'warning'); return }
    if (!formDescription.trim()) { Swal.fire('Peringatan', 'Keterangan kegiatan wajib diisi', 'warning'); return }
    if (!formTanggal) { Swal.fire('Peringatan', 'Tanggal wajib diisi', 'warning'); return }
    if (formCapaian === '' || formCapaian < 0) { Swal.fire('Peringatan', 'Capaian hari ini wajib diisi (minimal 0)', 'warning'); return }

    setSaving(true)

    let evidenceUrl = editingLog?.evidence_url || null
    let evidenceName = editingLog?.evidence_name || null

    if (formFile) {
      try {
        const result = await uploadToGoogleDrive(formFile, 'logbook')
        evidenceUrl = result.url
        evidenceName = formFile.name
      } catch (uploadErr: any) {
        setSaving(false)
        Swal.fire('Error', 'Gagal mengunggah ke Google Drive: ' + uploadErr.message, 'error')
        return
      }
    }

    // Hitung progress_percentage dari capaian hari ini saja (untuk referensi)
    const skp = approvedSKPs.find(s => s.id === formSkpId)
    const target = skp?.target_individual || 1
    const progressPct = Math.round((Number(formCapaian) / target) * 100 * 10) / 10

    const payload: any = {
      skp_id: formSkpId,
      user_id: user?.id,
      description: formDescription,
      tanggal: formTanggal,
      capaian: Number(formCapaian),
      progress_percentage: progressPct,
      evidence_url: evidenceUrl,
      evidence_name: evidenceName,
      status: evidenceUrl ? 'valid' : 'pending_evidence',
    }

    let error: any
    if (editingLog) {
      ;({ error } = await supabase.from('activity_logs').update(payload).eq('id', editingLog.id))
    } else {
      ;({ error } = await supabase.from('activity_logs').insert(payload))
    }

    setSaving(false)
    if (error) {
      Swal.fire('Error', 'Gagal menyimpan logbook: ' + error.message, 'error')
    } else {
      Swal.fire('Berhasil', `Logbook berhasil ${editingLog ? 'diperbarui' : 'ditambahkan'}`, 'success')
      setShowModal(false)
      fetchData()
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchSKP = selectedSkpFilter === 'all' || log.skp_id === selectedSkpFilter
    const logMonth = log.tanggal?.substring(0, 7)
    const matchMonth = !selectedMonth || logMonth === selectedMonth
    return matchSKP && matchMonth
  })

  const totalLogs = filteredLogs.length
  const validLogs = filteredLogs.filter(l => l.status === 'valid').length
  const pendingLogs = filteredLogs.filter(l => l.status === 'pending_evidence').length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid': return (
        <span className="px-2.5 py-1 rounded-full text-label-sm font-bold bg-success/10 text-success flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>Valid
        </span>
      )
      case 'pending_evidence': return (
        <span className="px-2.5 py-1 rounded-full text-label-sm font-bold bg-warning/10 text-warning flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">pending</span>Perlu Bukti
        </span>
      )
      case 'revision': return (
        <span className="px-2.5 py-1 rounded-full text-label-sm font-bold bg-error/10 text-error flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">edit_note</span>Revisi
        </span>
      )
      default: return null
    }
  }

  const getSKPContext = (skp: any) => skp?.iku_item?.iku?.nama_iku || skp?.parent_skp?.rencana_aksi || null

  const formatTanggal = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Extract Google Drive file ID from stored URL
  const getDriveFileId = (url: string): string | null => {
    try {
      const parsed = new URL(url)
      return parsed.searchParams.get('id')
    } catch {
      return null
    }
  }

  // Check if file is PDF based on evidence_name
  const isPdf = (name: string | null | undefined): boolean => {
    if (!name) return false
    return name.toLowerCase().endsWith('.pdf')
  }

  const handleEvidenceClick = (url: string, name: string | null) => {
    if (isPdf(name)) {
      // Show PDF in modal using Google Drive preview embed
      const fileId = getDriveFileId(url)
      if (fileId) {
        setPdfPreviewUrl(`https://drive.google.com/file/d/${fileId}/preview`)
        setPdfPreviewName(name || 'Dokumen PDF')
      } else {
        // Fallback: open in new tab
        window.open(url, '_blank')
      }
    } else {
      // Non-PDF: trigger download via Google Drive download URL
      const fileId = getDriveFileId(url)
      if (fileId) {
        window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank')
      } else {
        window.open(url, '_blank')
      }
    }
  }

  // Pilih warna progress bar (mendukung > 100%)
  const getProgressColor = (pct: number) => pct >= 100 ? '#22c55e' : pct >= 70 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#94a3b8'

  // SKP yang dipilih di form (untuk menampilkan konteks capaian kumulatif)
  const selectedSKPInForm = approvedSKPs.find(s => s.id === formSkpId) as any
  const cumulativeBeforeEdit = formSkpId
    ? logs
        .filter(l => l.skp_id === formSkpId && (!editingLog || l.id !== editingLog.id))
        .reduce((sum, l) => sum + (Number(l.capaian) || 0), 0)
    : 0
  const previewTotal = cumulativeBeforeEdit + (Number(formCapaian) || 0)
  const previewPct = selectedSKPInForm ? Math.round((previewTotal / selectedSKPInForm.target_individual) * 100 * 10) / 10 : 0

  return (
    <div>
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <nav className="flex items-center gap-2 text-label-sm font-label-sm text-on-surface-variant mb-2">
            <span>Aplikasi</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">Logbook Harian</span>
          </nav>
          <h1 className="font-headline-lg text-headline-lg text-on-background">Logbook & Bukti Dukung</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Catat aktivitas harian yang berkontribusi pada rencana SKP yang telah disetujui.</p>
        </div>
        <button
          onClick={openAddModal}
          disabled={approvedSKPs.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-body-md font-semibold shadow-lg shadow-primary/20 hover:-translate-y-1 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Tambah Logbook
        </button>
      </section>

      {!loading && approvedSKPs.length === 0 && (
        <div className="glass-card rounded-3xl p-6 mb-6 flex items-center gap-4 border border-warning/20 bg-warning/5">
          <span className="material-symbols-outlined text-warning text-[36px]">info</span>
          <div>
            <p className="font-bold text-on-surface">Belum ada Rencana SKP yang Disetujui</p>
            <p className="text-body-sm text-on-surface-variant mt-1">Logbook baru bisa ditambahkan setelah pengajuan Rencana SKP disetujui oleh Supervisor/Manajer.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Filters, Stats & SKP Progress */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Month filter */}
          <div className="glass-card rounded-3xl p-6">
            <h3 className="font-headline-md text-body-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">calendar_month</span>
              Filter Bulan
            </h3>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {/* SKP filter + running total */}
          <div className="glass-card rounded-3xl p-6">
            <h3 className="font-headline-md text-body-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">filter_list</span>
              Rencana SKP
            </h3>
            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedSkpFilter === 'all' ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:border-outline-variant/30 hover:bg-surface-container-low'}`}>
                <input type="radio" name="skpfilter" value="all" checked={selectedSkpFilter === 'all'} onChange={() => setSelectedSkpFilter('all')} className="mt-0.5 text-primary" />
                <span className="text-body-sm font-medium">Semua SKP</span>
              </label>
              {approvedSKPs.map(plan => {
                const totalCap = getTotalCapaian(plan.id)
                const pct = getPercentage(plan.id)
                const pColor = getProgressColor(pct)
                return (
                  <label key={plan.id} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedSkpFilter === plan.id ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:border-outline-variant/30 hover:bg-surface-container-low'}`}>
                    <input type="radio" name="skpfilter" value={plan.id} checked={selectedSkpFilter === plan.id} onChange={() => setSelectedSkpFilter(plan.id)} className="mt-0.5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-semibold text-on-surface leading-tight">{plan.rencana_aksi}</p>
                      <div className="flex items-center justify-between mt-1.5 mb-1">
                        <span className="text-[11px] text-on-surface-variant">{totalCap} / {plan.target_individual} {plan.satuan}</span>
                        <span className="text-[11px] font-bold" style={{ color: pColor }}>{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pColor }} />
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 text-center">
              <p className="text-label-sm text-primary uppercase mb-1 font-bold">Total</p>
              <p className="text-headline-md font-headline-md text-primary">{totalLogs}</p>
            </div>
            <div className="bg-success/5 p-4 rounded-2xl border border-success/10 text-center">
              <p className="text-label-sm text-success uppercase mb-1 font-bold">Valid</p>
              <p className="text-headline-md font-headline-md text-success">{validLogs}</p>
            </div>
            <div className="bg-warning/5 p-4 rounded-2xl border border-warning/10 text-center">
              <p className="text-[10px] text-warning uppercase mb-1 font-bold">Perlu Bukti</p>
              <p className="text-headline-md font-headline-md text-warning">{pendingLogs}</p>
            </div>
          </div>
        </div>

        {/* Right: Log list */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {loading ? (
            <div className="glass-card rounded-3xl p-12 flex justify-center items-center gap-3 text-on-surface-variant">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Memuat logbook...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-center">
              <span className="material-symbols-outlined text-[56px] text-outline/40">history_edu</span>
              <p className="font-headline-md text-on-surface">Belum ada logbook</p>
              <p className="text-body-sm">Tambahkan aktivitas harian yang berkontribusi pada SKP Anda.</p>
            </div>
          ) : filteredLogs.map(log => {
            const skp = log.skp
            const capaianLog = Number(log.capaian) || 0
            const target = skp?.target_individual || 1
            const pctLog = Math.round((capaianLog / target) * 100 * 10) / 10
            const pColor = getProgressColor(pctLog)

            return (
              <div key={log.id} className="glass-card rounded-3xl p-6 hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex items-start justify-between mb-3 gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${log.status === 'valid' ? 'bg-success/10 text-success' : log.status === 'revision' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'}`}>
                      <span className="material-symbols-outlined text-[22px]" style={{fontVariationSettings:"'FILL' 1"}}>
                        {log.status === 'valid' ? 'task_alt' : log.status === 'revision' ? 'warning' : 'pending_actions'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      {getSKPContext(skp) && (
                        <p className="text-[11px] text-primary font-bold uppercase tracking-wider mb-1">{getSKPContext(skp)}</p>
                      )}
                      <h4 className="font-bold text-body-lg text-on-background leading-snug">{skp?.rencana_aksi || '-'}</h4>
                      <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-1">
                        <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                        {formatTanggal(log.tanggal)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {getStatusBadge(log.status)}
                    <button onClick={() => openEditModal(log)} className="p-2 hover:bg-primary/10 text-primary/60 hover:text-primary rounded-xl transition-colors" title="Edit">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => handleDelete(log.id)} className="p-2 hover:bg-error/10 text-outline hover:text-error rounded-xl transition-colors" title="Hapus">
                      <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                    </button>
                  </div>
                </div>

                <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed pl-16">{log.description}</p>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-outline-variant/20">
                  <div className="flex items-center gap-3">
                    {/* Capaian angka hari ini */}
                    <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-xl">
                      <span className="material-symbols-outlined text-[16px] text-primary">trending_up</span>
                      <span className="font-bold text-on-surface text-body-sm">{capaianLog}</span>
                      <span className="text-body-sm text-on-surface-variant">{skp?.satuan || ''}</span>
                    </div>
                    {/* % hari ini */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-20 h-2 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pctLog, 100)}%`, backgroundColor: pColor }} />
                      </div>
                      <span className="text-label-sm font-bold" style={{ color: pColor }}>{pctLog}%</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant">dari target {skp?.target_individual} {skp?.satuan}</span>
                  </div>
                  {log.evidence_url ? (
                    <button
                      onClick={() => handleEvidenceClick(log.evidence_url, log.evidence_name)}
                      className="flex items-center gap-1.5 text-primary text-body-sm font-medium hover:underline"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isPdf(log.evidence_name) ? 'picture_as_pdf' : 'download'}
                      </span>
                      {log.evidence_name || 'Lihat Bukti'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-outline text-body-sm">
                      <span className="material-symbols-outlined text-[16px]">attachment_off</span>
                      Belum ada bukti
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-hidden flex flex-col animate-slide-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">{editingLog ? 'edit_note' : 'add_circle'}</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">{editingLog ? 'Edit Logbook' : 'Tambah Logbook Harian'}</h3>
                  <p className="text-body-sm text-on-surface-variant">Catat aktivitas dan realisasi SKP Anda</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
              {/* SKP Selector */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Rencana SKP yang Disetujui *</label>
                <select
                  value={formSkpId}
                  onChange={e => { setFormSkpId(e.target.value); setFormCapaian('') }}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="">-- Pilih Rencana SKP --</option>
                  {approvedSKPs.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.rencana_aksi} (Target: {plan.target_individual} {plan.satuan})
                    </option>
                  ))}
                </select>
                {formSkpId && selectedSKPInForm && (
                  <div className="mt-2 p-3 bg-primary/5 rounded-xl border border-primary/15 space-y-1">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-on-surface-variant">Target: <strong>{selectedSKPInForm.target_individual} {selectedSKPInForm.satuan}</strong></span>
                      <span className="text-on-surface-variant">Sudah terealisasi: <strong className="text-primary">{cumulativeBeforeEdit} {selectedSKPInForm.satuan}</strong></span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-on-surface-variant">Sisa target: <strong>{Math.max(0, selectedSKPInForm.target_individual - cumulativeBeforeEdit)} {selectedSKPInForm.satuan}</strong></span>
                      <span className="font-bold text-primary">{getPercentage(formSkpId)}% tercapai</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tanggal */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Tanggal Aktivitas *</label>
                <input
                  type="date"
                  value={formTanggal}
                  onChange={e => setFormTanggal(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Keterangan Kegiatan *</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={4}
                  placeholder="Deskripsikan aktivitas yang Anda lakukan hari ini untuk mengejar target SKP tersebut..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Capaian — input angka realisasi */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                  Realisasi Hari Ini *
                  {selectedSKPInForm && <span className="ml-1 text-outline font-normal">({selectedSKPInForm.satuan})</span>}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    value={formCapaian}
                    onChange={e => setFormCapaian(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="flex-1 bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  {selectedSKPInForm && (
                    <span className="text-body-sm text-on-surface-variant whitespace-nowrap">
                      dari {selectedSKPInForm.target_individual} {selectedSKPInForm.satuan}
                    </span>
                  )}
                </div>

                {/* Live preview total setelah diisi */}
                {selectedSKPInForm && formCapaian !== '' && (
                  <div className="mt-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-body-sm text-on-surface-variant">Total kumulatif setelah entri ini:</span>
                      <span className="font-bold text-on-surface">{previewTotal} / {selectedSKPInForm.target_individual} {selectedSKPInForm.satuan}</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(previewPct, 100)}%`, backgroundColor: getProgressColor(previewPct) }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[11px] text-on-surface-variant">Ketercapaian kumulatif</span>
                      <span className="text-[12px] font-bold" style={{ color: getProgressColor(previewPct) }}>
                        {previewPct}%
                        {previewPct > 100 && <span className="ml-1 text-success"> 🎉 Melebihi target!</span>}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Bukti Dukung</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-outline-variant/50 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  {formFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <span className="material-symbols-outlined">description</span>
                      <span className="text-body-sm font-medium">{formFile.name}</span>
                    </div>
                  ) : editingLog?.evidence_name ? (
                    <div>
                      <p className="text-body-sm text-success font-medium flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        {editingLog.evidence_name}
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-1">Klik untuk mengganti file</p>
                    </div>
                  ) : (
                    <div className="text-on-surface-variant">
                      <span className="material-symbols-outlined text-[40px] text-outline/40 block mb-2">cloud_upload</span>
                      <p className="text-body-sm font-medium">Klik untuk mengunggah ke Google Drive</p>
                      <p className="text-[11px] mt-1">PDF, Gambar, Word — maks. 10 MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={e => setFormFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-outline-variant/20 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-bold hover:bg-surface-container transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors flex justify-center items-center gap-2 disabled:opacity-60"
              >
                {saving
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <span className="material-symbols-outlined text-[20px]">save</span>
                }
                {saving ? 'Menyimpan...' : (editingLog ? 'Simpan Perubahan' : 'Simpan Logbook')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPdfPreviewUrl(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col animate-slide-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center text-error">
                  <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>picture_as_pdf</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface text-body-md leading-tight">{pdfPreviewName}</p>
                  <p className="text-[11px] text-on-surface-variant">Pratinjau Dokumen PDF</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const fileId = getDriveFileId(pdfPreviewUrl.replace('/preview', '').replace('https://drive.google.com/file/d/', '').split('/')[0])
                    const id = pdfPreviewUrl.split('/d/')[1]?.split('/')[0]
                    if (id) window.open(`https://drive.google.com/uc?export=download&id=${id}`, '_blank')
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors text-body-sm font-medium"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Unduh
                </button>
                <button
                  onClick={() => setPdfPreviewUrl(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            {/* PDF iframe */}
            <div className="flex-1 bg-surface-container-low">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                title={pdfPreviewName}
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
