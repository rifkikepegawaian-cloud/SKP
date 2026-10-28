import { UserRole } from '@/lib/types'

export interface RoleResolutionResult {
  role: UserRole
  isStructural: boolean
  title?: string
  ledUnit?: string
  ledSubUnit?: string
  ledSukpa?: string
}

export const KNOWN_UNIT_ES2 = [
  'Lembaga Penelitian dan Pengabdian kepada Masyarakat',
  'Lembaga Pengembangan dan Penjaminan Mutu Pendidikan',
  'Direktorat Organisasi dan Sumber Daya Manusia',
  'Direktorat Keuangan, Dana Abadi, Akuntansi, dan Perpajakan',
  'Direktorat Aset dan Perancangan',
  'Direktorat Reputasi, Kemitraan dan Konektivitas Global',
  'Direktorat Sistem dan Teknologi Informasi',
  'Direktorat Kemahasiswaan dan Alumni',
  'Direktorat Perpustakaan, Undip Press, dan Kearsipan',
  'Direktorat Jejaring Media, Komunitas dan Komunikasi Publik',
  'Direktorat Inovasi dan Kerja Sama',
  'Direktorat Hukum',
  'Direktorat Akademik',
  'Badan Pengelola Kampus di Luar Kampus Utama',
  'Badan Pengelola Kampus Jepara',
  'Badan Pengelola Usaha Bisnis Komersial dan Analisis Risiko',
  'Badan Perencanaan dan Pengembangan',
  'Biro Ketatausahaan dan Kerumahtanggaan',
  'Rumah Sakit Nasional Diponegoro',
  'Sekolah Pascasarjana',
  'Sekolah Vokasi',
  'Fakultas Teknik',
  'Fakultas Kedokteran',
  'Fakultas Ekonomika dan Bisnis',
  'Fakultas Hukum',
  'Fakultas Ilmu Sosial dan Ilmu Politik',
  'Fakultas Perikanan dan Ilmu Kelautan',
  'Fakultas Sains dan Matematika',
  'Fakultas Psikologi',
  'Fakultas Kesehatan Masyarakat',
  'Fakultas Peternakan dan Pertanian',
  'Fakultas Ilmu Budaya',
  'UPT Laboratorium Terpadu',
  'UPT Keselamatan, Kesehatan Kerja dan Lingkungan',
  'Kantor Pengelolaan Jurnal dan Indeksasi',
]

export function cleanUnitName(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/^(subbagian|bagian|departemen|fakultas|direktorat|biro|badan|lembaga|unit|sekolah)\s+/i, '')
    .trim()
}

/**
 * Mengekstrak Unit Eselon II yang sebenarnya dipimpin berdasarkan teks Tugas Tambahan.
 * Mengatasi kasus di mana Dosen homebase-nya Fakultas (misal FEB/Teknik) namun
 * menjabat struktural di LPPM, Direktorat, Badan, atau Biro.
 */
