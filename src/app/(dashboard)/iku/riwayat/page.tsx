'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IKUPengajuan } from '@/lib/types'
import { useAuthStore } from '@/store/authStore'
import Swal from 'sweetalert2'

export default function RiwayatIKUPage() {
  const user = useAuthStore(state => state.user)
  const [pengajuans, setPengajuans] = useState<IKUPengajuan[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<IKUPengajuan | null>(null)
  const [editedItems, setEditedItems] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [modalMode, setModalMode] = useState<'closed' | 'detail'>('closed')
  const supabase = createClient()

  useEffect(() => {
    if (user) fetchRiwayat()
  }, [user])

  const fetchRiwayat = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('iku_pengajuan')
      .select('*, periode:master_periode_iku(*), items:iku_pengajuan_item(*, iku:master_iku(*))')
      .eq('manajer_id', user?.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      Swal.fire('Error', 'Gagal memuat riwayat pengajuan', 'error')
    } else {
      setPengajuans(data as any || [])
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Draft Pengajuan?',
      text: "Data yang dihapus tidak dapat dikembalikan",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d33'
    })

    if (result.isConfirmed) {
      const { error } = await supabase.from('iku_pengajuan').delete().eq('id', id)
      if (error) {
        Swal.fire('Error', 'Gagal menghapus draft', 'error')
      } else {
        Swal.fire('Terhapus', 'Draft telah dihapus', 'success')
        fetchRiwayat()
      }
    }
  }

  const handleAjukan = async (id: string) => {
    const { error } = await supabase
      .from('iku_pengajuan')
      .update({ status: 'pending', submitted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      Swal.fire('Error', 'Gagal mengajukan IKU', 'error')
    } else {
      Swal.fire('Berhasil', 'Pengajuan IKU telah dikirim ke Pimpinan Unit', 'success')
      fetchRiwayat()
    }
  }

  const handleItemChange = (id: string, field: string, value: string) => {
    setEditedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const handleUpdateAndSubmit = async () => {
    if (!selected) return

    setSaving(true)
    let hasError = false
    for (const item of editedItems) {
      if (!item.target_output || isNaN(Number(item.target_output))) {
        Swal.fire('Peringatan', `Target output untuk ${item.iku?.kode_iku} tidak valid`, 'warning')
        setSaving(false)
        return
      }
      
      const { error } = await supabase
        .from('iku_pengajuan_item')
        .update({ target_output: Number(item.target_output), satuan: item.satuan })
        .eq('id', item.id)

      if (error) hasError = true
    }

    if (hasError) {
      Swal.fire('Error', 'Gagal memperbarui item IKU', 'error')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('iku_pengajuan')
      .update({ status: 'pending', submitted_at: new Date().toISOString() })
      .eq('id', selected.id)

    setSaving(false)

    if (error) {
      Swal.fire('Error', 'Gagal mengajukan kembali', 'error')
    } else {
      Swal.fire('Berhasil', 'Pengajuan berhasil direvisi dan dikirim ke Pimpinan Unit', 'success')
      setModalMode('closed')
      fetchRiwayat()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-surface-container text-outline inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-outline"></span> Draft</span>
      case 'pending': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-info/10 text-info inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-info"></span> Pending Review</span>
      case 'approved': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-success/10 text-success inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success"></span> Disetujui</span>
      case 'rejected': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-error/10 text-error inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-error"></span> Ditolak</span>
      case 'revision': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-warning/10 text-warning inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning"></span> Revisi</span>
      default: return null
    }
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Riwayat Pengajuan IKU</h2>
          <p className="text-body-lg text-on-surface-variant">Pantau status pengajuan IKU Bagian Anda</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-outline-variant/20 bg-white/40">
          <h3 className="font-headline-md text-headline-md text-on-surface">Daftar Pengajuan</h3>
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
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Judul & Periode</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Jumlah IKU</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Tanggal Dibuat</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {pengajuans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-outline">
                      Belum ada riwayat pengajuan IKU.
                    </td>
                  </tr>
                ) : pengajuans.map(p => (
                  <tr key={p.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface mb-1">{p.judul}</p>
                      <p className="text-body-sm text-on-surface-variant">Periode IKU: <span className="font-mono">{p.periode?.tahun_iku}</span></p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-surface-container-low rounded-lg text-body-sm font-bold border border-outline-variant/30">
                        {p.items?.length || 0} Item
                      </span>
                    </td>
                    <td className="px-6 py-4 text-body-sm text-on-surface-variant">
                      {new Date(p.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => { setSelected(p); setEditedItems(p.items || []); setModalMode('detail') }} className="text-outline hover:text-primary transition-colors p-2" title="Detail">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      
                      {(p.status === 'draft' || p.status === 'revision') && (
                        <>
                          <button onClick={() => handleAjukan(p.id)} className="text-outline hover:text-success transition-colors p-2" title="Ajukan">
                            <span className="material-symbols-outlined text-[20px]">send</span>
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="text-outline hover:text-danger transition-colors p-2" title="Hapus">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Detail */}
      {modalMode === 'detail' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalMode('closed')}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
            
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-start bg-surface-container-lowest">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{selected.judul}</h3>
                <div className="flex items-center gap-3">
                  <p className="text-body-sm text-on-surface-variant">Tahun IKU: <strong>{selected.periode?.tahun_iku}</strong></p>
                  {getStatusBadge(selected.status)}
                </div>
              </div>
              <button onClick={() => setModalMode('closed')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-surface-container-lowest/50">
              
              {(selected.status === 'rejected' || selected.status === 'revision') && selected.catatan_penolakan && (
                <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container border border-error/20">
                  <p className="text-label-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">warning</span> Catatan Pimpinan:
                  </p>
                  <p className="text-body-md whitespace-pre-wrap">{selected.catatan_penolakan}</p>
                </div>
              )}

              <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-4">Detail IKU yang Diajukan ({selected.items?.length})</h4>
              
              <div className="space-y-4">
                {editedItems.map((item: any, idx) => (
                  <div key={item.id} className="p-4 bg-white border border-outline-variant/30 rounded-xl shadow-sm">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-label-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <span className="inline-block px-2 py-0.5 bg-surface-container-low rounded text-[11px] font-bold text-outline uppercase tracking-wider mb-2">
                          {item.iku?.kode_iku}
                        </span>
                        <h5 className="font-bold text-on-surface mb-1">{item.iku?.nama_iku}</h5>
                        <p className="text-body-sm text-on-surface-variant mb-4">{item.iku?.nama_kegiatan}</p>
                        
                        {(selected.status === 'revision' || selected.status === 'draft') ? (
                          <div className="pt-4 border-t border-outline-variant/20 space-y-4">
                            {item.catatan_pimpinan && (
                              <div className="p-3 bg-error-container text-on-error-container rounded-lg border border-error/20">
                                <p className="text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">warning</span> Catatan Spesifik Pimpinan:
                                </p>
                                <p className="text-body-sm">{item.catatan_pimpinan}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] text-outline uppercase tracking-wider mb-1">Target Angka</label>
                                <input type="number" min="0" value={item.target_output} onChange={e => handleItemChange(item.id, 'target_output', e.target.value)}
                                  className="w-full bg-white border border-outline-variant/50 rounded-lg px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-primary/20" />
                              </div>
                              <div>
                                <label className="block text-[11px] text-outline uppercase tracking-wider mb-1">Satuan</label>
                                <input type="text" value={item.satuan} onChange={e => handleItemChange(item.id, 'satuan', e.target.value)}
                                  className="w-full bg-white border border-outline-variant/50 rounded-lg px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-primary/20" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 inline-block">
                              <p className="text-[11px] text-outline uppercase tracking-wider mb-1">Target Output</p>
                              <p className="font-mono font-bold text-primary text-body-lg">
                                {item.target_output} <span className="text-body-sm font-sans text-on-surface">{item.satuan}</span>
                              </p>
                            </div>
                            {item.catatan_pimpinan && (
                              <div className="p-3 bg-error-container text-on-error-container rounded-lg border border-error/20">
                                <p className="text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">warning</span> Catatan Pimpinan:
                                </p>
                                <p className="text-body-sm">{item.catatan_pimpinan}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant/20 bg-surface-container-lowest flex justify-end gap-3">
              <button onClick={() => setModalMode('closed')} disabled={saving}
                className="px-6 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container transition-all">
                Tutup
              </button>
              {(selected.status === 'revision' || selected.status === 'draft') && (
                <button onClick={handleUpdateAndSubmit} disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-[18px]">send</span>}
                  Simpan & Ajukan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
