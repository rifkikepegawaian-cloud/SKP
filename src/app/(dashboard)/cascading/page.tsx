'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCascading } from '@/context/CascadingContext'

export default function CascadingIndexPage() {
  const router = useRouter()
  const { role, isLoading } = useCascading()

  useEffect(() => {
    if (!isLoading) {
      if (role === 'staff') {
        router.replace('/cascading/dialog-kinerja')
      } else {
        router.replace('/cascading/penugasan')
      }
    }
  }, [role, isLoading, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
        <span className="material-symbols-outlined text-2xl">sync</span>
      </div>
      <p className="text-xs font-medium text-on-surface-variant">Mengarahkan ke modul Cascading & Rencana SKP...</p>
    </div>
  )
}