export function extractLedUnitFromTugasTambahan(tugasTambahan: string, fallbackEs2: string): string {
  const lower = (tugasTambahan || '').toLowerCase()

  // 1. Lembaga LPPM & LP2MP
  if (
    lower.includes('lppm') ||
    lower.includes('penelitian dan pengabdian') ||
    lower.includes('bidang penelitian') ||
    lower.includes('bidang pengabdian')
  ) {
    return 'Lembaga Penelitian dan Pengabdian kepada Masyarakat'
  }
  if (
    lower.includes('lp2mp') ||
    lower.includes('penjaminan mutu pendidikan') ||
    lower.includes('pengembangan dan penjaminan')
  ) {
    return 'Lembaga Pengembangan dan Penjaminan Mutu Pendidikan'
  }

  // 2. Direktorat
  if (lower.includes('sumber daya manusia') || lower.includes('organisasi dan sumber daya')) {
    return 'Direktorat Organisasi dan Sumber Daya Manusia'
  }
  if (
    lower.includes('keuangan') ||
    lower.includes('dana abadi') ||
    lower.includes('akuntansi') ||
    lower.includes('perpajakan')
  ) {
    return 'Direktorat Keuangan, Dana Abadi, Akuntansi, dan Perpajakan'
  }
  if (lower.includes('aset') || lower.includes('perancangan')) {
    return 'Direktorat Aset dan Perancangan'
  }
  if (
    lower.includes('reputasi') ||
    lower.includes('konektivitas global') ||
    lower.includes('kemitraan')
  ) {
    return 'Direktorat Reputasi, Kemitraan dan Konektivitas Global'
  }
  if (
    lower.includes('sistem dan teknologi informasi') ||
    lower.includes('sistem informasi') ||
    lower.includes('teknologi informasi')
  ) {
    return 'Direktorat Sistem dan Teknologi Informasi'
  }
  if (lower.includes('kemahasiswaan') || lower.includes('alumni')) {
    return 'Direktorat Kemahasiswaan dan Alumni'
  }
  if (lower.includes('perpustakaan') || lower.includes('undip press') || lower.includes('kearsipan')) {
    return 'Direktorat Perpustakaan, Undip Press, dan Kearsipan'
  }
  if (
    lower.includes('jejaring media') ||
    lower.includes('komunikasi publik') ||
    lower.includes('komunitas')
  ) {
    return 'Direktorat Jejaring Media, Komunitas dan Komunikasi Publik'
  }
  if (lower.includes('inovasi') || lower.includes('kerja sama') || lower.includes('kerjasama')) {
    return 'Direktorat Inovasi dan Kerja Sama'
  }
  if (lower.includes('hukum') && (lower.includes('direktur') || lower.includes('direktorat'))) {
    return 'Direktorat Hukum'
  }
  if (lower.includes('akademik') && (lower.includes('direktur') || lower.includes('direktorat'))) {
    return 'Direktorat Akademik'
  }

  // 3. Badan
  if (lower.includes('perencanaan dan pengembangan') || lower.includes('perencanaan & pengembangan')) {
    return 'Badan Perencanaan dan Pengembangan'
  }
  if (
    lower.includes('bisnis komersial') ||
    lower.includes('analisis risiko') ||
    lower.includes('usaha bisnis')
  ) {
    return 'Badan Pengelola Usaha Bisnis Komersial dan Analisis Risiko'
  }
  if (lower.includes('luar kampus') || lower.includes('psdku')) {
    return 'Badan Pengelola Kampus di Luar Kampus Utama'
  }
  if (lower.includes('kampus jepara') || lower.includes('jepara')) {
    return 'Badan Pengelola Kampus Jepara'
  }

  // 4. Biro
  if (lower.includes('biro') || lower.includes('ketatausahaan') || lower.includes('kerumahtanggaan')) {
    return 'Biro Ketatausahaan dan Kerumahtanggaan'
  }

  // 5. Rumah Sakit
  if (lower.includes('rumah sakit') || lower.includes('rsnd')) {
    return 'Rumah Sakit Nasional Diponegoro'
  }

  // 6. Sekolah
  if (lower.includes('pascasarjana')) {
    return 'Sekolah Pascasarjana'
  }
  if (lower.includes('vokasi')) {
    return 'Sekolah Vokasi'
  }

  // 7. Fakultas (jika disebutkan secara eksplisit di tugas tambahan)
  for (const unit of KNOWN_UNIT_ES2) {
    if (unit.startsWith('Fakultas ') && lower.includes(unit.toLowerCase())) {
      return unit
    }
  }

  // 8. Cek kecocokan dengan seluruh unit resmi
  for (const unit of KNOWN_UNIT_ES2) {
    if (lower.includes(unit.toLowerCase())) {
      return unit
    }
  }

  return fallbackEs2 || ''
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

  // 4. WAKIL PIMPINAN UNIT (Periksa SEBELUM Pimpinan Unit agar "Wakil Dekan/Direktur/Kaban/Wakil Ketua LPPM" tidak terpotong)
  const isWakilPimpinanUnit =
    lower.includes('wakil dekan') ||
    lower.includes('wadek') ||
    lower.includes('wakil direktur') ||
    lower.includes('wadir') ||
    lower.includes('wakil kepala biro') ||
    lower.includes('wakil kepala badan') ||
    lower.includes('wakil ketua lembaga') ||
    // Di LPPM / LP2MP jabatan sering ditulis: "Wakil Ketua Bidang ..."
    ((lower.includes('wakil ketua') || lower.startsWith('wakil ketua')) &&
      (lower.includes('penelitian') ||
        lower.includes('pengabdian') ||
        lower.includes('lppm') ||
        lower.includes('pendidikan') ||
        lower.includes('lp2mp') ||
        lower.includes('lembaga') ||
        lower.includes('badan')))

  if (isWakilPimpinanUnit) {
    const ledUnit = extractLedUnitFromTugasTambahan(tt, es2)
    let ledSubUnit = es3
    const bidangMatch = tt.match(/bidang\s+([a-zA-Z\s]+)/i)
    if (bidangMatch) {
      ledSubUnit = `Bidang ${bidangMatch[1].trim()}`
    }
    return {
      role: 'wakil_pimpinan_unit',
      isStructural: true,
      title: tt,
      ledUnit,
      ledSubUnit,
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
    (lower.includes('ketua') && (lower.includes('lppm') || lower.includes('lp2mp'))) ||
    lower.includes('sekretaris universitas')

  if (isPimpinanUnit) {
    const ledUnit = extractLedUnitFromTugasTambahan(tt, es2)
    return {
      role: 'pimpinan_unit',
      isStructural: true,
      title: tt,
      ledUnit,
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
    const ledUnit = extractLedUnitFromTugasTambahan(tt, es2)
    return {
      role: 'manajer',
      isStructural: true,
      title: tt,
      ledUnit,
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
    const ledUnit = extractLedUnitFromTugasTambahan(tt, es2)
    return {
      role: 'supervisor',
      isStructural: true,
      title: tt,
      ledUnit,
      ledSubUnit: es4 || es3,
    }
  }

  // 8. Keanggotaan senat / komite / dewan profesor non-struktural lainnya
  return { role: 'staff', isStructural: false, title: tt }
}
