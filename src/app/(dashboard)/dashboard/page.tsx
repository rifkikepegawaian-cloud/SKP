'use client'

export default function DashboardPage() {
  return (
    <div>
      {/* Welcome Section & Reminder */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h3 className="font-headline-lg text-headline-lg text-on-background">Selamat Pagi!</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">Berikut adalah ringkasan performa kerja Anda periode ini.</p>
        </div>
        
        {/* Pending SKP Reminder */}
        <div className="glass-card bg-error-container/20 border-error/20 px-6 py-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-[24px]">warning</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-error-container">Perencanaan SKP Pending</p>
            <p className="text-body-sm text-on-surface-variant">Batas waktu pengisian: 3 hari lagi.</p>
          </div>
          <button className="ml-4 px-4 py-2 bg-error text-white text-label-sm font-label-md rounded-lg hover:shadow-lg transition-shadow">
            Lengkapi Sekarang
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">task_alt</span>
            </div>
            <span className="font-label-sm text-label-sm bg-success/10 text-success px-2 py-1 rounded">Target</span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant">Total SKP Approved</p>
          <div className="flex items-end gap-2 mt-1">
            <h4 className="font-headline-lg text-headline-lg text-on-surface">12</h4>
            <p className="text-body-sm text-on-surface-variant pb-1.5">dari 15 Rencana</p>
          </div>
        </div>
        
        <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center text-info">
              <span className="material-symbols-outlined text-[24px]">trending_up</span>
            </div>
            <span className="font-label-sm text-label-sm bg-info/10 text-info px-2 py-1 rounded">+2.4% MoM</span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant">Average Achievement</p>
          <div className="flex items-end gap-2 mt-1">
            <h4 className="font-headline-lg text-headline-lg text-on-surface">94.2%</h4>
            <p className="text-body-sm text-on-surface-variant pb-1.5">Rating: Sangat Baik</p>
          </div>
        </div>
        
        <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
              <span className="material-symbols-outlined text-[24px]">history_edu</span>
            </div>
            <span className="font-label-sm text-label-sm bg-warning/10 text-warning px-2 py-1 rounded">Review Needed</span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant">Active Logbooks</p>
          <div className="flex items-end gap-2 mt-1">
            <h4 className="font-headline-lg text-headline-lg text-on-surface">48</h4>
            <p className="text-body-sm text-on-surface-variant pb-1.5">Entri Bulan Ini</p>
          </div>
        </div>
      </div>

      {/* Main Dashboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overall Progress (Left 7 cols) */}
        <div className="lg:col-span-7 glass-card p-8 rounded-3xl overflow-hidden relative">
          <div className="relative z-10">
            <h5 className="font-headline-md text-headline-md text-on-background mb-6">Progres Performa Keseluruhan</h5>
            <div className="space-y-8">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-body-md text-on-surface font-semibold">Capaian Utama (Utama)</span>
                  <span className="font-label-md text-primary">88%</span>
                </div>
                <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full progress-fill" style={{ width: '88%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-body-md text-on-surface font-semibold">Target Tambahan</span>
                  <span className="font-label-md text-success">100%</span>
                </div>
                <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full progress-fill" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-body-md text-on-surface font-semibold">Perilaku Kerja</span>
                  <span className="font-label-md text-info">92%</span>
                </div>
                <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-info rounded-full progress-fill" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 p-6 bg-surface-container-low rounded-2xl border border-primary/10 flex items-center gap-6">
              <div className="flex-shrink-0 relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle className="text-surface-variant" cx="40" cy="40" fill="transparent" r="36" stroke="currentColor" strokeWidth="8"></circle>
                  <circle className="text-primary" cx="40" cy="40" fill="transparent" r="36" stroke="currentColor" strokeDasharray="226.19" strokeDashoffset="13.57" strokeWidth="8"></circle>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-headline-md text-primary text-lg">94%</span>
              </div>
              <div>
                <p className="font-headline-md text-headline-md text-on-surface">Predikat Kinerja</p>
                <p className="text-body-md text-on-surface-variant">Hasil evaluasi sementara Anda berada di kategori <span className="text-primary font-bold">ISTIMEWA</span>.</p>
              </div>
            </div>
          </div>
          
          {/* Abstract visual element */}
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        </div>

        {/* Aktivitas Terbaru (Right 5 cols) */}
        <div className="lg:col-span-5 glass-card p-8 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h5 className="font-headline-md text-headline-md text-on-background">Aktivitas Terbaru</h5>
            <a href="#" className="text-primary font-label-md text-label-md hover:underline">Lihat Semua</a>
          </div>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">edit_note</span>
              </div>
              <div className="flex-grow">
                <p className="font-body-md text-on-surface font-medium leading-tight">Pengisian Logbook: Analisis Data Q3</p>
                <p className="text-body-sm text-on-surface-variant mt-1">Selesai menganalisis laporan departemen keuangan.</p>
                <span className="text-[11px] font-label-sm text-outline-variant mt-1 block">Hari ini, 09:15 AM</span>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                <span className="material-symbols-outlined text-xl">check_circle</span>
              </div>
              <div className="flex-grow">
                <p className="font-body-md text-on-surface font-medium leading-tight">SKP Disetujui: Modul Efisiensi</p>
                <p className="text-body-sm text-on-surface-variant mt-1">Reviewer: Pimpinan</p>
                <span className="text-[11px] font-label-sm text-outline-variant mt-1 block">Kemarin, 14:30 PM</span>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-info/10 flex items-center justify-center text-info">
                <span className="material-symbols-outlined text-xl">forum</span>
              </div>
              <div className="flex-grow">
                <p className="font-body-md text-on-surface font-medium leading-tight">Feedback Baru Diterima</p>
                <p className="text-body-sm text-on-surface-variant mt-1">Hasil monitoring periode Agustus telah keluar.</p>
                <span className="text-[11px] font-label-sm text-outline-variant mt-1 block">22 Sep, 10:00 AM</span>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                <span className="material-symbols-outlined text-xl">update</span>
              </div>
              <div className="flex-grow">
                <p className="font-body-md text-on-surface font-medium leading-tight">Logbook Dikembalikan</p>
                <p className="text-body-sm text-on-surface-variant mt-1">Perlu revisi pada deskripsi kegiatan tanggal 20 Sep.</p>
                <span className="text-[11px] font-label-sm text-outline-variant mt-1 block">21 Sep, 16:45 PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
