'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EvaluasiKinerjaIndexPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/evaluasi-kinerja/hasil-kerja')
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
        <span className="material-symbols-outlined text-2xl">sync</span>
      </div>
      <p className="text-xs font-medium text-on-surface-variant">Mengarahkan ke Evaluasi Hasil Kerja...</p>
    </div>
  )
}
