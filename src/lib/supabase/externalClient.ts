import { createClient } from '@supabase/supabase-js'

export const EXTERNAL_SUPABASE_DEFAULT_CONFIG = {
  url: process.env.EXTERNAL_SUPABASE_URL || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL || '',
  anonKey: process.env.EXTERNAL_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY || '',
  tableName: 'employees',
}

export function createExternalClient(customUrl?: string, customKey?: string) {
  const url = customUrl?.trim() || EXTERNAL_SUPABASE_DEFAULT_CONFIG.url
  const key = customKey?.trim() || EXTERNAL_SUPABASE_DEFAULT_CONFIG.anonKey
  if (!url || !key) {
    throw new Error('Kredensial database eksternal belum dikonfigurasi.')
  }
  return createClient(url, key)
}
