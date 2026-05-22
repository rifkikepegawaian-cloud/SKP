'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS, UserRole } from '@/lib/types'

export default function ProfilPage() {
  const user = useAuthStore(state => state.user)
  const fetchProfile = useAuthStore(state => state.fetchProfile)
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Change password state
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwError, setPwError] = useState('')

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!user) fetchProfile()
  }, [user, fetchProfile])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')

    if (newPassword.length < 8) {
      setPwError('Password baru minimal 8 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Konfirmasi password tidak cocok.')
      return
    }

    setSaving(true)
    // Reauthenticate with old password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: oldPassword,
    })

    if (signInError) {
      setPwError('Password lama tidak sesuai.')
      setSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      showToast('Gagal mengubah password: ' + error.message, 'error')
    } else {
      showToast('Password berhasil diubah!', 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSaving(false)
  }

  const initials = user?.pegawai?.nama_lengkap
    ? user.pegawai.nama_lengkap.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : (user?.email?.[0] ?? 'U').toUpperCase()

  const roleLabel = user?.role ? (ROLE_LABELS[user.role as UserRole] ?? user.role) : '-'

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    rektor: 'bg-purple-100 text-purple-700',
    pimpinan_sukpa: 'bg-indigo-100 text-indigo-700',
    pimpinan_unit: 'bg-blue-100 text-blue-700',
    manajer: 'bg-cyan-100 text-cyan-700',
    supervisor: 'bg-teal-100 text-teal-700',
    staff: 'bg-secondary-container text-on-secondary-container',
  }
  const roleColor = user?.role ? (roleColors[user.role] ?? roleColors.staff) : roleColors.staff

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up ${
          toast.type === 'success' ? 'bg-success text-white' : 'bg-error text-white'
        }`}>
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-label-md">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Profil Saya</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Lihat dan kelola informasi akun Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left: Profile Card ── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Avatar + Identity */}
          <div className="glass-card rounded-3xl p-8 flex flex-col items-center text-center gap-4">
            <div className="relative">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="avatar"
                  className="w-24 h-24 rounded-full object-cover"
                  style={{ border: '3px solid #d8e2ff' }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-extrabold shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#0059bb,#0070ea)', border: '3px solid #d8e2ff' }}
                >
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-success flex items-center justify-center shadow">
                <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
              </div>
            </div>

            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface leading-tight">
                {user?.pegawai?.nama_lengkap ?? user?.email ?? '-'}
              </h3>
              <p className="text-body-sm text-on-surface-variant mt-1">{user?.email}</p>
            </div>

            <span className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm ${roleColor}`}>
              {roleLabel}
            </span>
          </div>

          {/* Quick Stats */}
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <h4 className="font-headline-md text-body-lg font-bold text-on-surface mb-2">Informasi Akun</h4>
            <div className="space-y-3 divide-y divide-outline-variant/10">
              <div className="pt-3 first:pt-0">
                <p className="text-[11px] uppercase tracking-wider text-outline font-semibold mb-1" style={{ fontFamily: 'JetBrains Mono' }}>Email Login</p>
                <p className="text-body-sm text-on-surface font-medium break-all">{user?.email ?? '-'}</p>
              </div>
              <div className="pt-3">
                <p className="text-[11px] uppercase tracking-wider text-outline font-semibold mb-1" style={{ fontFamily: 'JetBrains Mono' }}>Role Sistem</p>
                <p className="text-body-sm text-on-surface font-medium">{roleLabel}</p>
              </div>
              <div className="pt-3">
                <p className="text-[11px] uppercase tracking-wider text-outline font-semibold mb-1" style={{ fontFamily: 'JetBrains Mono' }}>Terdaftar Sejak</p>
                <p className="text-body-sm text-on-surface font-medium">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Data Pegawai + Change Password ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Data Pegawai */}
          <div className="glass-card rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">badge</span>
              </div>
              <div>
                <h4 className="font-headline-md text-body-lg font-bold text-on-surface">Data Kepegawaian</h4>
                <p className="text-body-sm text-on-surface-variant">Informasi dari data pegawai institusi.</p>
              </div>
            </div>

            {user?.pegawai ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* NIP */}
                <div className="bg-surface-container-low rounded-2xl p-5">
                  <p className="text-[11px] uppercase tracking-wider text-outline font-semibold mb-2" style={{ fontFamily: 'JetBrains Mono' }}>NIP</p>
                  <p className="font-body-md text-on-surface font-bold tracking-wider" style={{ fontFamily: 'JetBrains Mono' }}>
                    {user.pegawai.nip}
                  </p>
                </div>

                {/* Nama Lengkap */}
                <div className="bg-surface-container-low rounded-2xl p-5">
                  <p className="text-[11px] uppercase tracking-wider text-outline font-semibold mb-2" style={{ fontFamily: 'JetBrains Mono' }}>Nama Lengkap</p>
                  <p className="font-body-md text-on-surface font-semibold">{user.pegawai.nama_lengkap}</p>
                </div>

                {/* Unit ES II */}
                <div className="bg-surface-container-low rounded-2xl p-5">
                  <p className="text-[11px] uppercase tracking-wider text-outline font-semibold mb-2" style={{ fontFamily: 'JetBrains Mono' }}>Unit ES II</p>
                  <p className="font-body-md text-on-surface font-medium">{user.pegawai.unit_es2 || '-'}</p>
                </div>

                {/* Unit ES III */}
                <div className="bg-surface-container-low rounded-2xl p-5">
                  <p className="text-[11px] uppercase tracking-wider text-outline font-semibold mb-2" style={{ fontFamily: 'JetBrains Mono' }}>Unit ES III</p>
                  <p className="font-body-md text-on-surface font-medium">{user.pegawai.unit_es3 || '-'}</p>
                </div>

                {/* Unit ES IV */}
                <div className="bg-surface-container-low rounded-2xl p-5 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wider text-outline font-semibold mb-2" style={{ fontFamily: 'JetBrains Mono' }}>Unit ES IV</p>
                  <p className="font-body-md text-on-surface font-medium">{user.pegawai.unit_es4 || '-'}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-outline-variant/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-outline-variant text-[32px]">person_off</span>
                </div>
                <p className="font-body-md text-on-surface-variant font-semibold">Data pegawai belum terhubung</p>
                <p className="text-body-sm text-outline mt-1">Hubungi admin untuk menautkan data kepegawaian Anda.</p>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="glass-card rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                <span className="material-symbols-outlined">lock_reset</span>
              </div>
              <div>
                <h4 className="font-headline-md text-body-lg font-bold text-on-surface">Ubah Password</h4>
                <p className="text-body-sm text-on-surface-variant">Gunakan password yang kuat minimal 8 karakter.</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg">
              {/* Old password */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">Password Lama</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl pl-12 pr-12 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowOld(!showOld)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">{showOld ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">Password Baru</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock_open</span>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="Min. 8 karakter"
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl pl-12 pr-12 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">{showNew ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">Konfirmasi Password Baru</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">verified</span>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Ulangi password baru"
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl pl-12 pr-12 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Password strength indicator */}
              {newPassword.length > 0 && (
                <div>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map(level => (
                      <div key={level} className={`h-1.5 flex-1 rounded-full transition-colors ${
                        newPassword.length >= level * 3
                          ? level <= 1 ? 'bg-error'
                            : level === 2 ? 'bg-warning'
                            : level === 3 ? 'bg-info'
                            : 'bg-success'
                          : 'bg-surface-container'
                      }`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-outline">
                    {newPassword.length < 4 ? 'Lemah' : newPassword.length < 7 ? 'Cukup' : newPassword.length < 10 ? 'Baik' : 'Sangat Kuat'}
                  </p>
                </div>
              )}

              {/* Error message */}
              {pwError && (
                <div className="p-4 bg-error-container/30 border border-error/20 rounded-xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-error text-[18px]">error</span>
                  <p className="text-body-sm text-error">{pwError}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving || !oldPassword || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-xl font-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Simpan Password Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
