'use client'

export default function MonitoringPage() {
  return (
    <div>
      <div className="grid grid-cols-12 gap-6 mb-12">
        <div className="col-span-12 lg:col-span-4 glass-card p-6 rounded-xl flex flex-col justify-between">
          <div>
            <p className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Pencapaian Unit</p>
            <h3 className="text-headline-xl font-headline-xl text-primary">87.4%</h3>
          </div>
          <div className="mt-4">
            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full shadow-[0_0_8px_rgba(0,89,187,0.4)] progress-fill" style={{ width: '87.4%' }}></div>
            </div>
            <p className="text-body-sm text-on-surface-variant mt-2 font-medium">+2.3% dari bulan lalu</p>
          </div>
        </div>
        
        <div className="col-span-12 lg:col-span-5 glass-card p-6 rounded-xl">
          <p className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-4">Status Persetujuan SKP</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-container-low p-4 rounded-lg text-center border border-outline-variant/10">
              <p className="text-headline-md font-headline-md text-primary">12</p>
              <p className="text-label-sm font-label-sm text-on-surface-variant">Menunggu</p>
            </div>
            <div className="bg-success/10 p-4 rounded-lg text-center border border-success/20">
              <p className="text-headline-md font-headline-md text-success">45</p>
              <p className="text-label-sm font-label-sm text-success">Disetujui</p>
            </div>
            <div className="bg-error/10 p-4 rounded-lg text-center border border-error/20">
              <p className="text-headline-md font-headline-md text-error">3</p>
              <p className="text-label-sm font-label-sm text-error">Ditolak</p>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 bg-primary-container p-6 rounded-xl relative overflow-hidden group cursor-pointer shadow-lg shadow-primary-container/20">
          <div className="relative z-10">
            <h4 className="text-on-primary-container font-headline-md text-headline-md mb-2">Review Tercepat</h4>
            <p className="text-on-primary-container/80 text-body-sm">Ada 5 usulan mendesak yang butuh validasi hari ini.</p>
          </div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl text-on-primary-container/10 group-hover:scale-110 transition-transform">bolt</span>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden mb-12">
        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/50">
          <h3 className="text-headline-md font-headline-md text-on-background">Monitoring Kinerja Bawahan</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-surface-container-highest rounded-lg text-body-sm font-medium flex items-center gap-2 hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Filter
            </button>
            <button className="px-4 py-2 bg-surface-container-highest rounded-lg text-body-sm font-medium flex items-center gap-2 hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Ekspor Laporan
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container/30 border-b border-outline-variant/20">
              <tr>
                <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase">Bawahan</th>
                <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase">Status SKP</th>
                <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase">Progress Capaian</th>
                <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase">Evaluasi Terakhir</th>
                <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              <tr className="hover:bg-surface-container-low transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">AS</div>
                    <div>
                      <p className="font-body-md font-semibold text-on-background">Aditya Surya</p>
                      <p className="text-body-sm text-on-surface-variant">Sr. HR Specialist</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="bg-warning/10 text-warning px-3 py-1 rounded-full font-label-sm text-label-sm border border-warning/20">Review Unit</span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-24 bg-surface-container h-1.5 rounded-full">
                      <div className="bg-primary h-full progress-fill" style={{ width: '92%' }}></div>
                    </div>
                    <span className="text-body-sm font-semibold">92%</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <p className="text-body-sm text-on-surface-variant">14 Okt 2023</p>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Review">
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                    <button className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors" title="Approve">
                      <span className="material-symbols-outlined">check_circle</span>
                    </button>
                    <button className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors" title="Reject">
                      <span className="material-symbols-outlined">cancel</span>
                    </button>
                  </div>
                </td>
              </tr>
              
              <tr className="hover:bg-surface-container-low transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary font-bold">BM</div>
                    <div>
                      <p className="font-body-md font-semibold text-on-background">Budi Mahendra</p>
                      <p className="text-body-sm text-on-surface-variant">HR Analyst</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="bg-success/10 text-success px-3 py-1 rounded-full font-label-sm text-label-sm border border-success/20">Disetujui</span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-24 bg-surface-container h-1.5 rounded-full">
                      <div className="bg-primary h-full progress-fill" style={{ width: '78%' }}></div>
                    </div>
                    <span className="text-body-sm font-semibold">78%</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <p className="text-body-sm text-on-surface-variant">12 Okt 2023</p>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Review">
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                    <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-surface-container-low/30 border-t border-outline-variant/20 flex justify-between items-center">
          <p className="text-body-sm text-on-surface-variant">Menampilkan 2 dari 24 bawahan</p>
          <div className="flex gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded bg-surface-container border border-outline-variant/30 hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-bold">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-variant transition-colors">2</button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-surface-container border border-outline-variant/30 hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
