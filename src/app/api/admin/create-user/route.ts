import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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
    return NextResponse.json({ error: 'Akses ditolak. Hanya admin yang bisa membuat akun.' }, { status: 403 })
  }

  const { pegawaiId, email, role } = await request.json()
  if (!pegawaiId || !email || !role) {
    return NextResponse.json({ error: 'pegawaiId, email, dan role diperlukan' }, { status: 400 })
  }

  // Get pegawai NIP for default password
  const { data: pegawai } = await supabase
    .from('pegawai')
    .select('*')
    .eq('id', pegawaiId)
    .single()

  if (!pegawai) {
    return NextResponse.json({ error: 'Data pegawai tidak ditemukan' }, { status: 404 })
  }

  if (!pegawai.nip || pegawai.nip.length < 8) {
    return NextResponse.json({ error: 'NIP pegawai tidak valid' }, { status: 400 })
  }

  // Check if pegawai already has an account
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('pegawai_id', pegawaiId)
    .single()

  if (existingUser) {
    return NextResponse.json({ error: 'Pegawai ini sudah memiliki akun' }, { status: 400 })
  }

  // Default password = last 8 digits of NIP
  const defaultPassword = pegawai.nip.slice(-8)

  const adminClient = createAdminClient()

  // Create auth user
  const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: defaultPassword,
    email_confirm: true, // Auto-confirm email
  })

  if (authError || !newAuthUser?.user) {
    return NextResponse.json({ error: 'Gagal membuat akun auth: ' + (authError?.message || 'Unknown error') }, { status: 500 })
  }

  // Create user row in users table
  const { error: dbError } = await adminClient
    .from('users')
    .insert({
      id: newAuthUser.user.id,
      email,
      role,
      pegawai_id: pegawaiId,
    })

  if (dbError) {
    // Rollback: delete auth user if db insert fails
    await adminClient.auth.admin.deleteUser(newAuthUser.user.id)
    return NextResponse.json({ error: 'Gagal menyimpan data user: ' + dbError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Akun berhasil dibuat',
    userId: newAuthUser.user.id,
  })
}
