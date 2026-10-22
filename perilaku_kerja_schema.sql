-- ==============================================================================
-- HRIS Smart-Performance — SKP PERILAKU KERJA (CORE VALUES BerAKHLAK)
-- Berdasarkan PermenPAN-RB No. 6 Tahun 2022
-- ==============================================================================

CREATE TABLE IF NOT EXISTS skp_perilaku_kerja (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  periode_id          UUID NOT NULL REFERENCES master_periode_skp(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  penilai_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  aspek_id            INT NOT NULL CHECK (aspek_id BETWEEN 1 AND 7),
  aspek_nama          TEXT NOT NULL,
  ekspektasi_khusus   TEXT,
  rating              TEXT NOT NULL CHECK (rating IN ('di_atas_ekspektasi', 'sesuai_ekspektasi', 'di_bawah_ekspektasi')) DEFAULT 'sesuai_ekspektasi',
  umpan_balik         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(periode_id, user_id, aspek_id)
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_perilaku_lookup ON skp_perilaku_kerja(periode_id, user_id);
CREATE INDEX IF NOT EXISTS idx_perilaku_penilai ON skp_perilaku_kerja(penilai_user_id);
