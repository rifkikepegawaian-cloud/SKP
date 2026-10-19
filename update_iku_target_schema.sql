-- ==============================================================================
-- UPDATE SKEMA: DUKUNGAN TARGET FLEKSIBEL (RASIO / PERSENTASE / ANGKA)
-- Jalankan query ini di SQL Editor Supabase untuk mengaktifkan kolom target
-- ==============================================================================

-- 0. Drop view yang bergantung pada kolom target agar ALTER TABLE tidak terhalang
DROP VIEW IF EXISTS v_rektor_dashboard_32_iku CASCADE;

-- 1. Tambah target_default dan satuan_default pada tabel master_iku
ALTER TABLE master_iku ADD COLUMN IF NOT EXISTS target_default VARCHAR(50);
ALTER TABLE master_iku ADD COLUMN IF NOT EXISTS satuan_default VARCHAR(50) DEFAULT '%';

-- Set default target rasio untuk IKU 18 (Faculty Student Ratio)
UPDATE master_iku 
SET target_default = '1:50', satuan_default = 'Rasio'
WHERE kode_iku = '18' OR nama_iku ILIKE '%faculty student ratio%';

-- 2. Mengubah tipe target pada seluruh jenjang cascading menjadi VARCHAR(50)
-- Level 1: cascading_iku_sukpa
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cascading_iku_sukpa_target_check') THEN
    ALTER TABLE cascading_iku_sukpa DROP CONSTRAINT cascading_iku_sukpa_target_check;
  END IF;
END $$;
ALTER TABLE cascading_iku_sukpa ALTER COLUMN target TYPE VARCHAR(50);
ALTER TABLE cascading_iku_sukpa ALTER COLUMN target_usulan TYPE VARCHAR(50);

-- Level 2: cascading_iku_unit
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cascading_iku_unit_target_check') THEN
    ALTER TABLE cascading_iku_unit DROP CONSTRAINT cascading_iku_unit_target_check;
  END IF;
END $$;
ALTER TABLE cascading_iku_unit ALTER COLUMN target TYPE VARCHAR(50);
ALTER TABLE cascading_iku_unit ALTER COLUMN target_usulan TYPE VARCHAR(50);

-- Level 3: cascading_output_manajer
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cascading_output_manajer_target_check') THEN
    ALTER TABLE cascading_output_manajer DROP CONSTRAINT cascading_output_manajer_target_check;
  END IF;
END $$;
ALTER TABLE cascading_output_manajer ALTER COLUMN target TYPE VARCHAR(50);
ALTER TABLE cascading_output_manajer ALTER COLUMN target_usulan TYPE VARCHAR(50);

-- Level 4: cascading_uraian_spv
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cascading_uraian_spv_target_check') THEN
    ALTER TABLE cascading_uraian_spv DROP CONSTRAINT cascading_uraian_spv_target_check;
  END IF;
END $$;
ALTER TABLE cascading_uraian_spv ALTER COLUMN target TYPE VARCHAR(50);
ALTER TABLE cascading_uraian_spv ALTER COLUMN target_usulan TYPE VARCHAR(50);

-- Level 5: cascading_sub_uraian_staff
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cascading_sub_uraian_staff_target_check') THEN
    ALTER TABLE cascading_sub_uraian_staff DROP CONSTRAINT cascading_sub_uraian_staff_target_check;
  END IF;
END $$;
ALTER TABLE cascading_sub_uraian_staff ALTER COLUMN target TYPE VARCHAR(50);
ALTER TABLE cascading_sub_uraian_staff ALTER COLUMN target_usulan TYPE VARCHAR(50);

-- 3. Re-create view v_rektor_dashboard_32_iku dengan penanganan target fleksibel
CREATE OR REPLACE VIEW v_rektor_dashboard_32_iku AS
SELECT 
  m.id AS iku_id,
  m.kode_iku,
  m.nama_iku,
  m.kode_kegiatan,
  m.nama_kegiatan,
  m.kode_output,
  m.nama_output,
  COALESCE(SUM(CASE WHEN s.target ~ '^[0-9]+(\.[0-9]+)?$' THEN s.target::NUMERIC ELSE 0 END), 0) AS total_target_sukpa,
  COALESCE(SUM(s.capaian_approved), 0) AS total_realisasi_approved,
  CASE 
    WHEN COALESCE(SUM(CASE WHEN s.target ~ '^[0-9]+(\.[0-9]+)?$' THEN s.target::NUMERIC ELSE 0 END), 0) > 0 
    THEN ROUND((COALESCE(SUM(s.capaian_approved), 0) / NULLIF(SUM(CASE WHEN s.target ~ '^[0-9]+(\.[0-9]+)?$' THEN s.target::NUMERIC ELSE 0 END), 0)) * 100, 2)
    ELSE 0 
  END AS persentase_capaian,
  COUNT(DISTINCT s.sukpa_user_id) AS jumlah_sukpa_terlibat,
  COUNT(CASE WHEN s.status = 'agreed' THEN 1 END) AS jumlah_sukpa_agreed,
  COUNT(CASE WHEN s.status = 'objected' THEN 1 END) AS jumlah_sukpa_objected,
  s.periode_id
FROM master_iku m
LEFT JOIN cascading_iku_sukpa s ON s.iku_id = m.id
GROUP BY m.id, m.kode_iku, m.nama_iku, m.kode_kegiatan, m.nama_kegiatan, m.kode_output, m.nama_output, s.periode_id;
