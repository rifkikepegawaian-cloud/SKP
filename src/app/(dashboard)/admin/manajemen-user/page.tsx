'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Pegawai, UserRole, ROLE_LABELS, ALL_ROLES } from '@/lib/types'
import { parseExcelToPegawai } from '@/lib/excel'

type ModalMode = 'closed' | 'edit-role' | 'reset-pw' | 'delete' | 'create' | 'import'

interface UserWithPegawai extends Omit<User, 'pegawai'> {
  pegawai: Pegawai | null
}

export default function ManajemenPegawaiUserPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserWithPegawai[]>([])
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [selectedUser, setSelectedUser] = useState<UserWithPegawai | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(['staff'])
  const [ledUnitEs2, setLedUnitEs2] = useState('')
  const [ledSukpa, setLedSukpa] = useState('')
  const [ledUnitEs3, setLedUnitEs3] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Sorting state
  const [sortField, setSortField] = useState<'nama' | 'nip' | 'unit' | 'role' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Create user state
  const [createPegawaiId, setCreatePegawaiId] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createRole, setCreateRole] = useState<UserRole>('staff')

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, show: false, errors: [] as string[] })

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    let allUsers: UserWithPegawai[] = []
    let from = 0
    const limit = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('users')
        .select('*, pegawai(*)')
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1)

      if (error) {
        showToast('Gagal memuat user: ' + error.message, 'error')
        hasMore = false
        break
      }

      if (data && data.length > 0) {
        allUsers = [...allUsers, ...data as UserWithPegawai[]]
        if (data.length < limit) {
          hasMore = false
        } else {
          from += limit
        }
      } else {
        hasMore = false
      }
    }

    setUsers(allUsers)
    setLoading(false)
  }, [supabase])

  const fetchPegawai = useCallback(async () => {
    let allPegawai: Pegawai[] = []
    let from = 0
    const limit = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('pegawai')
        .select('*')
        .order('nama_lengkap')
        .range(from, from + limit - 1)

      if (error) {
        hasMore = false
        break
      }

      if (data && data.length > 0) {
        allPegawai = [...allPegawai, ...data]
        if (data.length < limit) {
          hasMore = false
        } else {
          from += limit
        }
      } else {
        hasMore = false
      }
    }

    setPegawaiList(allPegawai)
  }, [supabase])

  useEffect(() => { fetchUsers(); fetchPegawai() }, [fetchUsers, fetchPegawai])

  // Filtered array
  const filtered = users.filter(u => {
    const matchSearch = [u.pegawai?.nama_lengkap, u.email, u.pegawai?.nip, u.pegawai?.unit_es2]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
    const matchRole = filterRole === 'all' || u.role?.split(',').includes(filterRole)
    return matchSearch && matchRole
  })

  // Sorted array
  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0

    let valA = ''
    let valB = ''

    if (sortField === 'nama') {
      valA = a.pegawai?.nama_lengkap ?? a.email ?? ''
      valB = b.pegawai?.nama_lengkap ?? b.email ?? ''
    } else if (sortField === 'nip') {
      valA = a.pegawai?.nip ?? ''
      valB = b.pegawai?.nip ?? ''
    } else if (sortField === 'unit') {
      valA = a.pegawai?.unit_es2 ?? ''
      valB = b.pegawai?.unit_es2 ?? ''
    } else if (sortField === 'role') {
      valA = a.role ?? ''
      valB = b.role ?? ''
    }

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

  const handleSort = (field: 'nama' | 'nip' | 'unit' | 'role') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  // ── Edit Role ──
  const openEditRole = (user: UserWithPegawai) => {
    setSelectedUser(user)
    const currentRoles = (user.role || '').split(',') as UserRole[]
    setSelectedRoles(currentRoles.length > 0 ? currentRoles : ['staff'])
    setLedUnitEs2(user.led_unit_es2 || user.pegawai?.unit_es2 || '')
    setLedSukpa(user.led_sukpa || '')
    setLedUnitEs3(user.led_unit_es3 || user.pegawai?.unit_es3 || '')
    setModalMode('edit-role')
  }

  const handleEditRole = async () => {
    if (!selectedUser) return
    if (selectedRoles.length === 0) {
      showToast('Minimal harus memilih 1 role', 'error')
      return
    }
    if (selectedRoles.includes('pimpinan_unit') && !ledUnitEs2) {
      showToast('Pilih Unit ES II yang dipimpin untuk role Pimpinan Unit', 'error')
      return
    }
    if (selectedRoles.includes('wakil_pimpinan_unit')) {
      if (!ledUnitEs2) {
        showToast('Pilih Unit ES II untuk role Wakil Pimpinan Unit', 'error')
        return
      }
      if (!ledUnitEs3) {
        showToast('Pilih Bagian / Bidang ES III untuk role Wakil Pimpinan Unit', 'error')
        return
      }
    }
    if (selectedRoles.includes('pimpinan_sukpa') && !ledSukpa) {
      showToast('Pilih SUKPA yang dipimpin untuk role Pimpinan SUKPA', 'error')
      return
    }

    setSaving(true)
    const newRolesString = selectedRoles.join(',')
    const updatePayload: Record<string, string | null> = { role: newRolesString }

    const isPimpinanUnit = selectedRoles.includes('pimpinan_unit')
    const isWakilPimpinanUnit = selectedRoles.includes('wakil_pimpinan_unit')
    const isPimpinanSukpa = selectedRoles.includes('pimpinan_sukpa')

    updatePayload.led_unit_es2 = (isPimpinanUnit || isWakilPimpinanUnit) ? ledUnitEs2 : null
    updatePayload.led_unit_es3 = isWakilPimpinanUnit ? ledUnitEs3 : null
    updatePayload.led_sukpa = isPimpinanSukpa ? ledSukpa : null

    let { error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', selectedUser.id)

    // Fallback defensif jika kolom led_unit_es3 belum dieksekusi di database Supabase
    if (error && error.message.includes('led_unit_es3')) {
      const fallbackPayload = { ...updatePayload }
      delete fallbackPayload.led_unit_es3
      const retry = await supabase.from('users').update(fallbackPayload).eq('id', selectedUser.id)
      error = retry.error
    }

    if (error) {
      showToast('Gagal mengubah role: ' + error.message, 'error')
    } else {
      const displayRoles = selectedRoles.map(r => ROLE_LABELS[r]).join(', ')
      showToast(`Role ${selectedUser.pegawai?.nama_lengkap || selectedUser.email} diubah menjadi ${displayRoles}`, 'success')
      setModalMode('closed')
      fetchUsers()
    }
    setSaving(false)
  }

  // ── Reset Password ──
  const openResetPw = (user: UserWithPegawai) => {
    setSelectedUser(user)
    setModalMode('reset-pw')
  }

  const handleResetPassword = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal reset password')
      showToast(`Password ${selectedUser.pegawai?.nama_lengkap || selectedUser.email} berhasil direset`, 'success')
      setModalMode('closed')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal reset password'
      showToast(message, 'error')
    }
    setSaving(false)
  }

  // ── Delete User ──
  const openDelete = (user: UserWithPegawai) => {
    setSelectedUser(user)
    setModalMode('delete')
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal menghapus user')
      showToast(`User ${selectedUser.pegawai?.nama_lengkap || selectedUser.email} berhasil dihapus`, 'success')
      setModalMode('closed')
      fetchUsers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus user'
      showToast(message, 'error')
    }
    setSaving(false)
  }

  // ── Create User ──
  const handleCreateUser = async () => {
    if (!createPegawaiId || !createEmail) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pegawaiId: createPegawaiId,
          email: createEmail,
          role: createRole,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal membuat akun')
      showToast('Akun berhasil dibuat. Password default: 8 digit terakhir NIP.', 'success')
      setModalMode('closed')
      setCreatePegawaiId('')
      setCreateEmail('')
      setCreateRole('staff')
      fetchUsers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membuat akun'
      showToast(message, 'error')
    }
    setSaving(false)
  }

  // ── Import Pegawai (Excel) ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0])
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImportFile(e.dataTransfer.files[0])
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    setSaving(true)
    setImportProgress({ current: 0, total: 0, show: true, errors: [] })

    try {
      const buffer = await importFile.arrayBuffer()
      const { data, errors: parseErrors } = parseExcelToPegawai(buffer)

      if (parseErrors.length > 0) {
        setImportProgress(p => ({ ...p, errors: parseErrors }))
        setSaving(false)
        return
      }

      const total = data.length
      setImportProgress(p => ({ ...p, total }))
      
      // Chunking logic: 10 rows per request
      const CHUNK_SIZE = 10
      const allErrors: string[] = []
      let successTotal = 0

      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE)
        
        const res = await fetch('/api/admin/import-pegawai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: chunk })
        })

        const result = await res.json()
        if (!res.ok) {
          allErrors.push(result.error || `Gagal memproses baris ${i + 1}-${i + chunk.length}`)
        } else {
          successTotal += result.successCount || 0
          if (result.errors?.length) {
            allErrors.push(...result.errors)
          }
        }
        
        setImportProgress(p => ({ ...p, current: Math.min(i + CHUNK_SIZE, total) }))
      }

      if (allErrors.length > 0) {
        setImportProgress(p => ({ ...p, errors: allErrors }))
      } else {
        showToast(`Berhasil mengimport dan membuat akun untuk ${successTotal} pegawai!`, 'success')
        setTimeout(() => {
          setModalMode('closed')
          setImportFile(null)
          setImportProgress({ current: 0, total: 0, show: false, errors: [] })
        }, 1500)
      }
      
      fetchUsers()
      fetchPegawai()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membaca file Excel'
      setImportProgress(p => ({ ...p, errors: [message] }))
    }
    
    setSaving(false)
  }

  // Pegawai who don't have accounts yet
  const availablePegawai = pegawaiList.filter(p => !users.some(u => u.pegawai_id === p.id))
  const selectedPegawaiData = pegawaiList.find(p => p.id === createPegawaiId)

  // List of distinct Unit ES II and Unit ES III for dropdowns
  const allUnitEs2List = Array.from(
    new Set([
      ...pegawaiList.map(p => p.unit_es2),
      ...users.map(u => u.pegawai?.unit_es2),
      ...users.map(u => u.led_unit_es2)
    ].filter((v): v is string => Boolean(v && v !== '-')))
  ).sort()

  const availableUnitEs3List = Array.from(
    new Set([
      ...pegawaiList.filter(p => !ledUnitEs2 || p.unit_es2 === ledUnitEs2).map(p => p.unit_es3),
      ...users.filter(u => !ledUnitEs2 || u.pegawai?.unit_es2 === ledUnitEs2 || u.led_unit_es2 === ledUnitEs2).map(u => u.pegawai?.unit_es3),
      ...users.map(u => u.led_unit_es3)
    ].filter((v): v is string => Boolean(v && v !== '-')))
  ).sort()

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-error/10 text-error',
      rektor: 'bg-purple-100 text-purple-700',
      pimpinan_sukpa: 'bg-indigo-100 text-indigo-700',
      pimpinan_unit: 'bg-blue-100 text-blue-700',
      wakil_pimpinan_unit: 'bg-sky-100 text-sky-700',
      manajer: 'bg-cyan-100 text-cyan-700',
      supervisor: 'bg-teal-100 text-teal-700',
      staff: 'bg-secondary-container text-on-secondary-container',
    }
    return colors[role] || 'bg-secondary-container text-on-secondary-container'
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Manajemen Pegawai & User</h2>
          <p className="text-body-md text-secondary mt-1">Kelola data pegawai, hak akses, ubah role, hingga import Excel massal.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setImportFile(null); setImportProgress({ current: 0, total: 0, show: false, errors: [] }); setModalMode('import') }}
            className="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-xl font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container-highest transition-colors border border-outline-variant/30 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            Import Excel
          </button>
          <button onClick={() => { setCreatePegawaiId(''); setCreateEmail(''); setCreateRole('staff'); setModalMode('create') }}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-label-md text-label-md flex items-center gap-2 hover:opacity-90 shadow-lg shadow-primary/20 transition-all">
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Buat Akun Manual
          </button>
        </div>
      </div>

      {/* Stats Cards (KPI Widgets at top for high-level dashboard context) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {ALL_ROLES.map(role => {
          const count = users.filter(u => u.role?.split(',').includes(role)).length
          const isActive = filterRole === role
          return (
            <div 
              key={role} 
              className={`glass-card rounded-2xl p-4 border text-center hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300 cursor-pointer select-none ${
                isActive 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/25 scale-[1.02]' 
                  : 'border-outline-variant/20 hover:border-primary/45'
              }`}
              onClick={() => { setFilterRole(isActive ? 'all' : role); setCurrentPage(1) }}
            >
              <p className={`font-headline-md text-headline-md ${isActive ? 'text-primary font-extrabold' : 'text-on-surface'}`}>
                {count}
              </p>
              <p className={`font-label-sm text-label-sm mt-1 uppercase tracking-wider text-[10px] ${isActive ? 'text-primary font-bold' : 'text-secondary'}`}>
                {ROLE_LABELS[role]}
              </p>
              {isActive && (
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary mx-auto animate-pulse" />
              )}
            </div>
          )
        })}
      </div>

      {/* Filters (Unified premium glass board) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-outline-variant/20 shadow-sm">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Cari nama, NIP, email, unit..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl pl-12 pr-4 py-2.5 text-body-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-body-sm font-medium text-secondary" style={{ fontFamily: 'Inter' }}>Filter Role:</span>
          <select 
            value={filterRole} 
            onChange={e => { setFilterRole(e.target.value); setCurrentPage(1) }}
            className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 text-body-sm outline-none focus:ring-2 focus:ring-primary/20 min-w-[160px] cursor-pointer"
          >
            <option value="all">Semua Role</option>
            {ALL_ROLES.map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table & Datatable Wrapper */}
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
            <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">person_search</span>
            <p className="text-body-lg text-on-surface-variant font-semibold">Tidak ada data ditemukan</p>
            <p className="text-body-sm text-outline mt-1">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th 
                    onClick={() => handleSort('nama')} 
                    className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Nama</span>
                      <span className="material-symbols-outlined text-[16px] text-outline/70">
                        {sortField === 'nama' 
                          ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') 
                          : 'swap_vert'}
                      </span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('nip')} 
                    className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>NIP</span>
                      <span className="material-symbols-outlined text-[16px] text-outline/70">
                        {sortField === 'nip' 
                          ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') 
                          : 'swap_vert'}
                      </span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('unit')} 
                    className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Unit / Sub Unit</span>
                      <span className="material-symbols-outlined text-[16px] text-outline/70">
                        {sortField === 'unit' 
                          ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') 
                          : 'swap_vert'}
                      </span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('role')} 
                    className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Role</span>
                      <span className="material-symbols-outlined text-[16px] text-outline/70">
                        {sortField === 'role' 
                          ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') 
                          : 'swap_vert'}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider select-none">Jabatan</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider text-right select-none">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {paginated.map(user => (
                  <tr key={user.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {(user.pegawai?.nama_lengkap || user.email).split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-body-md text-body-md font-semibold text-on-surface">{user.pegawai?.nama_lengkap || user.email}</p>
                          <p className="text-body-sm text-outline">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body-sm text-on-surface-variant" style={{ fontFamily: 'JetBrains Mono' }}>
                      {user.pegawai?.nip || '-'}
                    </td>
                    <td className="px-6 py-4 text-body-sm text-on-surface-variant max-w-[250px]">
                      {user.pegawai?.unit_es2 || '-'}
                      {user.pegawai?.unit_es3 && user.pegawai.unit_es3 !== '-' && <span className="block text-outline text-[12px]">{user.pegawai.unit_es3}</span>}
                      {user.role?.includes('wakil_pimpinan_unit') && (user.led_unit_es2 || user.led_unit_es3) && (
                        <div className="mt-1.5 p-2 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-sky-800 leading-tight space-y-0.5">
                          <span className="font-bold flex items-center gap-1 text-[10px] text-sky-700 uppercase">
                            <span className="material-symbols-outlined text-[13px]">visibility</span> Wilayah Pantauan:
                          </span>
                          <span className="block font-semibold">{user.led_unit_es2 || user.pegawai?.unit_es2}</span>
                          {user.led_unit_es3 && <span className="block text-sky-700 font-medium">Bagian: {user.led_unit_es3}</span>}
                        </div>
                      )}
                      {user.role?.includes('pimpinan_unit') && user.led_unit_es2 && (
                        <div className="mt-1.5 p-2 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 leading-tight">
                          <span className="font-bold flex items-center gap-1 text-[10px] text-blue-700 uppercase">
                            <span className="material-symbols-outlined text-[13px]">corporate_fare</span> Pimpinan Unit:
                          </span>
                          <span className="block font-semibold">{user.led_unit_es2}</span>
                        </div>
                      )}
                      {user.role?.includes('pimpinan_sukpa') && user.led_sukpa && (
                        <div className="mt-1.5 p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-800 leading-tight">
                          <span className="font-bold flex items-center gap-1 text-[10px] text-indigo-700 uppercase">
                            <span className="material-symbols-outlined text-[13px]">school</span> Pimpinan SUKPA:
                          </span>
                          <span className="block font-semibold">{user.led_sukpa}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(user.role || '').split(',').map(r => (
                          <span key={r} className={`px-3 py-1 rounded-full font-label-sm text-[10px] ${getRoleColor(r as UserRole)}`}>
                            {ROLE_LABELS[r as UserRole] || r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body-sm text-on-surface-variant max-w-[200px]">
                      {user.pegawai?.jabatan || <span className="text-outline/50">-</span>}
                      {user.pegawai?.tmt_jabatan && <span className="block text-outline text-[11px] mt-0.5">TMT: {user.pegawai.tmt_jabatan}</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditRole(user)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-outline hover:text-primary hover:bg-primary/10 transition-all"
                          title="Ubah Role">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => openResetPw(user)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-outline hover:text-warning hover:bg-warning/10 transition-all"
                          title="Reset Password">
                          <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                        </button>
                        <button onClick={() => openDelete(user)}
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
                {sorted.length < users.length && ` (difilter dari ${users.length} total)`}
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

      {/* ── MODAL: Import Excel ── */}
      {modalMode === 'import' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => !saving && setModalMode('closed')}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-lowest z-10">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Import Pegawai</h3>
                <p className="text-body-sm text-secondary mt-1">Upload file Excel berisi daftar pegawai. Akun akan dibuat otomatis.</p>
              </div>
              <button onClick={() => !saving && setModalMode('closed')} disabled={saving}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-surface-container disabled:opacity-50 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-colors cursor-pointer ${
                  importFile ? 'border-primary bg-primary/5' : 'border-outline-variant/50 hover:border-primary hover:bg-primary/5'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${importFile ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-surface-container text-outline'}`}>
                  <span className="material-symbols-outlined text-[32px]">{importFile ? 'task' : 'upload_file'}</span>
                </div>
                {importFile ? (
                  <>
                    <p className="font-headline-sm text-headline-sm text-on-surface mb-1">{importFile.name}</p>
                    <p className="text-body-sm text-secondary">Klik atau drag untuk mengganti file</p>
                  </>
                ) : (
                  <>
                    <p className="font-headline-sm text-headline-sm text-on-surface mb-1">Pilih File Excel Pegawai</p>
                    <p className="text-body-sm text-secondary">atau drag & drop file ke sini</p>
                  </>
                )}
              </div>

              <div className="mt-6 p-4 bg-info/10 rounded-xl">
                <p className="font-label-sm text-label-sm text-info font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  Format Kolom yang Dibutuhkan:
                </p>
                <ul className="text-body-sm text-info list-disc list-inside space-y-1 ml-2">
                  <li><code>Nama Lengkap</code></li>
                  <li><code>NIP</code> (Min. 8 Karakter, Digunakan untuk Password)</li>
                  <li><code>Unit Es II</code></li>
                  <li><code>Unit Es III</code> (Opsional)</li>
                  <li><code>Unit Es IV</code> (Opsional)</li>
                  <li><code>Jabatan</code> (Opsional)</li>
                  <li><code>TMT Jabatan</code> (Opsional, format: YYYY-MM-DD)</li>
                </ul>
              </div>

              {/* Progress & Error Section */}
              {importProgress.show && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-label-sm text-on-surface">Proses Import</span>
                    <span className="text-body-sm text-primary font-bold">
                      {importProgress.total > 0 ? `${Math.round((importProgress.current / importProgress.total) * 100)}%` : '0%'}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-container rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-primary transition-all duration-300"
                      style={{ width: importProgress.total > 0 ? `${(importProgress.current / importProgress.total) * 100}%` : '0%' }}></div>
                  </div>
                  
                  {importProgress.errors.length > 0 && (
                    <div className="p-4 bg-error-container text-on-error-container rounded-xl text-body-sm border border-error/20">
                      <p className="font-bold mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        Terdapat {importProgress.errors.length} Peringatan/Error:
                      </p>
                      <ul className="list-disc list-inside max-h-40 overflow-y-auto space-y-1">
                        {importProgress.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-outline-variant/20 flex justify-end gap-3 bg-surface-container-lowest">
              <button onClick={() => setModalMode('closed')} disabled={saving}
                className="px-6 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container transition-all disabled:opacity-50">
                Tutup
              </button>
              <button onClick={handleImport} disabled={saving || !importFile}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Memproses...</>
                ) : (
                  <><span className="material-symbols-outlined text-[20px]">cloud_upload</span> Mulai Import</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Role ── */}
      {modalMode === 'edit-role' && selectedUser && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setModalMode('closed')}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-headline-md text-headline-md text-on-surface">Ubah Role</h3>
                <button onClick={() => setModalMode('closed')}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mb-6 p-4 bg-surface-container-low rounded-xl">
                <p className="font-body-md font-semibold text-on-surface">{selectedUser.pegawai?.nama_lengkap || selectedUser.email}</p>
                <p className="text-body-sm text-outline mt-1">{selectedUser.pegawai?.nip || selectedUser.email}</p>
                {selectedUser.pegawai?.unit_es3 && <p className="text-body-sm text-outline mt-1 bg-surface-container px-2 py-1 rounded inline-block">{selectedUser.pegawai.unit_es3}</p>}
              </div>

              <label className="block font-label-md text-label-md text-on-surface-variant mb-3 uppercase tracking-wider">Pilih Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ROLES.map(role => (
                  <button key={role} onClick={() => {
                      if (selectedRoles.includes(role)) {
                        setSelectedRoles(selectedRoles.filter(r => r !== role))
                      } else {
                        setSelectedRoles([...selectedRoles, role])
                      }
                    }}
                    className={`py-3 px-4 rounded-xl font-label-sm text-label-sm text-left transition-all border ${
                      selectedRoles.includes(role)
                        ? 'bg-primary/10 border-primary text-primary font-bold'
                        : 'bg-white border-outline-variant/40 text-on-surface-variant hover:bg-primary/5 hover:border-primary/20'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span>{ROLE_LABELS[role]}</span>
                      {selectedRoles.includes(role) && <span className="material-symbols-outlined text-[18px]">check_circle</span>}
                    </div>
                  </button>
                ))}
              </div>

              {/* ── Hierarki Role: Info Kontekstual ── */}
              {(selectedRoles.includes('supervisor') || selectedRoles.includes('manajer') || selectedRoles.includes('wakil_pimpinan_unit') || selectedRoles.includes('pimpinan_unit') || selectedRoles.includes('pimpinan_sukpa') || selectedRoles.includes('rektor')) && (
                <div className="mt-5 space-y-3">
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Hierarki Wewenang</p>

                  {selectedRoles.includes('supervisor') && (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-2">
                      <span className="material-symbols-outlined text-teal-600 text-[18px] mt-0.5">account_tree</span>
                      <div className="text-body-sm">
                        <p className="font-semibold text-teal-800">Supervisor</p>
                        <p className="text-teal-700 mt-0.5">
                          Membawahi seluruh Staff pada Unit Es IV: <strong>{selectedUser.pegawai?.unit_es4 && selectedUser.pegawai.unit_es4 !== '-' ? selectedUser.pegawai.unit_es4 : selectedUser.pegawai?.unit_es3 || '(tidak ada data unit)'}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedRoles.includes('manajer') && (
                    <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl flex items-start gap-2">
                      <span className="material-symbols-outlined text-cyan-600 text-[18px] mt-0.5">account_tree</span>
                      <div className="text-body-sm">
                        <p className="font-semibold text-cyan-800">Manajer</p>
                        <p className="text-cyan-700 mt-0.5">
                          Membawahi Supervisor &amp; Staff pada Unit Es III: <strong>{selectedUser.pegawai?.unit_es3 || '(tidak ada data unit)'}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedRoles.includes('wakil_pimpinan_unit') && (
                    <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-sky-600 text-[18px] mt-0.5">visibility</span>
                        <div className="text-body-sm">
                          <p className="font-semibold text-sky-900">Wakil Pimpinan Unit (View Only)</p>
                          <p className="text-sky-700 text-xs mt-0.5">
                            Memantau Output IKU dan cascading pada Unit dan Bagian yang dibidangi.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-sky-900 mb-1 uppercase tracking-wider">
                            Unit ES II yang Dibidangi <span className="text-error">*</span>
                          </label>
                          <select
                            value={ledUnitEs2}
                            onChange={e => setLedUnitEs2(e.target.value)}
                            className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-sky-400 font-medium text-on-surface"
                          >
                            <option value="">-- Pilih Unit ES II --</option>
                            {allUnitEs2List.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-sky-900 mb-1 uppercase tracking-wider">
                            Bagian / Bidang ES III yang Dibidangi <span className="text-error">*</span>
                          </label>
                          <select
                            value={ledUnitEs3}
                            onChange={e => setLedUnitEs3(e.target.value)}
                            className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-sky-400 font-medium text-on-surface"
                          >
                            <option value="">-- Pilih Bagian / Bidang ES III --</option>
                            {availableUnitEs3List.map(bagian => (
                              <option key={bagian} value={bagian}>{bagian}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedRoles.includes('pimpinan_unit') && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="material-symbols-outlined text-blue-600 text-[18px] mt-0.5">corporate_fare</span>
                        <div className="text-body-sm">
                          <p className="font-semibold text-blue-800">Pimpinan Unit</p>
                          <p className="text-blue-700">Membawahi semua Manajer pada Unit Es II yang dipilih.</p>
                        </div>
                      </div>
                      <select
                        value={ledUnitEs2}
                        onChange={e => setLedUnitEs2(e.target.value)}
                        className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-blue-300 font-medium text-on-surface"
                      >
                        <option value="">-- Pilih Unit Es II yang Dipimpin --</option>
                        {allUnitEs2List.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedRoles.includes('pimpinan_sukpa') && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="material-symbols-outlined text-indigo-600 text-[18px] mt-0.5">school</span>
                        <div className="text-body-sm">
                          <p className="font-semibold text-indigo-800">Pimpinan SUKPA</p>
                          <p className="text-indigo-700">Membawahi semua Pimpinan Unit pada SUKPA yang dipilih.</p>
                        </div>
                      </div>
                      <select
                        value={ledSukpa}
                        onChange={e => setLedSukpa(e.target.value)}
                        className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        <option value="">-- Pilih SUKPA --</option>
                        <option value="Wakil Rektor I">Wakil Rektor I</option>
                        <option value="Wakil Rektor II">Wakil Rektor II</option>
                        <option value="Wakil Rektor III">Wakil Rektor III</option>
                        <option value="Wakil Rektor IV">Wakil Rektor IV</option>
                        <option value="Fakultas">Fakultas</option>
                      </select>
                    </div>
                  )}

                  {selectedRoles.includes('rektor') && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2">
                      <span className="material-symbols-outlined text-purple-600 text-[18px] mt-0.5">emoji_events</span>
                      <div className="text-body-sm">
                        <p className="font-semibold text-purple-800">Rektor</p>
                        <p className="text-purple-700 mt-0.5">Berada di puncak hierarki — membawahi seluruh Pimpinan SUKPA, Pimpinan Unit, Manajer, Supervisor, dan Staff.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setModalMode('closed')}
                  className="px-6 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container transition-all">
                  Batal
                </button>
                <button onClick={handleEditRole} disabled={saving || selectedRoles.join(',') === selectedUser.role}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Reset Password ── */}
      {modalMode === 'reset-pw' && selectedUser && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setModalMode('closed')}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-warning text-[32px]">lock_reset</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Reset Password?</h3>
              <p className="text-body-md text-on-surface-variant mb-2">
                Password <strong>{selectedUser.pegawai?.nama_lengkap || selectedUser.email}</strong> akan direset ke <strong>8 digit terakhir NIP</strong>.
              </p>
              {selectedUser.pegawai?.nip && (
                <p className="text-body-sm text-outline mb-6">
                  Password baru: <code className="bg-surface-container px-2 py-0.5 rounded font-mono font-bold text-on-surface">
                    {selectedUser.pegawai.nip.slice(-8)}
                  </code>
                </p>
              )}
              <div className="flex justify-center gap-3">
                <button onClick={() => setModalMode('closed')}
                  className="px-6 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container transition-all">
                  Batal
                </button>
                <button onClick={handleResetPassword} disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-warning text-white font-label-md shadow-lg shadow-warning/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  Ya, Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete ── */}
      {modalMode === 'delete' && selectedUser && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setModalMode('closed')}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-danger text-[32px]">person_remove</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Hapus Akun?</h3>
              <p className="text-body-md text-on-surface-variant mb-8">
                Akun <strong>{selectedUser.pegawai?.nama_lengkap || selectedUser.email}</strong> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
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

      {/* ── MODAL: Create User (Manual) ── */}
      {modalMode === 'create' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setModalMode('closed')}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">Buat Akun Manual</h3>
                  <p className="text-body-sm text-on-surface-variant mt-1">Pilih pegawai untuk dibuatkan akun login manual.</p>
                </div>
                <button onClick={() => setModalMode('closed')}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">Pilih Pegawai</label>
                  <select value={createPegawaiId} onChange={e => {
                    setCreatePegawaiId(e.target.value)
                    const p = pegawaiList.find(p => p.id === e.target.value)
                    if (p) setCreateEmail(p.nip + '@undip.ac.id')
                  }}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                    <option value="">-- Pilih Pegawai --</option>
                    {availablePegawai.map(p => (
                      <option key={p.id} value={p.id}>{p.nama_lengkap} — {p.nip}</option>
                    ))}
                  </select>
                </div>

                {selectedPegawaiData && (
                  <div className="p-4 bg-surface-container-low rounded-xl">
                    <div className="grid grid-cols-2 gap-3 text-body-sm">
                      <div>
                        <p className="text-outline text-[11px] uppercase tracking-wider">NIP</p>
                        <p className="font-semibold text-on-surface" style={{ fontFamily: 'JetBrains Mono' }}>{selectedPegawaiData.nip}</p>
                      </div>
                      <div>
                        <p className="text-outline text-[11px] uppercase tracking-wider">Unit ES II</p>
                        <p className="font-semibold text-on-surface">{selectedPegawaiData.unit_es2}</p>
                      </div>
                      <div>
                        <p className="text-outline text-[11px] uppercase tracking-wider">Unit ES III</p>
                        <p className="font-semibold text-on-surface">{selectedPegawaiData.unit_es3}</p>
                      </div>
                      <div>
                        <p className="text-outline text-[11px] uppercase tracking-wider">Unit ES IV</p>
                        <p className="font-semibold text-on-surface">{selectedPegawaiData.unit_es4}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">Email Login</label>
                  <input type="email" placeholder="email@undip.ac.id" value={createEmail} onChange={e => setCreateEmail(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">Role</label>
                  <select value={createRole} onChange={e => setCreateRole(e.target.value as UserRole)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                    {ALL_ROLES.map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-info/5 rounded-xl border border-info/10">
                  <p className="text-body-sm text-info">
                    <span className="font-bold">Password default:</span> 8 digit terakhir NIP
                    {selectedPegawaiData && (
                      <span> → <code className="bg-info/10 px-1.5 py-0.5 rounded font-mono font-bold">{selectedPegawaiData.nip.slice(-8)}</code></span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setModalMode('closed')}
                  className="px-6 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container transition-all">
                  Batal
                </button>
                <button onClick={handleCreateUser} disabled={saving || !createPegawaiId || !createEmail}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  Buat Akun
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
