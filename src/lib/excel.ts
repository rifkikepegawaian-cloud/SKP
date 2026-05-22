import { MasterIKU } from '@/lib/types'
import * as XLSX from 'xlsx'

export interface IKUImportRow {
  kode_iku: string
  nama_iku: string
  kode_kegiatan: string
  nama_kegiatan: string
  kode_output: string
  nama_output: string
}

// Expected column headers (case-insensitive matching)
const COLUMN_MAP: Record<string, keyof IKUImportRow> = {
  'kode iku': 'kode_iku',
  'kode_iku': 'kode_iku',
  'nama iku': 'nama_iku',
  'nama_iku': 'nama_iku',
  'kode kegiatan': 'kode_kegiatan',
  'kode_kegiatan': 'kode_kegiatan',
  'nama kegiatan': 'nama_kegiatan',
  'nama_kegiatan': 'nama_kegiatan',
  'kode output': 'kode_output',
  'kode_output': 'kode_output',
  'nama output': 'nama_output',
  'nama_output': 'nama_output',
}

const REQUIRED_FIELDS: (keyof IKUImportRow)[] = [
  'kode_iku', 'nama_iku', 'kode_kegiatan', 'nama_kegiatan', 'kode_output', 'nama_output'
]

export function parseExcelToIKU(buffer: ArrayBuffer): { data: IKUImportRow[]; errors: string[] } {
  const errors: string[] = []

  try {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return { data: [], errors: ['File Excel kosong atau tidak memiliki sheet.'] }
    }

    const sheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    if (rawData.length === 0) {
      return { data: [], errors: ['Sheet tidak memiliki data.'] }
    }

    // Map headers
    const firstRow = rawData[0]
    const headerMapping: Record<string, keyof IKUImportRow> = {}
    for (const key of Object.keys(firstRow)) {
      const normalized = key.toLowerCase().trim()
      if (COLUMN_MAP[normalized]) {
        headerMapping[key] = COLUMN_MAP[normalized]
      }
    }

    // Validate required columns
    const mappedFields = new Set(Object.values(headerMapping))
    for (const field of REQUIRED_FIELDS) {
      if (!mappedFields.has(field)) {
        errors.push(`Kolom "${field}" tidak ditemukan. Pastikan header Excel sesuai format.`)
      }
    }

    if (errors.length > 0) {
      return { data: [], errors }
    }

    // Parse rows
    const data: IKUImportRow[] = []
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const mapped: Partial<IKUImportRow> = {}

      for (const [originalKey, fieldName] of Object.entries(headerMapping)) {
        mapped[fieldName] = String(row[originalKey] ?? '').trim()
      }

      // Validate non-empty
      let valid = true
      for (const field of REQUIRED_FIELDS) {
        if (!mapped[field]) {
          errors.push(`Baris ${i + 2}: Kolom "${field}" kosong.`)
          valid = false
        }
      }

      if (valid) {
        data.push(mapped as IKUImportRow)
      }
    }

    return { data, errors }
  } catch {
    return { data: [], errors: ['Gagal membaca file Excel. Pastikan format file valid (.xlsx/.xls).'] }
  }
}

// Convert import rows to the format ready for Supabase insert (without id & created_at)
export function ikuRowsToInsert(rows: IKUImportRow[]): Omit<MasterIKU, 'id' | 'created_at'>[] {
  return rows.map(row => ({
    kode_iku: row.kode_iku,
    nama_iku: row.nama_iku,
    kode_kegiatan: row.kode_kegiatan,
    nama_kegiatan: row.nama_kegiatan,
    kode_output: row.kode_output,
    nama_output: row.nama_output,
  }))
}

export interface PegawaiImportRow {
  nama_lengkap: string
  nip: string
  unit_es2: string
  unit_es3: string
  unit_es4: string
  jabatan?: string
  tmt_jabatan?: string
}

const PEGAWAI_COLUMN_MAP: Record<string, keyof PegawaiImportRow> = {
  'nama lengkap': 'nama_lengkap',
  'nama_lengkap': 'nama_lengkap',
  'nama': 'nama_lengkap',
  'nip': 'nip',
  'nomor induk pegawai': 'nip',
  'unit es ii': 'unit_es2',
  'unit es 2': 'unit_es2',
  'unit_es2': 'unit_es2',
  'unit es iii': 'unit_es3',
  'unit es 3': 'unit_es3',
  'unit_es3': 'unit_es3',
  'unit es iv': 'unit_es4',
  'unit es 4': 'unit_es4',
  'unit_es4': 'unit_es4',
  'jabatan': 'jabatan',
  'tmt jabatan': 'tmt_jabatan',
  'tmt_jabatan': 'tmt_jabatan'
}

const PEGAWAI_REQUIRED_FIELDS: (keyof PegawaiImportRow)[] = [
  'nama_lengkap', 'nip', 'unit_es2'
]

export function parseExcelToPegawai(buffer: ArrayBuffer): { data: PegawaiImportRow[]; errors: string[] } {
  const errors: string[] = []

  try {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return { data: [], errors: ['File Excel kosong atau tidak memiliki sheet.'] }
    }

    const sheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    if (rawData.length === 0) {
      return { data: [], errors: ['Sheet tidak memiliki data.'] }
    }

    // Map headers
    const firstRow = rawData[0]
    const headerMapping: Record<string, keyof PegawaiImportRow> = {}
    for (const key of Object.keys(firstRow)) {
      const normalized = key.toLowerCase().trim()
      if (PEGAWAI_COLUMN_MAP[normalized]) {
        headerMapping[key] = PEGAWAI_COLUMN_MAP[normalized]
      }
    }

    // Validate required columns
    const mappedFields = new Set(Object.values(headerMapping))
    for (const field of PEGAWAI_REQUIRED_FIELDS) {
      if (!mappedFields.has(field)) {
        errors.push(`Kolom "${field}" tidak ditemukan. Pastikan header Excel mencakup Nama Lengkap, NIP, dan Unit Es II.`)
      }
    }

    if (errors.length > 0) {
      return { data: [], errors }
    }

    // Parse rows
    const data: PegawaiImportRow[] = []
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const mapped: Partial<PegawaiImportRow> = {}

      for (const [originalKey, fieldName] of Object.entries(headerMapping)) {
        let val = String(row[originalKey] ?? '').trim()
        if (fieldName === 'nip') {
          // Remove potential spaces or non-alphanumeric chars from NIP except dots if needed
          val = val.replace(/[^a-zA-Z0-9.]/g, '')
        }
        mapped[fieldName] = val
      }

      // Default optional fields if empty
      if (!mapped.unit_es3) mapped.unit_es3 = '-'
      if (!mapped.unit_es4) mapped.unit_es4 = '-'

      // Validate non-empty required fields
      let valid = true
      for (const field of PEGAWAI_REQUIRED_FIELDS) {
        if (!mapped[field]) {
           errors.push(`Baris ${i + 2}: Kolom "${field}" kosong.`)
           valid = false
        }
      }

      if (valid) {
        data.push(mapped as PegawaiImportRow)
      }
    }

    return { data, errors }
  } catch {
    return { data: [], errors: ['Gagal membaca file Excel. Pastikan format file valid (.xlsx/.xls).'] }
  }
}
