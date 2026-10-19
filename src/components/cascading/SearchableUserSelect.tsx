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
  placeholder = 'Cari berdasarkan Nama atau NIP...',
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
    const foundInProps = users.find(u => u.id === value)
    if (foundInProps) return foundInProps
    if (selectedUserCache && selectedUserCache.id === value) return selectedUserCache
    return null
  }, [users, value, selectedUserCache])

  // Ambil detail selectedUser jika belum ada di memory
  useEffect(() => {
    if (value && !selectedUser) {
      const supabase = createClient()
      supabase
        .from('users')
        .select('*, pegawai(*)')
        .eq('id', value)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setSelectedUserCache(data as User)
          }
        })
    }
  }, [value, selectedUser])

  // Gabungkan user lokal dan remote search hasil database (hilangkan duplikat)
  const combinedUsers = useMemo(() => {
    const map = new Map<string, User>()
    // Masukkan user lokal
    users.forEach(u => map.set(u.id, u))
    // Masukkan user hasil remote search
    remoteResults.forEach(u => map.set(u.id, u))
    // Masukkan selected user agar selalu ada
    if (selectedUser) map.set(selectedUser.id, selectedUser)

    return Array.from(map.values())
  }, [users, remoteResults, selectedUser])

  // Filter gabungan berdasarkan input kata kunci (Nama, NIP, Jabatan, Unit)
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return combinedUsers

    return combinedUsers.filter(u => {
      const nama = (u.pegawai?.nama_lengkap || '').toLowerCase()
      const nip = (u.pegawai?.nip || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      const jabatan = (u.pegawai?.jabatan || '').toLowerCase()
      const unit = (u.pegawai?.unit_es2 || u.led_unit_es2 || '').toLowerCase()
      const bagian = (u.pegawai?.unit_es3 || u.led_unit_es3 || '').toLowerCase()
      const subbag = (u.pegawai?.unit_es4 || '').toLowerCase()

      return (
        nama.includes(q) ||
        nip.includes(q) ||
        email.includes(q) ||
        jabatan.includes(q) ||
        unit.includes(q) ||
        bagian.includes(q) ||
        subbag.includes(q)
      )
    })
  }, [combinedUsers, searchQuery])

  // Live Database Search: mencari ke SELURUH data pegawai di Supabase tanpa batasan 1.000 data
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q || q.length < 2) {
      setRemoteResults([])
      setIsSearchingRemote(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingRemote(true)
        const supabase = createClient()

        // Query ke tabel users join pegawai dengan filter ilike pada nama dan nip
        let query = supabase
          .from('users')
          .select('*, pegawai!inner(*)')
          .or(`nama_lengkap.ilike.%${q}%,nip.ilike.%${q}%,email.ilike.%${q}%`, { foreignTable: 'pegawai' })

        // Filter role sesuai konteks penugasan
        const roleLower = targetRoleLabel.toLowerCase()
        if (roleLower.includes('staf') || roleLower.includes('staff')) {
          query = query.ilike('role', '%staff%')
        } else if (roleLower.includes('supervisor') || roleLower.includes('spv')) {
          query = query.ilike('role', '%supervisor%')
        } else if (roleLower.includes('manajer')) {
          query = query.ilike('role', '%manajer%')
        }

        // Filter unit Eselon II jika ditetapkan
        if (filterUnitEs2) {
          query = query.eq('pegawai.unit_es2', filterUnitEs2)
        }

        const { data, error } = await query.limit(50)

        if (!error && data) {
          setRemoteResults(data as User[])
        }
      } catch (err) {
        console.warn('Live remote search error:', err)
      } finally {
        setIsSearchingRemote(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, targetRoleLabel, filterUnitEs2])

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
            {/* Baris 1: Nama Lengkap Pegawai - Bersih dan tidak terhimpit NIP */}
            <p className="font-bold text-xs text-on-surface truncate leading-tight">
              {selectedUser.pegawai?.nama_lengkap || selectedUser.email}
            </p>

            {/* Baris 2: NIP dan Jabatan / Unit - Rapi di bawah nama */}
            <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant mt-1 overflow-hidden flex-wrap">
              {selectedUser.pegawai?.nip && (
                <span className="font-mono bg-surface-container-high px-1.5 py-0.5 rounded text-[9.5px] font-bold text-primary shrink-0">
                  NIP. {selectedUser.pegawai.nip}
                </span>
              )}
              <span className="truncate opacity-80 text-[10.5px]">
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
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:outline-none font-medium text-on-surface"
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
              <span>Mencari di seluruh database pegawai Undip</span>
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
                    ? 'Mencari di seluruh data pegawai...' 
                    : `Tidak ditemukan ${targetRoleLabel} yang cocok.`}
                </p>
                <p className="text-[10px] text-on-surface-variant/60">
                  Coba ketik bagian dari nama atau nomor NIP pegawai.
                </p>
              </div>
            ) : (
              filteredUsers.map(u => {
                const isSelected = u.id === value
                const badge = getUserBadge(u)

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelect(u)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Baris 1: Nama Lengkap */}
                      <p className="font-bold text-xs text-on-surface leading-tight">
                        {u.pegawai?.nama_lengkap || u.email}
                      </p>

                      {/* Baris 2: NIP dan Jabatan */}
                      <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant mt-1 flex-wrap">
                        {u.pegawai?.nip && (
                          <span className="font-mono bg-surface-container-high px-1.5 py-0.2 rounded text-[9.5px] font-semibold text-primary">
                            NIP. {u.pegawai.nip}
                          </span>
                        )}
                        <span className="opacity-80">
                          {badge}
                        </span>
                      </div>

                      {u.pegawai?.unit_es2 && (
                        <p className="text-[9.5px] text-on-surface-variant/70 mt-0.5">
                          Unit: {u.pegawai.unit_es2}
                        </p>
                      )}
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
