'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [nip, setNip] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const fetchProfile = useAuthStore(state => state.fetchProfile)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError('')

    const cleanNip = nip.trim()
    const cleanPassword = password.trim()

    if (!cleanNip) {
      setError('Silakan masukkan NIP Anda.')
      setIsProcessing(false)
      return
    }

    if (!cleanPassword) {
      setError('Silakan masukkan password (8 digit terakhir NIP Anda).')
      setIsProcessing(false)
      return
    }

    // Format akun Supabase Auth menggunakan {NIP}@undip.ac.id
    const loginEmail = cleanNip.includes('@') ? cleanNip : `${cleanNip}@undip.ac.id`

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: cleanPassword,
    })

    if (authError) {
      setError('NIP atau password salah. Pastikan password menggunakan 8 digit terakhir NIP Anda.')
      setIsProcessing(false)
      return
    }

    // Fetch user profile to determine redirect
    const profile = await fetchProfile()

    if (!profile) {
      setError('Akun tidak ditemukan di sistem. Hubungi Admin.')
      setIsProcessing(false)
      return
    }

    // Redirect based on activeRole (resolved during fetchProfile)
    const activeRole = useAuthStore.getState().activeRole
    if (activeRole === 'admin') {
      router.push('/admin/manajemen-iku')
    } else if (['rektor', 'pimpinan_sukpa', 'pimpinan_unit'].some(r => activeRole === r)) {
      router.push('/monitoring')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
         style={{ background: 'linear-gradient(135deg, #e8f0fe 0%, #f8f9ff 40%, #e0f2fe 100%)' }}>
      
      {/* Background decorative blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-info/5 rounded-full blur-3xl animate-float" style={{ animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s', animationDuration: '5s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left: Branding Panel */}
        <div className="animate-slide-up hidden lg:flex flex-col gap-8">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                   style={{ background: 'linear-gradient(135deg, #0059bb, #0070ea)' }}>
                <span className="material-symbols-outlined text-white text-3xl">school</span>
              </div>
              <div>
                <h1 className="font-headline-md text-headline-md font-bold text-primary">SKP UNDIP</h1>
                <p className="font-label-sm text-label-sm text-secondary">Universitas Diponegoro</p>
              </div>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-background mb-3">
              HRIS Smart-<span className="text-primary">Performance</span>
            </h2>
            <p className="text-body-lg text-on-surface-variant leading-relaxed">
              Sistem Manajemen Kinerja Terintegrasi untuk PNS dan Tenaga Kependidikan.
            </p>
          </div>

          <div className="space-y-4">
            {/* Fitur 1: Cascading SKP */}
            <div className="flex items-start gap-4 p-4 glass-card rounded-2xl hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined">account_tree</span>
              </div>
              <div>
                <p className="font-body-md font-semibold text-on-surface">Cascading SKP</p>
                <p className="text-body-sm text-on-surface-variant">Hubungkan IKU Institusi ke rencana kinerja individu secara otomatis.</p>
              </div>
            </div>

            {/* Fitur 2: Evaluasi Kinerja SKP */}
            <div className="flex items-start gap-4 p-4 glass-card rounded-2xl hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success flex-shrink-0">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <div>
                <p className="font-body-md font-semibold text-on-surface">Evaluasi Kinerja SKP</p>
                <p className="text-body-sm text-on-surface-variant">Penilaian capaian hasil kerja kualitatif dan perilaku kerja BerAKHLAK sesuai PermenPAN-RB.</p>
              </div>
            </div>

            {/* Fitur 3: Dialog & Matriks Kinerja */}
            <div className="flex items-start gap-4 p-4 glass-card rounded-2xl hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info flex-shrink-0">
                <span className="material-symbols-outlined">forum</span>
              </div>
              <div>
                <p className="font-body-md font-semibold text-on-surface">Dialog & Matriks Kinerja</p>
                <p className="text-body-sm text-on-surface-variant">Penyelarasan target kinerja organisasi dari pimpinan universitas hingga pelaksana.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-label-sm text-label-sm font-bold">v2.1.0</span>
            <span className="text-body-sm text-on-surface-variant">Periode Aktif: Tahun {new Date().getFullYear()}</span>
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="animate-slide-up glass-card rounded-3xl p-8 lg:p-10 w-full max-w-md mx-auto" style={{ animationDelay: '0.1s' }}>
          
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0059bb, #0070ea)' }}>
              <span className="material-symbols-outlined text-white">school</span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-primary">SKP UNDIP</h1>
              <p className="font-label-sm text-label-sm text-secondary">HRIS Performance</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-headline-md text-headline-md text-on-background mb-2">Selamat Datang</h3>
            <p className="text-body-md text-on-surface-variant">Masuk untuk melanjutkan ke dashboard Anda.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container/30 border border-error/20 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-error text-[20px] mt-0.5">error</span>
              <p className="text-body-sm text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* NIP Input */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider font-semibold">
                NIP (Nomor Induk Pegawai)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">badge</span>
                <input
                  type="text"
                  placeholder="Masukkan NIP Anda (misal: 197007221998021002)"
                  required
                  value={nip}
                  onChange={e => setNip(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl pl-12 pr-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider font-semibold">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="8 digit terakhir NIP Anda"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl pl-12 pr-12 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium tracking-wide"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors cursor-pointer"
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-1.5 flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-sm text-primary">key</span>
                Gunakan 8 digit terakhir NIP Anda sebagai password.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="text-primary focus:ring-primary rounded" />
                <span className="text-body-sm text-on-surface-variant">Ingat saya</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full bg-primary text-on-primary py-3.5 rounded-xl font-headline-md font-bold shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group cursor-pointer ${
                isProcessing ? 'opacity-80 cursor-wait' : ''
              }`}
            >
              <span>{isProcessing ? 'Memproses...' : 'Masuk ke Dashboard'}</span>
              {!isProcessing && (
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          {/* Informasi Login Card */}
          <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-1">
            <p className="font-label-sm text-label-sm text-primary font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">info</span>
              Informasi Login Pegawai
            </p>
            <p className="text-body-sm text-on-surface-variant text-xs leading-relaxed">
              Masuk menggunakan <strong>NIP</strong> Anda sebagai username dan <strong>8 digit terakhir NIP</strong> sebagai password bawaan.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
