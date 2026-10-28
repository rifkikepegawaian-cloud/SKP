-- ==============================================================================
-- HRIS Smart-Performance — MIGRASI SKEMA SASARAN KINERJA & INDIKATOR KINERJA INDIVIDU (IKI)
-- Berdasarkan PermenPAN-RB No. 6 Tahun 2022
-- Jalankan query ini di SQL Editor Supabase untuk menambahkan kolom permanen
-- ==============================================================================

-- 1. Master IKU (Opsional untuk simpan template sasaran & IKI Rektor)
ALTER TABLE master_iku ADD COLUMN IF NOT EXISTS sasaran_kinerja TEXT;
ALTER TABLE master_iku ADD COLUMN IF NOT EXISTS indikator_kinerja_individu TEXT;

-- 2. Level 1: Rektor -> Pimpinan SUKPA
ALTER TABLE cascading_iku_sukpa ADD COLUMN IF NOT EXISTS sasaran_kinerja TEXT;
ALTER TABLE cascading_iku_sukpa ADD COLUMN IF NOT EXISTS indikator_kinerja_individu TEXT;

-- 3. Level 2: Pimpinan SUKPA -> Pimpinan Unit
ALTER TABLE cascading_iku_unit ADD COLUMN IF NOT EXISTS sasaran_kinerja TEXT;
ALTER TABLE cascading_iku_unit ADD COLUMN IF NOT EXISTS indikator_kinerja_individu TEXT;

-- 4. Level 3: Pimpinan Unit -> Manajer (Output)
ALTER TABLE cascading_output_manajer ADD COLUMN IF NOT EXISTS sasaran_kinerja TEXT;
ALTER TABLE cascading_output_manajer ADD COLUMN IF NOT EXISTS indikator_kinerja_individu TEXT;

-- 5. Level 4: Manajer -> Supervisor (Uraian)
ALTER TABLE cascading_uraian_spv ADD COLUMN IF NOT EXISTS sasaran_kinerja TEXT;
ALTER TABLE cascading_uraian_spv ADD COLUMN IF NOT EXISTS indikator_kinerja_individu TEXT;

-- 6. Level 5: Supervisor -> Staff (Sub-Uraian)
ALTER TABLE cascading_sub_uraian_staff ADD COLUMN IF NOT EXISTS sasaran_kinerja TEXT;
ALTER TABLE cascading_sub_uraian_staff ADD COLUMN IF NOT EXISTS indikator_kinerja_individu TEXT;

-- Refresh skema cache PostgREST Supabase
NOTIFY pgrst, 'reload schema';
