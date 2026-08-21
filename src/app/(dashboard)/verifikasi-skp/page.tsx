'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SKPPlan } from '@/lib/types'
import { useAuthStore } from '@/store/authStore'
import Swal from 'sweetalert2'

export default function VerifikasiSKPPage() {
  const user = useAuthStore(state => state.user)
  const [plans, setPlans] = useState<SKPPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Semua')
  
  const [selected, setSelected] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'closed' | 'review'>('closed')
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const isSupervisor = user?.role.includes('supervisor')
  const isManajer = user?.role.includes('manajer')

  useEffect(() => {
    if (user) fetchSKP()
  }, [user])

  const fetchSKP = async () => {
    setLoading(true)
    
    // As Supervisor, we review Staff's SKP in our unit_es4.
    // As Manajer, we review Supervisor's SKP in our unit_es3.
    const { data, error } = await supabase
      .from('skp_plans')
      .select('*, owner:users(*, pegawai(*)), iku_item:iku_pengajuan_item(iku:master_iku(*)), parent_skp:skp_plans!parent_skp_id(rencana_aksi)')
      .neq('status', 'draft')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error(error)
      Swal.fire('Error', 'Gagal memuat data pengajuan SKP', 'error')
    } else {
      let filteredData = data as any[]
      
      filteredData = filteredData.filter(p => {
        const owner = p.owner
        if (!owner) return false
        
        let showAsSupervisor = false
        if (isSupervisor && owner.role.includes('staff')) {
          const matchEs2 = owner.pegawai?.unit_es2 && user?.pegawai?.unit_es2 && owner.pegawai.unit_es2.trim().toLowerCase() === user.pegawai.unit_es2.trim().toLowerCase()
          const matchEs3 = owner.pegawai?.unit_es3 && user?.pegawai?.unit_es3 && owner.pegawai.unit_es3.trim().toLowerCase() === user.pegawai.unit_es3.trim().toLowerCase()
          const matchEs4 = owner.pegawai?.unit_es4 && user?.pegawai?.unit_es4 && owner.pegawai.unit_es4.trim().toLowerCase() === user.pegawai.unit_es4.trim().toLowerCase()
          showAsSupervisor = !!(matchEs2 && matchEs3 && matchEs4)
        }

        let showAsManajer = false
        if (isManajer && owner.role.includes('supervisor')) {
          const matchEs2 = owner.pegawai?.unit_es2 && user?.pegawai?.unit_es2 && owner.pegawai.unit_es2.trim().toLowerCase() === user.pegawai.unit_es2.trim().toLowerCase()
          const matchEs3 = owner.pegawai?.unit_es3 && user?.pegawai?.unit_es3 && owner.pegawai.unit_es3.trim().toLowerCase() === user.pegawai.unit_es3.trim().toLowerCase()
          showAsManajer = !!(matchEs2 && matchEs3)
        }
        
        return showAsSupervisor || showAsManajer
      })
      
      setPlans(filteredData || [])
    }
    setLoading(false)
  }

  const handleReview = async (status: 'approved' | 'rejected' | 'revision') => {
    if (!selected) return

    if ((status === 'rejected' || status === 'revision') && !catatan.trim()) {
      Swal.fire('Peringatan', 'Catatan wajib diisi jika menolak atau meminta revisi', 'warning')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('skp_plans')
      .update({
        status,
        catatan_reviewer: status === 'approved' ? null : catatan,
        updated_at: new Date().toISOString()
      })
      .eq('id', selected.id)

    setSaving(false)

    if (error) {
      Swal.fire('Error', 'Gagal memproses review', 'error')
    } else {
      Swal.fire('Berhasil', `Rencana SKP telah ${status === 'approved' ? 'disetujui' : (status === 'rejected' ? 'ditolak' : 'dikembalikan untuk direvisi')}`, 'success')
      setModalMode('closed')
      fetchSKP()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-info/10 text-info">Perlu Review</span>
      case 'approved': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-success/10 text-success">Disetujui</span>
      case 'rejected': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-error/10 text-error">Ditolak</span>
      case 'revision': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-warning/10 text-warning">Direvisi</span>
      default: return null
    }
  }

  const filteredPlans = plans.filter(p => {
    if (filter === 'Semua') return true
    if (filter === 'Pending') return p.status === 'pending'
    if (filter === 'Selesai') return p.status === 'approved' || p.status === 'rejected'
    return true
  })

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Verifikasi SKP Bawahan</h2>
          <p className="text-body-lg text-on-surface-variant">
            {isManajer ? `Level: Supervisor (Unit Es 3: ${user?.pegawai?.unit_es3 || '-'})` : `Level: Staff (Unit Es 4: ${user?.pegawai?.unit_es4 || '-'})`}
          </p>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-white/40">
          <h3 className="font-headline-md text-headline-md text-on-surface">Daftar Pengajuan SKP</h3>
          
          <div className="flex gap-2">
            {['Semua', 'Pending', 'Selesai'].map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl font-bold text-label-sm transition-colors ${filter === tab ? 'bg-primary text-white' : 'bg-surface-container hover:bg-surface-container-high text-outline'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="p-10 text-center text-outline flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-outline border-t-primary rounded-full animate-spin"></div>
              Memuat data...
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-surface-container-low/50">
                <tr>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Nama Pegawai</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Induk Cascading</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Rencana Aksi</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-outline">
                      Belum ada pengajuan SKP yang masuk.
                    </td>
                  </tr>
                ) : filteredPlans.map((p: any) => (
                  <tr key={p.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface mb-1">{p.owner?.pegawai?.nama_lengkap || p.owner?.email}</p>
                      <p className="text-[11px] text-on-surface-variant">{p.owner?.pegawai?.jabatan || 'Staff'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {isManajer 
                        ? <span className="text-body-sm text-on-surface-variant">{p.iku_item?.iku?.nama_kegiatan || p.iku_item?.iku?.kode_iku}</span>
                        : <span className="text-body-sm text-on-surface-variant line-clamp-2">{p.parent_skp?.rencana_aksi}</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface mb-1 line-clamp-2">{p.rencana_aksi}</p>
                      <p className="text-body-sm text-on-surface-variant font-mono">
                        Target: {p.target_individual} {p.satuan}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { 
                          setSelected(p); 
                          setCatatan(p.catatan_reviewer || ''); 
                          setModalMode('review') 
                        }} 
                        className={`px-4 py-2 rounded-xl font-bold text-label-sm transition-colors ${p.status === 'pending' ? 'bg-primary/10 text-primary hover:bg-primary hover:text-white' : 'bg-surface-container text-outline hover:bg-surface-container-high'}`}>
                        {p.status === 'pending' ? 'Review' : 'Detail'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Review */}
      {modalMode === 'review' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalMode('closed')}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
            
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-start bg-surface-container-lowest">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Review SKP Bawahan</h3>
                <div className="flex items-center gap-3">
                  <p className="text-body-sm text-on-surface-variant">Pegawai: <strong>{selected.owner?.pegawai?.nama_lengkap}</strong></p>
                  {getStatusBadge(selected.status)}
                </div>
              </div>
              <button onClick={() => setModalMode('closed')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-surface-container-lowest/50">
              
              <div className="mb-6">
                <p className="text-[11px] text-outline uppercase tracking-wider mb-2">Induk Cascading</p>
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  {isManajer ? (
                    <>
                      <p className="font-bold text-on-surface text-body-md mb-1">{selected.iku_item?.iku?.nama_kegiatan}</p>
                      <p className="text-body-sm text-on-surface-variant">Dari IKU: {selected.iku_item?.iku?.kode_iku} - {selected.iku_item?.iku?.nama_iku}</p>
                    </>
                  ) : (
                    <p className="font-bold text-on-surface text-body-md">{selected.parent_skp?.rencana_aksi}</p>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <p className="text-[11px] text-outline uppercase tracking-wider mb-2">Rencana Aksi & Target Individu</p>
                <div className="p-4 bg-white rounded-xl border border-outline-variant/50 shadow-sm">
                  <p className="font-headline-sm text-on-surface mb-4">{selected.rencana_aksi}</p>
                  <div className="flex gap-4 border-t border-outline-variant/20 pt-4">
                    <div>
                      <p className="text-[11px] text-outline uppercase tracking-wider mb-1">Target</p>
                      <p className="font-mono font-bold text-primary text-body-lg">{selected.target_individual}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-outline uppercase tracking-wider mb-1">Satuan</p>
                      <p className="font-bold text-on-surface text-body-lg">{selected.satuan}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Review (Only show if pending) */}
              {selected.status === 'pending' ? (
                <div className="p-6 bg-warning/5 border border-warning/20 rounded-2xl">
                  <h4 className="font-headline-sm text-on-surface mb-4">Keputusan Verifikasi</h4>
                  <div className="mb-4">
                    <label className="block font-label-md text-on-surface-variant mb-2">Catatan Reviewer (Wajib jika menolak/revisi)</label>
                    <textarea value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Berikan catatan perbaikan atau alasan penolakan..." rows={3}
                      className="w-full bg-white border border-outline-variant/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none text-body-md" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleReview('approved')} disabled={saving}
                      className="flex-1 py-3 rounded-xl bg-success text-white font-bold shadow-lg shadow-success/20 hover:opacity-90 transition-all flex justify-center gap-2">
                      {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="material-symbols-outlined">thumb_up</span>}
                      Setujui
                    </button>
                    <button onClick={() => handleReview('revision')} disabled={saving}
                      className="flex-1 py-3 rounded-xl bg-warning text-white font-bold shadow-lg shadow-warning/20 hover:opacity-90 transition-all flex justify-center gap-2">
                      <span className="material-symbols-outlined">edit_note</span>
                      Revisi
                    </button>
                    <button onClick={() => handleReview('rejected')} disabled={saving}
                      className="flex-1 py-3 rounded-xl bg-error text-white font-bold shadow-lg shadow-error/20 hover:opacity-90 transition-all flex justify-center gap-2">
                      <span className="material-symbols-outlined">thumb_down</span>
                      Tolak
                    </button>
                  </div>
                </div>
              ) : (
                selected.catatan_reviewer && (
                  <div className="mt-2 p-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
                    <p className="text-label-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">info</span> Catatan Reviewer:
                    </p>
                    <p className="text-body-md whitespace-pre-wrap">{selected.catatan_reviewer}</p>
                  </div>
                )
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
