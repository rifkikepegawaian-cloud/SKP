'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MasterIKU, MasterPeriodeIKU } from '@/lib/types'
import { useAuthStore } from '@/store/authStore'
import Swal from 'sweetalert2'

interface IKUSelection {
  iku: MasterIKU
  target_output: string
  satuan: string
  selected: boolean
}

export default function PengajuanIKUPage() {
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const [activePeriod, setActivePeriod] = useState<MasterPeriodeIKU | null>(null)
  const [ikus, setIkus] = useState<IKUSelection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [judul, setJudul] = useState('Pengajuan IKU Bagian')
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    
    // 1. Get Active Period
    const { data: periodData } = await supabase
      .from('master_periode_iku')
      .select('*')
      .eq('is_active', true)
      .single()

    if (periodData) {
      setActivePeriod(periodData)
    }

    // 2. Get All Master IKU
    const { data: ikuData } = await supabase
      .from('master_iku')
      .select('*')
      .order('kode_iku')

    if (ikuData) {
      setIkus(ikuData.map(item => ({
        iku: item,
        target_output: '',
        satuan: 'Unit',
        selected: false
      })))
    }

    setLoading(false)
  }

  const toggleSelection = (id: string) => {
    setIkus(prev => prev.map(item => item.iku.id === id ? { ...item, selected: !item.selected } : item))
  }

  const updateTarget = (id: string, field: 'target_output' | 'satuan', value: string) => {
    setIkus(prev => prev.map(item => item.iku.id === id ? { ...item, [field]: value } : item))
  }

  const handleSave = async (status: 'draft' | 'pending') => {
    if (!activePeriod) return
    
    const selectedIkus = ikus.filter(i => i.selected)
    if (selectedIkus.length === 0) {
      Swal.fire('Peringatan', 'Pilih minimal 1 IKU untuk diajukan', 'warning')
      return
    }

    // Validate targets
    for (const item of selectedIkus) {
      if (!item.target_output || isNaN(Number(item.target_output))) {
        Swal.fire('Peringatan', `Target output untuk ${item.iku.kode_iku} harus berupa angka`, 'warning')
        return
      }
      if (!item.satuan) {
        Swal.fire('Peringatan', `Satuan untuk ${item.iku.kode_iku} harus diisi`, 'warning')
        return
      }
    }

    setSaving(true)

    // 1. Create Pengajuan Header
    const { data: pengajuanData, error: headerError } = await supabase
      .from('iku_pengajuan')
      .insert({
        periode_id: activePeriod.id,
        manajer_id: user?.id,
        judul: judul,
        status: status,
        submitted_at: status === 'pending' ? new Date().toISOString() : null
      })
      .select('id')
      .single()

    if (headerError || !pengajuanData) {
      setSaving(false)
      Swal.fire('Error', 'Gagal menyimpan pengajuan', 'error')
      return
    }

    // 2. Insert Items
    const itemsToInsert = selectedIkus.map(item => ({
      pengajuan_id: pengajuanData.id,
      iku_id: item.iku.id,
      target_output: Number(item.target_output),
      satuan: item.satuan
    }))

    const { error: itemError } = await supabase
      .from('iku_pengajuan_item')
      .insert(itemsToInsert)

    setSaving(false)

    if (itemError) {
      Swal.fire('Error', 'Gagal menyimpan detail pengajuan', 'error')
    } else {
      Swal.fire({
        title: 'Berhasil',
        text: status === 'draft' ? 'Pengajuan disimpan sebagai draft' : 'Pengajuan berhasil dikirim ke Pimpinan Unit',
        icon: 'success'
      }).then(() => {
        router.push('/iku/riwayat')
      })
    }
  }

  if (loading) {
    return <div className="p-10 text-center text-outline">Memuat formulir pengajuan...</div>
  }

  // Check period validity
  const now = new Date()
  let isPeriodValid = false
  if (activePeriod) {
    const start = new Date(activePeriod.tgl_mulai_pengajuan)
    const end = new Date(activePeriod.tgl_akhir_pengajuan)
    end.setHours(23, 59, 59, 999) // End of day
    if (now >= start && now <= end) {
      isPeriodValid = true
    }
  }

  if (!activePeriod || !isPeriodValid) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-error-container text-on-error-container">
            <span className="material-symbols-outlined text-[24px]">event_busy</span>
          </div>
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Pengajuan IKU Bagian</h2>
            <p className="text-body-lg text-on-surface-variant">Periode Pengajuan Tidak Aktif</p>
          </div>
        </div>
        <div className="glass-card p-8 rounded-2xl text-center">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Saat ini tidak ada periode pengajuan IKU yang aktif</h3>
          <p className="text-body-md text-outline">Silakan hubungi Admin jika Anda merasa ini adalah sebuah kesalahan, atau tunggu hingga periode pengajuan berikutnya dibuka.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Pengajuan IKU Bagian</h2>
          <p className="text-body-lg text-on-surface-variant">Periode Tahun IKU: {activePeriod.tahun_iku}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="px-6 py-3 rounded-xl border border-primary text-primary font-bold hover:bg-primary/5 transition-colors disabled:opacity-50">
            Simpan Draft
          </button>
          <button onClick={() => handleSave('pending')} disabled={saving}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-bold shadow-lg hover:-translate-y-1 transition-transform disabled:opacity-50">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-[20px]">send</span>}
            Ajukan ke Pimpinan Unit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-headline-md text-headline-md mb-4 text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">edit_document</span>
              Detail Pengajuan
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Judul Pengajuan</label>
                <input type="text" value={judul} onChange={e => setJudul(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
              </div>
              <div className="p-4 bg-surface-container-low rounded-xl">
                <p className="text-label-sm text-outline uppercase tracking-wider mb-1">Batas Waktu Pengajuan</p>
                <p className="font-bold text-on-surface">{new Date(activePeriod.tgl_akhir_pengajuan).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-headline-md text-headline-md mb-4 text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">info</span>
              Petunjuk
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body-md text-on-surface-variant">
              <li>Pilih IKU yang relevan dengan bagian Anda dari daftar di sebelah kanan.</li>
              <li>Tentukan angka target output dan satuannya secara spesifik.</li>
              <li>Pastikan IKU yang dipilih sudah selaras dengan tujuan unit.</li>
              <li>Anda dapat menyimpan sebagai Draft jika belum selesai mengisi.</li>
            </ul>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40">
            <h3 className="font-headline-md text-headline-md text-on-surface">Daftar Pilihan IKU</h3>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari IKU atau Kegiatan..."
                  className="w-full bg-white border border-outline-variant/50 rounded-xl pl-10 pr-4 py-2 text-body-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-bold text-label-sm whitespace-nowrap">
                {ikus.filter(i => i.selected).length} Dipilih
              </span>
            </div>
          </div>

          <div className="space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
            {ikus.filter(item => 
              item.iku.kode_iku.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.iku.nama_iku.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.iku.nama_kegiatan.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((item) => (
              <div key={item.iku.id} className={`glass-card p-5 rounded-2xl transition-all border-2 ${item.selected ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:border-outline-variant/30'}`}>
                <div className="flex gap-4">
                  <div className="pt-1">
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" checked={item.selected} onChange={() => toggleSelection(item.iku.id)}
                        className="w-5 h-5 accent-primary rounded border-outline-variant/50" />
                    </label>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="inline-block px-2 py-1 bg-surface-container rounded-lg text-label-sm font-bold text-primary mb-2">
                          {item.iku.kode_iku}
                        </span>
                        <h4 className="font-body-lg font-bold text-on-surface leading-tight mb-1">{item.iku.nama_iku}</h4>
                        <p className="text-body-sm text-on-surface-variant">{item.iku.nama_kegiatan}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                      <p className="text-label-sm text-outline uppercase tracking-wider mb-2">Output yang Diharapkan</p>
                      <p className="font-body-md text-on-surface mb-4">{item.iku.nama_output}</p>
                      
                      {item.selected && (
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/20 animate-slide-down">
                          <div>
                            <label className="block text-label-sm text-on-surface-variant mb-1">Target Angka</label>
                            <input type="number" min="0" value={item.target_output} onChange={e => updateTarget(item.iku.id, 'target_output', e.target.value)} placeholder="0"
                              className="w-full bg-white border border-outline-variant/50 rounded-lg px-3 py-2 text-body-md outline-none focus:ring-2 focus:ring-primary/20" />
                          </div>
                          <div>
                            <label className="block text-label-sm text-on-surface-variant mb-1">Satuan</label>
                            <input type="text" value={item.satuan} onChange={e => updateTarget(item.iku.id, 'satuan', e.target.value)} placeholder="Unit/Dokumen/Orang"
                              className="w-full bg-white border border-outline-variant/50 rounded-lg px-3 py-2 text-body-md outline-none focus:ring-2 focus:ring-primary/20" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
