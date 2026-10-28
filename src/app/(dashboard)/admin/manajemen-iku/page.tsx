'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MasterIKU } from '@/lib/types'
import { getRektorIKUFormula } from '@/lib/skpFormulas'
import { parseExcelToIKU, IKUImportRow, ikuRowsToInsert } from '@/lib/excel'

type ModalMode = 'closed' | 'add' | 'edit' | 'import' | 'delete'

interface IKUForm {
  kode_iku: string
  nama_iku: string
  kode_kegiatan: string
  nama_kegiatan: string
  kode_output: string
  nama_output: string
  target_default?: string
  satuan_default?: string
  sasaran_kinerja?: string
  indikator_kinerja_individu?: string
}

const emptyForm: IKUForm = {
  kode_iku: '', 
  nama_iku: '', 
  kode_kegiatan: '', 
  nama_kegiatan: '', 
  kode_output: '', 
  nama_output: '',
  target_default: '100',
  satuan_default: '%',
  sasaran_kinerja: '',
  indikator_kinerja_individu: '',
}

export default function ManajemenIKUPage() {
  const supabase = createClient()
  const [data, setData] = useState<MasterIKU[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [form, setForm] = useState<IKUForm>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<IKUImportRow[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sorting state
  const [sortField, setSortField] = useState<'kode_iku' | 'nama_iku' | 'kode_kegiatan' | 'nama_kegiatan' | 'kode_output' | 'nama_output' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: ikus, error } = await supabase
      .from('master_iku')
      .select('*')
      .order('kode_iku', { ascending: true })

    if (!error && ikus) setData(ikus)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = data.filter(item =>
    [item.kode_iku, item.nama_iku, item.kode_kegiatan, item.nama_kegiatan, item.kode_output, item.nama_output]
      .some(v => v.toLowerCase().includes(search.toLowerCase()))
  )

  // Sorted array
  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0

    const valA = a[sortField] || ''
    const valB = b[sortField] || ''

    const cleanA = valA.toLowerCase()
    const cleanB = valB.toLowerCase()

    if (cleanA < cleanB) return sortDirection === 'asc' ? -1 : 1
    if (cleanA > cleanB) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Dynamic bounds for activePage
  const totalPages = Math.ceil(sorted.length / pageSize)
  const activePage = Math.min(currentPage, Math.max(1, totalPages))
  const paginated = sorted.slice((activePage - 1) * pageSize, activePage * pageSize)

  const handleSort = (field: 'kode_iku' | 'nama_iku' | 'kode_kegiatan' | 'nama_kegiatan' | 'kode_output' | 'nama_output') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  // ── CRUD Handlers ──
  const handleSave = async () => {
    setSaving(true)
    const cleanForm = { ...form }

    const safeOp = async (isInsert: boolean) => {
      let err: any = null
      if (isInsert) {
        const res = await supabase.from('master_iku').insert([cleanForm])
        err = res.error
      } else {
        const res = await supabase.from('master_iku').update(cleanForm).eq('id', editId)
        err = res.error
      }

      if (err && (err.message?.includes('sasaran_kinerja') || err.message?.includes('indikator_kinerja_individu'))) {
        delete cleanForm.sasaran_kinerja
        delete cleanForm.indikator_kinerja_individu
        if (isInsert) {
          const res = await supabase.from('master_iku').insert([cleanForm])
          err = res.error
        } else {
          const res = await supabase.from('master_iku').update(cleanForm).eq('id', editId)
          err = res.error
        }
      }
      return err
    }

    if (modalMode === 'add') {
      const error = await safeOp(true)
      if (error) {
        showToast('Gagal menambah IKU: ' + error.message, 'error')
      } else {
        showToast('IKU berhasil ditambahkan', 'success')
        setModalMode('closed')
        setForm(emptyForm)
        fetchData()
      }
    } else if (modalMode === 'edit' && editId) {
      const error = await safeOp(false)
      if (error) {
        showToast('Gagal mengubah IKU: ' + error.message, 'error')
      } else {
        showToast('IKU berhasil diubah', 'success')
        setModalMode('closed')
        setForm(emptyForm)
        setEditId(null)
        fetchData()
      }
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    const { error } = await supabase.from('master_iku').delete().eq('id', deleteId)
    if (error) {
      showToast('Gagal menghapus IKU: ' + error.message, 'error')
    } else {
      showToast('IKU berhasil dihapus', 'success')
      fetchData()
    }
    setModalMode('closed')
    setDeleteId(null)
    setSaving(false)
  }

  const openEdit = (iku: MasterIKU) => {
    const defaultFormula = getRektorIKUFormula(iku.kode_iku, iku.nama_iku)
    setForm({
      kode_iku: iku.kode_iku,
      nama_iku: iku.nama_iku,
      kode_kegiatan: iku.kode_kegiatan,
      nama_kegiatan: iku.nama_kegiatan,
      kode_output: iku.kode_output,
      nama_output: iku.nama_output,
      target_default: iku.target_default || (iku.kode_iku === '18' ? '1:50' : '100'),
      satuan_default: iku.satuan_default || (iku.kode_iku === '18' ? 'Rasio' : '%'),
      sasaran_kinerja: iku.sasaran_kinerja || defaultFormula.sasaranKinerja,
      indikator_kinerja_individu: iku.indikator_kinerja_individu || defaultFormula.indikatorKinerjaIndividu,
    })
    setEditId(iku.id)
    setModalMode('edit')
  }

  const openDelete = (id: string) => {
    setDeleteId(id)
    setModalMode('delete')
  }

  // ── Import Handlers ──
  const handleFileSelect = async (file: File) => {
    setImportFile(file)
    setImportErrors([])
    setImportPreview([])

    const buffer = await file.arrayBuffer()
    const { data: rows, errors } = parseExcelToIKU(buffer)
    setImportPreview(rows)
    setImportErrors(errors)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleImportConfirm = async () => {
    if (importPreview.length === 0) return
    setImporting(true)
    const rows = ikuRowsToInsert(importPreview)
    const { error } = await supabase.from('master_iku').insert(rows)
    if (error) {
      showToast('Gagal mengimpor: ' + error.message, 'error')
    } else {
      showToast(`${importPreview.length} data IKU berhasil diimpor`, 'success')
      setModalMode('closed')
      setImportFile(null)
      setImportPreview([])
      setImportErrors([])
      fetchData()
    }
    setImporting(false)
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up ${
          toast.type === 'success' ? 'bg-success text-white' : 'bg-error text-white'
        }`}>
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-label-md">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Manajemen IKU</h2>
          <p className="text-body-md text-secondary mt-1">Kelola Indikator Kinerja Utama — Tambah, Edit, Hapus, atau Import dari Excel.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setImportFile(null); setImportPreview([]); setImportErrors([]); setModalMode('import') }}
            className="bg-surface-container-highest/50 text-primary border border-primary/20 px-5 py-2.5 rounded-xl font-label-md text-label-md flex items-center gap-2 hover:bg-primary/10 transition-all">
            <span className="material-symbols-outlined text-[20px]">file_upload</span>
            Import Excel
          </button>
          <button onClick={() => { setForm(emptyForm); setModalMode('add') }}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-label-md text-label-md flex items-center gap-2 hover:opacity-90 shadow-lg shadow-primary/20 transition-all">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Tambah IKU
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
        <input type="text" placeholder="Cari kode, nama IKU, kegiatan, output..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
          className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl pl-12 pr-4 py-3 text-body-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
      </div>

      {/* Table */}
      <div className="glass-card rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">search_off</span>
            <p className="text-body-lg text-on-surface-variant font-semibold">Tidak ada data ditemukan</p>
            <p className="text-body-sm text-outline mt-1">{search ? 'Coba ubah kata kunci pencarian' : 'Mulai dengan menambahkan IKU baru atau import dari Excel'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th 
                    onClick={() => handleSort('kode_iku')} 
                    className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Kode IKU</span>
                      <span className="material-symbols-outlined text-[16px] text-outline/70">
                        {sortField === 'kode_iku' 
                          ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') 
                          : 'swap_vert'}
                      </span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('nama_iku')} 
                    className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Nama IKU</span>
                      <span className="material-symbols-outlined text-[16px] text-outline/70">
                        {sortField === 'nama_iku' 
                          ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') 
                          : 'swap_vert'}
                      </span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('kode_kegiatan')} 
                    className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Kode Kegiatan</span>
                      <span className="material-symbols-outlined text-[16px] text-outline/70">
                        {sortField === 'kode_kegiatan' 
                          ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') 
                          : 'swap_vert'}
                      </span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('nama_kegiatan')} 
                    className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Nama Kegiatan</span>
                      <span className="material-symbols-outlined text-[16px] text-outline/70">
                        {sortField === 'nama_kegiatan' 
                          ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') 
                          : 'swap_vert'}
                      </span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('kode_output')} 
                    className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Kode Output</span>
                      <span className="material-symbols-outlined text-[16px] text-outline/70">
                        {sortField === 'kode_output' 
                          ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') 
                          : 'swap_vert'}
                      </span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('nama_output')} 
                    className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Nama Output</span>
                      <span className="material-symbols-outlined text-[16px] text-outline/70">
                        {sortField === 'nama_output' 
                          ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') 
                          : 'swap_vert'}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider select-none">
                    Target & Satuan
                  </th>
                  <th className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider text-right select-none">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {paginated.map(iku => (
                  <tr key={iku.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-label-sm text-label-sm font-bold">{iku.kode_iku}</span>
                    </td>
                    <td className="px-6 py-4 font-body-md text-body-md font-semibold text-on-surface max-w-[200px]">{iku.nama_iku}</td>
                    <td className="px-6 py-4">
                      <span className="bg-info/10 text-info px-2.5 py-1 rounded-lg font-label-sm text-label-sm">{iku.kode_kegiatan}</span>
                    </td>
                    <td className="px-6 py-4 text-body-sm text-on-surface-variant max-w-[200px]">{iku.nama_kegiatan}</td>
                    <td className="px-6 py-4">
                      <span className="bg-success/10 text-success px-2.5 py-1 rounded-lg font-label-sm text-label-sm">{iku.kode_output}</span>
                    </td>
                    <td className="px-6 py-4 text-body-sm text-on-surface-variant max-w-[200px]">{iku.nama_output}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-purple-100 text-purple-800 border border-purple-200">
                        {iku.target_default || (iku.kode_iku === '18' ? '1:50' : '100')} {iku.satuan_default || (iku.kode_iku === '18' ? 'Rasio' : '%')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(iku)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-outline hover:text-primary hover:bg-primary/10 transition-all"
                          title="Edit">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => openDelete(iku.id)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-outline hover:text-danger hover:bg-danger/10 transition-all"
                          title="Hapus">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Sleek Datatable Footer */}
        {!loading && sorted.length > 0 && (
          <div className="px-6 py-4 border-t border-outline-variant/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low/30">
            
            {/* Page Size & Record Counts */}
            <div className="flex flex-wrap items-center gap-4 text-body-sm text-outline">
              <p>
                Menampilkan <strong className="text-on-surface">{(activePage - 1) * pageSize + 1}</strong> - <strong className="text-on-surface">{Math.min(activePage * pageSize, sorted.length)}</strong> dari <strong className="text-on-surface">{sorted.length}</strong> data
                {sorted.length < data.length && ` (difilter dari ${data.length} total)`}
              </p>
              <div className="h-4 w-px bg-outline-variant/50 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span>Tampilkan:</span>
                <select 
                  value={pageSize} 
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                  className="bg-white border border-outline-variant/60 rounded-xl px-2.5 py-1.5 outline-none font-semibold text-on-surface cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all text-body-sm shadow-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>per halaman</span>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={activePage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-outline hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-outline"
                  title="Halaman Pertama"
                >
                  <span className="material-symbols-outlined text-[18px]">first_page</span>
                </button>
                <button
                  disabled={activePage === 1}
                  onClick={() => setCurrentPage(activePage - 1)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-outline hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-outline"
                  title="Halaman Sebelumnya"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>

                {(() => {
                  const pages: (number | string)[] = []
                  const range = 1
                  let start = Math.max(1, activePage - range)
                  let end = Math.min(totalPages, activePage + range)

                  if (start > 1) {
                    pages.push(1)
                    if (start > 2) pages.push('...')
                  }

                  for (let i = start; i <= end; i++) {
                    pages.push(i)
                  }

                  if (end < totalPages) {
                    if (end < totalPages - 1) pages.push('...')
                    pages.push(totalPages)
                  }

                  return pages.map((page, idx) => {
                    if (page === '...') {
                      return <span key={`dots-${idx}`} className="text-outline px-1">...</span>
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-label-md text-label-md transition-all ${
                          activePage === page
                            ? 'bg-primary text-on-primary shadow-md shadow-primary/20 font-bold'
                            : 'text-[#414754] hover:bg-primary/10 hover:text-primary'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })
                })()}

                <button
                  disabled={activePage === totalPages}
                  onClick={() => setCurrentPage(activePage + 1)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-outline hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-outline"
                  title="Halaman Berikutnya"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
                <button
                  disabled={activePage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-outline hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-outline"
                  title="Halaman Terakhir"
                >
                  <span className="material-symbols-outlined text-[18px]">last_page</span>
                </button>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── MODAL: Add/Edit ── */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setModalMode('closed')}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">
                    {modalMode === 'add' ? 'Tambah IKU Baru' : 'Edit IKU'}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant mt-1">Isi semua kolom di bawah ini.</p>
                </div>
                <button onClick={() => setModalMode('closed')}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {([
                  ['kode_iku', 'Kode IKU', 'Contoh: IKU-01'],
                  ['nama_iku', 'Nama IKU', 'Nama Indikator Kinerja Utama'],
                  ['kode_kegiatan', 'Kode Kegiatan', 'Contoh: KGT-01'],
                  ['nama_kegiatan', 'Nama Kegiatan', 'Nama Kegiatan'],
                  ['kode_output', 'Kode Output', 'Contoh: OUT-01'],
                  ['nama_output', 'Nama Output', 'Nama Output'],
                ] as [keyof IKUForm, string, string][]).map(([key, label, placeholder]) => (
                  <div key={key} className={key.startsWith('nama') ? 'col-span-2 sm:col-span-1' : ''}>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">{label}</label>
                    <input type="text" placeholder={placeholder} value={form[key] || ''}
                      onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                ))}

                {/* Target & Satuan Default */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">
                    Target Default
                  </label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 1:50 atau 100" 
                    value={form.target_default || ''}
                    onChange={e => setForm(prev => ({ ...prev, target_default: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" 
                  />
                  <p className="text-[11px] text-on-surface-variant/70 mt-1">Bisa berupa rasio (contoh: 1:50) atau persentase (100).</p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">
                    Satuan Default
                  </label>
                  <input 
                    type="text" 
                    list="satuan-options"
                    placeholder="Contoh: Rasio, %, Dokumen" 
                    value={form.satuan_default || ''}
                    onChange={e => setForm(prev => ({ ...prev, satuan_default: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold" 
                  />
                  <datalist id="satuan-options">
                    <option value="%" />
                    <option value="Rasio" />
                    <option value="Dokumen" />
                    <option value="Kegiatan" />
                    <option value="Laporan" />
                    <option value="Mahasiswa" />
                  </datalist>
                </div>

                {/* Sasaran Kinerja & Indikator Kinerja Individu (PermenPAN-RB No. 6/2022) */}
                <div className="col-span-2 bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Kaidah PermenPAN-RB No. 6/2022 (Rektor)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const formula = getRektorIKUFormula(form.kode_iku, form.nama_iku)
                        setForm(prev => ({
                          ...prev,
                          sasaran_kinerja: formula.sasaranKinerja,
                          indikator_kinerja_individu: formula.indikatorKinerjaIndividu,
                        }))
                      }}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                      Gunakan Rekomendasi Baku
                    </button>
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1 font-semibold">
                      Sasaran Kinerja Rektor (Awalan &quot;Me...&quot;)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Meningkatnya rasio dosen terhadap mahasiswa (FSR) sesuai standar mutu"
                      value={form.sasaran_kinerja || ''}
                      onChange={e => setForm(prev => ({ ...prev, sasaran_kinerja: e.target.value }))}
                      className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1 font-semibold">
                      Indikator Kinerja Individu (IKI)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Skor Faculty Student Ratio (FSR) institusi"
                      value={form.indikator_kinerja_individu || ''}
                      onChange={e => setForm(prev => ({ ...prev, indikator_kinerja_individu: e.target.value }))}
                      className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setModalMode('closed')}
                  className="px-6 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container transition-all">
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving || !form.kode_iku || !form.nama_iku}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  {modalMode === 'add' ? 'Tambah' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Import Excel ── */}
      {modalMode === 'import' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setModalMode('closed')}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">Import Data IKU</h3>
                  <p className="text-body-sm text-on-surface-variant mt-1">Upload file Excel (.xlsx / .xls) dengan format yang sesuai.</p>
                </div>
                <button onClick={() => setModalMode('closed')}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Format info */}
              <div className="mb-6 p-4 bg-info/5 rounded-xl border border-info/10">
                <p className="font-label-sm text-label-sm text-info font-bold mb-2">Format Kolom Excel yang Diperlukan:</p>
                <div className="flex flex-wrap gap-2">
                  {['Kode IKU', 'Nama IKU', 'Kode Kegiatan', 'Nama Kegiatan', 'Kode Output', 'Nama Output'].map(col => (
                    <span key={col} className="bg-info/10 text-info px-3 py-1 rounded-lg font-label-sm text-label-sm">{col}</span>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5'
                }`}>
                <span className="material-symbols-outlined text-[48px] text-outline-variant mb-3 block">upload_file</span>
                {importFile ? (
                  <div>
                    <p className="font-body-md font-semibold text-on-surface">{importFile.name}</p>
                    <p className="text-body-sm text-outline mt-1">{(importFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-body-md text-on-surface-variant">Drag & drop file Excel di sini</p>
                    <p className="text-body-sm text-outline mt-1">atau klik untuk memilih file</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }} />
              </div>

              {/* Errors */}
              {importErrors.length > 0 && (
                <div className="mt-4 p-4 bg-error-container/20 rounded-xl border border-error/10">
                  <p className="font-label-sm text-label-sm text-error font-bold mb-2">Terdapat {importErrors.length} masalah:</p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {importErrors.map((err, i) => (
                      <li key={i} className="text-body-sm text-error flex items-start gap-2">
                        <span className="material-symbols-outlined text-[14px] mt-0.5">error</span>
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview */}
              {importPreview.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-label-md text-label-md text-on-surface">
                      Preview Data ({importPreview.length} baris)
                    </p>
                    <span className="bg-success/10 text-success px-3 py-1 rounded-lg font-label-sm text-label-sm">
                      ✓ Siap diimpor
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-outline-variant/20 max-h-64">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-surface-container-low/50">
                          <th className="px-4 py-2 font-label-sm text-secondary">Kode IKU</th>
                          <th className="px-4 py-2 font-label-sm text-secondary">Nama IKU</th>
                          <th className="px-4 py-2 font-label-sm text-secondary">Kode Keg.</th>
                          <th className="px-4 py-2 font-label-sm text-secondary">Nama Kegiatan</th>
                          <th className="px-4 py-2 font-label-sm text-secondary">Kode Out.</th>
                          <th className="px-4 py-2 font-label-sm text-secondary">Nama Output</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {importPreview.slice(0, 10).map((row, i) => (
                          <tr key={i} className="hover:bg-primary/5">
                            <td className="px-4 py-2 text-body-sm">{row.kode_iku}</td>
                            <td className="px-4 py-2 text-body-sm">{row.nama_iku}</td>
                            <td className="px-4 py-2 text-body-sm">{row.kode_kegiatan}</td>
                            <td className="px-4 py-2 text-body-sm">{row.nama_kegiatan}</td>
                            <td className="px-4 py-2 text-body-sm">{row.kode_output}</td>
                            <td className="px-4 py-2 text-body-sm">{row.nama_output}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.length > 10 && (
                      <div className="px-4 py-2 text-body-sm text-outline text-center bg-surface-container-low/30">
                        ... dan {importPreview.length - 10} baris lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setModalMode('closed')}
                  className="px-6 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container transition-all">
                  Batal
                </button>
                <button onClick={handleImportConfirm} disabled={importing || importPreview.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                  {importing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  Import {importPreview.length} Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Confirm ── */}
      {modalMode === 'delete' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setModalMode('closed')}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-danger text-[32px]">delete_forever</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Hapus Data IKU?</h3>
              <p className="text-body-md text-on-surface-variant mb-8">Data yang dihapus tidak dapat dikembalikan. Apakah Anda yakin?</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setModalMode('closed')}
                  className="px-6 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container transition-all">
                  Batal
                </button>
                <button onClick={handleDelete} disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-danger text-white font-label-md shadow-lg shadow-danger/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
