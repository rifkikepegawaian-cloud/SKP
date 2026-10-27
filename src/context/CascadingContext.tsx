'use client'

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import {
  User,
  UserRole,
  ROLE_LABELS,
  MasterIKU,
  CascadingStatus,
  CascadingLevel,
  MasterPeriodeSKP,
  CascadingIKUSukpa,
  CascadingIKUUnit,
  CascadingOutputManajer,
  CascadingUraianSPV,
  CascadingSubUraianStaff,
  CascadingLaporanKerja,
} from '@/lib/types'
import TargetSplitterModal, { AllocationRow } from '@/components/cascading/TargetSplitterModal'
import SanggahanModal from '@/components/cascading/SanggahanModal'
import PelaporanCapaianModal from '@/components/cascading/PelaporanCapaianModal'
import Swal from 'sweetalert2'

export interface GroupedIKU {
  id: string
  kode_iku: string
  nama_iku: string
  target_default: string
  satuan_default: string
  all_ids: string[]
  outputs: Array<{ id: string; kode_output: string; nama_output: string; kode_kegiatan: string; nama_kegiatan: string }>
}

export interface SplitterConfig {
  levelTitle: string
  parentName: string
  parentSubtitle?: string
  parentTarget: string | number
  satuan: string
  requiresTaskName: boolean
  taskNameLabel?: string
  taskNamePlaceholder?: string
  taskNameSuggestions?: string[]
  targetRoleLabel?: string
  filterUnitEs2?: string
  allowEditParentTarget?: boolean
  subordinatesList?: User[]
  parentRecord: any
  selectedOutput?: { id?: string; kode_output?: string; nama_output: string; nama_kegiatan?: string }
}

interface CascadingContextType {
  user: User | null
  role: UserRole
  periode: MasterPeriodeSKP | null
  isLoading: boolean
  masterIkuList: MasterIKU[]
  subordinates: User[]
  sukpaAssignments: CascadingIKUSukpa[]
  unitAssignments: CascadingIKUUnit[]
  outputAssignments: CascadingOutputManajer[]
  uraianAssignments: CascadingUraianSPV[]
  subUraianAssignments: CascadingSubUraianStaff[]
  laporanList: CascadingLaporanKerja[]
  groupedIkuList: GroupedIKU[]
  incomingTasks: any[]
  myAssignedTasks: any[]
  subordinateReports: CascadingLaporanKerja[]
  myReports: CascadingLaporanKerja[]
  agreedTasksForSKP: Array<{
    id: string
    title: string
    target: number | string
    satuan: string
    parentTitle?: string
    isDirectSync?: boolean
    indikatorKinerja?: string
    jenisKinerja?: 'utama' | 'tambahan'
    assignedByUser?: User | null
    capaian_realisasi?: number
    capaian_approved?: number
  }>
  isViewOnly: boolean
  subordinateRoleTarget: string | null
  currentCascadingLevel: CascadingLevel
  fetchData: () => Promise<void>
  showToast: (message: string, type?: 'success' | 'error') => void
  openSplitterForParent: (parent: any, type: 'iku_sukpa' | 'iku_unit' | 'output' | 'uraian' | 'sub_uraian') => Promise<void>
  openSplitterForOutput: (parentUnitIku: any, outputItem: any) => Promise<void>
  handleAgreeTask: (taskId: string, tableName: string) => Promise<void>
  handleOpenSanggahan: (task: any, tableName: string) => void
  handleAcceptSubordinateProposal: (task: any) => Promise<void>
  handleDeleteAssignment: (task: any) => Promise<void>
  handleOpenPelaporanModal: (task: any, level: CascadingLevel) => void
  handleApproveLaporan: (laporan: CascadingLaporanKerja) => Promise<void>
  handleRejectLaporan: (laporanId: string, note: string) => Promise<void>
}

const CascadingContext = createContext<CascadingContextType | undefined>(undefined)

