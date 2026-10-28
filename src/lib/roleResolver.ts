import { UserRole } from '@/lib/types'

export interface RoleResolutionResult {
  role: UserRole
  isStructural: boolean
  title?: string
  ledUnit?: string
  ledSubUnit?: string
  ledSukpa?: string
}

export function cleanUnitName(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/^(subbagian|bagian|departemen|fakultas|direktorat|biro|badan|lembaga|unit|sekolah)\s+/i, '')
    .trim()
}

/**
 * Menerjemahkan data Tugas Tambahan / Jabatan Struktural Pegawai menjadi UserRole sistem.
 * 
 * Aturan Khusus:
 * 1. Pimpinan SUKPA: HANYA Wakil Rektor, Ketua Senat Akademik, dan Ketua MWA.
 * 2. Pimpinan Unit: Dekan, Direktur, Kepala Biro, Ketua Lembaga, dan Kepala Badan.
 * 3. Wakil Pimpinan Unit: Wakil Dekan, Wakil Direktur, Wakil Kepala Biro, Wakil Kepala Badan, Wakil Ketua Lembaga.
 * 4. Manajer: Manajer, Kepala Bagian / Kabag, Ketua Departemen, Sekretaris Departemen.
 * 5. Supervisor: Supervisor, Kepala Subbagian / Kasubbag, Subkoordinator, Ketua Prodi, Sekretaris Prodi, Kepala Instalasi.
 * 6. Staff: Seluruh pegawai tanpa jabatan struktural, atau bila tugas_tambahan sama persis dengan nama unit kerjanya.
 */
export function resolveRoleFromTugasTambahan(item: {
  tugas_tambahan?: string | null
  unit_es_ii?: string | null
  unit_es_iii?: string | null
  unit_es_iv?: string | null
}): RoleResolutionResult {
  const tt = (item.tugas_tambahan || '').trim()
  const es2 = (item.unit_es_ii || '').trim()
  const es3 = (item.unit_es_iii || '').trim()
  const es4 = (item.unit_es_iv || '').trim()

  if (!tt) {
    return { role: 'staff', isStructural: false }
  }

  const lower = tt.toLowerCase()
  const es2Lower = es2.toLowerCase()
  const es3Lower = es3.toLowerCase()
  const es4Lower = es4.toLowerCase()

  // 1. Jika tugas_tambahan sama persis dengan nama unitnya (bukan jabatan struktural / fallback dari sistem lama)
  if (
    lower === es2Lower ||
    lower === es3Lower ||
    lower === es4Lower ||
    (es2Lower && cleanUnitName(lower) === cleanUnitName(es2Lower)) ||
    (es4Lower && cleanUnitName(lower) === cleanUnitName(es4Lower))
  ) {
    return { role: 'staff', isStructural: false }
  }

  // 2. REKTOR
  if (
    lower.startsWith('rektor') ||
    (lower.includes('rektor') && !lower.includes('wakil'))
  ) {
    return {
      role: 'rektor',
      isStructural: true,
      title: tt,
      ledUnit: 'Universitas Diponegoro',
    }
  }

  // 3. PIMPINAN SUKPA (HANYA: Wakil Rektor, Ketua Senat Akademik, dan Ketua MWA)
  const isPimpinanSukpa =
    lower.includes('wakil rektor') ||
    lower.includes('ketua senat akademik') ||
    lower.includes('ketua mwa') ||
    lower.includes('ketua majelis wali amanat')

  if (isPimpinanSukpa) {
    return {
      role: 'pimpinan_sukpa',
      isStructural: true,
      title: tt,
      ledSukpa: tt,
    }
  }

  // 4. WAKIL PIMPINAN UNIT (Periksa SEBELUM Pimpinan Unit agar "Wakil Dekan/Direktur/Kaban" tidak terpotong)
  const isWakilPimpinanUnit =
    lower.includes('wakil dekan') ||
    lower.includes('wakil direktur') ||
    lower.includes('wakil kepala biro') ||
    lower.includes('wakil kepala badan') ||
    lower.includes('wakil ketua lembaga')

  if (isWakilPimpinanUnit) {
    return {
      role: 'wakil_pimpinan_unit',
      isStructural: true,
      title: tt,
      ledUnit: es2,
    }
  }

  // 5. PIMPINAN UNIT (Dekan, Direktur, Kepala Biro, Ketua Lembaga, dan Kepala Badan)
  const isPimpinanUnit =
    lower.startsWith('dekan') ||
    lower.includes(' dekan ') ||
    lower.includes('direktur') ||
    lower.includes('kepala biro') ||
    lower.includes('kepala badan') ||
    lower.includes('ketua lembaga') ||
    lower.includes('sekretaris universitas')

  if (isPimpinanUnit) {
    return {
      role: 'pimpinan_unit',
      isStructural: true,
      title: tt,
      ledUnit: es2,
    }
  }

  // 6. MANAJER (Eselon III: Manajer, Kepala Bagian / Kabag, Ketua Departemen, Sekretaris Departemen)
  const isManajer =
    lower.includes('manajer') ||
    lower.includes('kepala bagian') ||
    lower.includes('kabag') ||
    lower.includes('ketua departemen') ||
    lower.includes('sekretaris departemen')

  if (isManajer) {
    return {
      role: 'manajer',
      isStructural: true,
      title: tt,
      ledUnit: es2,
      ledSubUnit: es3,
    }
  }

  // 7. SUPERVISOR (Eselon IV: Supervisor, Kepala Subbagian / Kasubbag, Subkoordinator, Ketua Prodi, Sekretaris Prodi)
  const isSupervisor =
    lower.includes('supervisor') ||
    lower.includes('kepala subbagian') ||
    lower.includes('kasubbag') ||
    lower.includes('subkoordinator') ||
    lower.includes('ketua prodi') ||
    lower.includes('kaprodi') ||
    lower.includes('sekretaris prodi') ||
    lower.includes('kepala instalasi')

  if (isSupervisor) {
    return {
      role: 'supervisor',
      isStructural: true,
      title: tt,
      ledUnit: es2,
      ledSubUnit: es4 || es3,
    }
  }

  // 8. Keanggotaan senat / komite / dewan profesor non-struktural lainnya
  return { role: 'staff', isStructural: false, title: tt }
}
