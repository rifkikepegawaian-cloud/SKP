// Database types mirroring Supabase schema

export type UserRole = 'staff' | 'supervisor' | 'manajer' | 'pimpinan_unit' | 'pimpinan_sukpa' | 'rektor' | 'admin'

export const ROLE_LABELS: Record<UserRole, string> = {
  staff: 'Staff',
  supervisor: 'Supervisor',
  manajer: 'Manajer',
  pimpinan_unit: 'Pimpinan Unit',
  pimpinan_sukpa: 'Pimpinan SUKPA',
  rektor: 'Rektor',
  admin: 'Admin',
}

export const ALL_ROLES: UserRole[] = ['staff', 'supervisor', 'manajer', 'pimpinan_unit', 'pimpinan_sukpa', 'rektor', 'admin']

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
  created_at: string
}

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