export function CascadingProvider({ children }: { children: React.ReactNode }) {
  const { user, activeRole } = useAuthStore()
  // Asli tanpa fitur simulasi
  const role: UserRole = activeRole || (user?.role?.split(',')[0] as UserRole) || 'staff'

  const [periode, setPeriode] = useState<MasterPeriodeSKP | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [masterIkuList, setMasterIkuList] = useState<MasterIKU[]>([])
  const [subordinates, setSubordinates] = useState<User[]>([])

  const [sukpaAssignments, setSukpaAssignments] = useState<CascadingIKUSukpa[]>([])
  const [unitAssignments, setUnitAssignments] = useState<CascadingIKUUnit[]>([])
  const [outputAssignments, setOutputAssignments] = useState<CascadingOutputManajer[]>([])
  const [uraianAssignments, setUraianAssignments] = useState<CascadingUraianSPV[]>([])
  const [subUraianAssignments, setSubUraianAssignments] = useState<CascadingSubUraianStaff[]>([])
  const [laporanList, setLaporanList] = useState<CascadingLaporanKerja[]>([])

  // Modal Splitter States
  const [isSplitterOpen, setIsSplitterOpen] = useState(false)
  const [splitterConfig, setSplitterConfig] = useState<SplitterConfig | null>(null)

  // Modal Sanggahan States
  const [isSanggahanOpen, setIsSanggahanOpen] = useState(false)
  const [selectedTaskForSanggahan, setSelectedTaskForSanggahan] = useState<{
    id: string
    title: string
    target: string | number
    satuan: string
    assignedByName?: string
    tableName: string
  } | null>(null)

  // Modal Pelaporan States
  const [isPelaporanOpen, setIsPelaporanOpen] = useState(false)
  const [selectedTaskForPelaporan, setSelectedTaskForPelaporan] = useState<{
    id: string
    title: string
    target: string | number
    satuan: string
    level: CascadingLevel
    capaianSaatIni?: number
  } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const subordinateRoleTarget = useMemo(() => {
    switch (role) {
      case 'rektor': return 'pimpinan_sukpa'
      case 'pimpinan_sukpa': return 'pimpinan_unit'
      case 'pimpinan_unit': return 'manajer'
      case 'manajer': return 'supervisor'
      case 'supervisor': return 'staff'
      default: return null
    }
  }, [role])

  const currentCascadingLevel = useMemo<CascadingLevel>(() => {
    switch (role) {
      case 'staff': return 'staff'
      case 'supervisor': return 'spv'
      case 'manajer': return 'manajer'
      case 'pimpinan_unit': return 'unit'
      case 'pimpinan_sukpa': return 'sukpa'
      default: return 'staff'
    }
  }, [role])

  const isViewOnly = role === 'wakil_pimpinan_unit'

  // Fetch Core Data
  const fetchData = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data: periodeData } = await supabase
        .from('master_periode_skp')
        .select('*')
        .eq('is_active', true)
        .order('tahun', { ascending: false })
        .limit(1)
        .single()

      if (periodeData) {
        setPeriode(periodeData as MasterPeriodeSKP)
      }

      const { data: ikuData } = await supabase
        .from('master_iku')
        .select('*')
        .order('kode_iku', { ascending: true })

      if (ikuData) setMasterIkuList(ikuData as MasterIKU[])

      if (subordinateRoleTarget) {
        const { data: subUsers } = await supabase
          .from('users')
          .select('*, pegawai(*)')
          .ilike('role', `%${subordinateRoleTarget}%`)
          .order('email', { ascending: true })

        setSubordinates((subUsers as User[]) || [])
      } else {
        setSubordinates([])
      }

      const [
        { data: sukpaData },
        { data: unitData },
        { data: outputData },
        { data: uraianData },
        { data: subUraianData },
        { data: laporanData }
      ] = await Promise.all([
        supabase.from('cascading_iku_sukpa').select('*, iku:master_iku(*), assigned_by_user:users!assigned_by(*, pegawai(*)), sukpa_user:users!sukpa_user_id(*, pegawai(*))'),
        supabase.from('cascading_iku_unit').select('*, parent_sukpa:cascading_iku_sukpa(*, iku:master_iku(*)), assigned_by_user:users!assigned_by(*, pegawai(*)), unit_user:users!unit_user_id(*, pegawai(*))'),
        supabase.from('cascading_output_manajer').select('*, parent_unit:cascading_iku_unit(*, parent_sukpa:cascading_iku_sukpa(*, iku:master_iku(*))), assigned_by_user:users!assigned_by(*, pegawai(*)), manajer_user:users!manajer_user_id(*, pegawai(*))'),
        supabase.from('cascading_uraian_spv').select('*, parent_output:cascading_output_manajer(*, manajer_user:users!manajer_user_id(*, pegawai(*)), parent_unit:cascading_iku_unit(*, unit_user:users!unit_user_id(*, pegawai(*)), parent_sukpa:cascading_iku_sukpa(*, iku:master_iku(*)))), assigned_by_user:users!assigned_by(*, pegawai(*)), spv_user:users!spv_user_id(*, pegawai(*))'),
        supabase.from('cascading_sub_uraian_staff').select('*, parent_uraian:cascading_uraian_spv(*), assigned_by_user:users!assigned_by(*, pegawai(*)), staff_user:users!staff_user_id(*, pegawai(*))'),
        supabase.from('cascading_laporan_kerja').select('*, user:users!user_id(*, pegawai(*)), reviewer:users!reviewed_by(*, pegawai(*))').order('created_at', { ascending: false }),
      ])

      if (sukpaData) setSukpaAssignments(sukpaData as CascadingIKUSukpa[])
      if (unitData) setUnitAssignments(unitData as CascadingIKUUnit[])
      if (outputData) setOutputAssignments(outputData as CascadingOutputManajer[])
      if (uraianData) setUraianAssignments(uraianData as CascadingUraianSPV[])
      if (subUraianData) setSubUraianAssignments(subUraianData as CascadingSubUraianStaff[])
      if (laporanData) setLaporanList(laporanData as CascadingLaporanKerja[])

    } catch (err: any) {
      console.error('Error fetching cascading data:', err)
      showToast('Gagal memuat data cascading.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [role, subordinateRoleTarget])

  // Grouped 32 IKU by unique kode_iku
  const groupedIkuList = useMemo(() => {
    const map = new Map<string, GroupedIKU>()

    masterIkuList.forEach(item => {
      const key = item.kode_iku
      const isFSR = item.kode_iku === '18' || item.nama_iku?.toLowerCase().includes('faculty student ratio')
      const defaultTarget = item.target_default || (isFSR ? '1:50' : '100')
      const defaultSatuan = item.satuan_default || (isFSR ? 'Rasio' : '%')

      if (!map.has(key)) {
        map.set(key, {
          id: item.id,
          kode_iku: item.kode_iku,
          nama_iku: item.nama_iku,
          target_default: defaultTarget,
          satuan_default: defaultSatuan,
          all_ids: [item.id],
          outputs: [{
            id: item.id,
            kode_output: item.kode_output,
            nama_output: item.nama_output,
            kode_kegiatan: item.kode_kegiatan,
            nama_kegiatan: item.nama_kegiatan,
          }]
        })
      } else {
        const existing = map.get(key)!
        existing.all_ids.push(item.id)
        if (item.target_default && !existing.target_default) existing.target_default = item.target_default
        if (item.satuan_default && !existing.satuan_default) existing.satuan_default = item.satuan_default
        if (item.nama_output && !existing.outputs.some(o => o.nama_output === item.nama_output)) {
          existing.outputs.push({
            id: item.id,
            kode_output: item.kode_output,
            nama_output: item.nama_output,
            kode_kegiatan: item.kode_kegiatan,
            nama_kegiatan: item.nama_kegiatan,
          })
        }
      }
    })

    return Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(a.kode_iku, 10)
      const numB = parseInt(b.kode_iku, 10)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      return a.kode_iku.localeCompare(b.kode_iku)
    })
  }, [masterIkuList])

  // Incoming tasks for current user (real role)
  const incomingTasks = useMemo(() => {
    if (!user) return []
    const uid = user.id

    if (role === 'pimpinan_sukpa') {
      return sukpaAssignments
        .filter(a => a.sukpa_user_id === uid)
        .map(a => ({ ...a, _table: 'cascading_iku_sukpa', _level: 'sukpa' as CascadingLevel }))
    } else if (role === 'pimpinan_unit') {
      return unitAssignments
        .filter(a => a.unit_user_id === uid)
        .map(a => ({ ...a, _table: 'cascading_iku_unit', _level: 'unit' as CascadingLevel }))
    } else if (role === 'wakil_pimpinan_unit') {
      const targetUnit = user.led_unit_es2 || user.pegawai?.unit_es2
      const targetBagian = user.led_unit_es3 || user.pegawai?.unit_es3
      return outputAssignments.filter(a => {
        if (!targetUnit && !targetBagian) return true
        const mUnit = a.manajer_user?.pegawai?.unit_es2 || a.manajer_user?.led_unit_es2
        const mBagian = a.manajer_user?.pegawai?.unit_es3 || a.manajer_user?.led_unit_es3
        if (targetUnit && mUnit && mUnit !== targetUnit) return false
        if (targetBagian && mBagian && mBagian !== targetBagian) return false
        return true
      }).map(a => ({ ...a, _table: 'cascading_output_manajer', _level: 'manajer' as CascadingLevel }))
    } else if (role === 'manajer') {
      return outputAssignments
        .filter(a => a.manajer_user_id === uid)
        .map(a => ({ ...a, _table: 'cascading_output_manajer', _level: 'manajer' as CascadingLevel }))
    } else if (role === 'supervisor') {
      return uraianAssignments
        .filter(a => a.spv_user_id === uid)
        .map(a => ({ ...a, _table: 'cascading_uraian_spv', _level: 'spv' as CascadingLevel }))
    } else if (role === 'staff') {
      return subUraianAssignments
        .filter(a => a.staff_user_id === uid)
        .map(a => ({ ...a, _table: 'cascading_sub_uraian_staff', _level: 'staff' as CascadingLevel }))
    }
    return []
  }, [user, role, sukpaAssignments, unitAssignments, outputAssignments, uraianAssignments, subUraianAssignments])

  // Assigned tasks created by current user
  const myAssignedTasks = useMemo(() => {
    if (!user) return []
    const uid = user.id

    if (role === 'rektor') {
      return sukpaAssignments.map(a => ({ ...a, _table: 'cascading_iku_sukpa' }))
    } else if (role === 'pimpinan_sukpa') {
      return unitAssignments.filter(a => a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_iku_unit' }))
    } else if (role === 'pimpinan_unit') {
      return outputAssignments.filter(a => a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_output_manajer' }))
    } else if (role === 'manajer') {
      return uraianAssignments.filter(a => a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_uraian_spv' }))
    } else if (role === 'supervisor') {
      return subUraianAssignments.filter(a => a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_sub_uraian_staff' }))
    } else if (role === 'admin') {
      return [
        ...sukpaAssignments.map(a => ({ ...a, _table: 'cascading_iku_sukpa' })),
        ...unitAssignments.filter(a => a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_iku_unit' })),
        ...outputAssignments.filter(a => a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_output_manajer' })),
        ...uraianAssignments.filter(a => a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_uraian_spv' })),
        ...subUraianAssignments.filter(a => a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_sub_uraian_staff' })),
      ]
    }
    return []
  }, [user, role, sukpaAssignments, unitAssignments, outputAssignments, uraianAssignments, subUraianAssignments])

  const subordinateReports = useMemo(() => {
    if (!user) return []
    const subordinateTaskIds = new Set(myAssignedTasks.map((t: any) => t.id))
    return laporanList.filter(l => subordinateTaskIds.has(l.ref_id))
  }, [myAssignedTasks, laporanList, user])

  const myReports = useMemo(() => {
    if (!user) return []
    return laporanList.filter(l => l.user_id === user.id)
  }, [laporanList, user])

  const agreedTasksForSKP = useMemo(() => {
    // 1. Rektor: Berisi 32 IKU Universitas (Grouped by unique kode_iku)
    if (role === 'rektor') {
      return groupedIkuList.map((iku, idx) => ({
        id: iku.id || `rektor-iku-${idx}`,
        title: `Pencapaian Indikator Kinerja Utama [IKU ${iku.kode_iku}] ${iku.nama_iku}`,
        target: iku.target_default || '100',
        satuan: iku.satuan_default || '%',
        parentTitle: 'Sasaran Strategis Universitas Diponegoro',
        isDirectSync: false,
        indikatorKinerja: `Pencapaian target ${iku.nama_iku} sebesar ${iku.target_default || '100'} ${iku.satuan_default || '%'} diproses 100%`,
        jenisKinerja: 'utama' as const,
        assignedByUser: null,
        capaian_realisasi: 0,
        capaian_approved: 0,
      }))
    }

    // 2. Roles lainnya: Berdasarkan hierarki tugas cascading yang telah disepakati (status = 'agreed')
    return incomingTasks
      .filter((t: any) => t.status === 'agreed')
      .map((t: any) => {
        let title = ''
        let parentTitle = ''
        let indikatorKinerja = ''

        if (role === 'pimpinan_sukpa') {
          const ikuName = t.iku?.nama_iku || 'IKU SUKPA'
          title = `Pencapaian IKU [${t.iku?.kode_iku || ''}] ${ikuName}`
          parentTitle = 'Sasaran Strategis Rektor Universitas Diponegoro'
          indikatorKinerja = `Tercapainya target ${ikuName} sebesar ${t.target} ${t.satuan} diproses 100%`
        } else if (role === 'pimpinan_unit') {
          const ikuName = t.parent_sukpa?.iku?.nama_iku || 'IKU Unit'
          title = `Pencapaian IKU [${t.parent_sukpa?.iku?.kode_iku || ''}] ${ikuName} pada Unit Kerja`
          parentTitle = t.parent_sukpa?.iku?.nama_iku || 'Sasaran Strategis Pimpinan SUKPA'
          indikatorKinerja = `Tercapainya target IKU sebesar ${t.target} ${t.satuan} pada unit kerja diproses 100%`
        } else if (role === 'wakil_pimpinan_unit' || role === 'manajer') {
          title = t.nama_output || 'Output Kinerja Manajer'
          parentTitle = t.parent_unit?.parent_sukpa?.iku?.nama_iku || 'IKU Pimpinan Unit'
          indikatorKinerja = `Terprosesnya ${title} sebanyak ${t.target} ${t.satuan} diproses 100%`
        } else if (role === 'supervisor') {
          title = t.nama_uraian || 'Uraian Tugas Supervisor'
          parentTitle = t.parent_output?.nama_output || 'Output Manajer'
          indikatorKinerja = `Terlaksananya ${title} sebanyak ${t.target} ${t.satuan} diproses 100%`
        } else if (role === 'staff') {
          title = t.nama_sub_uraian || 'Sub-Uraian Tugas Staf'
          parentTitle = t.parent_uraian?.nama_uraian || 'Uraian Tugas Supervisor'
          indikatorKinerja = `Terprosesnya ${title} sebanyak ${t.target} ${t.satuan} diproses 100%`
        } else {
          title = t.nama_sub_uraian || t.nama_uraian || t.nama_output || t.parent_sukpa?.iku?.nama_iku || t.iku?.nama_iku || 'Rencana Kinerja'
          indikatorKinerja = `Terprosesnya ${title} sebanyak ${t.target} ${t.satuan} diproses 100%`
        }

        return {
          id: t.id,
          title,
          target: t.target,
          satuan: t.satuan,
          parentTitle,
          isDirectSync: t.is_direct_sync,
          indikatorKinerja,
          jenisKinerja: (t.jenis_kinerja || 'utama') as 'utama' | 'tambahan',
          assignedByUser: t.assigned_by_user || null,
          capaian_realisasi: t.capaian_realisasi || 0,
          capaian_approved: t.capaian_approved || 0,
        }
      })
  }, [incomingTasks, role, groupedIkuList])

  // Open Modal Splitter for Parent Item
  const openSplitterForParent = async (parent: any, type: 'iku_sukpa' | 'iku_unit' | 'output' | 'uraian' | 'sub_uraian') => {
    const supabase = createClient()
    const targetRole = subordinateRoleTarget || 'staff'
    const targetRoleLabel = ROLE_LABELS[targetRole] || 'Bawahan'
    const targetUnitEs2 = user?.led_unit_es2 || user?.pegawai?.unit_es2

    let subsList: User[] = []
    try {
      let query = supabase
        .from('users')
        .select('*, pegawai(*)')
        .ilike('role', `%${targetRole}%`)
        .order('email', { ascending: true })

      if (targetUnitEs2) {
        query = query.eq('pegawai.unit_es2', targetUnitEs2)
      }

      const { data } = await query
      subsList = (data as User[]) || []
    } catch (e) {
      console.warn('Gagal memuat bawahan unit:', e)
    }

    if (type === 'iku_sukpa') {
      const isRatio = parent.satuan_default === 'Rasio' || parent.target_default.includes(':')
      setSplitterConfig({
        levelTitle: 'Rektor ke Pimpinan SUKPA',
        parentName: `[IKU ${parent.kode_iku}] ${parent.nama_iku}`,
        parentSubtitle: isRatio ? 'Target berupa perbandingan/rasio kinerja standar universitas.' : 'Target kumulatif 100% dialokasikan kepada seluruh Pimpinan SUKPA pelaksana.',
        parentTarget: parent.target_default,
        satuan: parent.satuan_default,
        requiresTaskName: false,
        allowEditParentTarget: true,
        targetRoleLabel: 'Pimpinan SUKPA',
        subordinatesList: subordinates.length > 0 ? subordinates : subsList,
        parentRecord: parent,
      })
    } else if (type === 'iku_unit') {
      const kodeIku = parent.iku?.kode_iku || parent.parent_sukpa?.iku?.kode_iku || ''
      const namaIku = parent.iku?.nama_iku || parent.parent_sukpa?.iku?.nama_iku || 'IKU SUKPA'
      setSplitterConfig({
        levelTitle: 'Pimpinan SUKPA ke Pimpinan Unit',
        parentName: `[IKU ${kodeIku}] ${namaIku}`,
        parentTarget: parent.target,
        satuan: parent.satuan || '%',
        requiresTaskName: false,
        allowEditParentTarget: false,
        targetRoleLabel,
        subordinatesList: subsList,
        parentRecord: parent,
      })
    } else if (type === 'output') {
      const kodeIku = parent.parent_sukpa?.iku?.kode_iku
      const namaIku = parent.parent_sukpa?.iku?.nama_iku || 'IKU Unit'
      const matchedGroup = groupedIkuList.find(g => g.kode_iku === kodeIku)
      const outputSuggestions = matchedGroup ? matchedGroup.outputs.map(o => o.nama_output) : []

      setSplitterConfig({
        levelTitle: 'Pimpinan Unit ke Manajer Bagian',
        parentName: `[IKU ${kodeIku || ''}] ${namaIku}`,
        parentTarget: parent.target,
        satuan: parent.satuan || 'Dokumen',
        requiresTaskName: true,
        taskNameLabel: 'Nama Output IKU',
        taskNamePlaceholder: 'Pilih atau ketik Output IKU...',
        taskNameSuggestions: outputSuggestions,
        allowEditParentTarget: false,
        targetRoleLabel,
        subordinatesList: subsList,
        parentRecord: parent,
      })
    } else if (type === 'uraian') {
      const parentIkuName = parent.parent_unit?.parent_sukpa?.iku?.nama_iku
      setSplitterConfig({
        levelTitle: 'Manajer ke Supervisor (SPV)',
        parentName: `[Output IKU] ${parent.nama_output}`,
        parentSubtitle: parentIkuName ? `Berasal dari IKU: ${parentIkuName}` : undefined,
        parentTarget: parent.target,
        satuan: parent.satuan || 'Dokumen',
        requiresTaskName: true,
        taskNameLabel: 'Nama Uraian Tugas SPV',
        taskNamePlaceholder: 'Contoh: Pengelolaan dan verifikasi berkas...',
        taskNameSuggestions: [
          'Pengelolaan dan verifikasi berkas usulan',
          'Penyusunan laporan evaluasi dan monitoring kinerja',
          'Koordinasi pelaksanaan kegiatan dan sosialisasi program',
          'Pelayanan administrasi dan fasilitasi persuratan',
          'Penginputan dan validasi data dukung capaian'
        ],
        allowEditParentTarget: false,
        targetRoleLabel,
        filterUnitEs2: targetUnitEs2,
        subordinatesList: subsList,
        parentRecord: parent,
      })
    } else if (type === 'sub_uraian') {
      setSplitterConfig({
        levelTitle: 'Supervisor (SPV) ke Staf Pelaksana',
        parentName: `[Uraian Tugas] ${parent.nama_uraian}`,
        parentSubtitle: targetUnitEs2 ? `Unit Eselon II: ${targetUnitEs2} • Menampilkan Staf di Unit Ini` : undefined,
        parentTarget: parent.target,
        satuan: parent.satuan || 'Berkas',
        requiresTaskName: true,
        taskNameLabel: 'Nama Sub-Uraian Tugas Staff',
        taskNamePlaceholder: 'Contoh: Verifikasi berkas kelengkapan usulan...',
        taskNameSuggestions: [
          'Verifikasi kelengkapan berkas usulan',
          'Pencatatan dan pengarsipan surat masuk/keluar',
          'Penginputan data dukung ke aplikasi sistem',
          'Penyusunan draft rekapitulasi data dan bahan laporan',
          'Pemberian layanan informasi dan fasilitasi teknis'
        ],
        allowEditParentTarget: false,
        targetRoleLabel,
        filterUnitEs2: targetUnitEs2,
        subordinatesList: subsList,
        parentRecord: parent,
      })
    }

    setIsSplitterOpen(true)
  }

  const openSplitterForOutput = async (
    parentUnitIku: any, 
    outputItem: { id?: string; kode_output?: string; nama_output: string; nama_kegiatan?: string }
  ) => {
    const supabase = createClient()
    const targetRole = 'manajer'
    const unitEs2 = user?.led_unit_es2 || user?.pegawai?.unit_es2

    let subsList: User[] = []
    try {
      let query = supabase
        .from('users')
        .select('*, pegawai(*)')
        .ilike('role', `%${targetRole}%`)
        .order('email', { ascending: true })

      if (unitEs2) {
        query = query.eq('pegawai.unit_es2', unitEs2)
      }

      const { data } = await query
      subsList = (data as User[]) || []
    } catch (e) {
      console.warn('Gagal memuat daftar manajer:', e)
    }

    const kodeIku = parentUnitIku.parent_sukpa?.iku?.kode_iku || parentUnitIku.iku?.kode_iku || ''
    const namaIku = parentUnitIku.parent_sukpa?.iku?.nama_iku || parentUnitIku.iku?.nama_iku || 'IKU'

    const existing = outputAssignments.filter(o => 
      o.parent_unit_id === parentUnitIku.id && 
      (o.nama_output === outputItem.nama_output || o.kode_output === outputItem.kode_output)
    )

    const defaultTarget = existing[0]?.target || '1'
    const defaultSatuan = existing[0]?.satuan || 'Dokumen'

    setSplitterConfig({
      levelTitle: 'Pimpinan Unit ke Manajer Bagian',
      parentName: `[Output ${outputItem.kode_output || ''}] ${outputItem.nama_output}`,
      parentSubtitle: `Induk: [IKU ${kodeIku}] ${namaIku} (Target IKU Unit: ${parentUnitIku.target} ${parentUnitIku.satuan})`,
      parentTarget: defaultTarget,
      satuan: defaultSatuan,
      requiresTaskName: false,
      allowEditParentTarget: true,
      targetRoleLabel: 'Manajer Bagian',
      filterUnitEs2: unitEs2,
      subordinatesList: subsList,
      parentRecord: parentUnitIku,
      selectedOutput: outputItem,
    })

    setIsSplitterOpen(true)
  }

  const handleSaveAllocation = async (
    allocations: AllocationRow[], 
    isDirectSync: boolean,
    updatedParent?: { target: string | number; satuan: string }
  ) => {
    if (!splitterConfig || !periode || !user) return
    const supabase = createClient()
    const { parentRecord } = splitterConfig
    const effectiveSatuan = updatedParent?.satuan || splitterConfig.satuan

    try {
      if (role === 'rektor') {
        if (updatedParent) {
          try {
            await supabase
              .from('master_iku')
              .update({
                target_default: String(updatedParent.target),
                satuan_default: updatedParent.satuan,
              })
              .eq('kode_iku', parentRecord.kode_iku)
          } catch (mErr) {
            console.warn('Gagal update default master_iku:', mErr)
          }
        }

        const records = allocations.map(a => ({
          periode_id: periode.id,
          iku_id: parentRecord.id,
          assigned_by: user.id,
          sukpa_user_id: a.userId,
          target: a.target,
          satuan: effectiveSatuan,
          is_direct_sync: isDirectSync,
          status: 'assigned' as CascadingStatus,
        }))
        const { error } = await supabase.from('cascading_iku_sukpa').insert(records)
        if (error) throw error
      } else if (role === 'pimpinan_sukpa') {
        const records = allocations.map(a => ({
          parent_sukpa_id: parentRecord.id,
          periode_id: periode.id,
          assigned_by: user.id,
          unit_user_id: a.userId,
          target: a.target,
          satuan: effectiveSatuan,
          is_direct_sync: isDirectSync,
          status: 'assigned' as CascadingStatus,
        }))
        const { error } = await supabase.from('cascading_iku_unit').insert(records)
        if (error) throw error
      } else if (role === 'pimpinan_unit') {
        const outItem = splitterConfig.selectedOutput
        const records = allocations.map(a => ({
          parent_unit_id: parentRecord.id,
          periode_id: periode.id,
          assigned_by: user.id,
          manajer_user_id: a.userId,
          kode_output: outItem?.kode_output || null,
          nama_output: outItem?.nama_output || a.namaTugas || 'Output Kinerja',
          target: String(a.target),
          satuan: a.satuan || effectiveSatuan,
          is_direct_sync: isDirectSync,
          status: 'assigned' as CascadingStatus,
        }))
        const { error } = await supabase.from('cascading_output_manajer').insert(records)
        if (error) throw error
      } else if (role === 'manajer') {
        const records = allocations.map(a => ({
          parent_output_id: parentRecord.id,
          periode_id: periode.id,
          assigned_by: user.id,
          spv_user_id: a.userId,
          nama_uraian: a.namaTugas || 'Uraian Tugas',
          target: String(a.target),
          satuan: a.satuan || effectiveSatuan || 'Dokumen',
          status: 'assigned' as CascadingStatus,
        }))
        const { error } = await supabase.from('cascading_uraian_spv').insert(records)
        if (error) throw error
      } else if (role === 'supervisor') {
        const records = allocations.map(a => ({
          parent_uraian_id: parentRecord.id,
          periode_id: periode.id,
          assigned_by: user.id,
          staff_user_id: a.userId,
          nama_sub_uraian: a.namaTugas || 'Sub-Uraian Tugas',
          target: String(a.target),
          satuan: a.satuan || effectiveSatuan || 'Berkas',
          status: 'assigned' as CascadingStatus,
        }))
        const { error } = await supabase.from('cascading_sub_uraian_staff').insert(records)
        if (error) throw error
      }

      showToast('Penugasan berhasil disimpan dan dikirimkan ke bawahan!')
      fetchData()
    } catch (err: any) {
      console.error('Error saving allocation:', err)
      throw err
    }
  }

  const handleAgreeTask = async (taskId: string, tableName: string) => {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from(tableName)
        .update({
          status: 'agreed',
          agreed_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error
      showToast('Tugas disetujui! Telah resmi menjadi Rencana SKP Anda.')
      fetchData()
    } catch (err: any) {
      console.error('Error agreeing task:', err)
      showToast('Gagal menyetujui tugas.', 'error')
    }
  }

  const handleOpenSanggahan = (task: any, tableName: string) => {
    setSelectedTaskForSanggahan({
      id: task.id,
      title: task.nama_sub_uraian || task.nama_uraian || task.nama_output || task.parent_sukpa?.iku?.nama_iku || task.iku?.nama_iku || 'Tugas Cascading',
      target: task.target,
      satuan: task.satuan,
      assignedByName: task.assigned_by_user?.pegawai?.nama_lengkap || task.assigned_by_user?.email,
      tableName
    })
    setIsSanggahanOpen(true)
  }

  const handleSubmitSanggahan = async (catatan: string, targetUsulan?: string) => {
    if (!selectedTaskForSanggahan) return
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from(selectedTaskForSanggahan.tableName)
        .update({
          status: 'objected',
          catatan_sanggahan: catatan,
          target_usulan: targetUsulan || null
        })
        .eq('id', selectedTaskForSanggahan.id)

      if (error) throw error
      showToast('Sanggahan berhasil dikirimkan ke atasan.')
      fetchData()
    } catch (err: any) {
      console.error('Error submitting sanggahan:', err)
      throw err
    }
  }

  const handleAcceptSubordinateProposal = async (task: any) => {
    if (!task._table || !task.target_usulan) return
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from(task._table)
        .update({
          target: task.target_usulan,
          status: 'agreed',
          agreed_at: new Date().toISOString(),
          catatan_sanggahan: null
        })
        .eq('id', task.id)

      if (error) throw error
      showToast('Usulan bawahan disepakati! Target kinerja diperbarui.')
      fetchData()
    } catch (err: any) {
      console.error('Error accepting proposal:', err)
      showToast('Gagal menyepakati usulan bawahan.', 'error')
    }
  }

  const handleDeleteAssignment = async (task: any) => {
    let tableName = task._table
    if (!tableName) {
      if (task.sukpa_user_id) tableName = 'cascading_iku_sukpa'
      else if (task.unit_user_id) tableName = 'cascading_iku_unit'
      else if (task.manajer_user_id) tableName = 'cascading_output_manajer'
      else if (task.spv_user_id) tableName = 'cascading_uraian_spv'
      else if (task.staff_user_id) tableName = 'cascading_sub_uraian_staff'
    }

    if (!tableName || !task.id) {
      Swal.fire('Error', 'Informasi penugasan tidak valid.', 'error')
      return
    }

    const taskTitle = task.nama_sub_uraian || task.nama_uraian || task.nama_output || task.iku?.nama_iku || 'penugasan ini'

    const result = await Swal.fire({
      title: 'Batalkan Penugasan?',
      html: `Apakah Anda yakin ingin membatalkan dan menghapus penugasan <b>${taskTitle}</b>?<br/><span class="text-xs text-slate-500">Target yang telah dibagikan ke bawahan akan ditarik kembali.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#717786',
      confirmButtonText: 'Ya, Hapus Penugasan',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      Swal.fire({
        title: 'Menghapus...',
        text: 'Sedang membatalkan alokasi penugasan...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      const res = await fetch('/api/cascading/delete-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: tableName,
          id: task.id,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal membatalkan penugasan.')
      }

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil Dihapus',
        text: 'Alokasi penugasan berhasil dibatalkan dan dihapus.',
        timer: 1500,
        showConfirmButton: false,
      })

      await fetchData()
    } catch (err: any) {
      console.error('Error deleting assignment:', err)
      Swal.fire('Gagal', err.message || 'Gagal membatalkan penugasan.', 'error')
    }
  }

  const handleOpenPelaporanModal = (task: any, level: CascadingLevel) => {
    setSelectedTaskForPelaporan({
      id: task.id,
      title: task.nama_sub_uraian || task.nama_uraian || task.nama_output || task.parent_sukpa?.iku?.nama_iku || task.iku?.nama_iku || 'Tugas SKP',
      target: task.target,
      satuan: task.satuan,
      level,
      capaianSaatIni: task.capaian_approved || 0,
    })
    setIsPelaporanOpen(true)
  }

  const handleApproveLaporan = async (laporan: CascadingLaporanKerja) => {
    const supabase = createClient()
    try {
      const { error: repErr } = await supabase
        .from('cascading_laporan_kerja')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', laporan.id)

      if (repErr) throw repErr

      let tableName = ''
      if (laporan.level === 'staff') tableName = 'cascading_sub_uraian_staff'
      else if (laporan.level === 'spv') tableName = 'cascading_uraian_spv'
      else if (laporan.level === 'manajer') tableName = 'cascading_output_manajer'
      else if (laporan.level === 'unit') tableName = 'cascading_iku_unit'
      else if (laporan.level === 'sukpa') tableName = 'cascading_iku_sukpa'

      if (tableName) {
        const { data: current } = await supabase.from(tableName).select('capaian_approved, is_direct_sync, target').eq('id', laporan.ref_id).single()
        const newApproved = (Number(current?.capaian_approved) || 0) + Number(laporan.capaian)
        await supabase.from(tableName).update({ capaian_approved: newApproved }).eq('id', laporan.ref_id)
      }

      showToast('Laporan capaian berhasil disetujui & terakumulasi ke sistem!')
      fetchData()
    } catch (err: any) {
      console.error('Error approving laporan:', err)
      showToast('Gagal menyetujui laporan.', 'error')
    }
  }

  const handleRejectLaporan = async (laporanId: string, note: string) => {
    if (!note.trim()) {
      showToast('Catatan perbaikan wajib diisi.', 'error')
      return
    }
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('cascading_laporan_kerja')
        .update({
          status: 'revision',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          catatan_reviewer: note.trim()
        })
        .eq('id', laporanId)

      if (error) throw error
      showToast('Permintaan revisi berhasil dikirim ke pegawai.')
      fetchData()
    } catch (err: any) {
      console.error('Error rejecting laporan:', err)
      showToast('Gagal memproses revisi laporan.', 'error')
    }
  }

  return (
    <CascadingContext.Provider
      value={{
        user,
        role,
        periode,
        isLoading,
        masterIkuList,
        subordinates,
        sukpaAssignments,
        unitAssignments,
        outputAssignments,
        uraianAssignments,
        subUraianAssignments,
        laporanList,
        groupedIkuList,
        incomingTasks,
        myAssignedTasks,
        subordinateReports,
        myReports,
        agreedTasksForSKP,
        isViewOnly,
        subordinateRoleTarget,
        currentCascadingLevel,
        fetchData,
        showToast,
        openSplitterForParent,
        openSplitterForOutput,
        handleAgreeTask,
        handleOpenSanggahan,
        handleAcceptSubordinateProposal,
        handleDeleteAssignment,
        handleOpenPelaporanModal,
        handleApproveLaporan,
        handleRejectLaporan,
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-slide-up ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {children}

      {/* Target Splitter Modal */}
      {splitterConfig && (
        <TargetSplitterModal
          isOpen={isSplitterOpen}
          onClose={() => {
            setIsSplitterOpen(false)
            setSplitterConfig(null)
          }}
          levelTitle={splitterConfig.levelTitle}
          parentName={splitterConfig.parentName}
          parentSubtitle={splitterConfig.parentSubtitle}
          parentTarget={splitterConfig.parentTarget}
          satuan={splitterConfig.satuan}
          requiresTaskName={splitterConfig.requiresTaskName}
          taskNameLabel={splitterConfig.taskNameLabel}
          taskNamePlaceholder={splitterConfig.taskNamePlaceholder}
          taskNameSuggestions={splitterConfig.taskNameSuggestions}
          targetRoleLabel={splitterConfig.targetRoleLabel}
          filterUnitEs2={splitterConfig.filterUnitEs2}
          allowEditParentTarget={splitterConfig.allowEditParentTarget}
          subordinates={splitterConfig.subordinatesList || subordinates}
          onSave={handleSaveAllocation}
        />
      )}

      {/* Sanggahan Modal */}
      {selectedTaskForSanggahan && (
        <SanggahanModal
          isOpen={isSanggahanOpen}
          onClose={() => {
            setIsSanggahanOpen(false)
            setSelectedTaskForSanggahan(null)
          }}
          taskTitle={selectedTaskForSanggahan.title}
          currentTarget={selectedTaskForSanggahan.target}
          currentSatuan={selectedTaskForSanggahan.satuan}
          assignedByName={selectedTaskForSanggahan.assignedByName}
          onSubmit={handleSubmitSanggahan}
        />
      )}

      {/* Pelaporan Capaian Modal */}
      {selectedTaskForPelaporan && user && (
        <PelaporanCapaianModal
          isOpen={isPelaporanOpen}
          onClose={() => {
            setIsPelaporanOpen(false)
            setSelectedTaskForPelaporan(null)
          }}
          task={selectedTaskForPelaporan}
          onSuccess={() => {
            fetchData()
          }}
        />
      )}
    </CascadingContext.Provider>
  )
}

export function useCascading() {
  const context = useContext(CascadingContext)
  if (!context) {
    throw new Error('useCascading must be used within a CascadingProvider')
  }
  return context
}
