'use client'

import React from 'react'
import { CascadingProvider } from '@/context/CascadingContext'

export default function EvaluasiKinerjaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CascadingProvider>
      {children}
    </CascadingProvider>
  )
}
