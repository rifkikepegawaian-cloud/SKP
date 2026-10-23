import { User, UserRole, ROLE_LABELS } from '@/lib/types'
import { ProfileSKP } from '@/lib/constants/skpTemplateRifki'

export interface StructuralSuperiors {
  pejabatPenilai: ProfileSKP
  atasanPejabatPenilai: ProfileSKP
  pejabatPenilaiUser: User | null
  atasanPejabatPenilaiUser: User | null
}

const DEFAULT_REKTOR: ProfileSKP = {
  nama: 'Prof. Dr. Suharnomo, S.E., M.Si.',
  nip: '197007221998021001',
  pangkatGol: 'Pembina Utama / IV/e',
  jabatan: 'Rektor Universitas Diponegoro',
  unitKerja: 'Universitas Diponegoro',
}

const DEFAULT_MENTERI: ProfileSKP = {
  nama: 'Prof. Dr. Ir. Satryo Soemantri Brodjonegoro, M.Sc., Ph.D.',
  nip: '195601051980031002',
  pangkatGol: 'Pejabat Negara',
  jabatan: 'Menteri Pendidikan Tinggi, Sains, dan Teknologi RI',
  unitKerja: 'Kementerian Pendidikan Tinggi, Sains, dan Teknologi',
}

const DEFAULT_PRESIDEN: ProfileSKP = {
  nama: 'Jenderal TNI (Purn.) H. Prabowo Subianto',
  nip: '-',
  pangkatGol: 'Kepala Negara / Kepala Pemerintahan',
  jabatan: 'Presiden Republik Indonesia',
  unitKerja: 'Pemerintah Republik Indonesia',
}

/**
 * Mendapatkan identitas Pejabat Penilai Kinerja (Atasan Langsung)
 * dan Atasan Pejabat Penilai Kinerja (Atasan dari Atasan Langsung)
 * berdasarkan hierarki struktural unit organisasi pegawai (bukan semata-mata yang menugaskan).
 */
