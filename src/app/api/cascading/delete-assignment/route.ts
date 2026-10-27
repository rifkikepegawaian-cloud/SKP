import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TABLES = [
  'cascading_iku_sukpa',
  'cascading_iku_unit',
  'cascading_output_manajer',
  'cascading_uraian_spv',
  'cascading_sub_uraian_staff'
] as const

type AllowedTable = typeof ALLOWED_TABLES[number]

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user session
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { table, id } = await request.json()

    if (!table || !id) {
      return NextResponse.json({ error: 'Parameter table dan id diperlukan' }, { status: 400 })
    }

    if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
      return NextResponse.json({ error: 'Tabel penugasan tidak valid' }, { status: 400 })
    }

    // 2. Fetch user profile to check role
    const { data: profile } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', authUser.id)
      .single()

    const roles = (profile?.role || '').split(',').map((r: string) => r.trim())

    // 3. Use admin client to perform deletion reliably
    const admin = createAdminClient()

    // First check if the row exists and get assigned_by info
    const { data: existingRow, error: fetchError } = await admin
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: 'Gagal memeriksa data penugasan: ' + fetchError.message }, { status: 500 })
    }

    if (!existingRow) {
      return NextResponse.json({ error: 'Data penugasan tidak ditemukan atau sudah dihapus.' }, { status: 404 })
    }

    // Permission check:
    // - admin can delete any assignment
    // - rektor can delete any cascading_iku_sukpa
    // - user who assigned it can delete it
    // - or users with leader/supervisor roles in cascading
    const isAdmin = roles.includes('admin')
    const isRektor = roles.includes('rektor')
    const isOwner = existingRow.assigned_by === authUser.id

    const isAuthorized = isAdmin || isOwner || (isRektor && table === 'cascading_iku_sukpa') || roles.some((r: string) => ['pimpinan_sukpa', 'pimpinan_unit', 'manajer', 'supervisor'].includes(r))

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Anda tidak memiliki hak akses untuk membatalkan penugasan ini.' }, { status: 403 })
    }

    // Execute deletion using admin client to ensure foreign key cascades run cleanly and RLS doesn't block
    const { data: deleted, error: deleteError } = await admin
      .from(table)
      .delete()
      .eq('id', id)
      .select()

    if (deleteError) {
      console.error('Error deleting cascading assignment:', deleteError)
      return NextResponse.json({ error: 'Gagal membatalkan penugasan: ' + deleteError.message }, { status: 500 })
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Data tidak terhapus. Pastikan data belum terhapus sebelumnya.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Penugasan berhasil dibatalkan dan dihapus.',
      deletedId: id
    })
  } catch (err: any) {
    console.error('Unhandled error in delete-assignment route:', err)
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan sistem saat menghapus data' }, { status: 500 })
  }
}
