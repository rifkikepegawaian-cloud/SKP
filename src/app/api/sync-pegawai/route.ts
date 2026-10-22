import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const localKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const localSupabase = createClient(localUrl, localKey)

    const externalUrl = process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL || 'https://wdpeggurglqkzylhorng.supabase.co'
    const externalKey = process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcGVnZ3VyZ2xxa3p5bGhvcm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTk5MzIsImV4cCI6MjA5MzgzNTkzMn0.hAi6BqDk0mH-kRwD4Zvfa1N7OiXApYNAc59gfxgpHhk'
    const externalSupabase = createClient(externalUrl, externalKey)

    const [{ count: localCount }, { count: externalCount }] = await Promise.all([
      localSupabase.from('pegawai').select('id', { count: 'exact', head: true }),
      externalSupabase.from('employees').select('id', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      success: true,
      localCount: localCount || 0,
      externalCount: externalCount || 0,
      externalUrl,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const offset = Number(body.offset) || 0
    const limit = Math.min(Number(body.limit) || 250, 500)

    const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const localKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const localSupabase = createClient(localUrl, localKey)

    const externalUrl = body.customUrl?.trim() || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL || 'https://wdpeggurglqkzylhorng.supabase.co'
    const externalKey = body.customKey?.trim() || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcGVnZ3VyZ2xxa3p5bGhvcm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTk5MzIsImV4cCI6MjA5MzgzNTkzMn0.hAi6BqDk0mH-kRwD4Zvfa1N7OiXApYNAc59gfxgpHhk'
    const externalSupabase = createClient(externalUrl, externalKey)

    // 1. Total count
    const { count: totalExternal } = await externalSupabase
      .from('employees')
      .select('id', { count: 'exact', head: true })

    // 2. Fetch chunk from external database
    const { data: extData, error: extErr } = await externalSupabase
      .from('employees')
      .select('nip, nama_lengkap, nama, jabatan, pangkat, golongan, unit_es_ii, unit_es_iii, unit_es_iv, tmt_jab')
      .order('nip', { ascending: true })
      .range(offset, offset + limit - 1)

    if (extErr) {
      return NextResponse.json({ success: false, error: 'External error: ' + extErr.message }, { status: 500 })
    }

    if (!extData || extData.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        inserted: 0,
        updated: 0,
        hasMore: false,
        totalExternal: totalExternal || 0,
      })
    }

    // 3. Check existing NIPs in this batch
    const nips = extData.map(e => e.nip?.trim()).filter(Boolean)
    const { data: existingLocal } = await localSupabase
      .from('pegawai')
      .select('id, nip')
      .in('nip', nips)

    const existingNipSet = new Set((existingLocal || []).map(p => p.nip))

    // 4. Test if local pegawai has pangkat_golongan column
    let supportsPangkat = false
    const { error: testPangkatErr } = await localSupabase
      .from('pegawai')
      .select('pangkat_golongan')
      .limit(1)
    if (!testPangkatErr) {
      supportsPangkat = true
    }

    // 5. Build upsert payload
    let insertedCount = 0
    let updatedCount = 0
    const upsertList: any[] = []

    for (const item of extData) {
      const nip = item.nip?.trim()
      if (!nip) continue

      const namaLengkap = item.nama_lengkap?.trim() || item.nama?.trim() || 'Pegawai'
      const jabatan = item.jabatan?.trim() || ''
      const unitEs2 = item.unit_es_ii?.trim() || ''
      const unitEs3 = item.unit_es_iii?.trim() || ''
      const unitEs4 = item.unit_es_iv?.trim() || ''

      let pangkatGol = ''
      if (item.pangkat && item.golongan) {
        pangkatGol = `${item.pangkat.trim()} / ${item.golongan.trim()}`
      } else if (item.pangkat) {
        pangkatGol = item.pangkat.trim()
      } else if (item.golongan) {
        pangkatGol = item.golongan.trim()
      }

      const payload: any = {
        nip,
        nama_lengkap: namaLengkap,
        jabatan,
        unit_es2: unitEs2,
        unit_es3: unitEs3,
        unit_es4: unitEs4,
      }

      if (supportsPangkat && pangkatGol) {
        payload.pangkat_golongan = pangkatGol
      }

      if (existingNipSet.has(nip)) {
        updatedCount++
      } else {
        insertedCount++
      }

      upsertList.push(payload)
    }

    // 6. Fast batch upsert
    if (upsertList.length > 0) {
      const { error: upsertErr } = await localSupabase
        .from('pegawai')
        .upsert(upsertList, { onConflict: 'nip' })

      if (upsertErr) {
        console.error('Upsert error:', upsertErr)
        return NextResponse.json({ success: false, error: upsertErr.message }, { status: 500 })
      }
    }

    const nextOffset = offset + extData.length
    const hasMore = totalExternal ? nextOffset < totalExternal : extData.length === limit

    return NextResponse.json({
      success: true,
      processed: extData.length,
      inserted: insertedCount,
      updated: updatedCount,
      hasMore,
      nextOffset,
      totalExternal: totalExternal || 0,
      supportsPangkat,
      sampleNips: extData.slice(0, 3).map(e => `${e.nama_lengkap || e.nama} (${e.nip})`),
    })
  } catch (err: any) {
    console.error('Sync API fatal error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
