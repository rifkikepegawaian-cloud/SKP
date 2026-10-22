export interface SKPHasilKerjaItem {
  id: string
  title: string
  target?: string | number
  satuan?: string
  indikatorKinerja: string
  jenisKinerja: 'utama' | 'tambahan'
}

export interface ProfileSKP {
  nama: string
  nip: string
  pangkatGol: string
  jabatan: string
  unitKerja: string
}

export const DEFAULT_PEGAWAI_RIFKI: ProfileSKP = {
  nama: 'Rifki Rokhanudin, S.Si.',
  nip: 'H.7.199803202024051001',
  pangkatGol: 'Setara Penata Muda/ Set. III/a',
  jabatan: 'Pengadministrasi Umum',
  unitKerja: 'Direktorat Sumber Daya Manusia',
}

export const DEFAULT_PENILAI_MONA: ProfileSKP = {
  nama: 'Mona Martinasari, S.T.',
  nip: 'H.7.198705102021042001',
  pangkatGol: 'Setara Penata Muda/ Set. III/a',
  jabatan: 'Supervisor Perencanaan dan Layanan Informasi Kepegawaian',
  unitKerja: 'Direktorat Sumber Daya Manusia',
}

export const SAMPLE_HASIL_KERJA_UTAMA: SKPHasilKerjaItem[] = [
  {
    id: 'sample-1',
    title: 'Terprosesnya penyusunan proses bisnis dan daftar dokumen pendukung penyusunan SIMPAK sebanyak 4 dokumen',
    target: 4,
    satuan: 'dokumen',
    indikatorKinerja: 'Terprosesnya 4 dokumen persiapan pembuatan aplikasi SIMPAK yakni data kebutuhan form SIMPAK, flowchart aplikasi SIMPAK, Screenrecord aplikasi SISTER, dan simulasi perhitungan eligibilitas kenaikan jabatan diproses 100%',
    jenisKinerja: 'utama',
  },
  {
    id: 'sample-2',
    title: 'Terprosesnya rekapitulasi data kebutuhan dosen sesuai usulan per fakultas/sekolah',
    target: 100,
    satuan: '%',
    indikatorKinerja: 'Terprosesnya rekapitulasi data kebutuhan dosen Universitas Diponegoro diproses 100%',
    jenisKinerja: 'utama',
  },
  {
    id: 'sample-3',
    title: 'Terprosesnya unggah SOP/Panduan di web sebanyak 29 berupa: 8 Panduan Layanan SDM, 4 Panduan perencanaan dan layanan informasi kepegawaian, 5 Panduan layanan evaluasi kinerja dan kesejahteraan, 5 Panduan layanan pengembangan kompetensi, 7 Panduan layanan pengembangan karier',
    target: 29,
    satuan: 'Panduan',
    indikatorKinerja: 'Penambahan SOP/ Panduan pada 5 subbagian DSDM di website diproses 100%',
    jenisKinerja: 'utama',
  },
  {
    id: 'sample-4',
    title: 'Terprosesnya artikel berita kegiatan DSDM di web sebanyak 162 artikel',
    target: 162,
    satuan: 'artikel',
    indikatorKinerja: 'Penerbitan 162 postingan website berupa informasi kegiatan yang sudah dilaksanakan, pengumuman, informasi beasiswa, dan informasi lintas instansi DSDM diproses 100%',
    jenisKinerja: 'utama',
  },
  {
    id: 'sample-5',
    title: 'Terprosesnya feed informasi dan kegiatan DSDM di IG sebanyak 41 postingan',
    target: 41,
    satuan: 'postingan',
    indikatorKinerja: 'Penerbitan konten feed instagram 41 ucapan hari besar dan informasi layanan diproses 100%',
    jenisKinerja: 'utama',
  },
  {
    id: 'sample-6',
    title: 'Terprosesnya reels informasi dan kegiatan DSDM sebanyak 85 reels',
    target: 85,
    satuan: 'reels',
    indikatorKinerja: 'Penerbitan reels 85 kegiatan dan konten informasi DSDM di Instagram diproses 100%',
    jenisKinerja: 'utama',
  },
  {
    id: 'sample-7',
    title: 'Terprosesnya pembuatan backdrop kegiatan DSDM sebanyak 51 backdrop',
    target: 51,
    satuan: 'backdrop',
    indikatorKinerja: 'Terprosesnya pembuatan backdrop untuk 51 kegiatan DSDM baik secara offline maupun online diproses 100%',
    jenisKinerja: 'utama',
  },
  {
    id: 'sample-8',
    title: 'Terprosesnya pembuatan paparan laporan kegiatan DSDM sebanyak 36 paparan',
    target: 36,
    satuan: 'paparan',
    indikatorKinerja: 'Terprosesnya paparan/laporan pada 36 kegiatan DSDM diproses 100%',
    jenisKinerja: 'utama',
  },
  {
    id: 'sample-9',
    title: 'Terprosesnya pembuatan 2 video tutorial Youtube dan 1 Lagu Indonesia Raya DSDM',
    target: 3,
    satuan: 'video/lagu',
    indikatorKinerja: 'Terprosesnya 2 video tutorial penggunaan fitur di SIKASMI dan 1 video lagu Indonesia Raya khas DSDM diproses 100%',
    jenisKinerja: 'utama',
  },
  {
    id: 'sample-10',
    title: 'Terprosesnya pemeliharaan rutin dan pembaharuan website DSDM',
    target: 100,
    satuan: '%',
    indikatorKinerja: 'Pemeliharaan website (update plugin dan tema, backup rutin) serta perubahan tampilan diproses 100%',
    jenisKinerja: 'utama',
  },
  {
    id: 'sample-11',
    title: 'Terprosesnya penambahan modul pada website DSDM sebanyak 1 modul, berupa: Data Statistik Pegawai Universitas Diponegoro yang diupdate data nya setiap bulan',
    target: 1,
    satuan: 'modul',
    indikatorKinerja: 'Terprosesnya modul data statistik pegawai Universitas Diponegoro beserta update data setiap bulan diproses 100%',
    jenisKinerja: 'utama',
  },
]

export const SAMPLE_HASIL_KERJA_TAMBAHAN: SKPHasilKerjaItem[] = [
  {
    id: 'sample-tambahan-1',
    title: 'Terprosesnya pengelolaan barang di DSDM',
    target: 100,
    satuan: '%',
    indikatorKinerja: 'Terprosesnya kegiatan pengadaan dan pemeliharaan aset barang di DSDM diproses 100%',
    jenisKinerja: 'tambahan',
  },
]
