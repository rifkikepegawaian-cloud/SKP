'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IKUPengajuan } from '@/lib/types'
import { useAuthStore } from '@/store/authStore'
import Swal from 'sweetalert2'

export default function VerifikasiIKUPage() {
  const user = useAuthStore(state => state.user)
  const [pengajuans, setPengajuans] = useState<IKUPengajuan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Semua')
  const [selected, setSelected] = useState<IKUPengajuan | null>(null)
  const [modalMode, setModalMode] = useState<'closed' | 'review'>('closed')
  const [catatan, setCatatan] = useState('')
  const [itemCatatan, setItemCatatan] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (user) fetchPengajuans()
  }, [user])

  const fetchPengajuans = async () => {
    setLoading(true)
    
    // As Pimpinan Unit, we fetch all pengajuans, then filter those belonging to managers in our led_unit_es2
    // If Admin, fetch all.
    const isAdmin = user?.role.includes('admin')
    const ledUnit = user?.led_unit_es2

    const { data, error } = await supabase
      .from('iku_pengajuan')
      .select(`
        *, 
        periode:master_periode_iku(*), 
        items:iku_pengajuan_item(*, iku:master_iku(*)),
        manajer:users!iku_pengajuan_manajer_id_fkey(id, email, pegawai:pegawai(*))
      `)
      .neq('status', 'draft') // Draft is only visible to the owner
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error(error)
      Swal.fire('Error', 'Gagal memuat data pengajuan', 'error')
    } else {
      let filteredData = data as any[]
      
      if (!isAdmin && ledUnit) {
        // Filter by led_unit_es2 case-insensitive and trimmed
        filteredData = filteredData.filter(p => {
          const manajerUnit = p.manajer?.pegawai?.unit_es2;
          if (!manajerUnit) return false;
          return manajerUnit.trim().toLowerCase() === ledUnit.trim().toLowerCase();
        });
      }
      
      setPengajuans(filteredData || [])
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

    // Update item-level comments
    if (status !== 'approved') {
      for (const item of selected.items || []) {
        const cat = itemCatatan[item.id] || null
        await supabase
          .from('iku_pengajuan_item')
          .update({ catatan_pimpinan: cat })
          .eq('id', item.id)
      }
    }

    const { error } = await supabase
      .from('iku_pengajuan')
      .update({
        status,
        catatan_penolakan: status === 'approved' ? null : catatan,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', selected.id)

    setSaving(false)

    if (error) {
      Swal.fire('Error', 'Gagal memproses review pengajuan', 'error')
    } else {
      Swal.fire('Berhasil', `Pengajuan telah ${status === 'approved' ? 'disetujui' : (status === 'rejected' ? 'ditolak' : 'dikembalikan untuk direvisi')}`, 'success')
      setModalMode('closed')
      fetchPengajuans()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-info/10 text-info inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-info"></span> Perlu Review</span>
      case 'approved': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-success/10 text-success inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success"></span> Disetujui</span>
      case 'rejected': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-error/10 text-error inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-error"></span> Ditolak</span>
      case 'revision': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-warning/10 text-warning inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning"></span> Direvisi</span>
      default: return null
    }
  }

  const filteredPengajuans = pengajuans.filter(p => {
    if (filter === 'Semua') return true
    if (filter === 'Pending') return p.status === 'pending'
    if (filter === 'Selesai') return p.status === 'approved' || p.status === 'rejected'
    return true
  })

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Verifikasi IKU Bagian</h2>
          <p className="text-body-lg text-on-surface-variant">
            {user?.role.includes('admin') ? 'Seluruh Pengajuan' : `Unit: ${user?.led_unit_es2 || '-'}`}
          </p>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-white/40">
          <h3 className="font-headline-md text-headline-md text-on-surface">Daftar Pengajuan dari Manajer</h3>
          
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
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Pengaju (Manajer)</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Judul & Periode</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Jumlah IKU</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Tanggal Diajukan</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredPengajuans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-outline">
                      Belum ada pengajuan IKU yang masuk.
                    </td>
                  </tr>
                ) : filteredPengajuans.map(p => (
                  <tr key={p.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface mb-1">{(p as any).manajer?.pegawai?.nama_lengkap || (p as any).manajer?.email}</p>
                      <p className="text-[11px] text-on-surface-variant">{(p as any).manajer?.pegawai?.unit_es3}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface mb-1">{p.judul}</p>
                      <p className="text-body-sm text-on-surface-variant">Periode: <span className="font-mono">{p.periode?.tahun_iku}</span></p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-surface-container-low rounded-lg text-body-sm font-bold border border-outline-variant/30">
                        {p.items?.length || 0} Item
                      </span>
                    </td>
                    <td className="px-6 py-4 text-body-sm text-on-surface-variant">
                      {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { 
                          setSelected(p); 
                          setCatatan(p.catatan_penolakan || ''); 
                          const initialItemCat: Record<string, string> = {}
                          p.items?.forEach(item => { initialItemCat[item.id] = item.catatan_pimpinan || '' })
                          setItemCatatan(initialItemCat)
                          setModalMode('review') 
                        }} 
                        className={`px-4 py-2 rounded-xl font-bold text-label-sm transition-colors ${p.status === 'pending' ? 'bg-primary/10 text-primary hover:bg-primary hover:text-white' : 'bg-surface-container text-outline hover:bg-surface-container-high'}`}>
                        {p.status === 'pending' ? 'Review Sekarang' : 'Lihat Detail'}
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
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
            
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-start bg-surface-container-lowest">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Review Pengajuan: {selected.judul}</h3>
                <div className="flex items-center gap-3">
                  <p className="text-body-sm text-on-surface-variant">Pengaju: <strong>{(selected as any).manajer?.pegawai?.nama_lengkap}</strong></p>
                  <span className="text-outline">•</span>
                  <p className="text-body-sm text-on-surface-variant">Periode: <strong>{selected.periode?.tahun_iku}</strong></p>
                  {getStatusBadge(selected.status)}
                </div>
              </div>
              <button onClick={() => setModalMode('closed')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-surface-container-lowest/50">
              <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-4">Daftar IKU yang Diajukan</h4>
              
              <div className="space-y-4 mb-8">
                {selected.items?.map((item: any, idx) => (
                  <div key={item.id} className="p-4 bg-white border border-outline-variant/30 rounded-xl shadow-sm flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-label-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <span className="inline-block px-2 py-0.5 bg-surface-container-low rounded text-[11px] font-bold text-outline uppercase tracking-wider mb-2">
                        {item.iku?.kode_iku}
                      </span>
                      <h5 className="font-bold text-on-surface mb-1">{item.iku?.nama_iku}</h5>
                      <p className="text-body-sm text-on-surface-variant mb-4">{item.iku?.nama_kegiatan}</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[11px] text-outline uppercase tracking-wider mb-1">Output Target</p>
                          <p className="text-body-sm text-on-surface">{item.iku?.nama_output}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-outline uppercase tracking-wider mb-1">Target Angka</p>
                          <p className="font-mono font-bold text-primary text-body-lg">
                            {item.target_output} <span className="text-body-sm font-sans text-on-surface">{item.satuan}</span>
                          </p>
                        </div>
                      </div>

                      {selected.status === 'pending' ? (
                        <div className="mt-4 border-t border-outline-variant/20 pt-4">
                          <label className="block text-[11px] text-outline uppercase tracking-wider mb-2">Catatan untuk IKU ini (Opsional)</label>
                          <textarea
                            value={itemCatatan[item.id] || ''}
                            onChange={e => setItemCatatan({ ...itemCatatan, [item.id]: e.target.value })}
                            placeholder="Berikan catatan spesifik untuk usulan ini..."
                            rows={2}
                            className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                          />
                        </div>
                      ) : (
                        item.catatan_pimpinan && (
                          <div className="mt-4 p-3 bg-error/5 border border-error/20 rounded-lg">
                            <p className="text-[11px] font-bold text-error uppercase tracking-wider mb-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">warning</span> Catatan Pimpinan:
                            </p>
                            <p className="text-body-sm text-error">{item.catatan_pimpinan}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Review (Only show if pending) */}
              {selected.status === 'pending' ? (
                <div className="p-6 bg-warning/5 border border-warning/20 rounded-2xl">
                  <h4 className="font-headline-sm text-on-surface mb-4">Keputusan Verifikasi</h4>
                  <div className="mb-4">
                    <label className="block font-label-md text-on-surface-variant mb-2">Catatan Pimpinan (Wajib jika menolak/revisi)</label>
                    <textarea value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Berikan catatan perbaikan atau alasan penolakan..." rows={3}
                      className="w-full bg-white border border-outline-variant/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none text-body-md" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleReview('approved')} disabled={saving}
                      className="flex-1 py-3 rounded-xl bg-success text-white font-bold shadow-lg shadow-success/20 hover:opacity-90 transition-all flex items-center justify-center gap-2">
                      {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="material-symbols-outlined">thumb_up</span>}
                      Setujui Pengajuan
                    </button>
                    <button onClick={() => handleReview('revision')} disabled={saving}
                      className="flex-1 py-3 rounded-xl bg-warning text-white font-bold shadow-lg shadow-warning/20 hover:opacity-90 transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">edit_note</span>
                      Minta Revisi
                    </button>
                    <button onClick={() => handleReview('rejected')} disabled={saving}
                      className="flex-1 py-3 rounded-xl bg-error text-white font-bold shadow-lg shadow-error/20 hover:opacity-90 transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">thumb_down</span>
                      Tolak
                    </button>
                  </div>
                </div>
              ) : (
                selected.catatan_penolakan && (
                  <div className="mb-6 p-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
                    <p className="text-label-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">info</span> Catatan Pimpinan:
                    </p>
                    <p className="text-body-md whitespace-pre-wrap">{selected.catatan_penolakan}</p>
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
