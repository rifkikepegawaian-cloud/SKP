'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function VerifikasiSKPPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect ke modul Cascading & Verifikasi yang baru
    router.replace('/cascading')
  }, [router])

  return (
    <div className="p-8 text-center space-y-4 max-w-lg mx-auto py-24">
      <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <span className="material-symbols-outlined text-3xl">verified</span>
      </div>
      <h2 className="text-lg font-bold text-on-surface">Verifikasi SKP Terintegrasi di Cascading</h2>
      <p className="text-xs text-on-surface-variant leading-relaxed">
        Verifikasi tugas dan capaian kinerja bawahan kini dapat diakses langsung pada tab <b>Pelaporan & Verifikasi Capaian</b> di modul Cascading SKP.
      </p>
      <Link
        href="/cascading"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary/90 transition-all"
      >
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
        Buka Cascading & Verifikasi
      </Link>
    </div>
  )
}
