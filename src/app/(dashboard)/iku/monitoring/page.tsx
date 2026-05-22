'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IKUPengajuanItem } from '@/lib/types'
import { useAuthStore } from '@/store/authStore'
import Swal from 'sweetalert2'

export default function MonitoringIKUPage() {
  const user = useAuthStore(state => state.user)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (user) fetchMonitoringData()
  }, [user])

  const fetchMonitoringData = async () => {
    setLoading(true)
    
    // We fetch approved pengajuans for this manajer
    const { data: pengajuans, error: pError } = await supabase
      .from('iku_pengajuan')
      .select('id, judul, periode:master_periode_iku(tahun_iku)')
      .eq('manajer_id', user?.id)
      .eq('status', 'approved')

    if (pError) {
      console.error(pError)
      Swal.fire('Error', 'Gagal memuat data IKU', 'error')
      setLoading(false)
      return
    }

    if (pengajuans && pengajuans.length > 0) {
      const pengajuanIds = pengajuans.map(p => p.id)
      
      const { data: itemData, error: iError } = await supabase
        .from('iku_pengajuan_item')
        .select('*, iku:master_iku(*), laporan:iku_laporan(capaian)')
        .in('pengajuan_id', pengajuanIds)

      if (!iError && itemData) {
        const enrichedItems = itemData.map(item => {
          const parent = pengajuans.find(p => p.id === item.pengajuan_id)
          const totalCapaian = item.laporan?.reduce((sum: number, lap: any) => sum + Number(lap.capaian), 0) || 0
          const percentage = item.target_output > 0 ? Number(((totalCapaian / item.target_output) * 100).toFixed(2)) : 0
          
          return {
            ...item,
            pengajuan: parent,
            totalCapaian,
            percentage
          }
        })
        
        // Sort by percentage descending
        enrichedItems.sort((a, b) => b.percentage - a.percentage)
        setItems(enrichedItems)
      }
    } else {
      setItems([])
    }

    setLoading(false)
  }

  // Stats calculation
  const totalIKU = items.length
  const avgAchievement = totalIKU > 0 ? Number((items.reduce((sum, item) => sum + item.percentage, 0) / totalIKU).toFixed(2)) : 0
  const ikuTercapai = items.filter(i => i.percentage >= 100).length
  const ikuBelum = totalIKU - ikuTercapai

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Monitoring IKU Bagian</h2>
          <p className="text-body-lg text-on-surface-variant">Ringkasan progres seluruh IKU yang disetujui</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">assignment</span>
            </div>
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Total IKU</p>
          </div>
          <p className="text-4xl font-extrabold text-on-surface pl-14">{totalIKU}</p>
        </div>
        
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Rata-Rata Capaian</p>
          </div>
          <p className="text-4xl font-extrabold text-on-surface pl-14">{avgAchievement}%</p>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Tercapai (≥100%)</p>
          </div>
          <p className="text-4xl font-extrabold text-on-surface pl-14">{ikuTercapai}</p>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Sedang Berjalan</p>
          </div>
          <p className="text-4xl font-extrabold text-on-surface pl-14">{ikuBelum}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-white/40">
          <h3 className="font-headline-md text-headline-md text-on-surface">Rincian Capaian IKU</h3>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="p-10 text-center text-outline flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-outline border-t-primary rounded-full animate-spin"></div>
              Memuat data...
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-surface-container-low/50">
                <tr>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">IKU & Periode</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Output Target</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Target</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Tercapai</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider w-64">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-outline">
                      Belum ada data monitoring IKU.
                    </td>
                  </tr>
                ) : items.map(item => (
                  <tr key={item.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <span className="inline-block px-2 py-0.5 mt-0.5 bg-surface-container-low rounded border border-outline-variant/20 text-[10px] font-bold text-outline">
                          {item.iku?.kode_iku}
                        </span>
                        <div>
                          <p className="font-bold text-on-surface mb-1">{item.iku?.nama_iku}</p>
                          <p className="text-[11px] text-on-surface-variant">{item.pengajuan?.periode?.tahun_iku} - {item.pengajuan?.judul}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body-sm text-on-surface-variant max-w-[200px] truncate" title={item.iku?.nama_output}>
                      {item.iku?.nama_output}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono font-bold">{item.target_output}</span>
                      <span className="text-[11px] text-outline ml-1">{item.satuan}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono font-bold ${item.percentage >= 100 ? 'text-success' : 'text-primary'}`}>
                        {item.totalCapaian}
                      </span>
                      <span className="text-[11px] text-outline ml-1">{item.satuan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${item.percentage >= 100 ? 'bg-success' : 'bg-primary'}`} 
                            style={{ width: `${Math.min(100, item.percentage)}%` }}>
                          </div>
                        </div>
                        <span className="text-body-sm font-bold min-w-[40px] text-right">{item.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
