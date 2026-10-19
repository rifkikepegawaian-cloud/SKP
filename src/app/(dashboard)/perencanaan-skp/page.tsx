'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PerencanaanSKPPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect otomatis ke modul Cascading & Rencana SKP yang baru
    router.replace('/cascading')
  }, [router])

  return (
    <div className="p-8 text-center space-y-4 max-w-lg mx-auto py-24">
      <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <span className="material-symbols-outlined text-3xl">account_tree</span>
      </div>
      <h2 className="text-lg font-bold text-on-surface">Proses Perencanaan SKP Telah Diperbarui</h2>
      <p className="text-xs text-on-surface-variant leading-relaxed">
        Sesuai alur terbaru, perencanaan SKP kini terintegrasi langsung dalam modul <b>Cascading & Dialog Kinerja</b>. Target dan tugas diturunkan secara berjenjang dari pimpinan.
      </p>
      <Link
        href="/cascading"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary/90 transition-all"
      >
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
        Menuju Cascading & Rencana SKP
      </Link>
    </div>
  )
}
