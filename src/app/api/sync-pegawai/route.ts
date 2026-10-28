import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRoleFromTugasTambahan } from '@/lib/roleResolver'

export async function GET(req: NextRequest) {
  try {
    const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const localKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const localSupabase = createClient(localUrl, localKey)

    const externalUrl = process.env.EXTERNAL_SUPABASE_URL || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL
    const externalKey = process.env.EXTERNAL_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY

    if (!externalUrl || !externalKey) {
      return NextResponse.json({
        success: false,
        error: 'Kredensial Supabase eksternal (EXTERNAL_SUPABASE_URL / EXTERNAL_SUPABASE_ANON_KEY) belum dikonfigurasi di Environment Variables server.',
      }, { status: 400 })
    }

    const externalSupabase = createClient(externalUrl, externalKey)

    const [{ count: localCount }, { count: externalCount }] = await Promise.all([
      localSupabase.from('pegawai').select('id', { count: 'exact', head: true }),
      externalSupabase.from('employees').select('id', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      success: true,
      localCount: localCount || 0,
      externalCount: externalCount || 0,
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

    const externalUrl = body.customUrl?.trim() || process.env.EXTERNAL_SUPABASE_URL || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL
    const externalKey = body.customKey?.trim() || process.env.EXTERNAL_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY

    if (!externalUrl || !externalKey) {
      return NextResponse.json({
        success: false,
        error: 'Kredensial Supabase eksternal belum dikonfigurasi di Environment Variables.',
      }, { status: 400 })
    }
    const externalSupabase = createClient(externalUrl, externalKey)

    // 1. Total count
    const { count: totalExternal } = await externalSupabase
      .from('employees')
      .select('id', { count: 'exact', head: true })

    // 2. Fetch chunk from external database including tugas_tambahan
    const { data: extData, error: extErr } = await externalSupabase
      .from('employees')
      .select('nip, nama_lengkap, nama, jabatan, pangkat, golongan, unit_es_ii, unit_es_iii, unit_es_iv, tmt_jab, tugas_tambahan')
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

    // 4. Test if local pegawai has optional columns
    let supportsPangkat = false
    const { error: testPangkatErr } = await localSupabase
      .from('pegawai')
      .select('pangkat_golongan')
      .limit(1)
    if (!testPangkatErr) {
      supportsPangkat = true
    }

    let supportsTugasTambahan = false
    const { error: testTtErr } = await localSupabase
      .from('pegawai')
      .select('tugas_tambahan')
      .limit(1)
    if (!testTtErr) {
      supportsTugasTambahan = true
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

      if (supportsTugasTambahan && item.tugas_tambahan) {
        payload.tugas_tambahan = item.tugas_tambahan.trim()
      }

      if (existingNipSet.has(nip)) {
        updatedCount++
      } else {
        insertedCount++
      }

      upsertList.push(payload)
    }

    // 6. Fast batch upsert to pegawai
    if (upsertList.length > 0) {
      const { error: upsertErr } = await localSupabase
        .from('pegawai')
        .upsert(upsertList, { onConflict: 'nip' })

      if (upsertErr) {
        console.error('Upsert error:', upsertErr)
        return NextResponse.json({ success: false, error: upsertErr.message }, { status: 500 })
      }
    }

    // 7. Sync structural roles into users table based on tugas_tambahan
    const emails = nips.map(n => `${n}@undip.ac.id`.toLowerCase())
    const { data: matchedUsers } = await localSupabase
      .from('users')
      .select('id, email, role, led_unit_es2, led_unit_es3, led_sukpa')
      .in('email', emails)

    const roleSyncCounts: Record<string, number> = {
      rektor: 0,
      pimpinan_sukpa: 0,
      pimpinan_unit: 0,
      wakil_pimpinan_unit: 0,
      manajer: 0,
      supervisor: 0,
      staff: 0,
    }

    if (matchedUsers && matchedUsers.length > 0) {
      const userByEmail = new Map(matchedUsers.map(u => [u.email.toLowerCase(), u]))

      for (const item of extData) {
        const nip = item.nip?.trim()
        if (!nip) continue
        const email = `${nip}@undip.ac.id`.toLowerCase()
        const targetUser = userByEmail.get(email)
        if (!targetUser) continue

        const resolution = resolveRoleFromTugasTambahan(item)
        roleSyncCounts[resolution.role] = (roleSyncCounts[resolution.role] || 0) + 1

        // Do not strip admin privileges if user is admin
        if (targetUser.role?.includes('admin')) continue

        const targetRole = resolution.role === 'staff' ? 'staff' : `staff,${resolution.role}`

        await localSupabase
          .from('users')
          .update({
            role: targetRole,
            led_unit_es2: resolution.ledUnit || targetUser.led_unit_es2 || null,
            led_unit_es3: resolution.ledSubUnit || targetUser.led_unit_es3 || null,
            led_sukpa: resolution.ledSukpa || targetUser.led_sukpa || null,
          })
          .eq('id', targetUser.id)
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
      roleSyncCounts,
      sampleNips: extData.slice(0, 3).map(e => `${e.nama_lengkap || e.nama} (${e.nip})`),
    })
  } catch (err: any) {
    console.error('Sync API fatal error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
