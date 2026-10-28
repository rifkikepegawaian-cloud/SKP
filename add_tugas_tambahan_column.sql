-- ==============================================================================
-- HRIS Smart-Performance — PENAMBAHAN KOLOM TUGAS_TAMBAHAN (JABATAN STRUKTURAL)
-- Tabel: pegawai
-- Jalankan query ini di SQL Editor Supabase untuk menambahkan kolom tugas_tambahan
-- ==============================================================================

-- 1. Tambah kolom tugas_tambahan di tabel pegawai jika belum ada
ALTER TABLE pegawai ADD COLUMN IF NOT EXISTS tugas_tambahan TEXT DEFAULT '';

-- 2. Buat index opsional untuk mempercepat pencarian tugas tambahan
CREATE INDEX IF NOT EXISTS idx_pegawai_tugas_tambahan ON pegawai (tugas_tambahan);

-- 3. Reload schema cache PostgREST agar API Supabase langsung mendeteksi kolom baru
NOTIFY pgrst, 'reload schema';
