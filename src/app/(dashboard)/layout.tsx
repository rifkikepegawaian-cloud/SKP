'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { useUIStore } from '@/store/uiStore'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useAuthStore(state => state.user)
  const isLoading = useAuthStore(state => state.isLoading)
  const fetchProfile = useAuthStore(state => state.fetchProfile)
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen)
  const activeRole = useAuthStore(state => state.activeRole)
  const router = useRouter()

  useEffect(() => {
    if (!user && isLoading) {
      fetchProfile().then(profile => {
        if (!profile) {
          router.push('/')
        }
      })
    }
  }, [user, isLoading, fetchProfile, router])

  // Fallback defensively to the first role if activeRole is somehow missing but user.role is a multi-role string
  const role = activeRole || (user?.role ? (user.role.split(',')[0] as any) : 'staff')

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-slide-up">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#0059bb,#0070ea)' }}>
            <span className="material-symbols-outlined text-white text-2xl">school</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-body-sm text-on-surface-variant">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Sidebar role={role} />
      <TopBar user={user} />
      
      <main className={isSidebarOpen 
        ? "pl-6 pr-6 md:pl-10 md:pr-10 lg:pl-[320px] lg:pr-10 pt-[88px] pb-12 transition-all duration-300" 
        : "pl-6 pr-6 md:pl-10 md:pr-10 lg:pl-10 lg:pr-10 pt-[88px] pb-12 transition-all duration-300"
      }>
        <div className="max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
