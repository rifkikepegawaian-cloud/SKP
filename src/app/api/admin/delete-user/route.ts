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
    return NextResponse.json({ error: 'Akses ditolak. Hanya admin yang bisa menghapus akun.' }, { status: 403 })
  }

  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
  }

  // Prevent deleting yourself
  if (userId === authUser.id) {
    return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Delete from users table first (cascade will handle related data)
  const { error: dbError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (dbError) {
    return NextResponse.json({ error: 'Gagal menghapus data user: ' + dbError.message }, { status: 500 })
  }

  // Delete from Supabase Auth
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId)

  if (authError) {
    return NextResponse.json({ error: 'Gagal menghapus auth user: ' + authError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'User berhasil dihapus' })
}
