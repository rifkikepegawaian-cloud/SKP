'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect old super-admin route to new admin route
export default function SuperAdminRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/manajemen-iku')
  }, [router])

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-body-md text-on-surface-variant">Mengalihkan...</p>
    </div>
  )
}
