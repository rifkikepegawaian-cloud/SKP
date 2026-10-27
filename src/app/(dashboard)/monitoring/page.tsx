'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { User, UserRole, ROLE_LABELS, MasterPeriodeSKP } from '@/lib/types'
import { getStructuralSubordinates } from '@/lib/skpHierarchy'
import * as XLSX from 'xlsx'

interface SubordinatePerformance {
  user: User
  tasks: Array<{
    id: string
    title: string
    target: number | string
    satuan: string
    capaianApproved: number
    status: string
    isDirectSync?: boolean
    tableName: string
  }>
  totalTasks: number
  agreedTasks: number
  pendingTasks: number
  objectedTasks: number
  overallProgress: number
  totalReports: number
  pendingReports: number
}

export default function MonitoringPage() {
  const { user, activeRole } = useAuthStore()
  const role: UserRole = activeRole || (user?.role?.split(',')[0] as UserRole) || 'staff'

  const [periode, setPeriode] = useState<MasterPeriodeSKP | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [subordinatesData, setSubordinatesData] = useState<SubordinatePerformance[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'agreed' | 'pending' | 'objected'>('all')
  const [selectedSubordinate, setSelectedSubordinate] = useState<SubordinatePerformance | null>(null)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // Fetch real monitoring data from Supabase
  const fetchData = async () => {
    if (!user) return
    setIsLoading(true)
    const supabase = createClient()

    try {
      // 1. Fetch active periode
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

      // 2. Fetch structural subordinates based on role and unit
      const structuralSubs = await getStructuralSubordinates(user, role, supabase)
      const subIds = structuralSubs.map(s => s.id)

      // 3. Fetch assignments & tasks
      let rawTasks: any[] = []
      let tableName = ''

      if (role === 'rektor' || role === 'admin') {
        tableName = 'cascading_iku_sukpa'
        const { data } = await supabase
          .from('cascading_iku_sukpa')
          .select('*, subordinate:users!sukpa_user_id(*, pegawai(*)), iku:master_iku(*)')
        rawTasks = data || []
      } else if (role === 'pimpinan_sukpa') {
        tableName = 'cascading_iku_unit'
        let query = supabase
          .from('cascading_iku_unit')
          .select('*, subordinate:users!unit_user_id(*, pegawai(*)), parent_sukpa:cascading_iku_sukpa(*, iku:master_iku(*))')
        if (subIds.length > 0) {
          query = query.or(`assigned_by.eq.${user.id},unit_user_id.in.(${subIds.join(',')})`)
        } else {
          query = query.eq('assigned_by', user.id)
        }
        const { data } = await query
        rawTasks = data || []
      } else if (role === 'pimpinan_unit' || role === 'wakil_pimpinan_unit') {
        tableName = 'cascading_output_manajer'
        let query = supabase
          .from('cascading_output_manajer')
          .select('*, subordinate:users!manajer_user_id(*, pegawai(*)), parent_unit:cascading_iku_unit(*)')
        if (subIds.length > 0) {
          query = query.or(`assigned_by.eq.${user.id},manajer_user_id.in.(${subIds.join(',')})`)
        } else {
          query = query.eq('assigned_by', user.id)
        }
        const { data } = await query
        rawTasks = data || []
      } else if (role === 'manajer') {
        tableName = 'cascading_uraian_spv'
        let query = supabase
          .from('cascading_uraian_spv')
          .select('*, subordinate:users!spv_user_id(*, pegawai(*)), parent_output:cascading_output_manajer(*)')
        if (subIds.length > 0) {
          query = query.or(`assigned_by.eq.${user.id},spv_user_id.in.(${subIds.join(',')})`)
        } else {
          query = query.eq('assigned_by', user.id)
        }
        const { data } = await query
        rawTasks = data || []
      } else if (role === 'supervisor') {
        tableName = 'cascading_sub_uraian_staff'
        let query = supabase
          .from('cascading_sub_uraian_staff')
          .select('*, subordinate:users!staff_user_id(*, pegawai(*)), parent_uraian:cascading_uraian_spv(*)')
        if (subIds.length > 0) {
          query = query.or(`assigned_by.eq.${user.id},staff_user_id.in.(${subIds.join(',')})`)
        } else {
          query = query.eq('assigned_by', user.id)
        }
        const { data } = await query
        rawTasks = data || []
      }

      // 4. Fetch reports for all relevant task ids
      const taskIds = rawTasks.map(t => t.id)
      let reportsData: any[] = []
      if (taskIds.length > 0) {
        const { data: rep } = await supabase
          .from('cascading_laporan_kerja')
          .select('*')
          .in('ref_id', taskIds)
        reportsData = rep || []
      }

      // 5. Pre-populate subMap with all structural subordinates
      const subMap = new Map<string, SubordinatePerformance>()

      structuralSubs.forEach(sub => {
        subMap.set(sub.id, {
          user: sub,
          tasks: [],
          totalTasks: 0,
          agreedTasks: 0,
          pendingTasks: 0,
          objectedTasks: 0,
          overallProgress: 0,
          totalReports: 0,
          pendingReports: 0,
        })
      })

      // 6. Group tasks by subordinate
      rawTasks.forEach(item => {
        const sub = item.subordinate as User
        if (!sub || !sub.id) return

        const key = sub.id
        const title = item.nama_sub_uraian || item.nama_uraian || item.nama_output || item.iku?.nama_iku || 'Tugas Kinerja'
        const targetVal = item.target || '1'
        const capaianApproved = Number(item.capaian_approved) || 0
        const status = item.status || 'assigned'

        const taskItem = {
          id: item.id,
          title,
          target: targetVal,
          satuan: item.satuan || 'Dokumen',
          capaianApproved,
          status,
          isDirectSync: Boolean(item.is_direct_sync),
          tableName,
        }

        const taskReports = reportsData.filter(r => r.ref_id === item.id)
        const pendingReps = taskReports.filter(r => r.status === 'pending').length

        if (!subMap.has(key)) {
          subMap.set(key, {
            user: sub,
            tasks: [taskItem],
            totalTasks: 1,
            agreedTasks: status === 'agreed' ? 1 : 0,
            pendingTasks: status === 'assigned' ? 1 : 0,
            objectedTasks: status === 'objected' ? 1 : 0,
            overallProgress: 0,
            totalReports: taskReports.length,
            pendingReports: pendingReps,
          })
        } else {
          const entry = subMap.get(key)!
          entry.tasks.push(taskItem)
          entry.totalTasks += 1
          if (status === 'agreed') entry.agreedTasks += 1
          if (status === 'assigned') entry.pendingTasks += 1
          if (status === 'objected') entry.objectedTasks += 1
          entry.totalReports += taskReports.length
          entry.pendingReports += pendingReps
        }
      })

      // Calculate progress per subordinate
      subMap.forEach(entry => {
        let sumTarget = 0
        let sumCapaian = 0
        let computableTasks = 0

        entry.tasks.forEach(t => {
          const tNum = parseFloat(String(t.target))
          if (!isNaN(tNum) && tNum > 0) {
            sumTarget += tNum
            sumCapaian += Math.min(tNum, t.capaianApproved)
            computableTasks += 1
          }
        })

        if (computableTasks > 0 && sumTarget > 0) {
          entry.overallProgress = Math.min(100, Math.round((sumCapaian / sumTarget) * 100))
        } else {
          // If targets are text (like ratio 1:50) or binary
          entry.overallProgress = entry.totalTasks > 0 ? Math.round((entry.agreedTasks / entry.totalTasks) * 100) : 0
        }
      })

      setSubordinatesData(Array.from(subMap.values()))
    } catch (err) {
      console.error('Error fetching monitoring data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user, role])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalSubs = subordinatesData.length
    const totalAllTasks = subordinatesData.reduce((acc, s) => acc + s.totalTasks, 0)
    const totalAgreed = subordinatesData.reduce((acc, s) => acc + s.agreedTasks, 0)
    const totalPending = subordinatesData.reduce((acc, s) => acc + s.pendingTasks, 0)
    const totalObjected = subordinatesData.reduce((acc, s) => acc + s.objectedTasks, 0)
    const totalPendingReviews = subordinatesData.reduce((acc, s) => acc + s.pendingReports, 0)

    const avgProgress = totalSubs > 0
      ? Math.round(subordinatesData.reduce((acc, s) => acc + s.overallProgress, 0) / totalSubs)
      : 0

    const agreementRate = totalAllTasks > 0
      ? Math.round((totalAgreed / totalAllTasks) * 100)
      : 0

    return {
      totalSubs,
      totalAllTasks,
      totalAgreed,
      totalPending,
      totalObjected,
      totalPendingReviews,
      avgProgress,
      agreementRate,
    }
  }, [subordinatesData])

  // Filtered subordinates
  const filteredSubordinates = useMemo(() => {
    return subordinatesData.filter(s => {
      // Status filter
      if (statusFilter === 'agreed' && s.agreedTasks === 0) return false
      if (statusFilter === 'pending' && s.pendingTasks === 0) return false
      if (statusFilter === 'objected' && s.objectedTasks === 0) return false

      // Search query
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const name = s.user.pegawai?.nama_lengkap?.toLowerCase() || ''
      const nip = s.user.pegawai?.nip?.toLowerCase() || ''
      const email = s.user.email?.toLowerCase() || ''
      const jabatan = s.user.pegawai?.jabatan?.toLowerCase() || ''
      return name.includes(q) || nip.includes(q) || email.includes(q) || jabatan.includes(q)
    })
  }, [subordinatesData, searchQuery, statusFilter])

  // Export to Excel
  const handleExportExcel = () => {
    if (subordinatesData.length === 0) return

    const exportRows = subordinatesData.flatMap((sub, subIdx) => {
      if (sub.tasks.length === 0) {
        return [{
          'No': `${subIdx + 1}`,
          'Nama Pegawai Bawahan': sub.user.pegawai?.nama_lengkap || sub.user.email,
          'NIP': sub.user.pegawai?.nip || '-',
          'Jabatan': sub.user.pegawai?.jabatan || sub.user.role,
          'Unit Kerja': sub.user.pegawai?.unit_es2 || '-',
          'Nama Tugas / Output': 'Belum Ada Penugasan',
          'Target': '-',
          'Satuan': '-',
          'Capaian Disetujui': 0,
          'Status SKP': 'Belum Ada Penugasan',
          'Direct Sync': 'Tidak',
          'Progress Pegawai (%)': '0%',
        }]
      }

      return sub.tasks.map((task, tIdx) => ({
        'No': `${subIdx + 1}.${tIdx + 1}`,
        'Nama Pegawai Bawahan': sub.user.pegawai?.nama_lengkap || sub.user.email,
        'NIP': sub.user.pegawai?.nip || '-',
        'Jabatan': sub.user.pegawai?.jabatan || sub.user.role,
        'Unit Kerja': sub.user.pegawai?.unit_es2 || '-',
        'Nama Tugas / Output': task.title,
        'Target': task.target,
        'Satuan': task.satuan,
        'Capaian Disetujui': task.capaianApproved,
        'Status SKP': task.status === 'agreed' ? 'Disepakati' : task.status === 'objected' ? 'Disanggah' : 'Menunggu',
        'Direct Sync': task.isDirectSync ? 'Ya' : 'Tidak',
        'Progress Pegawai (%)': `${sub.overallProgress}%`,
      }))
    })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitoring Kinerja')
    XLSX.writeFile(workbook, `Monitoring_Kinerja_${periode?.tahun || '2026'}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Pengawasan Kinerja</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Monitoring Kinerja</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Monitoring Kinerja Bawahan & Cascading
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Pantau progres kesepakatan SKP, persentase realisasi tugas, dan akuntabilitas kinerja bawahan di bawah kewenangan Anda.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5 border border-primary/20">
            <span className="material-symbols-outlined text-sm">badge</span>
            Pengawas: {ROLE_LABELS[role] || role}
          </span>
          {periode && (
            <span className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold border border-outline-variant/40 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-emerald-600">calendar_month</span>
              Tahun {periode.tahun}
            </span>
          )}
          <button
            onClick={fetchData}
            className="p-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant transition-colors"
            title="Refresh Data"
          >
            <span className={`material-symbols-outlined text-base ${isLoading ? 'animate-spin' : ''}`}>sync</span>
          </button>
        </div>
      </div>

      {/* Metric Cards (100% Dynamic from Supabase) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Rata-Rata Capaian */}
        <div className="p-5 rounded-3xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Rata-Rata Capaian
            </span>
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-lg">trending_up</span>
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-primary" style={{ fontFamily: 'Manrope' }}>
              {summaryMetrics.avgProgress}%
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Realisasi kumulatif dari {summaryMetrics.totalSubs} pegawai bawahan
            </p>
          </div>
          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-700"
              style={{ width: `${summaryMetrics.avgProgress}%` }}
            />
          </div>
        </div>

        {/* Card 2: Kesepakatan SKP */}
        <div className="p-5 rounded-3xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Kesepakatan SKP
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-lg">handshake</span>
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-emerald-600" style={{ fontFamily: 'Manrope' }}>
              {summaryMetrics.agreementRate}%
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {summaryMetrics.totalAgreed} dari {summaryMetrics.totalAllTasks} tugas telah disepakati
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {summaryMetrics.totalAgreed} Sepakat
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {summaryMetrics.totalPending} Menunggu
            </span>
            {summaryMetrics.totalObjected > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                {summaryMetrics.totalObjected} Sanggah
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Pegawai Bawahan Terlibat */}
        <div className="p-5 rounded-3xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Pegawai Bawahan
            </span>
            <span className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-lg">group</span>
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-on-surface" style={{ fontFamily: 'Manrope' }}>
              {summaryMetrics.totalSubs}
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Pegawai yang menerima pendelegasian target
            </p>
          </div>
          <p className="text-[10px] text-primary font-semibold">
            {summaryMetrics.totalAllTasks} Total Butir Tugas Terdistribusi
          </p>
        </div>

        {/* Card 4: Antrean Verifikasi Laporan */}
        <div className="p-5 rounded-3xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Antrean Verifikasi
            </span>
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              summaryMetrics.totalPendingReviews > 0 ? 'bg-amber-100 text-amber-700' : 'bg-surface-container text-on-surface-variant'
            }`}>
              <span className="material-symbols-outlined text-lg">rate_review</span>
            </span>
          </div>
          <div>
            <h3 className={`text-2xl font-black ${
              summaryMetrics.totalPendingReviews > 0 ? 'text-amber-700' : 'text-on-surface'
            }`} style={{ fontFamily: 'Manrope' }}>
              {summaryMetrics.totalPendingReviews}
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Laporan capaian bawahan menunggu persetujuan
            </p>
          </div>
          <a
            href="/pelaporan-capaian"
            className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"
          >
            Buka Menu Pelaporan & Verifikasi
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </a>
        </div>
      </div>

      {/* Main Monitoring Table */}
      <div className="p-6 rounded-3xl bg-white shadow-xs border border-outline-variant/30 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
          <div>
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Daftar Kinerja Pegawai Bawahan
            </h3>
            <p className="text-xs text-on-surface-variant">
              Tinjau capaian individu, status persetujuan SKP, dan rincian tugas bawahan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none font-semibold text-on-surface cursor-pointer"
            >
              <option value="all">Semua Status SKP</option>
              <option value="agreed">Telah Disepakati</option>
              <option value="pending">Menunggu Konfirmasi</option>
              <option value="objected">Ada Sanggahan</option>
            </select>

            {/* Search */}
            <div className="w-56 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau NIP..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface-container-lowest border border-outline-variant/60 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-on-surface-variant/40 transition-all text-on-surface"
              />
              <span className="material-symbols-outlined text-sm absolute left-2.5 top-2 text-on-surface-variant">
                search
              </span>
            </div>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl border border-outline-variant/60 hover:bg-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh Rekap Monitoring dalam format Excel"
            >
              <span className="material-symbols-outlined text-xs text-emerald-600">download</span>
              Ekspor Excel
            </button>
          </div>
        </div>

        {/* Table */}
        {filteredSubordinates.length === 0 ? (
          <div className="p-12 text-center text-xs text-on-surface-variant italic space-y-2">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">person_search</span>
            <p>
              {subordinatesData.length === 0
                ? 'Belum ada pegawai bawahan yang menerima alokasi penugasan kinerja dari Anda.'
                : 'Tidak ada data bawahan yang cocok dengan pencarian / filter ini.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container text-on-surface-variant border-b border-outline-variant/30 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Pegawai Bawahan</th>
                  <th className="p-3">Beban Tugas</th>
                  <th className="p-3">Status Kesepakatan SKP</th>
                  <th className="p-3">Progres Realisasi Capaian</th>
                  <th className="p-3">Laporan Masuk</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredSubordinates.map(sub => {
                  const isExpanded = expandedRowId === sub.user.id
                  const allAgreed = sub.agreedTasks === sub.totalTasks

                  return (
                    <React.Fragment key={sub.user.id}>
                      <tr className="hover:bg-surface-container-lowest transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                              {sub.user.pegawai?.nama_lengkap
                                ? sub.user.pegawai.nama_lengkap.split(' ').map(n => n[0]).slice(0, 2).join('')
                                : 'BW'}
                            </div>
                            <div>
                              <p className="font-bold text-on-surface text-xs leading-snug">
                                {sub.user.pegawai?.nama_lengkap || sub.user.email}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                                {sub.user.pegawai?.nip && <span>NIP. {sub.user.pegawai.nip}</span>}
                                <span>•</span>
                                <span>{sub.user.pegawai?.jabatan || sub.user.role}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-xl bg-surface-container text-on-surface font-bold text-[11px]">
                            {sub.totalTasks} Butir Tugas
                          </span>
                        </td>

                        <td className="p-3">
                          {sub.totalTasks === 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center gap-1 w-fit">
                              <span className="material-symbols-outlined text-xs">info</span>
                              Belum Ada Penugasan
                            </span>
                          ) : allAgreed ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              Semua Disepakati ({sub.agreedTasks}/{sub.totalTasks})
                            </span>
                          ) : sub.objectedTasks > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                              <span className="material-symbols-outlined text-xs">gavel</span>
                              {sub.objectedTasks} Sanggahan Perlu Respons
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                              <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                              {sub.pendingTasks} Menunggu Konfirmasi
                            </span>
                          )}
                        </td>

                        <td className="p-3 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-on-surface">{sub.overallProgress}%</span>
                              <span className="text-on-surface-variant">Realisasi</span>
                            </div>
                            <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  sub.overallProgress >= 80
                                    ? 'bg-emerald-500'
                                    : sub.overallProgress >= 40
                                      ? 'bg-amber-500'
                                      : 'bg-primary'
                                }`}
                                style={{ width: `${sub.overallProgress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="text-[11px]">
                            <span className="font-bold text-on-surface">{sub.totalReports}</span> total
                            {sub.pendingReports > 0 && (
                              <span className="ml-1 text-rose-600 font-bold">
                                ({sub.pendingReports} baru)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : sub.user.id)}
                            className="px-2.5 py-1.5 rounded-xl border border-outline-variant/50 hover:bg-surface-container text-xs font-semibold text-primary inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? 'Tutup' : 'Rincian Tugas'}</span>
                            <span className={`material-symbols-outlined text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Drill-Down Row */}
                      {isExpanded && (
                        <tr className="bg-surface-container-low/40">
                          <td colSpan={6} className="p-4 border-t border-b border-outline-variant/30">
                            <div className="space-y-3 pl-4 md:pl-12">
                              <h5 className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm text-primary">format_list_bulleted</span>
                                Rincian Butir Tugas SKP: {sub.user.pegawai?.nama_lengkap || sub.user.email}
                              </h5>

                              {sub.tasks.length === 0 ? (
                                <div className="p-4 rounded-2xl bg-white border border-outline-variant/30 text-xs text-on-surface-variant flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm text-slate-400">info</span>
                                  <span>Belum ada butir penugasan sub-uraian yang dialokasikan kepada pegawai ini.</span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {sub.tasks.map(task => (
                                    <div
                                      key={task.id}
                                      className="p-3 rounded-2xl bg-white border border-outline-variant/40 space-y-2 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          task.status === 'agreed'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : task.status === 'objected'
                                              ? 'bg-rose-100 text-rose-800'
                                              : 'bg-amber-100 text-amber-800'
                                        }`}>
                                          {task.status === 'agreed' ? 'Disepakati' : task.status === 'objected' ? 'Disanggah' : 'Menunggu'}
                                        </span>
                                        <span className="font-bold text-primary text-xs">
                                          Target: {task.target} {task.satuan}
                                        </span>
                                      </div>

                                      <p className="font-semibold text-xs text-on-surface leading-snug">
                                        {task.title}
                                      </p>

                                      <div className="pt-1 flex items-center justify-between text-[11px] text-on-surface-variant border-t border-outline-variant/20">
                                        <span>Realisasi Disetujui:</span>
                                        <b className="text-on-surface">{task.capaianApproved} {task.satuan}</b>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
