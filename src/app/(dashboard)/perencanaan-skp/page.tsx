'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SKPPlan, IKUPengajuanItem } from '@/lib/types'
import { useAuthStore } from '@/store/authStore'
import Swal from 'sweetalert2'

export default function PerencanaanSKPPage() {
  const user = useAuthStore(state => state.user)
  const [plans, setPlans] = useState<SKPPlan[]>([])
  const [loading, setLoading] = useState(true)
  
  // Cascading Source (IKU for Supervisor, Parent SKP for Staff)
  const [ikuItems, setIkuItems] = useState<any[]>([])
  const [parentSkps, setParentSkps] = useState<any[]>([])
  
  // Input states
  const [rencanaAksi, setRencanaAksi] = useState('')
  const [target, setTarget] = useState('')
  const [satuan, setSatuan] = useState('')
  const [selectedParentId, setSelectedParentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  
  const [detailPlan, setDetailPlan] = useState<SKPPlan | null>(null)

  const supabase = createClient()
  const isSupervisor = user?.role.includes('supervisor')
  const isStaff = user?.role.includes('staff') && !isSupervisor

  useEffect(() => {
    if (user) {
      fetchMyPlans()
      fetchCascadingSources()
    }
  }, [user])

  const fetchMyPlans = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('skp_plans')
      .select('*, iku_item:iku_pengajuan_item(iku:master_iku(*)), parent_skp:skp_plans!parent_skp_id(rencana_aksi)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      Swal.fire('Error', 'Gagal memuat rencana SKP', 'error')
    } else {
      setPlans(data as any || [])
    }
    setLoading(false)
  }

  const fetchCascadingSources = async () => {
    // If Supervisor, fetch approved IKU items from Manajer in the same unit_es3
    if (isSupervisor) {
      const { data, error } = await supabase
        .from('iku_pengajuan_item')
        .select('*, iku:master_iku(*), pengajuan:iku_pengajuan(status, manajer:users!iku_pengajuan_manajer_id_fkey(pegawai(unit_es3)))')

      if (!error && data) {
        const filtered = data.filter(item => {
          if (item.status_pembatalan === 'approved') return false
          const peng = item.pengajuan as any
          if (peng?.status !== 'approved') return false
          const manajerUnit = peng?.manajer?.pegawai?.unit_es3
          return manajerUnit && user?.pegawai?.unit_es3 && manajerUnit.trim().toLowerCase() === user.pegawai.unit_es3.trim().toLowerCase()
        })
        setIkuItems(filtered)
      }
    }
    
    // If Staff, fetch approved SKP plans from Supervisor in the same unit_es4
    if (isStaff) {
      const { data, error } = await supabase
        .from('skp_plans')
        .select('*, owner:users(role, pegawai(unit_es4)), iku:master_iku!output_id(*)')
        .eq('status', 'approved')

      if (!error && data) {
        const filtered = data.filter(plan => {
          const owner = plan.owner as any
          if (!owner?.role.includes('supervisor')) return false
          const spvUnit = owner?.pegawai?.unit_es4
          return spvUnit && user?.pegawai?.unit_es4 && spvUnit.trim().toLowerCase() === user.pegawai.unit_es4.trim().toLowerCase()
        })
        setParentSkps(filtered)
      }
    }
  }

  const handleSavePlan = async () => {
    if (!selectedParentId) {
      Swal.fire('Peringatan', `Harap pilih ${isSupervisor ? 'IKU Program Utama' : 'Aktivitas Cascading dari Supervisor'}`, 'warning')
      return
    }
    if (!rencanaAksi.trim() || !target.trim() || !satuan.trim() || isNaN(Number(target))) {
      Swal.fire('Peringatan', 'Harap isi semua field dengan benar (target harus berupa angka)', 'warning')
      return
    }

    setSaving(true)
    let insertData: any = {
      user_id: user?.id,
      rencana_aksi: rencanaAksi,
      target_individual: Number(target),
      satuan: satuan,
      status: 'draft'
    }

    if (isSupervisor) {
      const parentIku = ikuItems.find(i => i.id === selectedParentId)
      insertData.iku_item_id = selectedParentId
      insertData.output_id = parentIku?.iku_id
    } else {
      const parentSkp = parentSkps.find(p => p.id === selectedParentId)
      insertData.parent_skp_id = selectedParentId
      insertData.output_id = parentSkp?.output_id
    }

    if (editingPlanId) {
      const { error } = await supabase.from('skp_plans').update(insertData).eq('id', editingPlanId)
      setSaving(false)
      if (error) {
        console.error(error)
        Swal.fire('Error', 'Gagal menyimpan perubahan rencana SKP', 'error')
      } else {
        Swal.fire('Berhasil', 'Rencana SKP berhasil diperbarui', 'success')
        cancelEdit()
        fetchMyPlans()
      }
    } else {
      const { error } = await supabase.from('skp_plans').insert(insertData)
      setSaving(false)
      if (error) {
        console.error(error)
        Swal.fire('Error', 'Gagal menyimpan rencana SKP', 'error')
      } else {
        Swal.fire('Berhasil', 'Rencana SKP berhasil ditambahkan', 'success')
        setRencanaAksi('')
        setTarget('')
        setSatuan('')
        setSelectedParentId('')
        fetchMyPlans()
      }
    }
  }

  const handleEdit = (plan: any) => {
    setEditingPlanId(plan.id)
    setRencanaAksi(plan.rencana_aksi)
    setTarget(plan.target_individual.toString())
    setSatuan(plan.satuan)
    setSelectedParentId(plan.iku_item_id || plan.parent_skp_id || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingPlanId(null)
    setRencanaAksi('')
    setTarget('')
    setSatuan('')
    setSelectedParentId('')
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Rencana?',
      text: "Data yang dihapus tidak dapat dikembalikan",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus'
    })

    if (result.isConfirmed) {
      const { error } = await supabase.from('skp_plans').delete().eq('id', id)
      if (error) {
        Swal.fire('Error', 'Gagal menghapus rencana', 'error')
      } else {
        Swal.fire('Terhapus', 'Rencana berhasil dihapus', 'success')
        fetchMyPlans()
      }
    }
  }

  const handleSubmitApproval = async () => {
    const draftPlans = plans.filter(p => p.status === 'draft' || p.status === 'revision')
    if (draftPlans.length === 0) {
      Swal.fire('Info', 'Tidak ada rencana SKP dengan status Draft atau Revisi untuk diajukan.', 'info')
      return
    }

    const result = await Swal.fire({
      title: 'Ajukan SKP?',
      text: `Anda akan mengajukan ${draftPlans.length} rencana SKP untuk diverifikasi oleh ${isSupervisor ? 'Manajer' : 'Supervisor'}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Ajukan'
    })

    if (result.isConfirmed) {
      const draftIds = draftPlans.map(p => p.id)
      const { error } = await supabase
        .from('skp_plans')
        .update({ status: 'pending' })
        .in('id', draftIds)

      if (error) {
        Swal.fire('Error', 'Gagal mengajukan SKP', 'error')
      } else {
        Swal.fire('Berhasil', 'SKP berhasil diajukan', 'success')
        fetchMyPlans()
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-surface-container-high text-on-surface-variant">Draft</span>
      case 'pending': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-info/10 text-info">Menunggu Verifikasi</span>
      case 'approved': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-success/10 text-success">Disetujui</span>
      case 'rejected': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-error/10 text-error">Ditolak</span>
      case 'revision': return <span className="px-3 py-1 rounded-full text-label-sm font-label-md bg-warning/10 text-warning">Revisi</span>
      default: return null
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Perencanaan SKP Tahunan</h2>
          <p className="text-body-lg text-on-surface-variant">Turunan / Cascading dari {isSupervisor ? 'Manajer Bagian' : 'Supervisor'}</p>
        </div>
        <button onClick={handleSubmitApproval} className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-body-md font-bold shadow-lg hover:-translate-y-1 transition-transform">
          <span className="material-symbols-outlined text-[20px]">send</span>
          Kirim untuk Approval
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Input Section */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <section className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <span className="material-symbols-outlined text-[24px]">account_tree</span>
              <h3 className="font-headline-md text-headline-md">Cascading Target</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                  {isSupervisor ? 'IKU Program Utama (Dari Manajer)' : 'Aktivitas Cascading (Dari Supervisor)'}
                </label>
                <select 
                  value={selectedParentId}
                  onChange={e => setSelectedParentId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
                  <option value="">-- Pilih Induk Cascading --</option>
                  {isSupervisor 
                    ? ikuItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.iku?.nama_iku} - {item.iku?.nama_kegiatan} - {item.iku?.nama_output}
                        </option>
                      ))
                    : parentSkps.map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.rencana_aksi}
                        </option>
                      ))
                  }
                </select>
                {/* Helper text showing target of parent */}
                {selectedParentId && (
                  <p className="mt-2 text-[11px] text-primary bg-primary/5 p-2 rounded border border-primary/10">
                    Target Induk:{' '}
                    {isSupervisor 
                      ? `${ikuItems.find(i => i.id === selectedParentId)?.target_output} ${ikuItems.find(i => i.id === selectedParentId)?.satuan}` 
                      : `${parentSkps.find(p => p.id === selectedParentId)?.target_individual} ${parentSkps.find(p => p.id === selectedParentId)?.satuan}`
                    }
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <span className="material-symbols-outlined text-[24px]">edit_note</span>
              <h3 className="font-headline-md text-headline-md">{editingPlanId ? 'Edit Rencana Aksi' : 'Rencana Aksi Anda'}</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Detail Rencana Aksi</label>
                <textarea 
                  value={rencanaAksi}
                  onChange={e => setRencanaAksi(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none" 
                  placeholder="Deskripsikan langkah konkret yang akan dilakukan..." 
                  rows={3} />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Target Individu (Setahun)</label>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="number" 
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none" 
                    placeholder="Angka" 
                  />
                  <input 
                    type="text" 
                    value={satuan}
                    onChange={e => setSatuan(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none" 
                    placeholder="Satuan (ex: Dokumen)" 
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSavePlan} disabled={saving} className="flex-1 bg-surface-container text-primary font-bold py-3 rounded-xl hover:bg-surface-container-high transition-colors flex justify-center items-center gap-2">
                  {saving ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-[20px]">{editingPlanId ? 'save' : 'add_circle'}</span>}
                  {editingPlanId ? 'Simpan Perubahan' : 'Tambahkan ke Daftar'}
                </button>
                {editingPlanId && (
                  <button onClick={cancelEdit} disabled={saving} className="px-6 bg-error/10 text-error font-bold rounded-xl hover:bg-error/20 transition-colors">
                    Batal
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Table Section */}
        <div className="col-span-12 lg:col-span-8">
          <section className="glass-card rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-white/40">
              <h3 className="font-headline-md text-headline-md text-on-surface">Daftar Usulan SKP Anda</h3>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 px-3 py-1 bg-surface-container rounded-full text-label-sm font-label-md text-primary">
                  <span className="material-symbols-outlined text-[16px]">list_alt</span>
                  {plans.length} Items
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1 min-h-[300px]">
              {loading ? (
                <div className="p-10 text-center text-outline flex justify-center items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  Memuat data...
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low/50">
                    <tr>
                      <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Induk Cascading</th>
                      <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Rencana Aksi Anda</th>
                      <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Target</th>
                      <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {plans.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-outline">
                          Belum ada rencana aksi yang ditambahkan.
                        </td>
                      </tr>
                    ) : plans.map(plan => (
                      <tr key={plan.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-6 py-4 text-body-sm text-on-surface-variant">
                          {isSupervisor 
                            ? <span title={(plan as any).iku_item?.iku?.nama_kegiatan}>{(plan as any).iku_item?.iku?.kode_iku || '-'}</span>
                            : <span className="line-clamp-2" title={(plan as any).parent_skp?.rencana_aksi}>{(plan as any).parent_skp?.rencana_aksi || '-'}</span>
                          }
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-body-md font-bold text-on-surface">{plan.rencana_aksi}</p>
                          {plan.catatan_reviewer && (
                            <p className="text-[11px] text-error mt-1">Catatan: {plan.catatan_reviewer}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-mono font-bold text-primary">{plan.target_individual} <span className="font-sans text-body-sm text-on-surface">{plan.satuan}</span></p>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(plan.status)}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button onClick={() => setDetailPlan(plan)} className="text-outline hover:text-primary transition-colors p-2 rounded hover:bg-primary/10 inline-block" title="Detail">
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </button>
                          {(plan.status === 'draft' || plan.status === 'revision') && (
                            <>
                              <button onClick={() => handleEdit(plan)} className="text-outline hover:text-info transition-colors p-2 rounded hover:bg-info/10 inline-block" title="Edit">
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                              </button>
                              <button onClick={() => handleDelete(plan.id)} className="text-outline hover:text-error transition-colors p-2 rounded hover:bg-error/10 inline-block" title="Hapus">
                                <span className="material-symbols-outlined text-[20px]">delete_outline</span>
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
          </section>
        </div>
      </div>

      {/* Detail Modal */}
      {detailPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDetailPlan(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-start bg-surface-container-lowest">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Detail Rencana SKP</h3>
                {getStatusBadge(detailPlan.status)}
              </div>
              <button onClick={() => setDetailPlan(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              {isSupervisor ? (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-label-sm font-bold text-primary uppercase tracking-wider mb-2">Induk Cascading (Dari Manajer)</p>
                  <p className="font-bold text-on-surface mb-1">{(detailPlan as any).iku_item?.iku?.nama_iku}</p>
                  <p className="text-body-sm text-on-surface-variant mb-1">Kegiatan: {(detailPlan as any).iku_item?.iku?.nama_kegiatan}</p>
                  <p className="text-body-sm text-on-surface-variant">Output: {(detailPlan as any).iku_item?.iku?.nama_output}</p>
                </div>
              ) : (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-label-sm font-bold text-primary uppercase tracking-wider mb-2">Induk Cascading (Dari Supervisor)</p>
                  <p className="font-bold text-on-surface">{(detailPlan as any).parent_skp?.rencana_aksi}</p>
                </div>
              )}
              
              <div>
                <p className="text-label-sm font-bold text-outline uppercase tracking-wider mb-1">Rencana Aksi / Target Kinerja</p>
                <p className="font-body-lg text-on-surface whitespace-pre-wrap">{detailPlan.rencana_aksi}</p>
              </div>
              
              <div>
                <p className="text-label-sm font-bold text-outline uppercase tracking-wider mb-1">Target Individual</p>
                <p className="font-headline-md text-primary">{detailPlan.target_individual} <span className="font-body-md text-on-surface-variant">{detailPlan.satuan}</span></p>
              </div>

              {detailPlan.catatan_reviewer && (
                <div className="p-4 bg-error-container text-on-error-container rounded-xl border border-error/20">
                  <p className="text-label-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">warning</span> Catatan Reviewer
                  </p>
                  <p className="text-body-md whitespace-pre-wrap">{detailPlan.catatan_reviewer}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
