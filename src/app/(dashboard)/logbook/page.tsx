'use client'

export default function LogbookPage() {
  return (
    <div>
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <nav className="flex items-center gap-2 text-label-sm font-label-sm text-on-surface-variant mb-2">
            <span>Aplikasi</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">Logbook Harian</span>
          </nav>
          <h1 className="font-headline-lg text-headline-lg text-on-background">Logbook & Bukti Dukung</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Kelola laporan harian dan lampirkan bukti capaian kinerja Anda.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-body-md font-semibold shadow-lg shadow-primary/20 hover:-translate-y-1 transition-transform active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Tambah Logbook
          </button>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Calendar & Filters */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline-md text-body-lg font-bold">Oktober 2023</h3>
              <div className="flex gap-1">
                <button className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">chevron_left</span></button>
                <button className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">chevron_right</span></button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center mb-4">
              <span className="font-label-sm text-label-sm text-outline opacity-60">SN</span>
              <span className="font-label-sm text-label-sm text-outline opacity-60">SL</span>
              <span className="font-label-sm text-label-sm text-outline opacity-60">RB</span>
              <span className="font-label-sm text-label-sm text-outline opacity-60">KM</span>
              <span className="font-label-sm text-label-sm text-outline opacity-60">JM</span>
              <span className="font-label-sm text-label-sm text-outline opacity-60">SB</span>
              <span className="font-label-sm text-label-sm text-outline opacity-60">MG</span>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              <button className="aspect-square flex items-center justify-center rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-colors">23</button>
              <button className="aspect-square flex items-center justify-center rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-colors">24</button>
              <button className="aspect-square flex items-center justify-center rounded-xl font-label-md text-label-md bg-primary text-white font-bold shadow-md shadow-primary/30">25</button>
              <button className="aspect-square flex items-center justify-center rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-colors relative">
                26
                <span className="absolute bottom-1.5 w-1 h-1 bg-success rounded-full"></span>
              </button>
              <button className="aspect-square flex items-center justify-center rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-colors">27</button>
              <button className="aspect-square flex items-center justify-center rounded-xl font-label-md text-label-md text-outline/40">28</button>
              <button className="aspect-square flex items-center justify-center rounded-xl font-label-md text-label-md text-outline/40">29</button>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <h3 className="font-headline-md text-body-lg font-bold mb-4">Filter SKP</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer border border-transparent hover:border-outline-variant/30">
                <input type="radio" name="skp" defaultChecked className="text-primary focus:ring-primary/20" />
                <span className="text-body-sm font-medium">Semua Output SKP</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer border border-transparent hover:border-outline-variant/30">
                <input type="radio" name="skp" className="text-primary focus:ring-primary/20" />
                <span className="text-body-sm font-medium">Laporan Analisis SDM</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer border border-transparent hover:border-outline-variant/30">
                <input type="radio" name="skp" className="text-primary focus:ring-primary/20" />
                <span className="text-body-sm font-medium">Dokumen Evaluasi Kinerja</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-primary uppercase">Total Log</p>
              <p className="text-headline-md font-headline-md text-primary">24</p>
            </div>
            <div className="bg-success/5 p-4 rounded-2xl border border-success/10">
              <p className="text-label-sm font-label-sm text-success uppercase">Valid</p>
              <p className="text-headline-md font-headline-md text-success">18</p>
            </div>
          </div>
        </div>

        {/* Right Column: Logbook List */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="glass-card rounded-3xl p-6 group hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-container/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                </div>
                <div>
                  <h4 className="font-headline-md text-body-lg font-bold text-on-background">Review usulan promosi jabatan fungsional</h4>
                  <p className="text-body-sm text-on-surface-variant flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    25 Okt 2023 • 08:30 - 12:00
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-success/10 text-success px-3 py-1 rounded-full font-label-sm text-label-sm uppercase">Uploaded</span>
                <button className="p-2 hover:bg-surface-container rounded-full transition-colors"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
              </div>
            </div>
            <p className="text-body-md text-on-surface-variant mb-6 leading-relaxed">
              Melakukan verifikasi berkas administrasi dan penilaian angka kredit untuk 15 orang calon pejabat fungsional di lingkungan Biro SDM. Memastikan semua dokumen pendukung sesuai dengan peraturan terbaru.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-outline-variant/20">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-label-sm font-label-sm text-outline uppercase">Progress</span>
                  <div className="w-24 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[75%] rounded-full progress-fill"></div>
                  </div>
                  <span className="text-label-sm font-label-sm text-primary font-bold">75%</span>
                </div>
                <div className="h-4 w-[1px] bg-outline-variant/30"></div>
                <div className="flex items-center gap-2 text-primary font-medium hover:underline cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">attachment</span>
                  <span className="text-body-sm">berkas_verifikasi_v2.pdf</span>
                </div>
              </div>
              <span className="bg-surface-container text-on-surface-variant px-3 py-1 rounded-lg text-label-sm font-label-sm">Output: Analisis SDM</span>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 group border-dashed border-2 border-outline-variant/40 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center text-warning">
                  <span className="material-symbols-outlined">pending_actions</span>
                </div>
                <div>
                  <h4 className="font-headline-md text-body-lg font-bold text-on-background">Penyusunan draft laporan evaluasi KPI triwulan III</h4>
                  <p className="text-body-sm text-on-surface-variant flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    24 Okt 2023 • 13:00 - 17:00
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-warning/10 text-warning px-3 py-1 rounded-full font-label-sm text-label-sm uppercase">Pending Evidence</span>
                <button className="p-2 hover:bg-surface-container rounded-full transition-colors"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
              </div>
            </div>
            <p className="text-body-md text-on-surface-variant mb-6 leading-relaxed">
              Mengumpulkan data pencapaian KPI dari masing-masing departemen dan menyusunnya ke dalam format laporan dashboard eksekutif. Masih menunggu validasi data dari Departemen IT.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-outline-variant/20">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-label-sm font-label-sm text-outline uppercase">Progress</span>
                  <div className="w-24 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-warning w-[40%] rounded-full progress-fill"></div>
                  </div>
                  <span className="text-label-sm font-label-sm text-warning font-bold">40%</span>
                </div>
              </div>
              <button className="text-primary font-bold text-body-sm flex items-center gap-1 hover:bg-primary/5 px-4 py-2 rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Unggah Bukti Dukung
              </button>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button className="px-8 py-3 bg-surface-container text-primary font-bold rounded-2xl hover:bg-primary-container/20 transition-all">
              Muat Aktivitas Lainnya
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
