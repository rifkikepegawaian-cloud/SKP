'use client'

export default function PerencanaanSKPPage() {
  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Perencanaan SKP Tahunan</h2>
          <p className="text-body-lg text-on-surface-variant">Periode Penilaian: Januari - Desember 2024</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-body-md font-bold shadow-lg hover:-translate-y-1 transition-transform">
          <span className="material-symbols-outlined text-[20px]">send</span>
          Kirim untuk Approval
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Input Section (Form & Cascading) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <section className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <span className="material-symbols-outlined text-[24px]">account_tree</span>
              <h3 className="font-headline-md text-headline-md">Cascading Target</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">IKU Program Utama</label>
                <select className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
                  <option>Optimasi Budaya Kerja Digital 2024</option>
                  <option>Transformasi Kompetensi SDM 4.0</option>
                </select>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Aktivitas Cascading</label>
                <select className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
                  <option>Penyusunan Kurikulum Digital HR</option>
                  <option>Implementasi Sistem Monitoring Realtime</option>
                </select>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Output Target</label>
                <select className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
                  <option>Modul Pelatihan Berbasis LMS (10 Unit)</option>
                  <option>Dokumen SOP Digital (5 Dokumen)</option>
                </select>
              </div>
            </div>
          </section>

          <section className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <span className="material-symbols-outlined text-[24px]">edit_note</span>
              <h3 className="font-headline-md text-headline-md">Rencana Aksi</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Detail Rencana Aksi</label>
                <textarea className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none" placeholder="Deskripsikan langkah konkret yang akan dilakukan..." rows={3}></textarea>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Target Tahunan (Kuantitas/Waktu)</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none" placeholder="Nilai" />
                  <input type="text" className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none" placeholder="Satuan (ex: %)" />
                </div>
              </div>
              <button className="w-full bg-surface-container text-primary font-bold py-3 rounded-xl hover:bg-surface-container-high transition-colors flex justify-center items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                Tambahkan ke Daftar
              </button>
            </div>
          </section>
        </div>

        {/* Table Section (Bento Style Card) */}
        <div className="col-span-12 lg:col-span-8">
          <section className="glass-card rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-white/40">
              <h3 className="font-headline-md text-headline-md text-on-surface">Daftar Usulan SKP</h3>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 px-3 py-1 bg-surface-container rounded-full text-label-sm font-label-md text-primary">
                  <span className="material-symbols-outlined text-[16px]">list_alt</span>
                  3 Items
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low/50">
                  <tr>
                    <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Aktivitas & Rencana Aksi</th>
                    <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Target</th>
                    <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  <tr className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-body-md font-bold text-on-surface">Penyusunan Kurikulum Digital HR</p>
                      <p className="text-body-sm text-on-surface-variant">Review 12 materi pelatihan kompetensi inti</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-label-md text-on-surface">12 Dokumen</p>
                      <p className="text-label-sm text-outline">100% Kualitas</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-success/10 text-success inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Approved
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-outline hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-body-md font-bold text-on-surface">Implementasi Monitoring Realtime</p>
                      <p className="text-body-sm text-on-surface-variant">Setup dashboard untuk 3 departemen pilot</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-label-md text-on-surface">3 Dashboard</p>
                      <p className="text-label-sm text-outline">Q3 Tuntas</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-warning/10 text-warning inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning"></span> Draft
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-outline hover:text-danger transition-colors">
                        <span className="material-symbols-outlined text-[20px]">delete_outline</span>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-body-md font-bold text-on-surface">Sosialisasi SKP Digital</p>
                      <p className="text-body-sm text-on-surface-variant">Edukasi penggunaan sistem kepada 250 karyawan</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-label-md text-on-surface">250 Orang</p>
                      <p className="text-label-sm text-outline">Mei 2024</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-warning/10 text-warning inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning"></span> Draft
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-outline hover:text-danger transition-colors">
                        <span className="material-symbols-outlined text-[20px]">delete_outline</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-surface-container-low/30 text-center">
              <p className="text-body-sm text-outline">Pastikan seluruh target cascading telah sesuai sebelum mengirimkan untuk approval atasan.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