export async function getStructuralSuperiors(
  user: User | null | undefined,
  supabase: any
): Promise<StructuralSuperiors> {
  if (!user) {
    return {
      pejabatPenilai: {
        nama: 'Pejabat Penilai Kinerja',
        nip: '-',
        pangkatGol: '-',
        jabatan: 'Atasan Langsung',
        unitKerja: '-',
      },
      atasanPejabatPenilai: {
        nama: 'Atasan Pejabat Penilai Kinerja',
        nip: '-',
        pangkatGol: '-',
        jabatan: 'Atasan dari Pejabat Penilai Kinerja',
        unitKerja: '-',
      },
      pejabatPenilaiUser: null,
      atasanPejabatPenilaiUser: null,
    }
  }

  const role = (user.role?.split(',')[0] as UserRole) || 'staff'
  const unitEs2 = (user.led_unit_es2 || user.pegawai?.unit_es2 || '').trim()
  const unitEs3 = (user.led_unit_es3 || user.pegawai?.unit_es3 || '').trim()
  const unitEs4 = (user.pegawai?.unit_es4 || '').trim()

  const clean = (str: string) => str.toLowerCase().replace(/^(subbagian|bagian|departemen|fakultas|direktorat|biro)\s+/i, '').trim()

  const mapUserToProfile = (u: User, defaultJabatan: string, defaultUnit: string): ProfileSKP => {
    let jabatan = u.pegawai?.jabatan || defaultJabatan
    if (defaultJabatan && !jabatan.toLowerCase().includes('supervisor') && !jabatan.toLowerCase().includes('manajer') && !jabatan.toLowerCase().includes('rektor') && !jabatan.toLowerCase().includes('dekan') && !jabatan.toLowerCase().includes('direktur') && !jabatan.toLowerCase().includes('pimpinan')) {
      jabatan = defaultJabatan
    }
    return {
      nama: u.pegawai?.nama_lengkap || u.email || '-',
      nip: u.pegawai?.nip || '-',
      pangkatGol: u.pegawai?.pangkat_golongan || '-',
      jabatan,
      unitKerja: u.pegawai?.unit_es2 || defaultUnit,
    }
  }

  // 1. REKTOR
  if (role === 'rektor') {
    return {
      pejabatPenilai: DEFAULT_MENTERI,
      atasanPejabatPenilai: DEFAULT_PRESIDEN,
      pejabatPenilaiUser: null,
      atasanPejabatPenilaiUser: null,
    }
  }

  // 2. PIMPINAN SUKPA (Wakil Rektor, dsb)
  if (role === 'pimpinan_sukpa') {
    let rektorUser: User | null = null
    try {
      const { data } = await supabase
        .from('users')
        .select('*, pegawai(*)')
        .ilike('role', '%rektor%')
        .limit(1)
      if (data && data.length > 0) rektorUser = data[0] as User
    } catch (e) {
      // fallback
    }

    return {
      pejabatPenilai: rektorUser ? mapUserToProfile(rektorUser, 'Rektor Universitas Diponegoro', 'Universitas Diponegoro') : DEFAULT_REKTOR,
      atasanPejabatPenilai: DEFAULT_MENTERI,
      pejabatPenilaiUser: rektorUser,
      atasanPejabatPenilaiUser: null,
    }
  }

  // 3. PIMPINAN UNIT / WAKIL PIMPINAN UNIT (Dekan, Direktur, dsb)
  if (role === 'pimpinan_unit' || role === 'wakil_pimpinan_unit') {
    let sukpaUser: User | null = null
    let rektorUser: User | null = null
    try {
      const [sukpaRes, rektorRes] = await Promise.all([
        supabase.from('users').select('*, pegawai(*)').ilike('role', '%pimpinan_sukpa%').limit(1),
        supabase.from('users').select('*, pegawai(*)').ilike('role', '%rektor%').limit(1),
      ])
      if (sukpaRes.data && sukpaRes.data.length > 0) sukpaUser = sukpaRes.data[0] as User
      if (rektorRes.data && rektorRes.data.length > 0) rektorUser = rektorRes.data[0] as User
    } catch (e) {
      // ignore
    }

    const penilaiFallback: ProfileSKP = {
      nama: 'Prof. Dr. Ir. Muhammad Zainuri, DEA',
      nip: '196207131987031003',
      pangkatGol: 'Pembina Utama Madya / IV/d',
      jabatan: 'Pimpinan SUKPA / Wakil Rektor',
      unitKerja: 'Universitas Diponegoro',
    }

    return {
      pejabatPenilai: sukpaUser ? mapUserToProfile(sukpaUser, 'Pimpinan SUKPA / Wakil Rektor', 'Universitas Diponegoro') : penilaiFallback,
      atasanPejabatPenilai: rektorUser ? mapUserToProfile(rektorUser, 'Rektor Universitas Diponegoro', 'Universitas Diponegoro') : DEFAULT_REKTOR,
      pejabatPenilaiUser: sukpaUser,
      atasanPejabatPenilaiUser: rektorUser,
    }
  }

  // 4. MANAJER (Kepala Bagian / Manajer Eselon III)
  if (role === 'manajer') {
    let pimpinanUnitUser: User | null = null
    let sukpaUser: User | null = null

    try {
      // Cari pimpinan unit di unit_es2 yang sama
      let queryUnit = supabase.from('users').select('*, pegawai(*)').ilike('role', '%pimpinan_unit%')
      if (unitEs2) {
        queryUnit = queryUnit.ilike('pegawai.unit_es2', `%${clean(unitEs2)}%`)
      }
      const { data: unitData } = await queryUnit.limit(1)
      if (unitData && unitData.length > 0) pimpinanUnitUser = unitData[0] as User

      const { data: sukpaData } = await supabase.from('users').select('*, pegawai(*)').ilike('role', '%pimpinan_sukpa%').limit(1)
      if (sukpaData && sukpaData.length > 0) sukpaUser = sukpaData[0] as User
    } catch (e) {
      // ignore
    }

    const penilaiFallback: ProfileSKP = {
      nama: `Pimpinan ${unitEs2 || 'Unit Kerja'}`,
      nip: '-',
      pangkatGol: '-',
      jabatan: `Pimpinan Unit ${unitEs2 || ''}`,
      unitKerja: unitEs2 || 'Universitas Diponegoro',
    }

    const atasanFallback: ProfileSKP = {
      nama: 'Prof. Dr. Ir. Muhammad Zainuri, DEA',
      nip: '196207131987031003',
      pangkatGol: 'Pembina Utama Madya / IV/d',
      jabatan: 'Pimpinan SUKPA / Wakil Rektor',
      unitKerja: 'Universitas Diponegoro',
    }

    return {
      pejabatPenilai: pimpinanUnitUser ? mapUserToProfile(pimpinanUnitUser, `Pimpinan Unit ${unitEs2}`, unitEs2) : penilaiFallback,
      atasanPejabatPenilai: sukpaUser ? mapUserToProfile(sukpaUser, 'Pimpinan SUKPA / Wakil Rektor', 'Universitas Diponegoro') : atasanFallback,
      pejabatPenilaiUser: pimpinanUnitUser,
      atasanPejabatPenilaiUser: sukpaUser,
    }
  }

  // 5. SUPERVISOR (Kepala Subbagian / Supervisor Eselon IV)
  if (role === 'supervisor') {
    let manajerUser: User | null = null
    let pimpinanUnitUser: User | null = null

    try {
      // Cari manajer di unit_es3 yang sama
      const { data: manajerData } = await supabase
        .from('users')
        .select('*, pegawai(*)')
        .ilike('role', '%manajer%')

      if (manajerData && manajerData.length > 0) {
        // Cari yang match unit_es3
        manajerUser = (manajerData as User[]).find(m => {
          const mEs3 = (m.led_unit_es3 || m.pegawai?.unit_es3 || '').trim()
          return unitEs3 && mEs3 && clean(mEs3) === clean(unitEs3)
        }) || null

        // Kalau tidak match es3, cari yang match es2
        if (!manajerUser && unitEs2) {
          manajerUser = (manajerData as User[]).find(m => {
            const mEs2 = (m.led_unit_es2 || m.pegawai?.unit_es2 || '').trim()
            return mEs2 && clean(mEs2) === clean(unitEs2)
          }) || null
        }
      }

      // Cari pimpinan unit di unit_es2
      let queryUnit = supabase.from('users').select('*, pegawai(*)').ilike('role', '%pimpinan_unit%')
      if (unitEs2) {
        queryUnit = queryUnit.ilike('pegawai.unit_es2', `%${clean(unitEs2)}%`)
      }
      const { data: unitData } = await queryUnit.limit(1)
      if (unitData && unitData.length > 0) pimpinanUnitUser = unitData[0] as User
    } catch (e) {
      // ignore
    }

    const penilaiFallback: ProfileSKP = {
      nama: `Manajer ${unitEs3 || 'Bagian'}`,
      nip: '-',
      pangkatGol: '-',
      jabatan: `Manajer ${unitEs3 || 'Bagian'}`,
      unitKerja: unitEs2 || 'Universitas Diponegoro',
    }

    const atasanFallback: ProfileSKP = {
      nama: `Pimpinan ${unitEs2 || 'Unit Kerja'}`,
      nip: '-',
      pangkatGol: '-',
      jabatan: `Pimpinan Unit ${unitEs2 || ''}`,
      unitKerja: unitEs2 || 'Universitas Diponegoro',
    }

    return {
      pejabatPenilai: manajerUser ? mapUserToProfile(manajerUser, `Manajer ${unitEs3}`, unitEs2) : penilaiFallback,
      atasanPejabatPenilai: pimpinanUnitUser ? mapUserToProfile(pimpinanUnitUser, `Pimpinan Unit ${unitEs2}`, unitEs2) : atasanFallback,
      pejabatPenilaiUser: manajerUser,
      atasanPejabatPenilaiUser: pimpinanUnitUser,
    }
  }

  // 6. STAFF (Staf Pelaksana Eselon IV)
  // Atasan Langsung = Supervisor di unit_es4 yang sama
  // Atasan Pejabat Penilai = Manajer di unit_es3 yang sama
  let supervisorUser: User | null = null
  let manajerUser: User | null = null

  try {
    // Cari semua supervisor
    const { data: spvData } = await supabase
      .from('users')
      .select('*, pegawai(*)')
      .ilike('role', '%supervisor%')

    if (spvData && spvData.length > 0) {
      // Prioritas 1: match unit_es4
      if (unitEs4) {
        supervisorUser = (spvData as User[]).find(s => {
          const sEs4 = (s.pegawai?.unit_es4 || '').trim()
          return sEs4 && clean(sEs4) === clean(unitEs4)
        }) || null
      }

      // Prioritas 2: match unit_es3
      if (!supervisorUser && unitEs3) {
        supervisorUser = (spvData as User[]).find(s => {
          const sEs3 = (s.led_unit_es3 || s.pegawai?.unit_es3 || '').trim()
          return sEs3 && clean(sEs3) === clean(unitEs3)
        }) || null
      }

      // Prioritas 3: match unit_es2
      if (!supervisorUser && unitEs2) {
        supervisorUser = (spvData as User[]).find(s => {
          const sEs2 = (s.led_unit_es2 || s.pegawai?.unit_es2 || '').trim()
          return sEs2 && clean(sEs2) === clean(unitEs2)
        }) || null
      }
    }

    // Cari manajer di unit_es3
    const { data: manajerData } = await supabase
      .from('users')
      .select('*, pegawai(*)')
      .ilike('role', '%manajer%')

    if (manajerData && manajerData.length > 0) {
      if (unitEs3) {
        manajerUser = (manajerData as User[]).find(m => {
          const mEs3 = (m.led_unit_es3 || m.pegawai?.unit_es3 || '').trim()
          return mEs3 && clean(mEs3) === clean(unitEs3)
        }) || null
      }

      if (!manajerUser && unitEs2) {
        manajerUser = (manajerData as User[]).find(m => {
          const mEs2 = (m.led_unit_es2 || m.pegawai?.unit_es2 || '').trim()
          return mEs2 && clean(mEs2) === clean(unitEs2)
        }) || null
      }
    }
  } catch (e) {
    // ignore
  }

  const penilaiFallback: ProfileSKP = {
    nama: `Supervisor ${unitEs4 || 'Subbagian'}`,
    nip: '-',
    pangkatGol: '-',
    jabatan: `Supervisor ${unitEs4 || 'Subbagian'}`,
    unitKerja: unitEs2 || 'Universitas Diponegoro',
  }

  const atasanFallback: ProfileSKP = {
    nama: `Manajer ${unitEs3 || 'Bagian'}`,
    nip: '-',
    pangkatGol: '-',
    jabatan: `Manajer ${unitEs3 || 'Bagian'}`,
    unitKerja: unitEs2 || 'Universitas Diponegoro',
  }

  return {
    pejabatPenilai: supervisorUser ? mapUserToProfile(supervisorUser, `Supervisor ${unitEs4 || 'Subbagian'}`, unitEs2) : penilaiFallback,
    atasanPejabatPenilai: manajerUser ? mapUserToProfile(manajerUser, `Manajer ${unitEs3 || 'Bagian'}`, unitEs2) : atasanFallback,
    pejabatPenilaiUser: supervisorUser,
    atasanPejabatPenilaiUser: manajerUser,
  }
}
