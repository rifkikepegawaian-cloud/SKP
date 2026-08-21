'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IKUPengajuanItem, IKULaporan } from '@/lib/types'
import { useAuthStore } from '@/store/authStore'
import Swal from 'sweetalert2'

export default function PelaporanIKUPage() {
  const user = useAuthStore(state => state.user)
  const [items, setItems] = useState<IKUPengajuanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalMode, setModalMode] = useState<'closed' | 'lapor'>('closed')
  const [selectedItem, setSelectedItem] = useState<IKUPengajuanItem | null>(null)
  const [selectedLaporan, setSelectedLaporan] = useState<IKULaporan | null>(null)
  const [saving, setSaving] = useState(false)

  // Form State
  const [capaian, setCapaian] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (user) fetchItems()
  }, [user])

  const fetchItems = async () => {
    setLoading(true)

    // We fetch approved pengajuans for this manajer, and get their items with laporans
    const { data: pengajuans, error: pError } = await supabase
      .from('iku_pengajuan')
      .select('id, judul, periode:master_periode_iku(tahun_iku)')
      .eq('manajer_id', user?.id)
      .eq('status', 'approved')

    if (pError) {
      console.error(pError)
      Swal.fire('Error', 'Gagal memuat data pengajuan yang disetujui', 'error')
      setLoading(false)
      return
    }

    if (pengajuans && pengajuans.length > 0) {
      const pengajuanIds = pengajuans.map(p => p.id)

      const { data: itemData, error: iError } = await supabase
        .from('iku_pengajuan_item')
        .select('*, iku:master_iku(*), laporan:iku_laporan(*)')
        .in('pengajuan_id', pengajuanIds)

      if (iError) {
        console.error(iError)
        Swal.fire('Error', 'Gagal memuat item IKU', 'error')
      } else {
        // attach pengajuan header data manually to items
        const mappedItems = itemData?.map(item => {
          const parent = pengajuans.find(p => p.id === item.pengajuan_id)
          return { ...item, pengajuan: parent }
        })
        setItems(mappedItems as any || [])
      }
    } else {
      setItems([])
    }

    setLoading(false)
  }

  const handleOpenLapor = (item: IKUPengajuanItem, laporan?: IKULaporan) => {
    setSelectedItem(item)
    setSelectedLaporan(laporan || null)
    setCapaian(laporan ? String(laporan.capaian) : '')
    setKeterangan(laporan?.keterangan || '')
    setEvidenceFile(null)
    setModalMode('lapor')
  }

  const handleBatalkanItem = async (item: IKUPengajuanItem) => {
    const { value: alasan } = await Swal.fire({
      title: 'Ajukan Pembatalan IKU',
      html: `Apakah Anda yakin ingin membatalkan IKU:<br/><b>${item.iku?.nama_iku}</b>?`,
      input: 'textarea',
      inputLabel: 'Alasan Pembatalan',
      inputPlaceholder: 'Tuliskan alasan kenapa IKU ini dibatalkan...',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Ajukan Batal',
      inputValidator: (value) => {
        if (!value) {
          return 'Alasan pembatalan wajib diisi!'
        }
      }
    })

    if (alasan) {
      setLoading(true)
      const { error } = await supabase
        .from('iku_pengajuan_item')
        .update({ status_pembatalan: 'pending', alasan_pembatalan: alasan })
        .eq('id', item.id)

      if (error) {
        Swal.fire('Error', 'Gagal memproses pengajuan pembatalan', 'error')
        setLoading(false)
      } else {
        Swal.fire('Berhasil', 'Permintaan pembatalan telah dikirim ke Pimpinan Unit', 'success')
        fetchItems()
      }
    }
  }

  const handleDeleteLapor = async (laporan: any) => {
    const result = await Swal.fire({
      title: 'Hapus Laporan?',
      text: "Data dan file eviden yang dihapus tidak dapat dikembalikan",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d33'
    })

    if (result.isConfirmed) {
      // 1. Delete file from storage if it exists
      if (laporan.evidence_url) {
        try {
          const fileName = laporan.evidence_url.split('/evidence/').pop();
          if (fileName) {
            await supabase.storage.from('evidence').remove([fileName]);
          }
        } catch (e) {
          console.error("Gagal menghapus file eviden", e);
        }
      }

      // 2. Delete record from database
      const { error } = await supabase.from('iku_laporan').delete().eq('id', laporan.id)
      if (error) {
        Swal.fire('Error', 'Gagal menghapus laporan', 'error')
      } else {
        Swal.fire('Terhapus', 'Laporan berhasil dihapus', 'success')
        fetchItems()
      }
    }
  }

  const handleSaveLapor = async () => {
    if (!selectedItem || !capaian || isNaN(Number(capaian))) {
      Swal.fire('Peringatan', 'Harap isi capaian berupa angka', 'warning')
      return
    }

    if (!selectedLaporan && !evidenceFile) {
      Swal.fire('Peringatan', 'Harap upload dokumen bukti eviden', 'warning')
      return
    }

    setSaving(true)
    let url = selectedLaporan?.evidence_url
    let name = selectedLaporan?.evidence_name

    // 1. Upload Evidence via our API Route
    if (evidenceFile) {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', evidenceFile)

      try {
        const uploadRes = await fetch('/api/iku/upload-evidence', {
          method: 'POST',
          body: formData
        })

        if (!uploadRes.ok) {
          throw new Error('Upload gagal')
        }

        const resData = await uploadRes.json()
        url = resData.url
        name = resData.name
      } catch (err) {
        Swal.fire('Error', 'Terjadi kesalahan saat mengunggah file. Pastikan bucket "evidence" sudah dibuat di Supabase Storage.', 'error')
        setUploading(false)
        setSaving(false)
        return
      }
    }

    try {
      if (selectedLaporan) {
        const { error } = await supabase.from('iku_laporan').update({
          capaian: Number(capaian),
          keterangan: keterangan,
          evidence_url: url,
          evidence_name: name
        }).eq('id', selectedLaporan.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('iku_laporan').insert({
          item_id: selectedItem.id,
          manajer_id: user?.id,
          capaian: Number(capaian),
          keterangan: keterangan,
          evidence_url: url,
          evidence_name: name
        })
        if (error) throw error
      }

      Swal.fire('Berhasil', selectedLaporan ? 'Laporan berhasil diubah' : 'Laporan capaian berhasil ditambahkan', 'success')
      setModalMode('closed')
      fetchItems()
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan laporan', 'error')
    } finally {
      setUploading(false)
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Pelaporan IKU Bagian</h2>
          <p className="text-body-lg text-on-surface-variant">Laporkan progres dan eviden untuk IKU yang telah disetujui</p>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="p-10 text-center text-outline flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-outline border-t-primary rounded-full animate-spin"></div>
            Memuat data...
          </div>
        ) : items.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <span className="material-symbols-outlined text-[48px] text-outline mb-4">fact_check</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Belum ada IKU yang disetujui</h3>
            <p className="text-body-md text-outline">Anda dapat mulai melaporkan capaian setelah pengajuan IKU Anda disetujui oleh Pimpinan Unit.</p>
          </div>
        ) : (
          items.map(item => {
            const totalCapaian = item.laporan?.reduce((acc, curr) => acc + Number(curr.capaian), 0) || 0
            const percentage = item.target_output > 0 ? Number(((totalCapaian / item.target_output) * 100).toFixed(2)) : 0

            return (
              <div key={item.id} className="glass-card rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 bg-white/60">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="px-2 py-1 bg-primary/10 text-primary font-bold text-label-sm rounded-lg">
                          {item.iku?.kode_iku}
                        </span>
                        <span className="text-body-sm text-on-surface-variant px-2 py-1 bg-surface-container rounded border border-outline-variant/20">
                          {item.pengajuan?.periode?.tahun_iku} - {item.pengajuan?.judul}
                        </span>
                        {item.status_pembatalan === 'pending' && <span className="px-2 py-1 bg-warning/10 text-warning font-bold text-label-sm rounded-lg flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> Menunggu Persetujuan Batal</span>}
                        {item.status_pembatalan === 'approved' && <span className="px-2 py-1 bg-error/10 text-error font-bold text-label-sm rounded-lg flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">cancel</span> Dibatalkan</span>}
                        {item.status_pembatalan === 'rejected' && <span className="px-2 py-1 bg-surface-container-high text-on-surface-variant font-bold text-label-sm rounded-lg flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">block</span> Batal Ditolak</span>}
                      </div>
                      <h4 className="font-headline-md text-on-surface mb-1">{item.iku?.nama_iku}</h4>
                      <p className="text-body-md text-on-surface-variant mb-4">{item.iku?.nama_kegiatan}</p>

                      <div className="p-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl max-w-lg">
                        <p className="text-label-sm text-outline uppercase tracking-wider mb-2">Output yang Diharapkan</p>
                        <p className="font-body-md text-on-surface mb-4">{item.iku?.nama_output}</p>

                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <p className="text-label-sm text-outline uppercase">Total Capaian / Target</p>
                            <p className="font-mono text-lg font-bold text-on-surface">
                              <span className={totalCapaian >= item.target_output ? 'text-success' : 'text-primary'}>
                                {totalCapaian}
                              </span> / {item.target_output} <span className="text-body-sm font-sans font-normal text-outline">{item.satuan}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-label-sm text-outline uppercase mb-1">Progress</p>
                            <p className="font-bold text-on-surface">{percentage}%</p>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden mb-4">
                          <div className={`h-full transition-all duration-500 ${percentage >= 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${percentage}%` }}></div>
                        </div>

                        {item.status_pembatalan !== 'pending' && item.status_pembatalan !== 'approved' && (
                          <button onClick={() => handleBatalkanItem(item)} className="text-error hover:bg-error/10 px-3 py-1.5 rounded-lg text-label-sm font-bold transition-colors inline-flex items-center gap-1.5 mt-2">
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                            Ajukan Pembatalan IKU
                          </button>
                        )}
                        
                        {item.alasan_pembatalan && (
                          <div className={`mt-4 p-3 rounded-xl border text-body-sm ${item.status_pembatalan === 'pending' ? 'bg-warning/5 border-warning/20 text-warning-dark' : item.status_pembatalan === 'approved' ? 'bg-error/5 border-error/20 text-error' : 'bg-surface-container-low border-outline-variant/20'}`}>
                            <p className="font-bold flex items-center gap-1 mb-1 text-[11px] uppercase tracking-wider"><span className="material-symbols-outlined text-[14px]">info</span> Alasan Pembatalan:</p>
                            <p>{item.alasan_pembatalan}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:w-72 shrink-0 border-l border-outline-variant/20 lg:pl-6 flex flex-col justify-between">
                      <div>
                        <h5 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Riwayat Laporan ({item.laporan?.length || 0})</h5>
                        {item.laporan?.length === 0 ? (
                          <p className="text-body-sm text-outline italic">Belum ada laporan</p>
                        ) : (
                          <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                            {item.laporan?.map(lap => (
                              <div key={lap.id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-body-sm relative group">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-on-surface">+{lap.capaian} {item.satuan}</span>
                                  <span className="text-outline text-[11px]">{new Date(lap.tanggal_laporan).toLocaleDateString('id-ID')}</span>
                                </div>
                                {lap.keterangan && <p className="text-on-surface-variant line-clamp-1 text-[12px] mb-2">{lap.keterangan}</p>}
                                {lap.evidence_url && (
                                  <a href={lap.evidence_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-bold">
                                    <span className="material-symbols-outlined text-[14px]">attachment</span>
                                    Lihat Eviden
                                  </a>
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-surface-container-lowest p-1 rounded-lg shadow-sm border border-outline-variant/20">
                                  <button onClick={() => handleOpenLapor(item, lap)} className="text-primary hover:bg-primary/10 p-1 rounded flex items-center" title="Edit">
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                  </button>
                                  <button onClick={() => handleDeleteLapor(lap)} className="text-error hover:bg-error/10 p-1 rounded flex items-center" title="Hapus">
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleOpenLapor(item)} disabled={item.status_pembatalan === 'approved' || item.status_pembatalan === 'pending'}
                        className="w-full mt-4 flex items-center justify-center gap-2 bg-primary/10 text-primary px-4 py-2.5 rounded-xl font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <span className="material-symbols-outlined text-[18px]">add_task</span>
                        {item.status_pembatalan === 'approved' ? 'IKU Dibatalkan' : 'Tambah Laporan'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Form Lapor */}
      {modalMode === 'lapor' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalMode('closed')}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="p-8">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                {selectedLaporan ? 'Edit Laporan Capaian' : 'Tambah Laporan Capaian'}
              </h3>
              <p className="text-body-sm text-outline mb-6 line-clamp-2">Untuk: {selectedItem.iku?.nama_iku} | {selectedItem.iku?.nama_output}</p>

              <div className="space-y-4">
                <div>
                  <label className="block font-label-md text-on-surface-variant mb-2">Angka Capaian Ditambahkan</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min="0" value={capaian} onChange={e => setCapaian(e.target.value)} placeholder="0"
                      className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 text-lg font-mono font-bold text-primary" />
                    <span className="font-label-md text-outline">{selectedItem.satuan}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-label-md text-on-surface-variant mb-2">Keterangan (Opsional)</label>
                  <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Jelaskan progres..." rows={3}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none text-body-md" />
                </div>

                <div>
                  <label className="block font-label-md text-on-surface-variant mb-2">Upload Bukti Eviden (PDF/Image) {selectedLaporan && '(Opsional jika tidak diubah)'}</label>
                  <div className="relative border-2 border-dashed border-outline-variant/50 rounded-xl p-4 text-center hover:bg-surface-container-lowest transition-colors group cursor-pointer"
                    onClick={() => document.getElementById('evidence-upload')?.click()}>
                    <input id="evidence-upload" type="file" className="hidden" accept=".pdf,image/png,image/jpeg"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setEvidenceFile(e.target.files[0])
                        }
                      }} />

                    {evidenceFile ? (
                      <div className="flex items-center justify-center gap-2 text-success font-bold text-body-md">
                        <span className="material-symbols-outlined">check_circle</span>
                        <span className="truncate max-w-[200px]">{evidenceFile.name}</span>
                      </div>
                    ) : selectedLaporan?.evidence_url ? (
                      <div className="flex flex-col items-center justify-center gap-2 text-primary font-bold text-body-sm">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">attachment</span>
                          <span className="truncate max-w-[200px]">{selectedLaporan.evidence_name || 'File Saat Ini'}</span>
                        </div>
                        <span className="text-[11px] text-outline font-normal">Klik untuk mengganti file</span>
                      </div>
                    ) : (
                      <div className="text-outline group-hover:text-primary transition-colors flex flex-col items-center gap-1">
                        <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
                        <span className="text-body-sm">Klik untuk memilih file</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setModalMode('closed')} disabled={saving}
                  className="px-6 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container transition-all">
                  Batal
                </button>
                <button onClick={handleSaveLapor} disabled={saving || !capaian || (!selectedLaporan && !evidenceFile)}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  {uploading ? 'Mengunggah...' : 'Simpan Laporan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
