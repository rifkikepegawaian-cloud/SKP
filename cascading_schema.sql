-- ==============================================================================
-- HRIS Smart-Performance — CASCADING SKP & DIALOG KINERJA SCHEMA (HIGH PERFORMANCE)
-- ==============================================================================
-- Arsitektur Berjenjang:
-- Rektor -> Pimpinan SUKPA -> Pimpinan Unit -> Manajer -> SPV -> Staff
-- Dioptimalkan dengan B-Tree Indexing & Materialized Views untuk loading instan.
-- ==============================================================================

-- 0. EXTENSION & PREPARATION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. MASTER PERIODE CASCADING & SKP
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_periode_skp (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tahun                 VARCHAR(10) NOT NULL,
  nama_periode          TEXT NOT NULL,
  tgl_mulai_cascading   DATE NOT NULL,
  tgl_akhir_cascading   DATE NOT NULL,
  tgl_mulai_penilaian   DATE,
  tgl_akhir_penilaian   DATE,
  is_active             BOOLEAN NOT NULL DEFAULT false,
  status                TEXT NOT NULL CHECK (status IN ('draft', 'cascading_active', 'pelaporan_active', 'closed')) DEFAULT 'draft',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing Master Periode
CREATE INDEX IF NOT EXISTS idx_periode_skp_active ON master_periode_skp(is_active);
CREATE INDEX IF NOT EXISTS idx_periode_skp_tahun ON master_periode_skp(tahun);

-- 1.1 KOLOM TAMBAHAN MASTER IKU
ALTER TABLE master_iku ADD COLUMN IF NOT EXISTS target_default VARCHAR(50);
ALTER TABLE master_iku ADD COLUMN IF NOT EXISTS satuan_default VARCHAR(50) DEFAULT '%';

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. LEVEL 1: IKU PENUGASAN REKTOR -> PIMPINAN SUKPA
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cascading_iku_sukpa (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  periode_id          UUID NOT NULL REFERENCES master_periode_skp(id) ON DELETE CASCADE,
  iku_id              UUID NOT NULL REFERENCES master_iku(id) ON DELETE RESTRICT,
  assigned_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Rektor
  sukpa_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Pimpinan SUKPA
  target              VARCHAR(50) NOT NULL, -- Mendukung persentase ('100'), angka ('85'), maupun rasio ('1:50')
  satuan              VARCHAR(50) NOT NULL DEFAULT '%',
  is_direct_sync      BOOLEAN NOT NULL DEFAULT false,
  status              TEXT NOT NULL CHECK (status IN ('assigned', 'agreed', 'objected')) DEFAULT 'assigned',
  catatan_sanggahan   TEXT,
  target_usulan       VARCHAR(50),
  agreed_at           TIMESTAMPTZ,
  capaian_realisasi   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (capaian_realisasi >= 0),
  capaian_approved    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (capaian_approved >= 0),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- High-performance Indexing Level 1
CREATE INDEX IF NOT EXISTS idx_cascading_sukpa_periode ON cascading_iku_sukpa(periode_id);
CREATE INDEX IF NOT EXISTS idx_cascading_sukpa_iku ON cascading_iku_sukpa(iku_id);
CREATE INDEX IF NOT EXISTS idx_cascading_sukpa_user ON cascading_iku_sukpa(sukpa_user_id);
CREATE INDEX IF NOT EXISTS idx_cascading_sukpa_status ON cascading_iku_sukpa(status);
CREATE INDEX IF NOT EXISTS idx_cascading_sukpa_lookup ON cascading_iku_sukpa(periode_id, sukpa_user_id, status);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. LEVEL 2: IKU PENUGASAN PIMPINAN SUKPA -> PIMPINAN UNIT
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cascading_iku_unit (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_sukpa_id     UUID NOT NULL REFERENCES cascading_iku_sukpa(id) ON DELETE CASCADE,
  periode_id          UUID NOT NULL REFERENCES master_periode_skp(id) ON DELETE CASCADE,
  assigned_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Pimpinan SUKPA
  unit_user_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Pimpinan Unit
  target              VARCHAR(50) NOT NULL,
  satuan              VARCHAR(50) NOT NULL DEFAULT '%',
  is_direct_sync      BOOLEAN NOT NULL DEFAULT false,
  status              TEXT NOT NULL CHECK (status IN ('assigned', 'agreed', 'objected')) DEFAULT 'assigned',
  catatan_sanggahan   TEXT,
  target_usulan       VARCHAR(50),
  agreed_at           TIMESTAMPTZ,
  capaian_realisasi   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (capaian_realisasi >= 0),
  capaian_approved    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (capaian_approved >= 0),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- High-performance Indexing Level 2
CREATE INDEX IF NOT EXISTS idx_cascading_unit_parent ON cascading_iku_unit(parent_sukpa_id);
CREATE INDEX IF NOT EXISTS idx_cascading_unit_periode ON cascading_iku_unit(periode_id);
CREATE INDEX IF NOT EXISTS idx_cascading_unit_user ON cascading_iku_unit(unit_user_id);
CREATE INDEX IF NOT EXISTS idx_cascading_unit_status ON cascading_iku_unit(status);
CREATE INDEX IF NOT EXISTS idx_cascading_unit_lookup ON cascading_iku_unit(periode_id, unit_user_id, status);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. LEVEL 3: OUTPUT IKU PIMPINAN UNIT -> MANAJER
-- (Catatan: Role Wakil Pimpinan Unit memiliki akses view-only ke tabel ini)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cascading_output_manajer (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_unit_id      UUID NOT NULL REFERENCES cascading_iku_unit(id) ON DELETE CASCADE,
  periode_id          UUID NOT NULL REFERENCES master_periode_skp(id) ON DELETE CASCADE,
  assigned_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Pimpinan Unit
  manajer_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Manajer Bagian
  nama_output         TEXT NOT NULL,
  kode_output         VARCHAR(50),
  target              VARCHAR(50) NOT NULL,
  satuan              VARCHAR(50) NOT NULL DEFAULT 'Dokumen',
  is_direct_sync      BOOLEAN NOT NULL DEFAULT false,
  status              TEXT NOT NULL CHECK (status IN ('assigned', 'agreed', 'objected')) DEFAULT 'assigned',
  catatan_sanggahan   TEXT,
  target_usulan       VARCHAR(50),
  agreed_at           TIMESTAMPTZ,
  capaian_realisasi   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (capaian_realisasi >= 0),
  capaian_approved    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (capaian_approved >= 0),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- High-performance Indexing Level 3
CREATE INDEX IF NOT EXISTS idx_cascading_output_parent ON cascading_output_manajer(parent_unit_id);
CREATE INDEX IF NOT EXISTS idx_cascading_output_periode ON cascading_output_manajer(periode_id);
CREATE INDEX IF NOT EXISTS idx_cascading_output_user ON cascading_output_manajer(manajer_user_id);
CREATE INDEX IF NOT EXISTS idx_cascading_output_status ON cascading_output_manajer(status);
CREATE INDEX IF NOT EXISTS idx_cascading_output_lookup ON cascading_output_manajer(periode_id, manajer_user_id, status);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. LEVEL 4: URAIAN TUGAS MANAJER -> SUPERVISOR (SPV)
-- (1 Output IKU dapat dipecah menjadi 1 atau lebih Uraian Tugas SPV)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cascading_uraian_spv (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_output_id    UUID NOT NULL REFERENCES cascading_output_manajer(id) ON DELETE CASCADE,
  periode_id          UUID NOT NULL REFERENCES master_periode_skp(id) ON DELETE CASCADE,
  assigned_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Manajer
  spv_user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Supervisor/Kasubbag
  nama_uraian         TEXT NOT NULL,
  target              VARCHAR(50) NOT NULL,
  satuan              VARCHAR(50) NOT NULL DEFAULT 'Laporan',
  is_direct_sync      BOOLEAN NOT NULL DEFAULT false,
  status              TEXT NOT NULL CHECK (status IN ('assigned', 'agreed', 'objected')) DEFAULT 'assigned',
  catatan_sanggahan   TEXT,
  target_usulan       VARCHAR(50),
  agreed_at           TIMESTAMPTZ,
  capaian_realisasi   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (capaian_realisasi >= 0),
  capaian_approved    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (capaian_approved >= 0),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- High-performance Indexing Level 4
CREATE INDEX IF NOT EXISTS idx_cascading_uraian_parent ON cascading_uraian_spv(parent_output_id);
CREATE INDEX IF NOT EXISTS idx_cascading_uraian_periode ON cascading_uraian_spv(periode_id);
CREATE INDEX IF NOT EXISTS idx_cascading_uraian_user ON cascading_uraian_spv(spv_user_id);
CREATE INDEX IF NOT EXISTS idx_cascading_uraian_status ON cascading_uraian_spv(status);
CREATE INDEX IF NOT EXISTS idx_cascading_uraian_lookup ON cascading_uraian_spv(periode_id, spv_user_id, status);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. LEVEL 5: SUB-URAIAN TUGAS SPV -> STAFF
-- (1 Uraian Tugas dapat dipecah menjadi 1 atau lebih Sub-Uraian Tugas Staff)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cascading_sub_uraian_staff (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_uraian_id    UUID NOT NULL REFERENCES cascading_uraian_spv(id) ON DELETE CASCADE,
  periode_id          UUID NOT NULL REFERENCES master_periode_skp(id) ON DELETE CASCADE,
  assigned_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Supervisor
  staff_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Staff
  nama_sub_uraian     TEXT NOT NULL,
  target              VARCHAR(50) NOT NULL,
  satuan              VARCHAR(50) NOT NULL DEFAULT 'Berkas',
  status              TEXT NOT NULL CHECK (status IN ('assigned', 'agreed', 'objected')) DEFAULT 'assigned',
  catatan_sanggahan   TEXT,
  target_usulan       VARCHAR(50),
  agreed_at           TIMESTAMPTZ,
  capaian_realisasi   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (capaian_realisasi >= 0),
  capaian_approved    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (capaian_approved >= 0),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- High-performance Indexing Level 5
CREATE INDEX IF NOT EXISTS idx_cascading_sub_parent ON cascading_sub_uraian_staff(parent_uraian_id);
CREATE INDEX IF NOT EXISTS idx_cascading_sub_periode ON cascading_sub_uraian_staff(periode_id);
CREATE INDEX IF NOT EXISTS idx_cascading_sub_user ON cascading_sub_uraian_staff(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_cascading_sub_status ON cascading_sub_uraian_staff(status);
CREATE INDEX IF NOT EXISTS idx_cascading_sub_lookup ON cascading_sub_uraian_staff(periode_id, staff_user_id, status);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. PELAPORAN CAPAIAN & EVIDENCE BUKTI DUKUNG BERJENJANG (TERPADU)
-- Menyimpan link Google Drive via GAS untuk hemat storage & performa cepat
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cascading_laporan_kerja (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level               TEXT NOT NULL CHECK (level IN ('staff', 'spv', 'manajer', 'pimpinan_unit', 'pimpinan_sukpa')),
  ref_id              UUID NOT NULL, -- Merujuk ke sub_uraian/uraian/output/unit sesuai level
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capaian             NUMERIC(12,2) NOT NULL CHECK (capaian >= 0),
  keterangan          TEXT NOT NULL,
  evidence_url        TEXT, -- Link Google Drive
  evidence_name       TEXT,
  tanggal_laporan     DATE NOT NULL DEFAULT CURRENT_DATE,
  status              TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'revision')) DEFAULT 'pending',
  reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  catatan_reviewer    TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- High-performance Indexing Pelaporan
CREATE INDEX IF NOT EXISTS idx_cascading_laporan_ref ON cascading_laporan_kerja(ref_id, level);
CREATE INDEX IF NOT EXISTS idx_cascading_laporan_user ON cascading_laporan_kerja(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cascading_laporan_reviewer ON cascading_laporan_kerja(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_cascading_laporan_tanggal ON cascading_laporan_kerja(tanggal_laporan DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. DOKUMEN RENCANA SKP RESMI & TANDA TANGAN (DIGITAL VERIFICATION)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skp_dokumen_final (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  periode_id          UUID NOT NULL REFERENCES master_periode_skp(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_saat_pengajuan TEXT NOT NULL,
  atasan_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status              TEXT NOT NULL CHECK (status IN ('draft', 'signed_pegawai', 'signed_atasan', 'final')) DEFAULT 'draft',
  signed_pegawai_at   TIMESTAMPTZ,
  signed_atasan_at    TIMESTAMPTZ,
  catatan             TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(periode_id, user_id)
);

-- Indexing Dokumen SKP
CREATE INDEX IF NOT EXISTS idx_skp_dokumen_user ON skp_dokumen_final(user_id);
CREATE INDEX IF NOT EXISTS idx_skp_dokumen_atasan ON skp_dokumen_final(atasan_id);
CREATE INDEX IF NOT EXISTS idx_skp_dokumen_periode ON skp_dokumen_final(periode_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. HIGH-PERFORMANCE VIEW: REALTIME REKTOR 32 IKU DASHBOARD
-- Kueri ini mengagregasi 32 IKU secara real-time tanpa join bertingkat di klien.
-- ──────────────────────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE master_periode_skp        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cascading_iku_sukpa       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cascading_iku_unit        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cascading_output_manajer  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cascading_uraian_spv      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cascading_sub_uraian_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE cascading_laporan_kerja   ENABLE ROW LEVEL SECURITY;
ALTER TABLE skp_dokumen_final         ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated users
CREATE POLICY "Periode: Read authenticated" ON master_periode_skp FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Periode: Admin manage" ON master_periode_skp FOR ALL USING (public.is_admin());

CREATE POLICY "Cascading Sukpa: Read all auth" ON cascading_iku_sukpa FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Cascading Sukpa: Manage" ON cascading_iku_sukpa FOR ALL USING (auth.uid() = assigned_by OR auth.uid() = sukpa_user_id OR public.is_admin());

CREATE POLICY "Cascading Unit: Read all auth" ON cascading_iku_unit FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Cascading Unit: Manage" ON cascading_iku_unit FOR ALL USING (auth.uid() = assigned_by OR auth.uid() = unit_user_id OR public.is_admin());

CREATE POLICY "Cascading Output: Read all auth" ON cascading_output_manajer FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Cascading Output: Manage" ON cascading_output_manajer FOR ALL USING (auth.uid() = assigned_by OR auth.uid() = manajer_user_id OR public.is_admin());

CREATE POLICY "Cascading Uraian: Read all auth" ON cascading_uraian_spv FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Cascading Uraian: Manage" ON cascading_uraian_spv FOR ALL USING (auth.uid() = assigned_by OR auth.uid() = spv_user_id OR public.is_admin());

CREATE POLICY "Cascading Sub: Read all auth" ON cascading_sub_uraian_staff FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Cascading Sub: Manage" ON cascading_sub_uraian_staff FOR ALL USING (auth.uid() = assigned_by OR auth.uid() = staff_user_id OR public.is_admin());

CREATE POLICY "Laporan Kerja: Read all auth" ON cascading_laporan_kerja FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Laporan Kerja: Manage own" ON cascading_laporan_kerja FOR ALL USING (auth.uid() = user_id OR auth.uid() = reviewed_by OR public.is_admin());

CREATE POLICY "SKP Dokumen: Read all auth" ON skp_dokumen_final FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "SKP Dokumen: Manage" ON skp_dokumen_final FOR ALL USING (auth.uid() = user_id OR auth.uid() = atasan_id OR public.is_admin());