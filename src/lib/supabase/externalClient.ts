import { createClient } from '@supabase/supabase-js'

export const EXTERNAL_SUPABASE_DEFAULT_CONFIG = {
  url: process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL || 'https://wdpeggurglqkzylhorng.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcGVnZ3VyZ2xxa3p5bGhvcm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTk5MzIsImV4cCI6MjA5MzgzNTkzMn0.hAi6BqDk0mH-kRwD4Zvfa1N7OiXApYNAc59gfxgpHhk',
  tableName: 'employees',
}

export function createExternalClient(customUrl?: string, customKey?: string) {
  const url = customUrl?.trim() || EXTERNAL_SUPABASE_DEFAULT_CONFIG.url
  const key = customKey?.trim() || EXTERNAL_SUPABASE_DEFAULT_CONFIG.anonKey
  return createClient(url, key)
}
