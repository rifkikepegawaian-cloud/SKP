'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { 
  UserRole, 
  ROLE_LABELS,
  MasterPeriodeSKP,
  MasterIKU,
  CascadingIKUSukpa,
  CascadingIKUUnit,
  CascadingOutputManajer,
  CascadingUraianSPV,
  CascadingSubUraianStaff,
  CascadingLaporanKerja,
  CascadingLevel,
  CascadingStatus,
  User
} from '@/lib/types'
import TargetSplitterModal, { AllocationRow } from '@/components/cascading/TargetSplitterModal'
import SanggahanModal from '@/components/cascading/SanggahanModal'
import PelaporanCapaianModal from '@/components/cascading/PelaporanCapaianModal'
import DokumenSKPModal from '@/components/cascading/DokumenSKPModal'

export default function CascadingSKPPage() {
  const { user, activeRole } = useAuthStore()
  const actualRole: UserRole = activeRole || (user?.role?.split(',')[0] as UserRole) || 'staff'
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null)
  const role: UserRole = simulatedRole || actualRole

  // State
  const [periode, setPeriode] = useState<MasterPeriodeSKP | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  // Tabs: 'assignment' | 'inbox' | 'laporan' | 'matrix'
  const [activeTab, setActiveTab] = useState<'assignment' | 'inbox' | 'laporan' | 'matrix'>('assignment')

  // Data states
  const [masterIkuList, setMasterIkuList] = useState<MasterIKU[]>([])
  const [subordinates, setSubordinates] = useState<User[]>([])
  
  // Cascading tables
  const [sukpaAssignments, setSukpaAssignments] = useState<CascadingIKUSukpa[]>([])
  const [unitAssignments, setUnitAssignments] = useState<CascadingIKUUnit[]>([])
  const [outputAssignments, setOutputAssignments] = useState<CascadingOutputManajer[]>([])
  const [uraianAssignments, setUraianAssignments] = useState<CascadingUraianSPV[]>([])
  const [subUraianAssignments, setSubUraianAssignments] = useState<CascadingSubUraianStaff[]>([])
  const [laporanList, setLaporanList] = useState<CascadingLaporanKerja[]>([])

  // Modal Splitter States
  const [isSplitterOpen, setIsSplitterOpen] = useState(false)
  const [splitterConfig, setSplitterConfig] = useState<{
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
  } | null>(null)

  // Grouped 32 IKU by unique kode_iku (so duplicate rows with same kode_iku appear only once)
  const groupedIkuList = useMemo(() => {
    const map = new Map<string, {
      id: string
      kode_iku: string
      nama_iku: string
      target_default: string
      satuan_default: string
      all_ids: string[]
      outputs: Array<{ id: string; kode_output: string; nama_output: string; kode_kegiatan: string; nama_kegiatan: string }>
    }>()

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

  // Modal Dokumen SKP State
  const [isDokumenSKPOpen, setIsDokumenSKPOpen] = useState(false)

  // Rejection note prompt
  const [rejectPromptId, setRejectPromptId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  // Search in Matrix
  const [searchQuery, setSearchQuery] = useState('')

  // Show Toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Determine Subordinate Roles to load for assignment
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

  // Current level for reporting
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

  // Is View Only mode (Wakil Pimpinan Unit)
  const isViewOnly = role === 'wakil_pimpinan_unit'

  // Fetch Core Data
  const fetchData = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      // 1. Fetch Active Periode
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

      // 2. Fetch Master 32 IKU
      const { data: ikuData } = await supabase
        .from('master_iku')
        .select('*')
        .order('kode_iku', { ascending: true })

      if (ikuData) setMasterIkuList(ikuData as MasterIKU[])

      // 3. Fetch Subordinates for assignment dropdown based on role
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

      // 4. Fetch Cascading Levels
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
        supabase.from('cascading_uraian_spv').select('*, parent_output:cascading_output_manajer(*, manajer_user:users!manajer_user_id(*, pegawai(*)), parent_unit:cascading_iku_unit(*, unit_user:users!unit_user_id(*, pegawai(*)))), assigned_by_user:users!assigned_by(*, pegawai(*)), spv_user:users!spv_user_id(*, pegawai(*))'),
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

  // Automatically adjust default active tab based on role
  useEffect(() => {
    if (role === 'staff' || isViewOnly) {
      setActiveTab(role === 'staff' ? 'inbox' : 'matrix')
    } else if (role !== 'rektor') {
      setActiveTab('inbox')
    } else {
      setActiveTab('assignment')
    }
  }, [role, isViewOnly])

  // ────────────────────────────────────────────────────────────
  // HANDLERS: PENUGASAN (TOP-DOWN)
  // ────────────────────────────────────────────────────────────
  const openSplitterForParent = async (parent: any, type: 'iku_sukpa' | 'iku_unit' | 'output' | 'uraian' | 'sub_uraian') => {
    if (!periode) {
      showToast('Periode SKP aktif belum disetting.', 'error')
      return
    }

    const supabase = createClient()
    let targetRole = ''
    let targetRoleLabel = 'Pejabat / Pegawai Bawahan'

    if (type === 'iku_sukpa') {
      targetRole = 'pimpinan_sukpa'
      targetRoleLabel = 'Pimpinan SUKPA'
    } else if (type === 'iku_unit') {
      targetRole = 'pimpinan_unit'
      targetRoleLabel = 'Pimpinan Unit'
    } else if (type === 'output') {
      targetRole = 'manajer'
      targetRoleLabel = 'Manajer Bagian'
    } else if (type === 'uraian') {
      targetRole = 'supervisor'
      targetRoleLabel = 'Supervisor (SPV)'
    } else if (type === 'sub_uraian') {
      targetRole = 'staff'
      targetRoleLabel = 'Staf Pelaksana'
    }

    // ────────────────────────────────────────────────────────────
    // FILTERING SESUAI STRUKTUR ORGANISASI & UNIT ESELON II
    // ────────────────────────────────────────────────────────────
    let targetUnitEs2: string | undefined = undefined

    if (type === 'sub_uraian') {
      // SPV ke Staf Pelaksana: Wajib difilter hanya staf di Unit Eselon II (unit_es2) SPV terkait
      targetUnitEs2 = 
        parent.spv_user?.pegawai?.unit_es2 || 
        parent.spv_user?.led_unit_es2 ||
        user?.pegawai?.unit_es2 || 
        user?.led_unit_es2 ||
        parent.assigned_by_user?.pegawai?.unit_es2 ||
        parent.parent_output?.manajer_user?.pegawai?.unit_es2 ||
        parent.parent_output?.parent_unit?.unit_user?.pegawai?.unit_es2
    } else if (type === 'uraian') {
      // Manajer ke Supervisor: Difilter supervisor di Unit Eselon II Manajer terkait
      targetUnitEs2 = 
        user?.pegawai?.unit_es2 || 
        user?.led_unit_es2 || 
        parent.manajer_user?.pegawai?.unit_es2 || 
        parent.manajer_user?.led_unit_es2 ||
        parent.parent_unit?.unit_user?.pegawai?.unit_es2
    }

    // Ambil data bawahan:
    // Jika ada targetUnitEs2, filter langsung di query database agar seluruh staf/SPV di unit tersebut terambil 100% tanpa batas 1000
    let subsList: User[] = []
    if (targetUnitEs2) {
      const { data: unitData } = await supabase
        .from('users')
        .select('*, pegawai!inner(*)')
        .ilike('role', `%${targetRole}%`)
        .eq('pegawai.unit_es2', targetUnitEs2)
        .order('email', { ascending: true })

      if (unitData && unitData.length > 0) {
        subsList = unitData as User[]
      }
    }

    // Jika tanpa unit khusus atau unitData kosong, ambil seluruh data dengan multi-batch agar tidak terpotong 1.000 limit PostgREST
    if (subsList.length === 0) {
      const [b1, b2, b3, b4] = await Promise.all([
        supabase.from('users').select('*, pegawai(*)').ilike('role', `%${targetRole}%`).range(0, 999),
        supabase.from('users').select('*, pegawai(*)').ilike('role', `%${targetRole}%`).range(1000, 1999),
        supabase.from('users').select('*, pegawai(*)').ilike('role', `%${targetRole}%`).range(2000, 2999),
        supabase.from('users').select('*, pegawai(*)').ilike('role', `%${targetRole}%`).range(3000, 3999),
      ])
      const allUsers = [...(b1.data || []), ...(b2.data || []), ...(b3.data || []), ...(b4.data || [])] as User[]
      subsList = allUsers
    }

    if (type === 'iku_sukpa') {
      const isFSR = parent.kode_iku === '18' || parent.nama_iku?.toLowerCase().includes('faculty student ratio')
      const targetVal = parent.target_default || (isFSR ? '1:50' : '100')
      const satuanVal = parent.satuan_default || (isFSR ? 'Rasio' : '%')

      setSplitterConfig({
        levelTitle: 'Rektor ke Pimpinan SUKPA',
        parentName: `[IKU ${parent.kode_iku}] ${parent.nama_iku}`,
        parentTarget: targetVal,
        satuan: satuanVal,
        requiresTaskName: false,
        allowEditParentTarget: true,
        targetRoleLabel,
        subordinatesList: subsList,
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

  // Khusus Pimpinan Unit: Membuka modal penugasan untuk Output IKU tertentu ke Manajer Bagian
  const openSplitterForOutput = async (
    parentUnitIku: any, 
    outputItem: { id?: string; kode_output?: string; nama_output: string; nama_kegiatan?: string }
  ) => {
    if (!periode) {
      showToast('Periode SKP aktif belum disetting.', 'error')
      return
    }

    const supabase = createClient()
    const { data: subData } = await supabase
      .from('users')
      .select('*, pegawai(*)')
      .ilike('role', '%manajer%')
      .order('email', { ascending: true })

    let subsList = (subData as User[]) || []
    const unitEs2 = user?.led_unit_es2 || user?.pegawai?.unit_es2 || parentUnitIku.unit_user?.pegawai?.unit_es2 || parentUnitIku.unit_user?.led_unit_es2

    if (unitEs2) {
      const matched = subsList.filter(s => {
        const sUnit = s.pegawai?.unit_es2 || s.led_unit_es2
        return sUnit && sUnit.toLowerCase().trim() === unitEs2.toLowerCase().trim()
      })
      if (matched.length > 0) {
        subsList = matched
      }
    }
    const kodeIku = parentUnitIku.iku?.kode_iku || parentUnitIku.parent_sukpa?.iku?.kode_iku || ''
    const namaIku = parentUnitIku.iku?.nama_iku || parentUnitIku.parent_sukpa?.iku?.nama_iku || 'IKU'

    // Cari alokasi sebelumnya jika ada
    const isSim = Boolean(simulatedRole)
    const existing = outputAssignments.filter(o => 
      (o.parent_unit_id === parentUnitIku.id || isSim) && 
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
        // Jika Rektor menyesuaikan target induk / satuan, update default master_iku juga
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
        const outputItem = splitterConfig.selectedOutput
        const outputName = outputItem?.nama_output || splitterConfig.parentName.replace(/^\[Output [^\]]*\]\s*/, '')
        const records = allocations.map(a => ({
          parent_unit_id: parentRecord.id,
          periode_id: periode.id,
          assigned_by: user.id,
          manajer_user_id: a.userId,
          nama_output: a.namaTugas || outputName,
          kode_output: outputItem?.kode_output || null,
          target: a.target,
          satuan: effectiveSatuan,
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
          satuan: a.satuan || effectiveSatuan || 'Laporan',
          is_direct_sync: isDirectSync,
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

  // ────────────────────────────────────────────────────────────
  // HANDLERS: DIALOG KINERJA (REVIEW & SANGGAHAN BAWAHAN)
  // ────────────────────────────────────────────────────────────
  const handleAgreeTask = async (tableName: string, taskId: string) => {
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
    if (!task._table) return
    if (!confirm('Apakah Anda yakin ingin membatalkan/menghapus alokasi penugasan ini?')) return
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from(task._table)
        .delete()
        .eq('id', task.id)

      if (error) throw error
      showToast('Penugasan berhasil dibatalkan.')
      fetchData()
    } catch (err: any) {
      console.error('Error deleting assignment:', err)
      showToast('Gagal membatalkan penugasan.', 'error')
    }
  }

  // ────────────────────────────────────────────────────────────
  // HANDLERS: PELAPORAN & VERIFIKASI CAPAIAN
  // ────────────────────────────────────────────────────────────
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
      // 1. Update report status
      const { error: repErr } = await supabase
        .from('cascading_laporan_kerja')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', laporan.id)

      if (repErr) throw repErr

      // 2. Accumulate approved capaian on target table
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

  const handleRejectLaporan = async (laporanId: string) => {
    if (!rejectNote.trim()) {
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
          catatan_reviewer: rejectNote.trim()
        })
        .eq('id', laporanId)

      if (error) throw error
      showToast('Permintaan revisi berhasil dikirim ke pegawai.')
      setRejectPromptId(null)
      setRejectNote('')
      fetchData()
    } catch (err: any) {
      console.error('Error rejecting laporan:', err)
      showToast('Gagal memproses revisi laporan.', 'error')
    }
  }

  // Incoming tasks for current user
  const incomingTasks = useMemo(() => {
    if (!user) return []
    const uid = user.id
    const isSim = Boolean(simulatedRole)

    if (role === 'pimpinan_sukpa') {
      return sukpaAssignments
        .filter(a => isSim ? true : a.sukpa_user_id === uid)
        .map(a => ({ ...a, _table: 'cascading_iku_sukpa', _level: 'sukpa' as CascadingLevel }))
    } else if (role === 'pimpinan_unit') {
      return unitAssignments
        .filter(a => isSim ? true : a.unit_user_id === uid)
        .map(a => ({ ...a, _table: 'cascading_iku_unit', _level: 'unit' as CascadingLevel }))
    } else if (role === 'wakil_pimpinan_unit') {
      // Tinjau Output IKU pada Unit & Bagian yang dibidangi
      const targetUnit = user.led_unit_es2 || user.pegawai?.unit_es2
      const targetBagian = user.led_unit_es3 || user.pegawai?.unit_es3
      return outputAssignments.filter(a => {
        if (isSim) return true
        if (!targetUnit && !targetBagian) return true
        const mUnit = a.manajer_user?.pegawai?.unit_es2 || a.manajer_user?.led_unit_es2
        const mBagian = a.manajer_user?.pegawai?.unit_es3 || a.manajer_user?.led_unit_es3
        if (targetUnit && mUnit && mUnit !== targetUnit) return false
        if (targetBagian && mBagian && mBagian !== targetBagian) return false
        return true
      }).map(a => ({ ...a, _table: 'cascading_output_manajer', _level: 'manajer' as CascadingLevel }))
    } else if (role === 'manajer') {
      return outputAssignments
        .filter(a => isSim ? true : a.manajer_user_id === uid)
        .map(a => ({ ...a, _table: 'cascading_output_manajer', _level: 'manajer' as CascadingLevel }))
    } else if (role === 'supervisor') {
      return uraianAssignments
        .filter(a => isSim ? true : a.spv_user_id === uid)
        .map(a => ({ ...a, _table: 'cascading_uraian_spv', _level: 'spv' as CascadingLevel }))
    } else if (role === 'staff') {
      return subUraianAssignments
        .filter(a => isSim ? true : a.staff_user_id === uid)
        .map(a => ({ ...a, _table: 'cascading_sub_uraian_staff', _level: 'staff' as CascadingLevel }))
    }
    return []
  }, [user, role, simulatedRole, sukpaAssignments, unitAssignments, outputAssignments, uraianAssignments, subUraianAssignments])

  // Assigned tasks created by current user
  const myAssignedTasks = useMemo(() => {
    if (!user) return []
    const uid = user.id
    const isSim = Boolean(simulatedRole)

    if (role === 'rektor') {
      return sukpaAssignments.map(a => ({ ...a, _table: 'cascading_iku_sukpa' }))
    } else if (role === 'pimpinan_sukpa') {
      return unitAssignments.filter(a => isSim ? true : a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_iku_unit' }))
    } else if (role === 'pimpinan_unit') {
      return outputAssignments.filter(a => isSim ? true : a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_output_manajer' }))
    } else if (role === 'manajer') {
      return uraianAssignments.filter(a => isSim ? true : a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_uraian_spv' }))
    } else if (role === 'supervisor') {
      return subUraianAssignments.filter(a => isSim ? true : a.assigned_by === uid).map(a => ({ ...a, _table: 'cascading_sub_uraian_staff' }))
    }
    return []
  }, [user, role, simulatedRole, sukpaAssignments, unitAssignments, outputAssignments, uraianAssignments, subUraianAssignments])

  // Subordinate reports waiting for verification
  const subordinateReports = useMemo(() => {
    if (!user) return []
    const subordinateTaskIds = new Set(myAssignedTasks.map((t: any) => t.id))
    return laporanList.filter(l => subordinateTaskIds.has(l.ref_id))
  }, [myAssignedTasks, laporanList, user])

  // User's own submitted reports
  const myReports = useMemo(() => {
    if (!user) return []
    return laporanList.filter(l => l.user_id === user.id)
  }, [laporanList, user])

  // Ready tasks for printable SKP Document (tasks agreed by user)
  const agreedTasksForSKP = useMemo(() => {
    return incomingTasks.filter((t: any) => t.status === 'agreed').map((t: any) => ({
      id: t.id,
      title: t.nama_sub_uraian || t.nama_uraian || t.nama_output || t.parent_sukpa?.iku?.nama_iku || t.iku?.nama_iku || 'Rencana Kinerja',
      target: t.target,
      satuan: t.satuan,
      parentTitle: t.parent_uraian?.nama_uraian || t.parent_output?.nama_output || t.parent_unit?.nama_output || t.parent_sukpa?.iku?.nama_iku,
      isDirectSync: t.is_direct_sync,
    }))
  }, [incomingTasks])

  const assignedBySuperior = (incomingTasks[0] as any)?.assigned_by_user as User || null

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-white text-xs font-semibold animate-slide-up ${
          toast.type === 'success' ? 'bg-success' : 'bg-error'
        }`}>
          <span className="material-symbols-outlined text-sm">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-primary via-primary-dark to-slate-900 text-white shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 backdrop-blur-md text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">account_tree</span>
                Cascading Performance Management
              </span>
              {periode && (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {periode.nama_periode} ({periode.tahun})
                </span>
              )}
            </div>
            <h1 className="font-headline-lg text-2xl md:text-3xl font-extrabold tracking-tight">
              Cascading, Dialog Kinerja & Pelaporan SKP
            </h1>
            <p className="font-body-md text-white/80 max-w-2xl text-xs md:text-sm leading-relaxed">
              Penetapan target kinerja berjenjang dari Rektor (32 IKU) hingga pelaksana staf. 
              Laporan capaian dan bukti evidence langsung terintegrasi dengan tugas yang disepakati.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white">
                <span className="material-symbols-outlined text-lg">badge</span>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-white/60 uppercase font-semibold">Peran Aktif Anda</p>
                <p className="text-xs font-bold text-white">{ROLE_LABELS[role] || role}</p>
              </div>
            </div>
            {isViewOnly && (
              <div className="flex flex-col items-start md:items-end gap-1">
                <span className="px-3 py-1 rounded-xl bg-amber-400/20 text-amber-200 text-[10px] font-bold border border-amber-400/30 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">visibility</span>
                  Akses View Only (Tinjauan Output IKU)
                </span>
                <span className="text-[11px] text-white/90 font-medium bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                  Unit: <b>{user?.led_unit_es2 || user?.pegawai?.unit_es2 || 'Semua Unit'}</b>
                  {(user?.led_unit_es3 || user?.pegawai?.unit_es3) && (
                    <> • Bagian: <b>{user?.led_unit_es3 || user?.pegawai?.unit_es3}</b></>
                  )}
                </span>
              </div>
            )}
            {agreedTasksForSKP.length > 0 && (
              <button
                onClick={() => setIsDokumenSKPOpen(true)}
                className="px-4 py-2 rounded-xl bg-white text-primary text-xs font-bold hover:bg-white/90 shadow-lg flex items-center gap-1.5 transition-all mt-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">description</span>
                Dokumen Rencana SKP Resmi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Role Switcher Toolbar (Simulasi Berbagai Peran Secara Instan) */}
      <div className="p-4 rounded-3xl bg-white border border-outline-variant/30 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-on-surface-variant font-medium">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-sm">swap_horiz</span>
          </div>
          <span>
            <b>Simulasi Sudut Pandang Peran:</b> Coba alur penugasan, sanggahan, dan verifikasi dari level:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['rektor', 'pimpinan_sukpa', 'pimpinan_unit', 'wakil_pimpinan_unit', 'manajer', 'supervisor', 'staff'] as UserRole[]).map(r => (
            <button
              key={r}
              onClick={() => setSimulatedRole(r === actualRole ? null : r)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                role === r
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {ROLE_LABELS[r]}
              {r === actualRole && ' (Asli)'}
            </button>
          ))}
          {simulatedRole && (
            <button
              onClick={() => setSimulatedRole(null)}
              className="px-2.5 py-1.5 rounded-xl text-error hover:bg-error/10 font-bold transition-colors"
            >
              Kembali ke Peran Asli
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-2 flex-wrap">
        {!isViewOnly && role !== 'staff' && (
          <button
            onClick={() => setActiveTab('assignment')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'assignment'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-sm">send_and_archive</span>
            Penugasan ke Bawahan (Top-Down)
            {myAssignedTasks.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">
                {myAssignedTasks.length}
              </span>
            )}
          </button>
        )}

        {role !== 'rektor' && (
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'inbox'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{isViewOnly ? 'preview' : 'inbox'}</span>
            {isViewOnly ? 'Tinjauan Output IKU Bagian' : 'Tugas Masuk & Dialog Kinerja'}
            {isViewOnly ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500 text-white font-bold">
                {incomingTasks.length} Output
              </span>
            ) : incomingTasks.filter(t => t.status === 'assigned').length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-black animate-pulse">
                {incomingTasks.filter(t => t.status === 'assigned').length} Baru
              </span>
            )}
          </button>
        )}

        {!isViewOnly && (
          <button
            onClick={() => setActiveTab('laporan')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'laporan'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-sm">verified</span>
            Pelaporan & Verifikasi Capaian
            {subordinateReports.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
                {subordinateReports.filter(r => r.status === 'pending').length} Butuh Verifikasi
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'matrix'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-sm">hub</span>
          Matriks & Pohon Cascading
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 1: PENUGASAN KE BAWAHAN (TOP-DOWN)                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'assignment' && !isViewOnly && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">
                  Alokasi Target ke Pejabat / Pegawai Bawahan
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  {role === 'rektor' && 'Pilih dari 32 Master IKU universitas untuk dialokasikan kepada para Pimpinan SUKPA.'}
                  {role === 'pimpinan_sukpa' && 'Bagi target IKU yang telah Anda sepakati kepada Pimpinan Unit di bawah SUKPA Anda.'}
                  {role === 'pimpinan_unit' && 'Bagi Output IKU kepada Manajer Bagian yang membidangi.'}
                  {role === 'manajer' && 'Pecah Output IKU menjadi Uraian Tugas untuk Supervisor (SPV) / Kasubbag.'}
                  {role === 'supervisor' && 'Pecah Uraian Tugas menjadi Sub-Uraian Tugas untuk Staf Pelaksana.'}
                </p>
              </div>
            </div>

            {/* If Rektor: Show 32 IKU list (grouped by kode_iku, no duplicates) with Allocation Trigger */}
            {role === 'rektor' && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-on-surface-variant font-medium bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      32
                    </span>
                    <span>Total <b>{groupedIkuList.length} Indikator Kinerja Utama (IKU)</b> Universitas Diponegoro</span>
                  </div>
                  <span className="text-[11px] text-primary bg-primary/10 px-3 py-1 rounded-xl font-bold border border-primary/20">
                    Alokasi Target 100% per IKU ke Pimpinan SUKPA
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedIkuList.map((iku) => {
                    const assignedForThis = sukpaAssignments.filter(s => iku.all_ids.includes(s.iku_id) || s.iku?.kode_iku === iku.kode_iku)
                    const totalAssigned = assignedForThis.reduce((acc, s) => acc + Number(s.target), 0)
                    const isRatio = iku.satuan_default === 'Rasio' || iku.target_default.includes(':')
                    const isFullyAssigned = isRatio ? assignedForThis.length > 0 : totalAssigned >= 100

                    return (
                      <div 
                        key={iku.kode_iku}
                        className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest flex flex-col justify-between gap-3 hover:border-primary/50 transition-all hover:shadow-md"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-black">
                              IKU {iku.kode_iku}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isFullyAssigned 
                                ? 'bg-success/10 text-success' 
                                : totalAssigned > 0 || assignedForThis.length > 0
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {isRatio 
                                ? (assignedForThis.length > 0 ? `${assignedForThis.length} SUKPA Ditugaskan` : 'Belum Ditugaskan')
                                : (isFullyAssigned ? '100% Ditugaskan' : totalAssigned > 0 ? `${totalAssigned}% Teralokasi` : 'Belum Ditugaskan')}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-on-surface line-clamp-3 leading-snug">
                            {iku.nama_iku}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] font-bold border border-outline-variant/30 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px] text-primary">flag</span>
                              Target: <b>{iku.target_default} {iku.satuan_default}</b>
                            </span>
                            <span className="text-[10px] text-on-surface-variant flex items-center gap-1 font-medium ml-1">
                              <span className="material-symbols-outlined text-[13px] text-primary">account_tree</span>
                              {iku.outputs.length} Output
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            {assignedForThis.length} SUKPA Terlibat
                          </span>
                          <button
                            onClick={() => openSplitterForParent(iku, 'iku_sukpa')}
                            className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">call_split</span>
                            Bagi Target
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* If SUKPA, Pimpinan Unit, Manajer, SPV: Show Ready Parent Items to Split */}
            {role !== 'rektor' && (
              <div className="space-y-3 pt-2">
                {incomingTasks.filter(t => t.status === 'agreed').length === 0 ? (
                  <div className="p-8 rounded-2xl bg-surface-container-low text-center space-y-3">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">assignment_late</span>
                    <p className="text-xs font-semibold text-on-surface-variant">
                      Belum ada tugas yang disepakati untuk dialokasikan ke bawahan.
                    </p>
                    <p className="text-[11px] text-on-surface-variant/70">
                      Silakan buka tab <b>"Tugas Masuk & Dialog Kinerja"</b> terlebih dahulu untuk menyetujui target dari atasan Anda.
                    </p>
                    <div>
                      <button
                        onClick={() => setActiveTab('inbox')}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 inline-flex items-center gap-1.5 shadow-md shadow-primary/20 cursor-pointer transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">inbox</span>
                        Buka Tugas Masuk & Dialog Kinerja
                        {incomingTasks.filter(t => t.status === 'assigned').length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-900 font-black">
                            {incomingTasks.filter(t => t.status === 'assigned').length} Baru
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                ) : role === 'pimpinan_unit' ? (
                  /* KHUSUS PIMPINAN UNIT: Dimunculkan semua daftar output dari IKU yang ditugasi pimpinan sukpa */
                  <div className="space-y-6 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-on-surface-variant font-medium bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-xs">
                          <span className="material-symbols-outlined text-sm">widgets</span>
                        </span>
                        <span>Daftar <b>Output IKU</b> yang Ditugaskan oleh Pimpinan SUKPA</span>
                      </div>
                      <span className="text-[11px] text-sky-700 bg-sky-500/10 px-3 py-1 rounded-xl font-bold border border-sky-500/20">
                        Pimpinan Unit ke Manajer Bagian
                      </span>
                    </div>

                    {incomingTasks.filter(t => t.status === 'agreed').map((unitItem: any) => {
                      const kodeIku = unitItem.parent_sukpa?.iku?.kode_iku || unitItem.iku?.kode_iku || ''
                      const namaIku = unitItem.parent_sukpa?.iku?.nama_iku || unitItem.iku?.nama_iku || 'IKU'
                      const matchedGroup = groupedIkuList.find(g => g.kode_iku === kodeIku)
                      const outputsList = matchedGroup?.outputs || []
                      const isSim = Boolean(simulatedRole)

                      return (
                        <div key={unitItem.id} className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/40 space-y-4 shadow-sm">
                          {/* Banner Header IKU Induk */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-outline-variant/30">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-black">
                                  IKU {kodeIku}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Target IKU Unit: {unitItem.target} {unitItem.satuan}
                                </span>
                                {unitItem.is_direct_sync && (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-semibold">
                                    Direct Sync
                                  </span>
                                )}
                              </div>
                              <h4 className="font-headline-sm text-sm font-bold text-on-surface">
                                {namaIku}
                              </h4>
                              <p className="text-[11px] text-on-surface-variant">
                                Tentukan target masing-masing Output Kinerja berikut (satuan dapat berbeda dengan IKU) dan alokasikan ke Manajer Bagian terkait.
                              </p>
                            </div>

                            <button
                              onClick={() => openSplitterForParent(unitItem, 'output')}
                              className="px-3.5 py-1.5 rounded-xl border border-outline-variant/50 hover:bg-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5 self-start md:self-center transition-colors cursor-pointer"
                              title="Tambah output kustom di luar daftar master"
                            >
                              <span className="material-symbols-outlined text-xs">add</span>
                              Tambah Output Kustom
                            </button>
                          </div>

                          {/* Grid Kartu Output (Disamakan dengan Tampilan Rektor 32 IKU) */}
                          {outputsList.length === 0 ? (
                            <div className="p-6 text-center text-xs text-on-surface-variant italic">
                              Tidak ada daftar master output untuk IKU ini. Gunakan tombol "Tambah Output Kustom" di atas untuk menugaskan.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {outputsList.map((output, oIdx) => {
                                const assignedManagers = outputAssignments.filter(o => 
                                  (o.parent_unit_id === unitItem.id || isSim) && 
                                  (o.nama_output === output.nama_output || o.kode_output === output.kode_output)
                                )
                                const isAssigned = assignedManagers.length > 0
                                const managerNames = assignedManagers.map(m => m.manajer_user?.pegawai?.nama_lengkap || m.manajer_user?.email).join(', ')

                                return (
                                  <div 
                                    key={output.id || oIdx}
                                    className="p-4 rounded-2xl border border-outline-variant/40 bg-white flex flex-col justify-between gap-3 hover:border-primary/50 transition-all hover:shadow-md"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-700 text-xs font-black">
                                          Output {output.kode_output || (oIdx + 1)}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          isAssigned
                                            ? 'bg-success/10 text-success'
                                            : 'bg-surface-container-high text-on-surface-variant'
                                        }`}>
                                          {isAssigned ? `${assignedManagers.length} Manajer Ditugaskan` : 'Belum Ditugaskan'}
                                        </span>
                                      </div>

                                      <h5 className="text-xs font-bold text-on-surface line-clamp-3 leading-snug">
                                        {output.nama_output}
                                      </h5>

                                      {output.nama_kegiatan && (
                                        <p className="text-[10px] text-on-surface-variant flex items-center gap-1 font-medium">
                                          <span className="material-symbols-outlined text-[11px] text-primary">folder_open</span>
                                          {output.nama_kegiatan}
                                        </p>
                                      )}

                                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] font-bold border border-outline-variant/30 flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[12px] text-primary">flag</span>
                                          Target: <b>{isAssigned ? assignedManagers.map(m => `${m.target} ${m.satuan}`).join(', ') : 'Belum Diatur'}</b>
                                        </span>
                                      </div>

                                      {isAssigned && (
                                        <p className="text-[10px] text-primary font-medium line-clamp-1 pt-0.5">
                                          Penerima: {managerNames}
                                        </p>
                                      )}
                                    </div>

                                    <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                                      <span className="text-[10px] text-on-surface-variant font-medium">
                                        {isAssigned ? 'Dapat dialokasikan lagi' : 'Pilih Manajer & Target'}
                                      </span>
                                      <button
                                        onClick={() => openSplitterForOutput(unitItem, output)}
                                        className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-xs">call_split</span>
                                        Bagi Target
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header info jika role manajer */}
                    {role === 'manajer' && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-on-surface-variant font-medium bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                            <span className="material-symbols-outlined text-sm">task_alt</span>
                          </span>
                          <span>Output IKU yang <b>Telah Anda Sepakati</b> (Siap Dibuatkan Uraian Tugas ke SPV)</span>
                        </div>
                        <span className="text-[11px] text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl font-bold border border-emerald-200">
                          Buat Uraian Tugas & Target Operasional SPV
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {incomingTasks.filter(t => t.status === 'agreed').map((item: any) => {
                        const relatedUraians = role === 'manajer' 
                          ? uraianAssignments.filter(u => u.parent_output_id === item.id)
                          : role === 'supervisor'
                            ? subUraianAssignments.filter(s => s.parent_uraian_id === item.id)
                            : []

                        const parentIkuName = item.parent_unit?.parent_sukpa?.iku?.nama_iku || item.parent_sukpa?.iku?.nama_iku

                        return (
                          <div 
                            key={item.id} 
                            className="p-5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest flex flex-col justify-between gap-4 hover:border-primary/50 transition-all hover:shadow-md"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-xs">verified</span>
                                  Target Disepakati: {item.target} {item.satuan}
                                </span>
                                {item.is_direct_sync && (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">
                                    Direct Sync
                                  </span>
                                )}
                              </div>

                              <div>
                                <h4 className="text-sm font-bold text-on-surface leading-snug">
                                  {item.nama_sub_uraian || item.nama_uraian || item.nama_output || item.parent_sukpa?.iku?.nama_iku || item.iku?.nama_iku}
                                </h4>
                                {parentIkuName && (
                                  <p className="text-[11px] text-on-surface-variant font-medium mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px] text-primary">flag</span>
                                    IKU: {parentIkuName}
                                  </p>
                                )}
                              </div>

                              {/* Daftar Uraian Tugas SPV yang sudah dibuat di bawah output ini */}
                              {role === 'manajer' && (
                                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-on-surface flex items-center gap-1">
                                      <span className="material-symbols-outlined text-xs text-primary">assignment</span>
                                      Uraian Tugas SPV ({relatedUraians.length})
                                    </span>
                                  </div>

                                  {relatedUraians.length === 0 ? (
                                    <p className="text-[11px] text-on-surface-variant/70 italic">
                                      Belum ada Uraian Tugas yang didelegasikan ke SPV.
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                      {relatedUraians.map((u: any) => (
                                        <div key={u.id} className="p-2 rounded-lg bg-white border border-outline-variant/30 flex items-center justify-between gap-2 text-xs">
                                          <div className="min-w-0">
                                            <p className="font-semibold text-on-surface line-clamp-1">{u.nama_uraian}</p>
                                            <p className="text-[10px] text-on-surface-variant">
                                              SPV: <span className="font-medium text-primary">{u.spv_user?.pegawai?.nama_lengkap || u.spv_user?.email}</span>
                                            </p>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="font-bold text-xs text-on-surface block">{u.target} {u.satuan}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                              u.status === 'agreed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                              {u.status === 'agreed' ? 'Disepakati' : 'Menunggu SPV'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-end">
                              <button
                                onClick={() => {
                                  if (role === 'pimpinan_sukpa') openSplitterForParent(item, 'iku_unit')
                                  else if (role === 'manajer') openSplitterForParent(item, 'uraian')
                                  else if (role === 'supervisor') openSplitterForParent(item, 'sub_uraian')
                                }}
                                className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {role === 'manajer' ? 'add_task' : 'call_split'}
                                </span>
                                {role === 'manajer' 
                                  ? (relatedUraians.length > 0 ? '+ Tambah Uraian Tugas SPV' : '+ Buat Uraian Tugas SPV')
                                  : 'Bagi Target ke Bawahan'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table: Riwayat Penugasan yang Telah Dikirim */}
          <div className="p-6 rounded-3xl bg-white shadow-sm border border-outline-variant/30 space-y-4">
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Daftar Penugasan yang Telah Diteruskan ke Bawahan
            </h3>

            {myAssignedTasks.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic py-4">Belum ada penugasan yang diteruskan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container text-on-surface-variant border-b border-outline-variant/30 uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Nama Tugas / Output</th>
                      <th className="p-3">Ditugaskan Kepada</th>
                      <th className="p-3">Porsi Target</th>
                      <th className="p-3">Direct Sync</th>
                      <th className="p-3">Status Kesepakatan</th>
                      <th className="p-3">Catatan / Sanggahan</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {myAssignedTasks.map((task: any) => {
                      const assignee = task.sukpa_user || task.unit_user || task.manajer_user || task.spv_user || task.staff_user

                      return (
                        <tr key={task.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="p-3 font-semibold text-on-surface max-w-xs">
                            {task.nama_sub_uraian || task.nama_uraian || task.nama_output || task.iku?.nama_iku || '-'}
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-on-surface">{assignee?.pegawai?.nama_lengkap || assignee?.email}</p>
                            <p className="text-[10px] text-on-surface-variant">{assignee?.pegawai?.jabatan || assignee?.role}</p>
                          </td>
                          <td className="p-3 font-bold text-on-surface">
                            {task.target} {task.satuan}
                          </td>
                          <td className="p-3">
                            {task.is_direct_sync ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Aktif</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px]">Rekomendasi</span>
                            )}
                          </td>
                          <td className="p-3">
                            {task.status === 'agreed' && (
                              <span className="px-2.5 py-1 rounded-full bg-success/15 text-success text-[10px] font-bold flex items-center gap-1 w-fit">
                                <span className="material-symbols-outlined text-xs">check_circle</span> Disepakati
                              </span>
                            )}
                            {task.status === 'assigned' && (
                              <span className="px-2.5 py-1 rounded-full bg-warning/20 text-amber-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <span className="material-symbols-outlined text-xs">hourglass_empty</span> Menunggu
                              </span>
                            )}
                            {task.status === 'objected' && (
                              <span className="px-2.5 py-1 rounded-full bg-error/15 text-error text-[10px] font-bold flex items-center gap-1 w-fit">
                                <span className="material-symbols-outlined text-xs">gavel</span> Disanggah
                              </span>
                            )}
                          </td>
                          <td className="p-3 max-w-xs">
                            {task.catatan_sanggahan ? (
                              <div className="space-y-1">
                                <p className="text-[11px] text-error bg-error/10 p-2 rounded-xl border border-error/20 leading-snug">
                                  "{task.catatan_sanggahan}"
                                </p>
                                {task.target_usulan && (
                                  <p className="text-[10px] text-on-surface-variant">
                                    Usulan Bawahan: <b>{task.target_usulan} {task.satuan}</b>
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-on-surface-variant/50 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {task.status === 'objected' && task.target_usulan && (
                                <button
                                  onClick={() => handleAcceptSubordinateProposal(task)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                                  title="Terima usulan target bawahan & langsung sepakati"
                                >
                                  <span className="material-symbols-outlined text-xs">check</span>
                                  Terima Usulan
                                </button>
                              )}
                              {task.status !== 'agreed' && (
                                <button
                                  onClick={() => handleDeleteAssignment(task)}
                                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                  title="Batalkan alokasi penugasan ini"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 2: TUGAS MASUK & DIALOG KINERJA (REVIEW & SANGGAHAN)    */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'inbox' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white shadow-sm border border-outline-variant/30 space-y-4">
            <div>
              <h3 className="font-headline-sm text-base font-bold text-on-surface">
                Tugas Masuk dari Pimpinan (Dialog Kinerja)
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Tinjau tugas dan target yang dialokasikan oleh atasan Anda. Jika setuju, klik <b>"Setujui & Sepakati"</b> agar resmi menjadi Rencana SKP Anda. 
                Jika target atau uraian memberatkan, gunakan <b>"Ajukan Sanggahan"</b> untuk dialog kinerja.
              </p>
            </div>

            {incomingTasks.length === 0 ? (
              <div className="p-8 rounded-2xl bg-surface-container-low text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">inbox</span>
                <p className="text-xs font-semibold text-on-surface-variant">
                  Tidak ada tugas masuk yang ditugaskan kepada Anda saat ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomingTasks.map((task: any) => (
                  <div 
                    key={task.id}
                    className="p-5 rounded-3xl border border-outline-variant/40 bg-surface-container-lowest flex flex-col justify-between gap-4 shadow-sm hover:border-primary/50 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[11px] text-on-surface-variant">
                            Dari: <b>{task.assigned_by_user?.pegawai?.nama_lengkap || task.assigned_by_user?.email || 'Pimpinan'}</b>
                          </p>
                          {Boolean(simulatedRole) && (
                            <p className="text-[10px] text-primary font-semibold">
                              Ditugaskan ke: <b>{task.sukpa_user?.pegawai?.nama_lengkap || task.unit_user?.pegawai?.nama_lengkap || task.manajer_user?.pegawai?.nama_lengkap || task.spv_user?.pegawai?.nama_lengkap || task.staff_user?.pegawai?.nama_lengkap || 'Pejabat Terkait'}</b>
                            </p>
                          )}
                        </div>
                        {task.status === 'agreed' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-bold">
                            Disepakati (SKP Aktif)
                          </span>
                        )}
                        {task.status === 'assigned' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-warning/20 text-amber-800 text-[10px] font-bold">
                            Menunggu Persetujuan Anda
                          </span>
                        )}
                        {task.status === 'objected' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-error/15 text-error text-[10px] font-bold">
                            Telah Disanggah
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-title-md text-sm font-bold text-on-surface">
                          {task.nama_sub_uraian || task.nama_uraian || task.nama_output || task.parent_sukpa?.iku?.nama_iku || task.iku?.nama_iku}
                        </h4>
                      </div>

                      <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between text-xs">
                        <span className="text-on-surface-variant font-medium">Target Ditetapkan:</span>
                        <span className="font-bold text-primary text-sm">
                          {task.target} {task.satuan}
                        </span>
                      </div>

                      {task.catatan_sanggahan && (
                        <div className="p-3 rounded-2xl bg-error/10 border border-error/20 text-xs text-error space-y-1">
                          <p className="font-semibold text-[10px] uppercase">Catatan Sanggahan Anda:</p>
                          <p className="italic">"{task.catatan_sanggahan}"</p>
                          {task.target_usulan && (
                            <p className="text-[11px] text-on-surface-variant font-medium pt-1">
                              Usulan Anda: <b>{task.target_usulan} {task.satuan}</b>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-end gap-2">
                      {task.status !== 'agreed' && (
                        <>
                          <button
                            onClick={() => handleOpenSanggahan(task, task._table)}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">gavel</span>
                            {task.status === 'objected' ? 'Ubah Sanggahan' : 'Sanggah'}
                          </button>
                          <button
                            onClick={() => handleAgreeTask(task._table, task.id)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-success hover:bg-success/90 shadow-md shadow-success/20 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Setujui & Sepakati
                          </button>
                        </>
                      )}

                      {task.status === 'agreed' && (
                        <div className="flex items-center gap-2">
                          {role !== 'staff' && !isViewOnly && (
                            <button
                              onClick={() => {
                                setActiveTab('assignment')
                              }}
                              className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-xs">call_split</span>
                              Bagi ke Bawahan
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenPelaporanModal(task, task._level)}
                            className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">upload_file</span>
                            Laporkan Capaian
                          </button>
                          <span className="text-xs text-success flex items-center gap-1 font-semibold ml-1">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            SKP Resmi
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 3: PELAPORAN & VERIFIKASI CAPAIAN (BOTTOM-UP)            */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'laporan' && (
        <div className="space-y-6">
          {/* Subordinate Reports Waiting for Verification (For Superiors) */}
          {role !== 'staff' && (
            <div className="p-6 rounded-3xl bg-white shadow-sm border border-outline-variant/30 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">
                    Verifikasi Laporan Capaian Bawahan
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    Periksa angka realisasi dan tautan bukti dukung (evidence) dari bawahan. Jika disetujui, angka capaian akan tersimpan ke sistem.
                  </p>
                </div>
                {subordinateReports.filter(r => r.status === 'pending').length > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                    {subordinateReports.filter(r => r.status === 'pending').length} Menunggu Verifikasi
                  </span>
                )}
              </div>

              {subordinateReports.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic py-4">Belum ada laporan yang diajukan oleh bawahan.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container text-on-surface-variant border-b border-outline-variant/30 uppercase tracking-wider font-semibold text-[10px]">
                      <tr>
                        <th className="p-3">Pegawai Bawahan</th>
                        <th className="p-3">Angka Capaian</th>
                        <th className="p-3">Keterangan / Hasil Kerja</th>
                        <th className="p-3">Bukti Dukung (Evidence)</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Aksi Verifikasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {subordinateReports.map((report) => (
                        <tr key={report.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="p-3">
                            <p className="font-bold text-on-surface">{report.user?.pegawai?.nama_lengkap || report.user?.email}</p>
                            <p className="text-[10px] text-on-surface-variant">{report.user?.pegawai?.jabatan || report.user?.role}</p>
                          </td>
                          <td className="p-3 font-bold text-primary text-sm">
                            +{report.capaian}
                          </td>
                          <td className="p-3 max-w-xs text-on-surface leading-snug">
                            {report.keterangan}
                          </td>
                          <td className="p-3">
                            {report.evidence_url ? (
                              <a
                                href={report.evidence_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold flex items-center gap-1 w-fit transition-colors"
                              >
                                <span className="material-symbols-outlined text-xs">open_in_new</span>
                                Buka Bukti Drive
                              </a>
                            ) : (
                              <span className="text-[11px] text-on-surface-variant/50">Tidak ada file</span>
                            )}
                          </td>
                          <td className="p-3">
                            {report.status === 'pending' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Menunggu
                              </span>
                            )}
                            {report.status === 'approved' && (
                              <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-bold">
                                Disetujui
                              </span>
                            )}
                            {report.status === 'revision' && (
                              <span className="px-2 py-0.5 rounded-full bg-error/15 text-error text-[10px] font-bold">
                                Diminta Revisi
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {report.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {rejectPromptId === report.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder="Alasan revisi..."
                                      value={rejectNote}
                                      onChange={e => setRejectNote(e.target.value)}
                                      className="px-2 py-1 text-xs rounded-lg bg-surface-container border border-outline-variant"
                                    />
                                    <button
                                      onClick={() => handleRejectLaporan(report.id)}
                                      className="px-2 py-1 rounded-lg bg-error text-white font-bold text-[10px]"
                                    >
                                      Kirim
                                    </button>
                                    <button
                                      onClick={() => setRejectPromptId(null)}
                                      className="px-2 py-1 rounded-lg bg-surface-container text-on-surface-variant text-[10px]"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setRejectPromptId(report.id)}
                                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold transition-colors"
                                    >
                                      Revisi
                                    </button>
                                    <button
                                      onClick={() => handleApproveLaporan(report)}
                                      className="px-3 py-1.5 rounded-xl bg-success text-white hover:bg-success/90 text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                                    >
                                      <span className="material-symbols-outlined text-xs">check</span>
                                      Setujui
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-on-surface-variant/50 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* User's Own Tasks Capaian & Laporan Section */}
          <div className="p-6 rounded-3xl bg-white shadow-sm border border-outline-variant/30 space-y-4">
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Capaian Kinerja Tugas Saya
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Klik <b>"Laporkan Capaian & Bukti"</b> pada item tugas yang telah Anda selesaikan untuk dikirimkan ke atasan penilai.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingTasks.filter(t => t.status === 'agreed').map((task: any) => {
                const target = Number(task.target) || 0
                const approved = Number(task.capaian_approved) || 0
                const pct = target > 0 ? (approved / target) * 100 : 0

                return (
                  <div key={task.id} className="p-5 rounded-3xl border border-outline-variant/40 bg-surface-container-lowest space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
                        Target: {target} {task.satuan}
                      </span>
                      <span className={`text-xs font-bold ${pct >= 100 ? 'text-success' : 'text-primary'}`}>
                        {approved} / {target} ({pct.toFixed(1)}%)
                      </span>
                    </div>

                    <h4 className="font-title-md text-sm font-bold text-on-surface">
                      {task.nama_sub_uraian || task.nama_uraian || task.nama_output || task.parent_sukpa?.iku?.nama_iku || task.iku?.nama_iku}
                    </h4>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${pct >= 100 ? 'bg-success' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-end">
                      <button
                        onClick={() => handleOpenPelaporanModal(task, task._level)}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <span className="material-symbols-outlined text-xs">upload_file</span>
                        Laporkan Capaian & Bukti
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 4: MATRIKS & POHON CASCADING                             */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">
                  Pohon Cascading Kinerja Institusi
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Visualisasi aliran penugasan dari Level 1 (IKU Universitas) hingga Level 5 (Sub-Uraian Staff).
                </p>
              </div>

              <div className="w-full md:w-72 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama IKU atau pegawai..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:outline-none"
                />
                <span className="material-symbols-outlined text-sm absolute left-3 top-2.5 text-on-surface-variant">
                  search
                </span>
              </div>
            </div>

            {/* Tree View / Matrix Cards */}
            <div className="space-y-4 pt-2">
              {sukpaAssignments.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic py-6 text-center">
                  Belum ada data cascading yang ditugaskan pada periode aktif ini.
                </p>
              ) : (
                sukpaAssignments
                  .filter(s => !searchQuery || s.iku?.nama_iku.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((sukpaItem) => {
                    const relatedUnits = unitAssignments.filter(u => u.parent_sukpa_id === sukpaItem.id)

                    return (
                      <div 
                        key={sukpaItem.id} 
                        className="p-5 rounded-3xl border border-outline-variant/40 bg-surface-container-lowest/60 space-y-4"
                      >
                        {/* Level 1 Header: SUKPA */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
                              L1
                            </span>
                            <div>
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                IKU Universitas ({sukpaItem.iku?.kode_iku})
                              </span>
                              <h4 className="font-bold text-xs text-on-surface">
                                {sukpaItem.iku?.nama_iku}
                              </h4>
                              <p className="text-[11px] text-on-surface-variant">
                                Ditugaskan ke: <b>{sukpaItem.sukpa_user?.pegawai?.nama_lengkap || sukpaItem.sukpa_user?.email}</b>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                              Target: {sukpaItem.target} {sukpaItem.satuan}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              sukpaItem.status === 'agreed' ? 'bg-success/15 text-success' : 'bg-warning/20 text-amber-800'
                            }`}>
                              {sukpaItem.status === 'agreed' ? 'Disepakati' : 'Menunggu'}
                            </span>
                          </div>
                        </div>

                        {/* Level 2: Units */}
                        <div className="pl-4 md:pl-8 space-y-3">
                          {relatedUnits.length === 0 ? (
                            <p className="text-[11px] text-on-surface-variant/60 italic">
                              &rarr; Belum ada target IKU yang diturunkan ke Unit.
                            </p>
                          ) : (
                            relatedUnits.map((unitItem) => {
                              const relatedOutputs = outputAssignments.filter(o => o.parent_unit_id === unitItem.id)

                              return (
                                <div key={unitItem.id} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                                        L2
                                      </span>
                                      <div>
                                        <p className="text-xs font-bold text-on-surface">
                                          Pimpinan Unit: {unitItem.unit_user?.pegawai?.nama_lengkap || unitItem.unit_user?.email}
                                        </p>
                                        <p className="text-[10px] text-on-surface-variant">
                                          Target Unit: <b>{unitItem.target} {unitItem.satuan}</b>
                                        </p>
                                      </div>
                                    </div>

                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      unitItem.status === 'agreed' ? 'bg-success/15 text-success' : 'bg-warning/20 text-amber-800'
                                    }`}>
                                      {unitItem.status === 'agreed' ? 'Disepakati' : 'Menunggu'}
                                    </span>
                                  </div>

                                  {/* Level 3: Output Manajer */}
                                  <div className="pl-4 space-y-2 border-l-2 border-primary/20">
                                    {relatedOutputs.length === 0 ? (
                                      <p className="text-[10px] text-on-surface-variant/60 italic">
                                        &rarr; Belum ada Output IKU yang ditugaskan ke Manajer.
                                      </p>
                                    ) : (
                                      relatedOutputs.map(outputItem => (
                                        <div key={outputItem.id} className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-[9px]">
                                              L3
                                            </span>
                                            <div>
                                              <p className="font-semibold text-on-surface">{outputItem.nama_output}</p>
                                              <p className="text-[10px] text-on-surface-variant">
                                                Manajer: {outputItem.manajer_user?.pegawai?.nama_lengkap || outputItem.manajer_user?.email}
                                              </p>
                                            </div>
                                          </div>
                                          <span className="font-bold text-primary text-[11px]">
                                            {outputItem.target} {outputItem.satuan}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Target Splitter Modal */}
      {isSplitterOpen && splitterConfig && (
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
          allowEditParentTarget={splitterConfig.allowEditParentTarget ?? true}
          subordinates={splitterConfig.subordinatesList || subordinates}
          onSave={handleSaveAllocation}
        />
      )}

      {/* Sanggahan Modal */}
      {isSanggahanOpen && selectedTaskForSanggahan && (
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
      {isPelaporanOpen && selectedTaskForPelaporan && (
        <PelaporanCapaianModal
          isOpen={isPelaporanOpen}
          onClose={() => {
            setIsPelaporanOpen(false)
            setSelectedTaskForPelaporan(null)
          }}
          task={selectedTaskForPelaporan}
          onSuccess={() => {
            showToast('Laporan capaian dan bukti berhasil dikirimkan ke atasan!')
            fetchData()
          }}
        />
      )}

      {/* Dokumen SKP Resmi Modal */}
      {isDokumenSKPOpen && (
        <DokumenSKPModal
          isOpen={isDokumenSKPOpen}
          onClose={() => setIsDokumenSKPOpen(false)}
          periode={periode}
          pegawaiUser={user}
          atasanUser={assignedBySuperior}
          tasks={agreedTasksForSKP}
        />
      )}
    </div>
  )
}
