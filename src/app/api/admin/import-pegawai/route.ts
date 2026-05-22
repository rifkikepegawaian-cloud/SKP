import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { PegawaiImportRow } from '@/lib/excel'

export async function POST(request: NextRequest) {
  // Verify the requesting user is admin
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!profile?.role?.includes('admin')) {
    return NextResponse.json({ error: 'Akses ditolak. Hanya admin yang bisa melakukan import pegawai.' }, { status: 403 })
  }

  const payload = await request.json()
  const rows: PegawaiImportRow[] = payload.rows

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Data pegawai kosong atau format tidak valid' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  // Process with concurrency limit (e.g., chunks of 10) to speed up import without hitting rate limits
  const CHUNK_SIZE = 10
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    
    await Promise.all(chunk.map(async (row) => {
      try {
        if (!row.nip || row.nip.length < 8) {
          throw new Error('NIP tidak valid atau terlalu pendek (min. 8 karakter)')
        }

        // 1. Cek atau Buat Pegawai
        let pegawaiId = ''
        const { data: existingPegawai } = await adminClient
          .from('pegawai')
          .select('id, nip')
          .eq('nip', row.nip)
          .single()

        if (existingPegawai) {
          pegawaiId = existingPegawai.id
          // Update pegawai details just in case they changed
          await adminClient.from('pegawai').update({
            nama_lengkap: row.nama_lengkap,
            unit_es2: row.unit_es2,
            unit_es3: row.unit_es3,
            unit_es4: row.unit_es4,
            jabatan: row.jabatan || '',
            tmt_jabatan: row.tmt_jabatan || null,
          }).eq('id', pegawaiId)
        } else {
          const { data: newPegawai, error: insertPgError } = await adminClient
            .from('pegawai')
            .insert({
              nama_lengkap: row.nama_lengkap,
              nip: row.nip,
              unit_es2: row.unit_es2,
              unit_es3: row.unit_es3,
              unit_es4: row.unit_es4,
              jabatan: row.jabatan || '',
              tmt_jabatan: row.tmt_jabatan || null,
            })
            .select('id')
            .single()

          if (insertPgError || !newPegawai) {
            throw new Error(`Gagal menyimpan pegawai: ${insertPgError?.message}`)
          }
          pegawaiId = newPegawai.id
        }

        // 2. Cek apakah pegawai sudah punya akun
        const { data: existingUser } = await adminClient
          .from('users')
          .select('id')
          .eq('pegawai_id', pegawaiId)
          .single()

        if (!existingUser) {
          // Buat akun Auth
          const email = `${row.nip}@undip.ac.id`.toLowerCase()
          const defaultPassword = row.nip.slice(-8)

          let authUserId = ''

          const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password: defaultPassword,
            email_confirm: true,
          })

          if (authError || !newAuthUser?.user) {
            // Tangkap error jika email sudah ada di Supabase Auth tapi tidak ada di tabel users
            if (authError?.message?.toLowerCase().includes('already') || authError?.message?.toLowerCase().includes('registered')) {
              throw new Error(`Email ${email} sudah terdaftar di sistem autentikasi.`)
            }
            throw new Error(`Gagal membuat akun auth: ${authError?.message}`)
          }
          authUserId = newAuthUser.user.id

          // Create record in users table with role 'staff'
          const { error: dbError } = await adminClient
            .from('users')
            .insert({
              id: authUserId,
              email,
              role: 'staff',
              pegawai_id: pegawaiId,
            })

          if (dbError) {
            throw new Error(`Gagal menyimpan data user: ${dbError.message}`)
          }
        }

        successCount++
      } catch (err: unknown) {
        errorCount++
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Baris NIP ${row.nip}: ${msg}`)
      }
    }))
  }

  return NextResponse.json({
    success: true,
    message: `Berhasil import ${successCount} pegawai. Gagal: ${errorCount}.`,
    successCount,
    errorCount,
    errors
  })
}
