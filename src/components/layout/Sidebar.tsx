'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRole, ROLE_LABELS } from '@/lib/types'
import { useUIStore } from '@/store/uiStore'
import { useState } from 'react'

interface NavItem {
  href: string
  icon: string
  label: string
  roles: UserRole[]
  children?: Omit<NavItem, 'children'>[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',             icon: 'dashboard',             label: 'Dashboard',          roles: ['staff', 'supervisor', 'manajer', 'pimpinan_unit', 'pimpinan_sukpa', 'rektor', 'admin'] },
  { href: '/perencanaan-skp',       icon: 'assignment',            label: 'Perencanaan SKP',    roles: ['staff', 'supervisor', 'manajer', 'pimpinan_unit', 'pimpinan_sukpa'] },
  { href: '/logbook',               icon: 'history_edu',           label: 'Logbook',            roles: ['staff', 'supervisor', 'manajer'] },
  { href: '/monitoring',            icon: 'query_stats',           label: 'Monitoring',         roles: ['supervisor', 'manajer', 'pimpinan_unit', 'pimpinan_sukpa', 'rektor', 'admin'] },
  { 
    href: '/iku', 
    icon: 'corporate_fare', 
    label: 'IKU Bagian', 
    roles: ['manajer'],
    children: [
      { href: '/iku/pengajuan', icon: 'add_box', label: 'Pengajuan IKU', roles: ['manajer'] },
      { href: '/iku/riwayat', icon: 'history', label: 'Riwayat Pengajuan', roles: ['manajer'] },
      { href: '/iku/pelaporan', icon: 'fact_check', label: 'Pelaporan IKU', roles: ['manajer'] },
      { href: '/iku/monitoring', icon: 'monitoring', label: 'Monitoring IKU', roles: ['manajer'] },
    ]
  },
  { href: '/verifikasi-iku',        icon: 'task_alt',              label: 'Verifikasi IKU',     roles: ['pimpinan_unit', 'admin'] },
  { href: '/admin/manajemen-periode', icon: 'date_range',          label: 'Manajemen Periode',  roles: ['admin'] },
  { href: '/admin/manajemen-iku',   icon: 'description',           label: 'Manajemen IKU',      roles: ['admin'] },
  { href: '/admin/manajemen-user',  icon: 'manage_accounts',       label: 'Manajemen User',     roles: ['admin'] },
]

interface SidebarProps {
  role?: UserRole
}

export default function Sidebar({ role = 'staff' }: SidebarProps) {
  const pathname = usePathname()
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen)
  const toggleSidebar = useUIStore(state => state.toggleSidebar)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ '/iku': true })

  const toggleGroup = (href: string) => {
    setOpenGroups(prev => ({ ...prev, [href]: !prev[href] }))
  }

  const visible = NAV_ITEMS.filter(item => item.roles.includes(role)).map(item => {
    if (item.children) {
      return { ...item, children: item.children.filter(child => child.roles.includes(role)) }
    }
    return item
  })

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-[280px] flex flex-col py-8 px-4 z-50 transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', borderRight: '1px solid rgba(193,198,215,0.25)', boxShadow: '4px 0 24px -4px rgba(0,89,187,0.06)' }}>

        {/* Brand */}
        <div className="px-4 mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg,#0059bb,#0070ea)' }}>
              <span className="material-symbols-outlined text-[20px]">school</span>
            </div>
            <div>
              <h1 className="text-[17px] font-extrabold leading-tight" style={{ fontFamily: 'Manrope', color: '#0059bb' }}>
                SKP UNDIP
              </h1>
              <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: '#717786', fontFamily: 'JetBrains Mono' }}>
                HRIS Performance
              </p>
            </div>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden p-1.5 rounded-lg hover:bg-black/5 text-[#717786]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
          {visible.map(item => {
            if (item.children && item.children.length > 0) {
              const isActiveGroup = item.children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))
              const isOpen = openGroups[item.href] !== undefined ? openGroups[item.href] : isActiveGroup

              return (
                <div key={item.href} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 group
                      ${isActiveGroup
                        ? 'text-[#0059bb] font-bold'
                        : 'text-[#414754] hover:bg-[#0059bb]/5'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-[22px] transition-colors ${isActiveGroup ? 'text-[#0059bb]' : 'text-[#717786] group-hover:text-[#0059bb]'}`}
                      style={{ fontVariationSettings: isActiveGroup ? "'FILL' 1" : "'FILL' 0" }}>
                      {item.icon}
                    </span>
                    <span style={{ fontFamily: 'Inter' }} className="flex-1 text-left">{item.label}</span>
                    <span className={`material-symbols-outlined text-[20px] text-[#717786] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>
                  
                  {isOpen && (
                    <div className="pl-12 pr-2 space-y-1 animate-slide-down origin-top">
                      {item.children.map(child => {
                        const active = pathname === child.href || pathname.startsWith(child.href + '/')
                        return (
                          <Link key={child.href} href={child.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 group
                              ${active
                                ? 'text-[#0059bb] font-bold bg-[#0059bb]/10 shadow-sm'
                                : 'text-[#717786] hover:text-[#0059bb] hover:bg-[#0059bb]/5'
                              }`}
                          >
                            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                              {child.icon}
                            </span>
                            <span style={{ fontFamily: 'Inter' }}>{child.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 group
                  ${active
                    ? 'text-[#0059bb] font-bold -translate-y-0.5'
                    : 'text-[#414754] hover:-translate-y-0.5 hover:bg-[#0059bb]/5'
                  }`}
                style={active
                  ? { background: 'rgba(0,89,187,0.10)', boxShadow: '0 2px 8px rgba(0,89,187,0.10)' }
                  : undefined
                }
              >
                <span className={`material-symbols-outlined text-[22px] transition-colors ${active ? 'text-[#0059bb]' : 'text-[#717786] group-hover:text-[#0059bb]'}`}
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span style={{ fontFamily: 'Inter' }}>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0059bb]" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Role badge */}
        <div className="mt-4 mx-2 p-3 rounded-xl" style={{ background: 'rgba(0,89,187,0.05)', border: '1px solid rgba(0,89,187,0.10)' }}>
          <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: '#717786', fontFamily: 'JetBrains Mono' }}>Login Sebagai</p>
          <p className="text-[13px] font-bold capitalize" style={{ color: '#0059bb', fontFamily: 'Manrope' }}>
            {ROLE_LABELS[role] || role}
          </p>
        </div>
      </aside>
    </>
  )
}
