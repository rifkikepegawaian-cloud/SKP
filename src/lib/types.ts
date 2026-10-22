// Database types mirroring Supabase schema

export type UserRole = 
  | 'staff' 
  | 'supervisor' 
  | 'manajer' 
  | 'wakil_pimpinan_unit' 
  | 'pimpinan_unit' 
  | 'pimpinan_sukpa' 
  | 'rektor' 
  | 'admin'

export const ROLE_LABELS: Record<UserRole, string> = {
  staff: 'Staff',
  supervisor: 'Supervisor',
  manajer: 'Manajer',
  wakil_pimpinan_unit: 'Wakil Pimpinan Unit',
  pimpinan_unit: 'Pimpinan Unit',
  pimpinan_sukpa: 'Pimpinan SUKPA',
  rektor: 'Rektor',
  admin: 'Admin',
}

export const ALL_ROLES: UserRole[] = [
  'staff', 
  'supervisor', 
  'manajer', 
  'wakil_pimpinan_unit', 
  'pimpinan_unit', 
  'pimpinan_sukpa', 
  'rektor', 
  'admin'
]

export interface Pegawai {
  id: string
  nama_lengkap: string
  nip: string
  unit_es2: string
  unit_es3: string
  unit_es4: string
  jabatan?: string
  tmt_jabatan?: string
  created_at: string
}

export interface User {
  id: string
  email: string
  role: UserRole
  pegawai_id?: string
  avatar_url?: string
  led_unit_es2?: string
  led_sukpa?: string
  led_unit_es3?: string
  created_at: string
  // joined
  pegawai?: Pegawai
}

export interface MasterIKU {
  id: string
  kode_iku: string
  nama_iku: string
  kode_kegiatan: string
  nama_kegiatan: string
  kode_output: string
  nama_output: string
  target_default?: string
  satuan_default?: string
  created_at: string
}

// ────────────────────────────────────────────────────────────
// CASCADING PERFORMANCE & DIALOG KINERJA (NEW ARCHITECTURE)
// ────────────────────────────────────────────────────────────

export type CascadingStatus = 'assigned' | 'agreed' | 'objected'
export type CascadingLevel = 'sukpa' | 'unit' | 'manajer' | 'spv' | 'staff'
export type LaporanStatus = 'pending' | 'approved' | 'rejected' | 'revision'
export type SKPDokumenStatus = 'draft' | 'signed_pegawai' | 'signed_atasan' | 'final'

export interface MasterPeriodeSKP {
  id: string
  tahun: string
  nama_periode: string
  tgl_mulai_cascading: string
  tgl_akhir_cascading: string
  tgl_mulai_penilaian?: string
  tgl_akhir_penilaian?: string
  is_active: boolean
  status: 'draft' | 'cascading_active' | 'pelaporan_active' | 'closed'
  created_at: string
}

// Level 1: Rektor -> Pimpinan SUKPA
export interface CascadingIKUSukpa {
  id: string
  periode_id: string
  iku_id: string
  assigned_by: string
  sukpa_user_id: string
  target: string | number
  satuan: string
  is_direct_sync: boolean
  status: CascadingStatus
  catatan_sanggahan?: string
  target_usulan?: string | number
  agreed_at?: string
  capaian_realisasi: number
  capaian_approved: number
  created_at: string
  updated_at: string
  // joins
  periode?: MasterPeriodeSKP
  iku?: MasterIKU
  assigned_by_user?: User
  sukpa_user?: User
  units?: CascadingIKUUnit[]
}

// Level 2: Pimpinan SUKPA -> Pimpinan Unit
export interface CascadingIKUUnit {
  id: string
  parent_sukpa_id: string
  periode_id: string
  assigned_by: string
  unit_user_id: string
  target: string | number
  satuan: string
  is_direct_sync: boolean
  status: CascadingStatus
  catatan_sanggahan?: string
  target_usulan?: string | number
  agreed_at?: string
  capaian_realisasi: number
  capaian_approved: number
  created_at: string
  updated_at: string
  // joins
  parent_sukpa?: CascadingIKUSukpa
  unit_user?: User
  outputs?: CascadingOutputManajer[]
}

// Level 3: Pimpinan Unit -> Manajer (Wakil Pimpinan Unit view-only)
export interface CascadingOutputManajer {
  id: string
  parent_unit_id: string
  periode_id: string
  assigned_by: string
  manajer_user_id: string
  nama_output: string
  kode_output?: string
  target: string | number
  satuan: string
  is_direct_sync: boolean
  status: CascadingStatus
  catatan_sanggahan?: string
  target_usulan?: string | number
  agreed_at?: string
  capaian_realisasi: number
  capaian_approved: number
  created_at: string
  updated_at: string
  // joins
  parent_unit?: CascadingIKUUnit
  manajer_user?: User
  uraians?: CascadingUraianSPV[]
}

// Level 4: Manajer -> Supervisor (SPV)
export interface CascadingUraianSPV {
  id: string
  parent_output_id: string
  periode_id: string
  assigned_by: string
  spv_user_id: string
  nama_uraian: string
  target: string | number
  satuan: string
  is_direct_sync: boolean
  status: CascadingStatus
  catatan_sanggahan?: string
  target_usulan?: string | number
  agreed_at?: string
  capaian_realisasi: number
  capaian_approved: number
  created_at: string
  updated_at: string
  // joins
  parent_output?: CascadingOutputManajer
  spv_user?: User
  sub_uraians?: CascadingSubUraianStaff[]
}

