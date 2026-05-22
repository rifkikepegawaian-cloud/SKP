'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, ROLE_LABELS } from '@/lib/types'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import Swal from 'sweetalert2'

interface TopBarProps {
  title?: string
  user?: Partial<User> | null
  searchPlaceholder?: string
}

export default function TopBar({ title = 'SKP Universitas Diponegoro', user, searchPlaceholder = 'Cari data...' }: TopBarProps) {
  const router = useRouter()
  const logout = useAuthStore(state => state.logout)
  const toggleSidebar = useUIStore(state => state.toggleSidebar)
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen)
  
  const activeRole = useAuthStore(state => state.activeRole)
  const setActiveRole = useAuthStore(state => state.setActiveRole)
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = user?.pegawai?.nama_lengkap
    ? user.pegawai.nama_lengkap.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'U'

  const displayName = user?.pegawai?.nama_lengkap ?? user?.email ?? 'Pengguna'
  const roles = (user?.role || '').split(',') as (keyof typeof ROLE_LABELS)[]
  const roleLabel = activeRole ? (ROLE_LABELS[activeRole as keyof typeof ROLE_LABELS] ?? activeRole) : 'User'

  const handleLogout = async () => {
    setIsDropdownOpen(false)
    const result = await Swal.fire({
      title: 'Keluar Aplikasi?',
      text: 'Anda yakin ingin mengakhiri sesi ini?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    })
    
    if (result.isConfirmed) {
      await logout()
      router.push('/')
    }
  }

  return (
    <header
      className="fixed top-0 right-0 z-40 flex items-center justify-between h-16 px-4 md:px-6 transition-all duration-300"
      style={{
        left: isSidebarOpen ? '280px' : '0px',
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(193,198,215,0.25)',
        boxShadow: '0 1px 12px rgba(0,89,187,0.05)',
      }}
    >
      {/* Left: Hamburger + Title + Search */}
      <div className="flex items-center gap-3">
        {/* Hamburger toggle */}
        <button
          onClick={toggleSidebar}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#717786] hover:bg-[#e5eeff] hover:text-[#0059bb] transition-colors flex-shrink-0"
          title={isSidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
        >
          <span className="material-symbols-outlined text-[22px]">
            {isSidebarOpen ? 'menu_open' : 'menu'}
          </span>
        </button>

        <h2 className="text-[16px] font-extrabold text-[#0059bb] hidden lg:block" style={{ fontFamily: 'Manrope' }}>
          {title}
        </h2>

        <div className="relative hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#717786] text-[20px]">search</span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="pl-10 pr-4 py-1.5 rounded-full text-[14px] outline-none transition-all w-48 focus:w-64"
            style={{
              background: '#eff4ff',
              border: '1px solid rgba(193,198,215,0.4)',
              color: '#0b1c30',
              fontFamily: 'Inter',
            }}
          />
        </div>
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-[#717786] hover:bg-[#e5eeff] transition-colors">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>
        <button className="w-9 h-9 rounded-full items-center justify-center text-[#717786] hover:bg-[#e5eeff] transition-colors hidden sm:flex">
          <span className="material-symbols-outlined text-[22px]">help_outline</span>
        </button>

        <div className="h-7 w-px mx-1" style={{ background: 'rgba(193,198,215,0.5)' }} />

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
          >
            <div className="text-right hidden lg:block">
              <p className="text-[13px] font-bold leading-none text-[#0b1c30]" style={{ fontFamily: 'JetBrains Mono' }}>
                {displayName}
              </p>
              <p className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: '#717786', fontFamily: 'JetBrains Mono' }}>
                {roleLabel}
              </p>
            </div>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="w-9 h-9 rounded-full object-cover"
                style={{ border: '2px solid #d8e2ff' }} />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px] text-white"
                style={{ background: 'linear-gradient(135deg,#0059bb,#0070ea)', border: '2px solid #d8e2ff' }}>
                {initials}
              </div>
            )}
            <span className="material-symbols-outlined text-[#717786] text-[18px]">
              {isDropdownOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden animate-slide-up origin-top-right z-50">
              
              {/* Role Selection */}
              {roles.length > 1 && (
                <div className="p-3 border-b border-outline-variant/20 bg-surface-container-lowest">
                  <p className="text-[11px] uppercase tracking-wider text-outline mb-2 px-2" style={{ fontFamily: 'JetBrains Mono' }}>Ganti Role</p>
                  <div className="space-y-1">
                    {roles.map(r => (
                      <button 
                        key={r}
                        onClick={() => { 
                          setActiveRole(r as any); 
                          setIsDropdownOpen(false);
                          window.location.href = '/dashboard';
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-[13px] font-medium transition-colors flex items-center justify-between ${
                          activeRole === r ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {ROLE_LABELS[r] || r}
                        {activeRole === r && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* General Links */}
              <div className="p-2">
                <Link href="/profil" onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container transition-colors text-on-surface"
                >
                  <span className="material-symbols-outlined text-[20px] text-outline">person</span>
                  <span className="text-[14px] font-medium">Profil Saya</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-error/10 transition-colors text-error mt-1"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  <span className="text-[14px] font-medium">Keluar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
