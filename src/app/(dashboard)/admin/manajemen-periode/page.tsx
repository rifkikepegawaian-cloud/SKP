'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MasterPeriodeIKU } from '@/lib/types'
import Swal from 'sweetalert2'

export default function ManajemenPeriodePage() {
  const [periods, setPeriods] = useState<MasterPeriodeIKU[]>([])
  const [loading, setLoading] = useState(true)
  const [modalMode, setModalMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [saving, setSaving] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<MasterPeriodeIKU | null>(null)

  // Form State
  const [tahunIku, setTahunIku] = useState('')
  const [tglMulai, setTglMulai] = useState('')
  const [tglAkhir, setTglAkhir] = useState('')
  const [isActive, setIsActive] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchPeriods()
  }, [])

  const fetchPeriods = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('master_periode_iku')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      Swal.fire('Error', 'Gagal memuat data periode', 'error')
    } else {
      setPeriods(data || [])
    }
    setLoading(false)
  }

  const handleOpenCreate = () => {
    setTahunIku('')
    setTglMulai('')
    setTglAkhir('')
    setIsActive(false)
    setModalMode('create')
  }

  const handleOpenEdit = (period: MasterPeriodeIKU) => {
    setSelectedPeriod(period)
    setTahunIku(period.tahun_iku)
    setTglMulai(period.tgl_mulai_pengajuan)
    setTglAkhir(period.tgl_akhir_pengajuan)
    setIsActive(period.is_active)
    setModalMode('edit')
  }

  const handleSave = async () => {
    if (!tahunIku || !tglMulai || !tglAkhir) {
      Swal.fire('Peringatan', 'Harap isi semua data', 'warning')
      return
    }

    setSaving(true)

    // Jika set active, kita harus set yang lain jadi inactive
    if (isActive) {
      await supabase.from('master_periode_iku').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000') // just a dummy condition to update all
    }

    if (modalMode === 'create') {
      const { error } = await supabase.from('master_periode_iku').insert({
        tahun_iku: tahunIku,
        tgl_mulai_pengajuan: tglMulai,
        tgl_akhir_pengajuan: tglAkhir,
        is_active: isActive
      })

      // Sync ke master_periode_skp
      await supabase.from('master_periode_skp').insert({
        tahun: tahunIku,
        nama_periode: `Periode SKP & Cascading IKU ${tahunIku}`,
        tgl_mulai_cascading: tglMulai,
        tgl_akhir_cascading: tglAkhir,
        is_active: isActive,
        status: 'cascading_active'
      })

      if (error) {
        Swal.fire('Error', 'Gagal menyimpan periode', 'error')
      } else {
        Swal.fire('Berhasil', 'Periode baru ditambahkan', 'success')
        setModalMode('closed')
        fetchPeriods()
      }
    } else if (modalMode === 'edit' && selectedPeriod) {
      const { error } = await supabase.from('master_periode_iku').update({
        tahun_iku: tahunIku,
        tgl_mulai_pengajuan: tglMulai,
        tgl_akhir_pengajuan: tglAkhir,
        is_active: isActive
      }).eq('id', selectedPeriod.id)

      // Sync ke master_periode_skp
      if (isActive) {
        await supabase.from('master_periode_skp').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
      }
      await supabase.from('master_periode_skp').update({
        tgl_mulai_cascading: tglMulai,
        tgl_akhir_cascading: tglAkhir,
        is_active: isActive
      }).eq('tahun', tahunIku)

      if (error) {
        Swal.fire('Error', 'Gagal memperbarui periode', 'error')
      } else {
        Swal.fire('Berhasil', 'Periode diperbarui', 'success')
        setModalMode('closed')
        fetchPeriods()
      }
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Periode?',
      text: "Data yang dihapus tidak dapat dikembalikan",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d33'
    })

    if (result.isConfirmed) {
      const { error } = await supabase.from('master_periode_iku').delete().eq('id', id)
      if (error) {
        Swal.fire('Error', 'Gagal menghapus', 'error')
      } else {
        Swal.fire('Terhapus', 'Periode telah dihapus', 'success')
        fetchPeriods()
      }
    }
  }

  const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      // Deactivating
      await supabase.from('master_periode_iku').update({ is_active: false }).eq('id', id)
    } else {
      // Activating - deactivate others first
      await supabase.from('master_periode_iku').update({ is_active: false }).neq('id', id)
      await supabase.from('master_periode_iku').update({ is_active: true }).eq('id', id)
    }
    fetchPeriods()
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Manajemen Periode IKU</h2>
          <p className="text-body-lg text-on-surface-variant">Atur rentang waktu pengajuan IKU Bagian</p>
        </div>
        <button onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-body-md font-bold shadow-lg hover:-translate-y-1 transition-transform">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Tambah Periode
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-outline-variant/20 bg-white/40">
          <h3 className="font-headline-md text-headline-md text-on-surface">Daftar Periode</h3>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-outline">Memuat data...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-surface-container-low/50">
                <tr>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Tahun IKU</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Mulai Pengajuan</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Akhir Pengajuan</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider">Status Aktif</th>
                  <th className="px-6 py-4 font-label-md text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {periods.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-outline">Belum ada data periode</td>
                  </tr>
                ) : periods.map(p => (
                  <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{p.tahun_iku}</td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">{new Date(p.tgl_mulai_pengajuan).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">{new Date(p.tgl_akhir_pengajuan).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleActiveStatus(p.id, p.is_active)}
                        className={`px-3 py-1 rounded-full text-label-sm font-label-md inline-flex items-center gap-1 transition-colors ${
                          p.is_active ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-surface-container text-outline hover:bg-surface-container-high'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-success' : 'bg-outline'}`}></span>
                        {p.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleOpenEdit(p)} className="text-outline hover:text-primary transition-colors p-2">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-outline hover:text-danger transition-colors p-2">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {modalMode !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalMode('closed')}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="p-8">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-6">
                {modalMode === 'create' ? 'Tambah Periode Baru' : 'Edit Periode'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block font-label-md text-on-surface-variant mb-2">Tahun IKU (Rencana)</label>
                  <input type="text" value={tahunIku} onChange={e => setTahunIku(e.target.value)} placeholder="Contoh: 2026"
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block font-label-md text-on-surface-variant mb-2">Tanggal Mulai Pengajuan</label>
                  <input type="date" value={tglMulai} onChange={e => setTglMulai(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block font-label-md text-on-surface-variant mb-2">Tanggal Akhir Pengajuan</label>
                  <input type="date" value={tglAkhir} onChange={e => setTglAkhir(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-primary rounded" />
                    <span className="font-body-md text-on-surface">Jadikan Periode Aktif</span>
                  </label>
                  <p className="text-body-sm text-outline mt-1 ml-8">Mengaktifkan periode ini akan menonaktifkan periode lainnya.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setModalMode('closed')} disabled={saving}
                  className="px-6 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container transition-all">
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
