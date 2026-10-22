'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { User, UserRole, ROLE_LABELS, MasterPeriodeSKP } from '@/lib/types'

interface DashboardData {
  periode: MasterPeriodeSKP | null
  incomingTasks: any[]
  myAssignedTasks: any[]
  myReports: any[]
  subordinateReports: any[]
  recentActivities: any[]
}

export default function DashboardPage() {
  const { user, activeRole } = useAuthStore()
  const role: UserRole = activeRole || (user?.role?.split(',')[0] as UserRole) || 'staff'

  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<DashboardData>({
    periode: null,
    incomingTasks: [],
    myAssignedTasks: [],
    myReports: [],
    subordinateReports: [],
    recentActivities: [],
  })

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 11) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }, [])

  // Fetch live dashboard data from Supabase
  const fetchDashboardData = async () => {
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

      // 2. Fetch incoming tasks assigned to this user
      let incoming: any[] = []
      if (role === 'rektor') {
        const { data: ikus } = await supabase.from('master_iku').select('*')
        incoming = (ikus || []).map(i => ({
          id: i.id,
          title: `[IKU ${i.kode_iku}] ${i.nama_iku}`,
          target: i.target_default || '100',
          satuan: i.satuan_default || '%',
          status: 'agreed',
          capaian_approved: 0,
        }))
      } else if (role === 'pimpinan_sukpa') {
        const { data: sukpa } = await supabase
          .from('cascading_iku_sukpa')
          .select('*, iku:master_iku(*), assigned_by_user:users!assigned_by(*, pegawai(*))')
          .eq('sukpa_user_id', user.id)
        incoming = (sukpa || []).map(s => ({
          ...s,
          title: s.iku?.nama_iku || 'IKU SUKPA',
        }))
      } else if (role === 'pimpinan_unit') {
        const { data: units } = await supabase
          .from('cascading_iku_unit')
          .select('*, parent_sukpa:cascading_iku_sukpa(*, iku:master_iku(*)), assigned_by_user:users!assigned_by(*, pegawai(*))')
          .eq('unit_user_id', user.id)
        incoming = (units || []).map(u => ({
          ...u,
          title: u.parent_sukpa?.iku?.nama_iku || 'IKU Unit',
        }))
      } else if (role === 'manajer') {
        const { data: outputs } = await supabase
          .from('cascading_output_manajer')
          .select('*, assigned_by_user:users!assigned_by(*, pegawai(*))')
          .eq('manajer_user_id', user.id)
        incoming = (outputs || []).map(o => ({
          ...o,
          title: o.nama_output || 'Output Kinerja Manajer',
        }))
      } else if (role === 'supervisor') {
        const { data: uraians } = await supabase
          .from('cascading_uraian_spv')
          .select('*, assigned_by_user:users!assigned_by(*, pegawai(*))')
          .eq('spv_user_id', user.id)
        incoming = (uraians || []).map(u => ({
          ...u,
          title: u.nama_uraian || 'Uraian Tugas SPV',
        }))
      } else if (role === 'staff') {
        const { data: subs } = await supabase
          .from('cascading_sub_uraian_staff')
          .select('*, assigned_by_user:users!assigned_by(*, pegawai(*))')
          .eq('staff_user_id', user.id)
        incoming = (subs || []).map(s => ({
          ...s,
          title: s.nama_sub_uraian || 'Sub-Uraian Tugas Staf',
        }))
      }

      // 3. Fetch tasks created/assigned by this user to subordinates
      let assignedByMe: any[] = []
      if (role === 'rektor' || role === 'admin') {
        const { data: allSukpa } = await supabase
          .from('cascading_iku_sukpa')
          .select('*, sukpa_user:users!sukpa_user_id(*, pegawai(*))')
        assignedByMe = allSukpa || []
      } else if (role === 'pimpinan_sukpa') {
        const { data: allUnits } = await supabase
          .from('cascading_iku_unit')
          .select('*, unit_user:users!unit_user_id(*, pegawai(*))')
          .eq('assigned_by', user.id)
        assignedByMe = allUnits || []
      } else if (role === 'pimpinan_unit') {
        const { data: allOutputs } = await supabase
          .from('cascading_output_manajer')
          .select('*, manajer_user:users!manajer_user_id(*, pegawai(*))')
          .eq('assigned_by', user.id)
        assignedByMe = allOutputs || []
      } else if (role === 'manajer') {
        const { data: allUraians } = await supabase
          .from('cascading_uraian_spv')
          .select('*, spv_user:users!spv_user_id(*, pegawai(*))')
          .eq('assigned_by', user.id)
        assignedByMe = allUraians || []
      } else if (role === 'supervisor') {
        const { data: allSubs } = await supabase
          .from('cascading_sub_uraian_staff')
          .select('*, staff_user:users!staff_user_id(*, pegawai(*))')
          .eq('assigned_by', user.id)
        assignedByMe = allSubs || []
      }

      // 4. Fetch my own reports
      const { data: myReps } = await supabase
        .from('cascading_laporan_kerja')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // 5. Fetch subordinate reports
      const myAssignedIds = assignedByMe.map(t => t.id)
      let subReps: any[] = []
      if (myAssignedIds.length > 0) {
        const { data: sReps } = await supabase
          .from('cascading_laporan_kerja')
          .select('*, user:users!user_id(*, pegawai(*))')
          .in('ref_id', myAssignedIds)
          .order('created_at', { ascending: false })
        subReps = sReps || []
      }

      // 6. Recent activities feed (combination of recent reports and task agreements)
      const { data: recents } = await supabase
        .from('cascading_laporan_kerja')
        .select('*, user:users!user_id(*, pegawai(*))')
        .order('created_at', { ascending: false })
        .limit(6)

      setData({
        periode: periodeData as MasterPeriodeSKP,
        incomingTasks: incoming,
        myAssignedTasks: assignedByMe,
        myReports: myReps || [],
        subordinateReports: subReps,
        recentActivities: recents || [],
      })
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [user, role])

  // Calculated Metrics
  const agreedIncoming = useMemo(() => data.incomingTasks.filter(t => t.status === 'agreed'), [data.incomingTasks])
  const pendingIncoming = useMemo(() => data.incomingTasks.filter(t => t.status === 'assigned'), [data.incomingTasks])
  const objectedIncoming = useMemo(() => data.incomingTasks.filter(t => t.status === 'objected'), [data.incomingTasks])

  // Subordinate alerts for superiors
  const pendingSubordinateReports = useMemo(() => data.subordinateReports.filter(r => r.status === 'pending'), [data.subordinateReports])
  const subordinateObjections = useMemo(() => data.myAssignedTasks.filter(t => t.status === 'objected'), [data.myAssignedTasks])

  // Personal Progress
  const personalProgress = useMemo(() => {
    if (agreedIncoming.length === 0) return 0
    let totalTarget = 0
    let totalCapaian = 0
    let computable = 0

    agreedIncoming.forEach(t => {
      const tNum = parseFloat(String(t.target))
      if (!isNaN(tNum) && tNum > 0) {
        totalTarget += tNum
        totalCapaian += Math.min(tNum, Number(t.capaian_approved) || 0)
        computable += 1
      }
    })

    if (computable > 0 && totalTarget > 0) {
      return Math.min(100, Math.round((totalCapaian / totalTarget) * 100))
    }
    return agreedIncoming.length > 0 ? 100 : 0
  }, [agreedIncoming])

  // Performance Rating Category
  const predikatKinerja = useMemo(() => {
    if (personalProgress >= 100) return { label: 'Sangat Baik', color: 'text-emerald-700 bg-emerald-100 border-emerald-200' }
    if (personalProgress >= 80) return { label: 'Baik', color: 'text-primary bg-primary/10 border-primary/20' }
    if (personalProgress >= 60) return { label: 'Butuh Perbaikan', color: 'text-amber-800 bg-amber-100 border-amber-200' }
    return { label: 'Kurang', color: 'text-rose-800 bg-rose-100 border-rose-200' }
  }, [personalProgress])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
          <span className="material-symbols-outlined text-2xl">sync</span>
        </div>
        <p className="text-xs font-medium text-on-surface-variant">Memuat ringkasan performa kinerja Anda...</p>
      </div>
    )
  }

  const userName = user?.pegawai?.nama_lengkap || user?.email || 'Pegawai'
  const userUnit = user?.pegawai?.unit_es2 || 'Universitas Diponegoro'

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. WELCOME & ACTION REMINDER BANNER                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
              {ROLE_LABELS[role] || role}
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              {userUnit}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'Manrope' }}>
            {greeting}, {userName}! 👋
          </h2>
          <p className="text-xs text-on-surface-variant">
            Berikut adalah rangkuman progres sasaran kinerja, penugasan, dan akuntabilitas realisasi periode ini.
          </p>
        </div>

        {/* Periode Badge & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {data.periode && (
            <div className="px-3.5 py-2 rounded-2xl bg-surface-container-low border border-outline-variant/40 flex items-center gap-2 text-xs">
              <span className="material-symbols-outlined text-sm text-emerald-600">calendar_month</span>
              <div>
                <p className="text-[10px] text-on-surface-variant font-medium leading-tight">Periode Aktif</p>
                <p className="font-bold text-on-surface">Tahun {data.periode.tahun} ({data.periode.nama_periode})</p>
              </div>
            </div>
          )}

          <Link
            href="/cascading/dialog-kinerja"
            className="px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">inbox</span>
            Tugas Masuk
            {pendingIncoming.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-300 text-slate-900 text-[10px] font-black">
                {pendingIncoming.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. DYNAMIC ALERT NOTIFICATIONS (TUGAS & VERIFIKASI PENDING)  */}
      {/* ──────────────────────────────────────────────────────────── */}
      {(pendingIncoming.length > 0 || pendingSubordinateReports.length > 0 || subordinateObjections.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {/* Alert: Tugas Masuk Butuh Konfirmasi */}
          {pendingIncoming.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-amber-900">
                <span className="material-symbols-outlined text-amber-600 text-lg">hourglass_empty</span>
                <div>
                  <p className="font-bold">{pendingIncoming.length} Tugas Baru Menunggu Konfirmasi</p>
                  <p className="text-[11px] text-amber-800">Target dari atasan perlu disepakati menjadi SKP Anda.</p>
                </div>
              </div>
              <Link
                href="/cascading/dialog-kinerja"
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 transition-colors"
              >
                Tinjau
              </Link>
            </div>
          )}

          {/* Alert: Verifikasi Laporan Bawahan */}
          {pendingSubordinateReports.length > 0 && (
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-sky-950">
                <span className="material-symbols-outlined text-sky-600 text-lg">rate_review</span>
                <div>
                  <p className="font-bold">{pendingSubordinateReports.length} Laporan Bawahan Perlu Verifikasi</p>
                  <p className="text-[11px] text-sky-800">Bukti dukung realisasi siap untuk divalidasi.</p>
                </div>
              </div>
              <Link
                href="/pelaporan-capaian"
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shrink-0 transition-colors"
              >
                Verifikasi
              </Link>
            </div>
          )}

          {/* Alert: Dialog Kinerja / Sanggahan Bawahan */}
          {subordinateObjections.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-rose-950">
                <span className="material-symbols-outlined text-rose-600 text-lg">forum</span>
                <div>
                  <p className="font-bold">{subordinateObjections.length} Sanggahan Target dari Bawahan</p>
                  <p className="text-[11px] text-rose-800">Bawahan mengusulkan dialog kinerja target.</p>
                </div>
              </div>
              <Link
                href="/cascading/dialog-kinerja"
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shrink-0 transition-colors"
              >
                Respons
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. METRIC CARDS GRID (100% LIVE FROM SUPABASE)               */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: SKP Disepakati */}
        <div className="p-5 rounded-3xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
              <span className="material-symbols-outlined text-xl">task_alt</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {agreedIncoming.length === data.incomingTasks.length && data.incomingTasks.length > 0
                ? '100% Disepakati'
                : `${agreedIncoming.length}/${data.incomingTasks.length} Rencana`}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Target SKP Disepakati
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-2xl font-black text-on-surface" style={{ fontFamily: 'Manrope' }}>
                {agreedIncoming.length}
              </h4>
              <p className="text-xs text-on-surface-variant">
                dari {data.incomingTasks.length} butir tugas
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
            <span className="text-on-surface-variant">Menunggu: <b>{pendingIncoming.length}</b></span>
            {objectedIncoming.length > 0 && (
              <span className="text-rose-600 font-bold">Sanggahan: {objectedIncoming.length}</span>
            )}
          </div>
        </div>

        {/* Card 2: Progres Realisasi Capaian */}
        <div className="p-5 rounded-3xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">
              <span className="material-symbols-outlined text-xl">trending_up</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${predikatKinerja.color}`}>
              {predikatKinerja.label}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Realisasi Capaian Anda
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-2xl font-black text-emerald-600" style={{ fontFamily: 'Manrope' }}>
                {personalProgress}%
              </h4>
              <p className="text-xs text-on-surface-variant">
                dari target terverifikasi
              </p>
            </div>
          </div>
          <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${personalProgress}%` }}
            />
          </div>
        </div>

        {/* Card 3: Akuntabilitas Pelaporan Saya */}
        <div className="p-5 rounded-3xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 font-bold">
              <span className="material-symbols-outlined text-xl">upload_file</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface">
              {data.myReports.filter(r => r.status === 'approved').length} Disetujui
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Laporan Kerja Dikirim
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-2xl font-black text-on-surface" style={{ fontFamily: 'Manrope' }}>
                {data.myReports.length}
              </h4>
              <p className="text-xs text-on-surface-variant">
                bukti realisasi terunggah
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
            <Link href="/pelaporan-capaian" className="text-primary font-bold hover:underline">
              + Input Capaian Baru
            </Link>
            {data.myReports.filter(r => r.status === 'revision').length > 0 && (
              <span className="text-rose-600 font-bold">
                {data.myReports.filter(r => r.status === 'revision').length} Perlu Revisi
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Pengawasan Bawahan (Khusus Atasan) atau Direct Sync (Khusus Staf) */}
        <div className="p-5 rounded-3xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 font-bold">
              <span className="material-symbols-outlined text-xl">
                {role !== 'staff' ? 'supervised_user_circle' : 'sync_alt'}
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              {role !== 'staff' ? 'Pendelegasian' : 'Sinkronisasi'}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              {role !== 'staff' ? 'Penugasan ke Bawahan' : 'Tugas Direct Sync'}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-2xl font-black text-purple-700" style={{ fontFamily: 'Manrope' }}>
                {role !== 'staff' ? data.myAssignedTasks.length : data.incomingTasks.filter(t => t.is_direct_sync).length}
              </h4>
              <p className="text-xs text-on-surface-variant">
                {role !== 'staff' ? 'tugas diteruskan' : 'otomatis akumulasi'}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
            {role !== 'staff' ? (
              <Link href="/cascading/penugasan" className="text-primary font-bold hover:underline flex items-center gap-1">
                Alokasi Target <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            ) : (
              <span className="text-on-surface-variant">
                Terhubung langsung ke kinerja atasan
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. MAIN CONTENT (TWO COLUMNS: PROGRESS & RECENT ACTIVITY)    */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Daftar Sasaran Rencana SKP & Evaluasi */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-outline-variant/30 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div>
              <h3 className="font-headline-sm text-base font-bold text-on-surface">
                Daftar Sasaran Rencana SKP Anda
              </h3>
              <p className="text-xs text-on-surface-variant">
                Target yang telah disepakati beserta akumulasi realisasi capaian yang terverifikasi.
              </p>
            </div>

            <Link
              href="/cascading/cetak-skp"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Template SKP
            </Link>
          </div>

          {agreedIncoming.length === 0 ? (
            <div className="p-10 text-center text-xs text-on-surface-variant italic bg-surface-container-low rounded-2xl space-y-2">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">assignment_late</span>
              <p>Belum ada target yang disepakati untuk menjadi rencana SKP aktif.</p>
              <Link
                href="/cascading/dialog-kinerja"
                className="inline-block mt-2 px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs"
              >
                Buka Dialog Kinerja
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {agreedIncoming.slice(0, 5).map(task => {
                const targetNum = parseFloat(String(task.target)) || 0
                const approved = Number(task.capaian_approved) || 0
                const percent = targetNum > 0 ? Math.min(100, Math.round((approved / targetNum) * 100)) : 0

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-on-surface line-clamp-1 flex-1 pr-2">
                        {task.title}
                      </span>
                      <span className="font-black text-primary text-xs shrink-0">
                        {approved} / {task.target} {task.satuan} ({percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percent >= 80 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              {agreedIncoming.length > 5 && (
                <p className="text-center text-xs text-on-surface-variant">
                  +{agreedIncoming.length - 5} tugas lainnya tercatat dalam dokumen SKP.
                </p>
              )}
            </div>
          )}

          {/* Evaluasi Singkat Predikat */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border border-primary/15 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md shadow-primary/20">
              {personalProgress}%
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">
                Predikat Kinerja Saat Ini: <span className="text-primary font-black uppercase">{predikatKinerja.label}</span>
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Nilai dihitung berdasar capaian tugas SKP Anda yang telah diverifikasi oleh atasan langsung pada periode aktif {data.periode?.tahun || '2026'}.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Aktivitas Terkini & Quick Shortcuts */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Shortcuts */}
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs space-y-3">
            <h4 className="font-headline-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">
              Aksi Cepat & Navigasi
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {role !== 'staff' && (
                <Link
                  href="/cascading/penugasan"
                  className="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 flex flex-col items-start gap-1 transition-colors text-xs font-bold text-on-surface"
                >
                  <span className="material-symbols-outlined text-primary text-lg">call_split</span>
                  Penugasan Bawahan
                </Link>
              )}
              <Link
                href="/cascading/dialog-kinerja"
                className="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 flex flex-col items-start gap-1 transition-colors text-xs font-bold text-on-surface"
              >
                <span className="material-symbols-outlined text-emerald-600 text-lg">forum</span>
                Dialog Kinerja
              </Link>
              <Link
                href="/pelaporan-capaian"
                className="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 flex flex-col items-start gap-1 transition-colors text-xs font-bold text-on-surface"
              >
                <span className="material-symbols-outlined text-sky-600 text-lg">fact_check</span>
                Lapor Capaian
              </Link>
              <Link
                href="/cascading/matriks"
                className="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 flex flex-col items-start gap-1 transition-colors text-xs font-bold text-on-surface"
              >
                <span className="material-symbols-outlined text-purple-600 text-lg">hub</span>
                Matriks Cascading
              </Link>
            </div>
          </div>

          {/* Feed Aktivitas Terkini (Live Feed from cascading_laporan_kerja) */}
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <h4 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-primary">history</span>
                Aktivitas Pelaporan Terkini
              </h4>
              <Link href="/pelaporan-capaian" className="text-[11px] font-bold text-primary hover:underline">
                Lihat Semua
              </Link>
            </div>

            {data.recentActivities.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic py-4 text-center">
                Belum ada aktivitas pelaporan capaian yang terekam.
              </p>
            ) : (
              <div className="space-y-3.5">
                {data.recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      act.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : act.status === 'revision'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {act.status === 'approved' ? 'check_circle' : act.status === 'revision' ? 'error' : 'schedule'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-on-surface line-clamp-1 leading-snug">
                        {act.user?.pegawai?.nama_lengkap || act.user?.email}
                      </p>
                      <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                        +{act.capaian} • "{act.keterangan}"
                      </p>
                      <span className="text-[10px] text-on-surface-variant/60 block mt-0.5">
                        {new Date(act.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {act.evidence_url && (
                      <a
                        href={act.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-dark p-1"
                        title="Buka Bukti Drive"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
