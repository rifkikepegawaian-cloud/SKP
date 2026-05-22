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
    return NextResponse.json({ error: 'Akses ditolak. Hanya admin yang bisa melakukan reset password.' }, { status: 403 })
  }

  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
  }

  // Get user's pegawai data to find NIP
  const { data: targetUser } = await supabase
    .from('users')
    .select('*, pegawai(*)')
    .eq('id', userId)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }

  const nip = targetUser.pegawai?.nip
  if (!nip || nip.length < 8) {
    return NextResponse.json({ error: 'NIP pegawai tidak valid atau tidak ditemukan' }, { status: 400 })
  }

  // New password = last 8 digits of NIP
  const newPassword = nip.slice(-8)

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
    return NextResponse.json({ error: 'Gagal mereset password: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Password berhasil direset ke 8 digit terakhir NIP' })
}
