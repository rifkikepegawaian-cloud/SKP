'use client'

import React from 'react'
import { CascadingProvider } from '@/context/CascadingContext'

export default function CascadingLayout({
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
