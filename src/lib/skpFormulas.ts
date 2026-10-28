/**
 * Standar Formulasi Sasaran Kinerja dan Indikator Kinerja Individu (IKI)
 * Berdasarkan PermenPAN-RB No. 6 Tahun 2022 untuk Universitas Diponegoro
 */

export interface IKUFormula {
  kode_iku: string
  nama_iku: string
  sasaranKinerjaRektor: string
  ikiRektor: string
  sasaranKinerja?: string
  indikatorKinerjaIndividu?: string
  defaultTarget: string
  defaultSatuan: string
}

/**
 * 32 IKU Perjanjian Kinerja Rektor dengan Formulasi Kalimat Baku
 * Level Rektor: Sasaran Kinerja berawalan 'Meningkatnya...' / 'Terwujudnya...'
 */
export const MASTER_32_IKU_FORMULAS: Record<string, IKUFormula> = {
  '1': {
    kode_iku: '1',
    nama_iku: 'Lulusan memiliki pekerjaan; melanjutkan studi; atau menjadi wiraswasta',
    sasaranKinerjaRektor: 'Meningkatnya keterserapan lulusan yang langsung bekerja layak, berwirausaha, atau studi lanjut',
    ikiRektor: 'Persentase lulusan S1 dan D4/D3/D2/D1 yang berhasil mendapat pekerjaan, melanjutkan studi, atau menjadi wiraswasta',
    defaultTarget: '80',
    defaultSatuan: '%',
  },
  '2': {
    kode_iku: '2',
    nama_iku: 'Employment Outcomes (EO)',
    sasaranKinerjaRektor: 'Meningkatnya reputasi dan daya saing lulusan di pasar kerja nasional dan global (Employment Outcomes)',
    ikiRektor: 'Skor Employment Outcomes (EO) institusi dalam pemeringkatan perguruan tinggi',
    defaultTarget: '75',
    defaultSatuan: 'Skor',
  },
  '3': {
    kode_iku: '3',
    nama_iku: 'Employer Reputation (ER)',
    sasaranKinerjaRektor: 'Meningkatnya kepuasan dan pengakuan pengguna lulusan (Employer Reputation) terhadap alumni',
    ikiRektor: 'Skor Employer Reputation (ER) institusi pada tingkat internasional',
    defaultTarget: '70',
    defaultSatuan: 'Skor',
  },
  '4': {
    kode_iku: '4',
    nama_iku: 'Mahasiswa belajar di luar program studi atau meraih prestasi',
    sasaranKinerjaRektor: 'Meningkatnya keterlibatan mahasiswa berkegiatan di luar kampus dan torehan prestasi kompetisi',
    ikiRektor: 'Persentase mahasiswa S1 dan D4/D3/D2 yang menghabiskan paling tidak 20 sks di luar kampus atau meraih prestasi',
    defaultTarget: '35',
    defaultSatuan: '%',
  },
  '5': {
    kode_iku: '5',
    nama_iku: 'International Student Ratio (ISR)',
    sasaranKinerjaRektor: 'Meningkatnya proporsi mahasiswa internasional sebagai wujud internasionalisasi kampus',
    ikiRektor: 'Rasio mahasiswa asing (International Student Ratio) terhadap total mahasiswa',
    defaultTarget: '5',
    defaultSatuan: '%',
  },
  '6': {
    kode_iku: '6',
    nama_iku: 'Pembelajaran berbasis case method atau team-based project',
    sasaranKinerjaRektor: 'Meningkatnya kualitas metode pembelajaran kolaboratif dan partisipatif berbasis pemecahan kasus nyata',
    ikiRektor: 'Persentase mata kuliah yang menggunakan metode pemecahan kasus (case method) atau pembelajaran kelompok (team-based project)',
    defaultTarget: '50',
    defaultSatuan: '%',
  },
  '7': {
    kode_iku: '7',
    nama_iku: 'Akreditasi atau Sertifikasi Internasional Program Studi',
    sasaranKinerjaRektor: 'Meningkatnya jumlah program studi yang terakreditasi atau tersertifikasi internasional bereputasi',
    ikiRektor: 'Persentase program studi S1 dan D4/D3 yang memiliki akreditasi atau sertifikasi internasional',
    defaultTarget: '40',
    defaultSatuan: '%',
  },
  '8': {
    kode_iku: '8',
    nama_iku: 'Academic Reputation (AR)',
    sasaranKinerjaRektor: 'Meningkatnya reputasi akademik global universitas di mata akademisi dunia (Academic Reputation)',
    ikiRektor: 'Skor Academic Reputation (AR) universitas dalam pemeringkatan QS WUR',
    defaultTarget: '65',
    defaultSatuan: 'Skor',
  },
  '9': {
    kode_iku: '9',
    nama_iku: 'Paper per Faculty',
    sasaranKinerjaRektor: 'Meningkatnya produktivitas publikasi ilmiah internasional bereputasi dosen (Paper per Faculty)',
    ikiRektor: 'Rasio jumlah publikasi ilmiah di jurnal internasional terindeks Scopus per dosen',
    defaultTarget: '1.5',
    defaultSatuan: 'Publikasi/Dosen',
  },
  '10': {
    kode_iku: '10',
    nama_iku: 'Pengembangan lingkungan wilayah tropis, pantai, dan pesisir berkelanjutan',
    sasaranKinerjaRektor: 'Meningkatnya riset dan hilirisasi keunggulan komparatif wilayah tropis dan pesisir berkelanjutan',
    ikiRektor: 'Jumlah program riset dan pengabdian bertema lingkungan tropis dan pesisir yang terimplementasi',
    defaultTarget: '50',
    defaultSatuan: 'Program',
  },
  '11': {
    kode_iku: '11',
    nama_iku: 'Citation per Faculty (CF)',
    sasaranKinerjaRektor: 'Meningkatnya dampak sitasi karya ilmiah sivitas akademika universitas di tingkat dunia',
    ikiRektor: 'Rasio sitasi per dosen (Citation per Faculty) pada pangkalan data internasional',
    defaultTarget: '12',
    defaultSatuan: 'Sitasi/Dosen',
  },
  '12': {
    kode_iku: '12',
    nama_iku: 'International Research Network (IRN)',
    sasaranKinerjaRektor: 'Meningkatnya kolaborasi jejaring riset dan publikasi bersama mitra perguruan tinggi luar negeri',
    ikiRektor: 'Indeks International Research Network (IRN) universitas',
    defaultTarget: '45',
    defaultSatuan: 'Indeks',
  },
  '13': {
    kode_iku: '13',
    nama_iku: 'Kerjasama Program Studi',
    sasaranKinerjaRektor: 'Meningkatnya kemitraan strategis program studi dengan industri, dunia kerja, dan universitas mitra',
    ikiRektor: 'Persentase program studi yang memiliki kerjasama aktif tridharma dengan mitra bereputasi',
    defaultTarget: '80',
    defaultSatuan: '%',
  },
  '14': {
    kode_iku: '14',
    nama_iku: 'Luaran dosen diterapkan oleh masyarakat/ industri/ pemerintah',
    sasaranKinerjaRektor: 'Meningkatnya pemanfaatan inovasi dan hasil penelitian dosen oleh industri, pemerintah, dan masyarakat',
    ikiRektor: 'Jumlah luaran penelitian dan pengabdian dosen yang dimanfaatkan secara nyata',
    defaultTarget: '150',
    defaultSatuan: 'Karya/Paten',
  },
  '15': {
    kode_iku: '15',
    nama_iku: 'Hilirisasi Produk Inovasi',
    sasaranKinerjaRektor: 'Meningkatnya komersialisasi dan hilirisasi produk inovasi universitas ke pasar industri',
    ikiRektor: 'Jumlah produk inovasi universitas yang berhasil dihilirisasi dan memperoleh royalti/penjualan',
    defaultTarget: '20',
    defaultSatuan: 'Produk',
  },
  '16': {
    kode_iku: '16',
    nama_iku: 'Kontribusi pengentasan kemiskinan, ketahanan pangan dan penanggulangan bencana',
    sasaranKinerjaRektor: 'Meningkatnya kontribusi sosial-ekonomi universitas dalam penanggulangan kemiskinan dan ketahanan pangan',
    ikiRektor: 'Jumlah kegiatan pengabdian strategis berdampak nyata bagi kesejahteraan masyarakat',
    defaultTarget: '40',
    defaultSatuan: 'Program',
  },
  '17': {
    kode_iku: '17',
    nama_iku: 'Dosen berkegiatan tridharma di perguruan tinggi lain, menjadi praktisi atau pembimbing di luar program studi',
    sasaranKinerjaRektor: 'Meningkatnya mobilitas dosen berkegiatan di luar kampus (industri/perguruan tinggi lain)',
    ikiRektor: 'Persentase dosen tetap yang berkegiatan tridharma di luar kampus atau menjadi praktisi',
    defaultTarget: '30',
    defaultSatuan: '%',
  },
  '18': {
    kode_iku: '18',
    nama_iku: 'Faculty Student Ratio (FSR)',
    sasaranKinerjaRektor: 'Meningkatnya rasio dosen terhadap mahasiswa (FSR) sesuai standar mutu pendidikan tinggi',
    ikiRektor: 'Skor Faculty Student Ratio (FSR) institusi',
    defaultTarget: '30',
    defaultSatuan: 'Skor',
  },
  '19': {
    kode_iku: '19',
    nama_iku: 'International Faculty Ratio (IFR)',
    sasaranKinerjaRektor: 'Meningkatnya keberadaan dosen asing (International Faculty) dalam proses tridharma perguruan tinggi',
    ikiRektor: 'Persentase dosen asing (International Faculty Ratio) terhadap total dosen tetap',
    defaultTarget: '8',
    defaultSatuan: '%',
  },
  '20': {
    kode_iku: '20',
    nama_iku: 'Dosen bersertiﬁkasi kompetensi/profesi dan pengajar praktisi',
    sasaranKinerjaRektor: 'Meningkatnya jumlah dosen bersertifikasi kompetensi/profesi dan pengajar praktisi dari dunia industri',
    ikiRektor: 'Persentase dosen bersertifikasi kompetensi/profesi dan pengajar praktisi',
    defaultTarget: '27',
    defaultSatuan: '%',
  },
  '21': {
    kode_iku: '21',
    nama_iku: 'Tendik Bersertifikasi Kompetensi',
    sasaranKinerjaRektor: 'Meningkatnya profesionalisme dan kualifikasi tenaga kependidikan bersertifikasi kompetensi resmi',
    ikiRektor: 'Persentase tenaga kependidikan yang memiliki sertifikat kompetensi yang masih berlaku',
    defaultTarget: '50',
    defaultSatuan: '%',
  },
  '22': {
    kode_iku: '22',
    nama_iku: 'Predikat SAKIP Satker',
    sasaranKinerjaRektor: 'Terwujudnya akuntabilitas kinerja institusi yang prima dengan predikat SAKIP memuaskan',
    ikiRektor: 'Predikat nilai Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) Universitas',
    defaultTarget: 'A',
    defaultSatuan: 'Predikat',
  },
  '23': {
    kode_iku: '23',
    nama_iku: 'Nilai Kinerja Anggaran',
    sasaranKinerjaRektor: 'Meningkatnya efisiensi, akuntabilitas, dan efektivitas pengelolaan anggaran universitas',
    ikiRektor: 'Nilai Kinerja Anggaran (NKA) universitas berdasarkan evaluasi Kemenkeu/Kemendikbud',
    defaultTarget: '90',
    defaultSatuan: 'Nilai',
  },
  '24': {
    kode_iku: '24',
    nama_iku: 'Kepatuhan, Pengendalian Internal dan Penyelesaian Temuan',
    sasaranKinerjaRektor: 'Terwujudnya tata kelola keuangan yang transparan, bebas temuan berulang, dan patuh regulasi',
    ikiRektor: 'Tingkat kepatuhan pengendalian internal dan persentase tindak lanjut rekomendasi temuan pemeriksa',
    defaultTarget: '100',
    defaultSatuan: '%',
  },
  '25': {
    kode_iku: '25',
    nama_iku: 'Manajemen dan Pelayanan Teknis',
    sasaranKinerjaRektor: 'Meningkatnya mutu pelayanan teknis, kepegawaian, dan kepuasan layanan sivitas akademika',
    ikiRektor: 'Indeks Kepuasan Layanan Teknis dan Manajemen Kepegawaian',
    defaultTarget: '85',
    defaultSatuan: 'Indeks',
  },
  '26': {
    kode_iku: '26',
    nama_iku: 'Pendapatan non akademik terhadap total pendapatan',
    sasaranKinerjaRektor: 'Meningkatnya kemandirian finansial universitas melalui pendapatan non-akademik (income generating)',
    ikiRektor: 'Persentase pendapatan non-akademik terhadap total realisasi pendapatan universitas',
    defaultTarget: '25',
    defaultSatuan: '%',
  },
  '27': {
    kode_iku: '27',
    nama_iku: 'Endowment Fund dan Hasil Investasi',
    sasaranKinerjaRektor: 'Meningkatnya akumulasi dana abadi (Endowment Fund) dan imbal hasil investasi universitas',
    ikiRektor: 'Jumlah akumulasi dana abadi dan imbal hasil investasi yang dikelola',
    defaultTarget: '100',
    defaultSatuan: 'Miliar Rupiah',
  },
  '28': {
    kode_iku: '28',
    nama_iku: 'Nilai Aset',
    sasaranKinerjaRektor: 'Meningkatnya optimalisasi pemanfaatan dan legalitas pengamanan aset universitas',
    ikiRektor: 'Persentase aset universitas yang teroptimalisasi dan bersertifikat resmi',
    defaultTarget: '95',
    defaultSatuan: '%',
  },
  '29': {
    kode_iku: '29',
    nama_iku: 'Sustainability',
    sasaranKinerjaRektor: 'Terwujudnya kampus hijau berkelanjutan (Green Campus) berstandar internasional',
    ikiRektor: 'Skor pemeringkatan UI GreenMetric World University Rankings',
    defaultTarget: '8000',
    defaultSatuan: 'Poin',
  },
  '30': {
    kode_iku: '30',
    nama_iku: 'Branding dan Diseminasi di Media',
    sasaranKinerjaRektor: 'Meningkatnya citra positif, publikasi prestasi, dan eksposur reputasi universitas di media massa',
    ikiRektor: 'Jumlah diseminasi pemberitaan positif institusi di media massa nasional dan internasional',
    defaultTarget: '500',
    defaultSatuan: 'Pemberitaan',
  },
  '31': {
    kode_iku: '31',
    nama_iku: 'Repositori dan Literasi',
    sasaranKinerjaRektor: 'Meningkatnya keterbukaan akses repositori ilmiah dan budaya literasi sivitas akademika',
    ikiRektor: 'Jumlah unduhan karya ilmiah di repositori institusi dan indeks kepuasan perpustakaan',
    defaultTarget: '100000',
    defaultSatuan: 'Unduhan',
  },
  '32': {
    kode_iku: '32',
    nama_iku: 'Sistem Informasi penunjang Tata Kelola',
    sasaranKinerjaRektor: 'Terwujudnya integrasi sistem informasi dan transformasi digital terpadu penunjang tata kelola',
    ikiRektor: 'Tingkat maturitas penerapan Sistem Pemerintahan Berbasis Elektronik (SPBE) universitas',
    defaultTarget: '4.0',
    defaultSatuan: 'Indeks',
  },
}