// Level 5: Supervisor (SPV) -> Staff
export interface CascadingSubUraianStaff {
  id: string
  parent_uraian_id: string
  periode_id: string
  assigned_by: string
  staff_user_id: string
  nama_sub_uraian: string
  target: string | number
  satuan: string
  status: CascadingStatus
  catatan_sanggahan?: string
  target_usulan?: string | number
  agreed_at?: string
  capaian_realisasi: number
  capaian_approved: number
  created_at: string
  updated_at: string
  // joins
  parent_uraian?: CascadingUraianSPV
  staff_user?: User
  laporans?: CascadingLaporanKerja[]
}

// Pelaporan Log & Evidence Bukti Dukung (GAS Google Drive)
export interface CascadingLaporanKerja {
  id: string
  level: CascadingLevel
  ref_id: string
  user_id: string
  capaian: number
  keterangan: string
  evidence_url?: string
  evidence_name?: string
  tanggal_laporan: string
  status: LaporanStatus
  reviewed_by?: string
  reviewed_at?: string
  catatan_reviewer?: string
  created_at: string
  // joins
  user?: User
  reviewer?: User
}

// Dokumen Rencana SKP & Lembar Pengesahan
export interface SKPDokumenFinal {
  id: string
  periode_id: string
  user_id: string
  role_saat_pengajuan: UserRole
  atasan_id: string
  status: SKPDokumenStatus
  signed_pegawai_at?: string
  signed_atasan_at?: string
  catatan?: string
  created_at: string
  // joins
  periode?: MasterPeriodeSKP
  user?: User
  atasan?: User
}

// ────────────────────────────────────────────────────────────
// LEGACY COMPATIBILITY TYPES (Untuk modul yang sudah berjalan)
// ────────────────────────────────────────────────────────────

export interface SKPPlan {
  id: string
  user_id: string
  output_id: string
  target_individual: number
  satuan: string
  rencana_aksi: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'revision'
  catatan_reviewer?: string
  parent_skp_id?: string
  iku_item_id?: string
  iku_item?: IKUPengajuanItem
  parent_skp?: SKPPlan
  created_at: string
  updated_at: string
  // joins
  user?: User
  iku?: MasterIKU
}

export interface ActivityLog {
  id: string
  skp_id: string
  user_id: string
  description: string
  progress_percentage: number
  capaian?: number
  evidence_url?: string
  evidence_name?: string
  tanggal: string
  status: 'valid' | 'pending_evidence' | 'revision'
  created_at: string
  // joins
  skp?: SKPPlan
}

export interface UnitRisk {
  unit_id: string
  unit_name: string
  risk_factor: number
  updated_at: string
}

export interface JobSalary {
  job_id: string
  job_name: string
  standard_payment: number
  updated_at: string
}

export interface RemunerationResult {
  user_id: string
  user_name: string
  job_name: string
  unit_name: string
  achievement_percent: number
  standard_payment: number
  risk_factor: number
  final_payment: number
  period: string
}

export interface MasterPeriodeIKU {
  id: string
  tahun_iku: string
  tgl_mulai_pengajuan: string
  tgl_akhir_pengajuan: string
  is_active: boolean
  created_at: string
}

export interface IKUPengajuan {
  id: string
  periode_id: string
  manajer_id: string
  judul: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'revision' | 'cancellation_pending' | 'cancelled'
  catatan_penolakan?: string
  alasan_pembatalan?: string
  reviewed_by?: string
  reviewed_at?: string
  submitted_at?: string
  created_at: string
  updated_at: string
  // joins
  periode?: MasterPeriodeIKU
  manajer?: User
  reviewer?: User
  items?: IKUPengajuanItem[]
}

export interface IKUPengajuanItem {
  id: string
  pengajuan_id: string
  iku_id: string
  target_output: number
  satuan: string
  catatan_pimpinan?: string
  status_pembatalan?: 'pending' | 'approved' | 'rejected'
  alasan_pembatalan?: string
  created_at: string
  // joins
  pengajuan?: IKUPengajuan
  iku?: MasterIKU
  laporan?: IKULaporan[]
}

export interface IKULaporan {
  id: string
  item_id: string
  manajer_id: string
  capaian: number
  keterangan?: string
  evidence_url?: string
  evidence_name?: string
  tanggal_laporan: string
  created_at: string
  // joins
  item?: IKUPengajuanItem
}

// ────────────────────────────────────────────────────────────
// PERILAKU KERJA (CORE VALUES ASN BerAKHLAK - PermenPAN-RB No. 6 Tahun 2022)
// ────────────────────────────────────────────────────────────

export type RatingPerilaku = 'di_atas_ekspektasi' | 'sesuai_ekspektasi' | 'di_bawah_ekspektasi'

export interface AspekBerakhlakDef {
  id: number
  nama: string
  tagline: string
  icon: string
  color: string
  panduan: string[]
  defaultEkspektasi: string
}

export interface NilaiPerilakuItem {
  aspek_id: number
  ekspektasi_khusus: string
  rating: RatingPerilaku
  umpan_balik?: string
}

export interface SKPPerilakuKerja {
  id?: string
  periode_id: string
  user_id: string
  penilai_user_id?: string
  aspek_id: number
  aspek_nama: string
  ekspektasi_khusus: string
  rating: RatingPerilaku
  umpan_balik?: string
  created_at?: string
  updated_at?: string
}

