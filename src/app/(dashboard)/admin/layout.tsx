'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useAuthStore(state => state.user)
  const activeRole = useAuthStore(state => state.activeRole)
  const isLoading = useAuthStore(state => state.isLoading)
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      if (activeRole !== 'admin') {
        router.replace('/dashboard')
      }
    }
  }, [user, activeRole, isLoading, router])

  if (!isLoading && activeRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">Halaman Khusus Administrator</h3>
        <p className="text-sm text-slate-500 max-w-md">
          Mengalihkan ke Dashboard karena Anda sedang aktif sebagai <span className="font-semibold capitalize">{activeRole || 'Staff'}</span>...
        </p>
      </div>
    )
  }

  return <>{children}</>
}