/**
 * Mendapatkan formula default untuk IKU Rektor
 */
export function getRektorIKUFormula(kodeIku: string, namaIku?: string): IKUFormula {
  if (MASTER_32_IKU_FORMULAS[kodeIku]) {
    return MASTER_32_IKU_FORMULAS[kodeIku]
  }

  const cleanName = namaIku || `IKU ${kodeIku}`
  return {
    kode_iku: kodeIku,
    nama_iku: cleanName,
    sasaranKinerjaRektor: `Meningkatnya capaian ${cleanName} sesuai standar mutu universitas`,
    ikiRektor: `Persentase ketercapaian target ${cleanName}`,
    defaultTarget: '100',
    defaultSatuan: '%',
  }
}

/**
 * Menghasilkan saran formulasi Sasaran Kinerja dan Indikator Kinerja Individu (IKI)
 * berdasarkan level cascading dan nama tugas/output
 */
export function generateCascadingFormula(params: {
  level: 'sukpa' | 'unit' | 'manajer' | 'spv' | 'staff'
  parentTitle?: string
  taskName?: string
  satuan?: string
  kodeIku?: string
}): { sasaranKinerja: string; indikatorKinerjaIndividu: string } {
  const { level, parentTitle, taskName, satuan = 'Dokumen', kodeIku } = params
  const baseName = (taskName || parentTitle || 'Kinerja').trim()

  switch (level) {
    case 'sukpa': {
      // Pimpinan SUKPA (Wakil Rektor): Berawalan 'Terselenggaranya...' / 'Terpenuhinya...'
      const ikuInfo = kodeIku ? MASTER_32_IKU_FORMULAS[kodeIku] : null
      if (kodeIku === '18') {
        return {
          sasaranKinerja: 'Terselenggaranya perencanaan dan pemenuhan kebutuhan dosen sesuai rasio ideal',
          indikatorKinerjaIndividu: 'Skor FSR yang tercapai melalui perencanaan kebutuhan dosen',
        }
      }
      if (kodeIku === '20') {
        return {
          sasaranKinerja: 'Terselenggaranya pembinaan sertifikasi kompetensi dosen dan rekruitmen pengajar praktisi',
          indikatorKinerjaIndividu: 'Persentase pemenuhan sertifikasi dosen dan kemitraan praktisi',
        }
      }
      return {
        sasaranKinerja: `Terselenggaranya koordinasi strategis dan pencapaian ${ikuInfo?.nama_iku || baseName}`,
        indikatorKinerjaIndividu: `Skor / capaian realisasi ${ikuInfo?.nama_iku || baseName} pada bidang kerja`,
      }
    }

    case 'unit': {
      // Pimpinan Unit (Dekan / Direktur): Berawalan 'Tercapainya...' / 'Terpenuhinya...'
      return {
        sasaranKinerja: `Terwujudnya pemenuhan target ${baseName} di lingkungan unit kerja`,
        indikatorKinerjaIndividu: `Persentase ketercapaian alokasi target ${baseName} pada unit`,
      }
    }

    case 'manajer': {
      // Manajer: IKI = nama Output dari Unit; Sasaran Kinerja = 'Terlaksananya [nama output]'
      const cleanOutput = baseName.replace(/^(jumlah|output|kegiatan)\s+/i, '')
      return {
        sasaranKinerja: `Terlaksananya proses ${cleanOutput.toLowerCase()}`,
        indikatorKinerjaIndividu: baseName, // Sesuai aturan: IKI Manajer mengikuti nama Output
      }
    }

    case 'spv': {
      // Supervisor: Uraian tugas, Sasaran = 'Terkelolanya / Terlaksananya [uraian]', IKI = 'Jumlah [uraian]'
      return {
        sasaranKinerja: `Terkelolanya pelaksanaan ${baseName.toLowerCase()}`,
        indikatorKinerjaIndividu: `Jumlah ${baseName} yang diselesaikan sesuai SOP (${satuan})`,
      }
    }

    case 'staff': {
      // Staff: Sub-uraian teknis, Sasaran = 'Terselesaikannya [sub-uraian]', IKI = 'Jumlah [sub-uraian]'
      return {
        sasaranKinerja: `Terselesaikannya ${baseName.toLowerCase()}`,
        indikatorKinerjaIndividu: `Jumlah ${baseName} yang berhasil diproses (${satuan})`,
      }
    }

    default:
      return {
        sasaranKinerja: `Terlaksananya ${baseName}`,
        indikatorKinerjaIndividu: `Jumlah ${baseName} yang dicapai`,
      }
  }
}
