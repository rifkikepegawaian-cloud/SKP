'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { User } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface SearchableUserSelectProps {
  value: string
  onChange: (userId: string) => void
  users: User[]
  placeholder?: string
  targetRoleLabel?: string
  filterUnitEs2?: string
  disabled?: boolean
  required?: boolean
}

export default function SearchableUserSelect({
  value,
  onChange,
  users,
  placeholder = 'Ketik Nama atau NIP pegawai...',
  targetRoleLabel = 'Pegawai',
  filterUnitEs2,
  disabled = false,
  required = false,
}: SearchableUserSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [remoteResults, setRemoteResults] = useState<User[]>([])
  const [isSearchingRemote, setIsSearchingRemote] = useState(false)
  const [selectedUserCache, setSelectedUserCache] = useState<User | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Helper untuk mendapatkan badge/jabatan user
  const getUserBadge = (sub: User) => {
    if (sub.role?.includes('pimpinan_sukpa')) {
      return sub.led_sukpa ? `Pimpinan SUKPA: ${sub.led_sukpa}` : 'Pimpinan SUKPA'
    } else if (sub.role?.includes('pimpinan_unit')) {
      return sub.led_unit_es2 ? `Pimpinan Unit: ${sub.led_unit_es2}` : (sub.pegawai?.unit_es2 ? `Unit: ${sub.pegawai.unit_es2}` : 'Pimpinan Unit')
    } else if (sub.role?.includes('manajer')) {
      return sub.pegawai?.unit_es3 ? `Manajer: ${sub.pegawai.unit_es3}` : (sub.pegawai?.unit_es2 ? `Unit: ${sub.pegawai.unit_es2}` : 'Manajer')
    } else if (sub.role?.includes('supervisor')) {
      return sub.pegawai?.unit_es4 ? `Supervisor: ${sub.pegawai.unit_es4}` : (sub.pegawai?.unit_es3 ? `Bagian: ${sub.pegawai.unit_es3}` : 'Supervisor')
    } else {
      return sub.pegawai?.jabatan || sub.pegawai?.unit_es4 || sub.pegawai?.unit_es3 || sub.pegawai?.unit_es2 || 'Staf Pelaksana'
    }
  }

  // Cari user terpilih baik dari props `users` maupun dari cache hasil remote search
  const selectedUser = useMemo(() => {
    if (!value) return null
    // Prioritaskan yang sudah memiliki data pegawai lengkap
    if (selectedUserCache && selectedUserCache.id === value && selectedUserCache.pegawai?.nama_lengkap) {
      return selectedUserCache
    }

    const foundInProps = users.find(u => u.id === value)
    if (foundInProps && foundInProps.pegawai?.nama_lengkap) {
      return foundInProps
    }

    return foundInProps || selectedUserCache || null
  }, [users, value, selectedUserCache])

  // Ambil detail selectedUser jika belum ada di memory atau belum ada data pegawai-nya
  useEffect(() => {
    if (value && (!selectedUser || !selectedUser.pegawai?.nama_lengkap)) {
      const supabase = createClient()
      supabase
        .from('users')
        .select('*, pegawai!inner(*)')
        .eq('id', value)
        .maybeSingle()
        .then(({ data, error }) => {
          if (data && (data as any).pegawai) {
            setSelectedUserCache(data as User)
          } else {
            // Fallback jika tidak match inner join
            supabase
              .from('users')
              .select('*, pegawai(*)')
              .eq('id', value)
              .maybeSingle()
              .then(({ data: fallbackData }) => {
                if (fallbackData) setSelectedUserCache(fallbackData as User)
              })
          }
        })
    }
  }, [value, selectedUser])

  // Gabungkan user lokal dan remote search hasil database (hilangkan duplikat)
  const combinedUsers = useMemo(() => {
    const map = new Map<string, User>()
    // Masukkan user lokal
    users.forEach(u => map.set(u.id, u))
    // Masukkan user hasil remote search (akan menimpa dengan data lengkap pegawai jika ada)
    remoteResults.forEach(u => map.set(u.id, u))
    // Masukkan selected user agar selalu ada
    if (selectedUser) map.set(selectedUser.id, selectedUser)

    return Array.from(map.values())
  }, [users, remoteResults, selectedUser])

  // Filter gabungan berdasarkan input kata kunci (Nama, NIP, Jabatan, Unit)
  const filteredUsers = useMemo(() => {
    const rawQ = searchQuery.trim()
    const q = rawQ.toLowerCase()
    if (!q) return combinedUsers

    // Hanya ambil angka untuk matching NIP fleksibel
    const digitsOnlyQ = rawQ.replace(/\D/g, '')

    return combinedUsers.filter(u => {
      const nama = (u.pegawai?.nama_lengkap || '').toLowerCase()
      const nip = (u.pegawai?.nip || '').toLowerCase()
      const nipDigits = (u.pegawai?.nip || '').replace(/\D/g, '')
      const email = (u.email || '').toLowerCase()
      const jabatan = (u.pegawai?.jabatan || '').toLowerCase()
      const unit = (u.pegawai?.unit_es2 || u.led_unit_es2 || '').toLowerCase()
      const bagian = (u.pegawai?.unit_es3 || u.led_unit_es3 || '').toLowerCase()
      const subbag = (u.pegawai?.unit_es4 || '').toLowerCase()

      const matchNama = nama.includes(q)
      const matchNip = nip.includes(q) || (digitsOnlyQ.length >= 3 && nipDigits.includes(digitsOnlyQ))
      const matchEmail = email.includes(q)
      const matchJabatan = jabatan.includes(q)
      const matchUnit = unit.includes(q) || bagian.includes(q) || subbag.includes(q)

      return matchNama || matchNip || matchEmail || matchJabatan || matchUnit
    })
  }, [combinedUsers, searchQuery])

  // Live Database Search: mencari ke SELURUH database pegawai Undip secara real-time
  useEffect(() => {
    const rawQ = searchQuery.trim()
    if (!rawQ || rawQ.length < 2) {
      setRemoteResults([])
      setIsSearchingRemote(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingRemote(true)
        const supabase = createClient()

        // Query ke tabel users join pegawai dengan filter ilike pada nama_lengkap dan nip
        let query = supabase
          .from('users')
          .select('*, pegawai!inner(*)')
          .or(`nama_lengkap.ilike.%${rawQ}%,nip.ilike.%${rawQ}%`, { foreignTable: 'pegawai' })

        // Filter role sesuai konteks penugasan jika relevan
        const roleLower = targetRoleLabel.toLowerCase()
        if (roleLower.includes('staf') || roleLower.includes('staff')) {
          query = query.ilike('role', '%staff%')
        } else if (roleLower.includes('supervisor') || roleLower.includes('spv')) {
          query = query.ilike('role', '%supervisor%')
        } else if (roleLower.includes('manajer')) {
          query = query.ilike('role', '%manajer%')
        } else if (roleLower.includes('unit')) {
          query = query.ilike('role', '%pimpinan_unit%')
        } else if (roleLower.includes('sukpa')) {
          query = query.ilike('role', '%pimpinan_sukpa%')
        }

        const { data, error } = await query.limit(50)

        if (!error && data) {
          setRemoteResults(data as User[])
        } else if (error) {
          console.warn('Live remote search error:', error.message)
        }
      } catch (err) {
        console.warn('Live remote search exception:', err)
      } finally {
        setIsSearchingRemote(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery, targetRoleLabel])

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  const handleSelect = (u: User) => {
    setSelectedUserCache(u)
    onChange(u.id)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Hidden input for HTML form requirement validation */}
      <input
        type="text"
        className="sr-only"
        value={value}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
      />

      {/* Trigger Button / Display */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full text-left px-3 py-2 text-xs rounded-xl border transition-all flex items-center justify-between gap-2 ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-white'
            : selectedUser
              ? 'bg-surface-container-lowest border-outline-variant/60 hover:border-primary/60'
              : 'bg-surface-container border-outline-variant/50 hover:border-outline'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {selectedUser ? (
          <div className="min-w-0 flex-1 text-left py-0.5">
            {/* Baris 1: Nama Lengkap Pegawai */}
            <p className="font-bold text-xs text-on-surface truncate leading-tight">
              {selectedUser.pegawai?.nama_lengkap || selectedUser.email}
            </p>

            {/* Baris 2: NIP dan Jabatan / Unit - Rapi dan Jelas */}
            <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant mt-1 overflow-hidden flex-wrap">
              {selectedUser.pegawai?.nip ? (
                <span className="font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[9.5px] font-bold shrink-0">
                  NIP. {selectedUser.pegawai.nip}
                </span>
              ) : selectedUser.email && (
                <span className="font-mono bg-surface-container-high px-1.5 py-0.5 rounded text-[9.5px] text-on-surface-variant shrink-0">
                  {selectedUser.email.split('@')[0]}
                </span>
              )}
              <span className="truncate opacity-85 text-[10.5px]">
                {getUserBadge(selectedUser)}
              </span>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1 py-1">
            <span className="text-on-surface-variant/70 flex items-center gap-1.5 truncate text-xs">
              <span className="material-symbols-outlined text-[16px] text-primary">person_search</span>
              <span>Pilih {targetRoleLabel} (Cari Nama / NIP)...</span>
            </span>
          </div>
        )}

        <span className={`material-symbols-outlined text-sm text-on-surface-variant/60 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-outline-variant/40 overflow-hidden flex flex-col animate-fade-in max-h-80">
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-outline-variant/30 bg-surface-container-lowest">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-2.5 text-on-surface-variant/50 text-[16px]">
                search
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-white focus:outline-none font-medium text-on-surface"
              />
              {isSearchingRemote ? (
                <span className="material-symbols-outlined absolute right-2 text-primary animate-spin text-xs">
                  progress_activity
                </span>
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-on-surface-variant/50 hover:text-on-surface p-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              ) : null}
            </div>
            <div className="flex items-center justify-between text-[10px] text-on-surface-variant/70 mt-1.5 px-1 font-medium">
              <span>Cari berdasarkan Nama atau Nomor NIP</span>
              {searchQuery && (
                <span className="text-primary font-bold">
                  {filteredUsers.length} ditemukan
                </span>
              )}
            </div>
          </div>

          {/* User List */}
          <div className="overflow-y-auto divide-y divide-outline-variant/15 flex-1 p-1 max-h-60">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center space-y-1">
                <span className="material-symbols-outlined text-2xl text-on-surface-variant/40">person_off</span>
                <p className="text-xs text-on-surface-variant font-medium">
                  {isSearchingRemote 
                    ? 'Mencari di seluruh database pegawai...' 
                    : `Tidak ditemukan ${targetRoleLabel} yang cocok.`}
                </p>
                <p className="text-[10px] text-on-surface-variant/60">
                  Coba ketik bagian nama pegawai atau nomor NIP.
                </p>
              </div>
            ) : (
              filteredUsers.map(u => {
                const isSelected = u.id === value
                const badge = getUserBadge(u)
                const nama = u.pegawai?.nama_lengkap || u.email
                const nip = u.pegawai?.nip || (u.email?.includes('@') ? u.email.split('@')[0] : '')

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelect(u)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Baris 1: Nama Lengkap dan Badge NIP */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-xs text-on-surface leading-snug">
                          {nama}
                        </p>
                        {nip && (
                          <span className="font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[9.5px] font-bold shrink-0">
                            NIP. {nip}
                          </span>
                        )}
                      </div>

                      {/* Baris 2: Jabatan dan Unit Kerja */}
                      <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant mt-1 flex-wrap">
                        <span className="font-medium text-on-surface-variant/90">
                          {badge}
                        </span>
                        {u.pegawai?.unit_es2 && (
                          <>
                            <span className="text-outline-variant">•</span>
                            <span className="text-on-surface-variant/70">
                              {u.pegawai.unit_es2}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <span className="material-symbols-outlined text-primary text-sm mt-0.5 shrink-0">
                        check_circle
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
