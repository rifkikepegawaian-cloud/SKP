import { RatingPerilaku } from '@/lib/types'

export interface RubrikIndikatorItem {
  id: string // e.g. '1.1', '1.2'
  aspekId: number
  kriteria: string
  diBawah: {
    skorDefault: number
    deskripsi: string
  }
  sesuai: {
    skorDefault: number
    deskripsi: string
  }
  diAtas: {
    skorDefault: number
    deskripsi: string
  }
}

export interface RubrikAspekDef {
  id: number
  nama: string
  singkatan: string
  definisi: string
  icon: string
  color: string
  indikatorList: RubrikIndikatorItem[]
}

export const RUBRIK_PERILAKU_TENDIK: RubrikAspekDef[] = [
  {
    id: 1,
    nama: 'Berorientasi Pelayanan',
    singkatan: 'Pelayanan',
    definisi: 'Sikap dan perilaku dalam memberikan pelayanan terbaik kepada mahasiswa, rekan kerja, institusi, dan masyarakat.',
    icon: 'sentiment_satisfied',
    color: 'sky',
    indikatorList: [
      {
        id: '1.1',
        aspekId: 1,
        kriteria: 'Kemampuan untuk mengidentifikasi, menganalisis, dan merespon kebutuhan, keinginan, dan harapan masyarakat/stakeholder',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Kurang mampu untuk mengidentifikasi, menganalisis, dan merespon kebutuhan, keinginan, dan harapan masyarakat/stakeholder',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Mampu untuk mengidentifikasi, menganalisis, dan merespon kebutuhan, keinginan, dan harapan masyarakat/stakeholder',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu mampu untuk mengidentifikasi, menganalisis, dan merespon kebutuhan, keinginan, dan harapan masyarakat/stakeholder',
        },
      },
      {
        id: '1.2',
        aspekId: 1,
        kriteria: 'Ramah, cekatan, solutif, dan dapat diandalkan',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Kurang ramah, kurang cekatan, kurang solutif, dan kurang dapat diandalkan dalam memberikan pelayanan kepada masyarakat/stakeholder',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Ramah, cekatan, solutif, dan dapat diandalkan dalam tugas/memberikan pelayanan kepada mahasiswa, rekan kerja, institusi, atau masyarakat sesuai dengan standar',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu ramah, sangat cekatan, sangat solutif, dan sangat dapat diandalkan dalam menyelesaikan tugas/memberikan pelayanan kepada mahasiswa, rekan kerja, institusi, atau masyarakat',
        },
      },
      {
        id: '1.3',
        aspekId: 1,
        kriteria: 'Melakukan perbaikan tiada henti',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Tertutup terhadap perubahan dan masukan, selalu mengulangi kesalahan, dan belum mampu menghilangkan kebiasaan buruk',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Mampu melakukan evaluasi dan refleksi diri, terbuka terhadap perubahan dan masukan, mampu belajar dari kesalahan, dan mampu menghilangkan kebiasaan buruk',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu mampu melakukan evaluasi dan refleksi diri, selalu terbuka terhadap perubahan dan masukan, dan tidak memiliki kebiasaan buruk',
        },
      },
    ],
  },
  {
    id: 2,
    nama: 'Akuntabel',
    singkatan: 'Akuntabel',
    definisi: 'Sikap jujur dan bertanggung jawab, memiliki disiplin dan berintegritas yang tinggi dalam setiap pelaksanaan tugas.',
    icon: 'verified_user',
    color: 'emerald',
    indikatorList: [
      {
        id: '2.1',
        aspekId: 2,
        kriteria: 'Melaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin, dan berintegritas tinggi',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Kurang mampu melaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin, dan berintegritas tinggi sesuai dengan standar',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Mampu melaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin, dan berintegritas tinggi sesuai dengan standar',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu melaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin, dan berintegritas tinggi sesuai dengan standar',
        },
      },
      {
        id: '2.2',
        aspekId: 2,
        kriteria: 'Menggunakan kekayaan dan barang milik Negara secara bertanggung jawab, efektif, dan efisien',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Menggunakan sarana dan prasarana kantor untuk kepentingan pribadi/keluarga/golongan',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Menggunakan sarana dan prasarana kantor secara bertanggung jawab, efektif, dan efisien',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu menggunakan sarana dan prasarana kantor secara bertanggung jawab, efektif, dan efisien',
        },
      },
      {
        id: '2.3',
        aspekId: 2,
        kriteria: 'Tidak menyalahgunakan kewenangan jabatan',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Menyalahgunakan wewenang untuk kepentingan pribadi/keluarga/golongan',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Tidak pernah menyalahgunakan wewenang untuk kepentingan pribadi/keluarga/golongan',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu taat aturan dan tidak pernah menyalahgunakan kewenangan jabatan untuk kepentingan pribadi/keluarga/golongan',
        },
      },
    ],
  },
  {
    id: 3,
    nama: 'Kompeten',
    singkatan: 'Kompeten',
    definisi: 'Memiliki kemampuan, pengetahuan, keterampilan, dan perilaku yang diperlukan untuk menjalankan tugas jabatannya dengan baik.',
    icon: 'school',
    color: 'indigo',
    indikatorList: [
      {
        id: '3.1',
        aspekId: 3,
        kriteria: 'Meningkatkan kompetensi diri untuk menjawab tantangan yang selalu berubah',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Tidak pernah mengikuti berbagai sarana peningkatan kompetensi (diklat, workshop, coaching/mentoring, seminar, belajar mandiri, bimtek, dll.)',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Sering mengikuti berbagai sarana peningkatan kompetensi (diklat, workshop, coaching/mentoring, seminar, belajar mandiri, bimtek, dll.)',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu aktif mengikuti berbagai sarana peningkatan kompetensi (diklat, workshop, coaching/mentoring, seminar, belajar mandiri, bimtek, dll.)',
        },
      },
      {
        id: '3.2',
        aspekId: 3,
        kriteria: 'Membantu orang lain belajar',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Tidak pernah membantu rekan kerja dalam meningkatkan kompetensi dan memecahkan masalah pekerjaan',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Sering membantu rekan kerja untuk meningkatkan kompetensi dan memecahkan masalah pekerjaan',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu membantu rekan kerja untuk meningkatkan kompetensi dan memecahkan masalah pekerjaan',
        },
      },
      {
        id: '3.3',
        aspekId: 3,
        kriteria: 'Melaksanakan tugas dengan kualitas terbaik',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Tidak pernah berusaha untuk melaksanakan tugas dengan baik sesuai dengan standar',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Sering melaksanakan tugas sesuai dengan standar',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu melaksanakan tugas sesuai dengan standar',
        },
      },
    ],
  },
  {
    id: 4,
    nama: 'Harmonis',
    singkatan: 'Harmonis',
    definisi: 'Menciptakan lingkungan kerja yang saling peduli dan menghargai perbedaan sehingga tercipta keselarasan, kondusivitas, dan produktivitas yang tinggi.',
    icon: 'diversity_3',
    color: 'amber',
    indikatorList: [
      {
        id: '4.1',
        aspekId: 4,
        kriteria: 'Menghargai setiap orang apapun latar belakangnya',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Kurang mampu menghargai perbedaan latar belakang atasan dan rekan kerja (suku, agama, dan ras)',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Mampu menghargai perbedaan latar belakang atasan dan rekan kerja (suku, agama, dan ras)',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu menjaga hubungan baik dengan atasan dan rekan kerja',
        },
      },
      {
        id: '4.2',
        aspekId: 4,
        kriteria: 'Suka menolong orang lain',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Egois dan tidak pernah membantu rekan kerja dalam memecahkan masalah pekerjaan',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Sering membantu rekan kerja dalam memecahkan masalah pekerjaan',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu membantu rekan kerja dalam memecahkan masalah pekerjaan',
        },
      },
      {
        id: '4.3',
        aspekId: 4,
        kriteria: 'Membangun lingkungan kerja yang kondusif',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Selalu menciptakan lingkungan kerja toxic (intimidasi, gosip/fitnah, pelecehan, konflik, manipulatif, diktator, dan diskriminatif)',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Menghindari terciptanya lingkungan kerja yang toxic',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu aktif menciptakan lingkungan kondusif (solutif, saling menghormati, bebas gosip/fitnah, teladan baik, membangun kolaborasi)',
        },
      },
    ],
  },
  {
    id: 5,
    nama: 'Loyal',
    singkatan: 'Loyal',
    definisi: 'Berdedikasi dan mengutamakan kepentingan bangsa dan negara di atas kepentingan pribadi atau golongan.',
    icon: 'flag',
    color: 'rose',
    indikatorList: [
      {
        id: '5.1',
        aspekId: 5,
        kriteria: 'Memegang teguh ideologi Pancasila, UUD 1945, setia kepada NKRI serta pemerintahan yang sah',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Tidak mencintai NKRI dengan menimbulkan perpecahan (mengadu domba pegawai, melanggar ibadah, mengutamakan kepentingan pribadi di atas bangsa/negara)',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Komitmen dalam menerapkan ideologi Pancasila (mengutamakan kepentingan bangsa/negara di atas kepentingan pribadi/golongan)',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu berkomitmen dalam menerapkan ideologi Pancasila (mengutamakan kepentingan bangsa/negara di atas kepentingan pribadi/golongan)',
        },
      },
      {
        id: '5.2',
        aspekId: 5,
        kriteria: 'Menjaga nama baik sesama Aparatur Sipil Negara, pimpinan, instansi, dan Negara',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Tidak mampu menjaga nama baik ASN (selalu berperilaku buruk di lingkungan kerja maupun sosial)',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Mampu menjaga nama baik ASN (berperilaku baik di lingkungan kerja maupun sosial)',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Menjaga nama baik ASN dengan selalu berperilaku baik di lingkungan kerja maupun sosial',
        },
      },
      {
        id: '5.3',
        aspekId: 5,
        kriteria: 'Menjaga rahasia jabatan dan negara',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Membocorkan informasi rahasia jabatan dan negara kepada pihak yang tidak berwenang',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Mampu menjaga informasi rahasia jabatan dan negara dari pihak yang tidak berwenang',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu menjaga informasi rahasia jabatan dan negara dari pihak yang tidak berwenang',
        },
      },
    ],
  },
  {
    id: 6,
    nama: 'Adaptif',
    singkatan: 'Adaptif',
    definisi: 'Kemampuan untuk terus berinovasi, cepat beradaptasi, dan proaktif menghadapi perubahan serta tantangan di lingkungan kerja dan era digital.',
    icon: 'autorenew',
    color: 'cyan',
    indikatorList: [
      {
        id: '6.1',
        aspekId: 6,
        kriteria: 'Cepat menyesuaikan diri menghadapi perubahan',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Kurang mampu menyesuaikan diri dengan perubahan dan tidak mau menerima masukan',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Mampu menyesuaikan diri dengan perubahan',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Terbuka dengan masukan dan selalu mampu menyesuaikan diri dengan perubahan',
        },
      },
      {
        id: '6.2',
        aspekId: 6,
        kriteria: 'Terus berinovasi dan mengembangkan kreativitas',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Kurang mampu mengembangkan kreativitas dalam bekerja',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Mampu berinovasi dan mengembangkan kreativitas dalam bekerja',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu berinovasi dan mengembangkan kreativitas dalam bekerja',
        },
      },
      {
        id: '6.3',
        aspekId: 6,
        kriteria: 'Bertindak proaktif',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Pasif dalam mengerjakan tugas-tugas yang diberikan',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Aktif dalam mengerjakan tugas-tugas yang diberikan',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu aktif dalam mengerjakan tugas-tugas yang diberikan',
        },
      },
    ],
  },
  {
    id: 7,
    nama: 'Kolaboratif',
    singkatan: 'Kolaboratif',
    definisi: 'Membangun kerjasama yang sinergis dengan berbagai pihak untuk mencapai tujuan bersama institusi.',
    icon: 'groups',
    color: 'purple',
    indikatorList: [
      {
        id: '7.1',
        aspekId: 7,
        kriteria: 'Memberi kesempatan kepada berbagai pihak untuk berkontribusi',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Kurang mampu memberi kesempatan rekan kerja berkontribusi serta kurang mampu berbagi informasi/pengetahuan yang relevan',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Memberi kesempatan rekan kerja berkontribusi dan berbagi informasi/pengetahuan yang relevan',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu memberi kesempatan rekan kerja berkontribusi dan selalu aktif berbagi informasi/pengetahuan yang relevan',
        },
      },
      {
        id: '7.2',
        aspekId: 7,
        kriteria: 'Terbuka dalam bekerja sama untuk menghasilkan nilai tambah',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Kurang mampu terbuka dalam bekerja sama dan kurang mampu membangun komunikasi efektif',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Terbuka dalam bekerja sama dan mampu membangun komunikasi efektif',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Selalu terbuka dalam bekerja sama dan aktif membangun komunikasi efektif',
        },
      },
      {
        id: '7.3',
        aspekId: 7,
        kriteria: 'Menggerakkan pemanfaatan berbagai sumber daya untuk tujuan bersama',
        diBawah: {
          skorDefault: 70,
          deskripsi: 'Kurang mampu memanfaatkan berbagai sumber daya untuk tujuan bersama',
        },
        sesuai: {
          skorDefault: 85,
          deskripsi: 'Mampu memanfaatkan berbagai sumber daya untuk tujuan bersama',
        },
        diAtas: {
          skorDefault: 95,
          deskripsi: 'Aktif dalam memanfaatkan berbagai sumber daya untuk tujuan bersama',
        },
      },
    ],
  },
]

export type LevelPilihan = 'di_bawah_ekspektasi' | 'sesuai_ekspektasi' | 'di_atas_ekspektasi'

export interface JawabanIndikator {
  level: LevelPilihan
  skor: number
}

// Convert average score (0-100) to standard RatingPerilaku
export function skorToRating(score: number): RatingPerilaku {
  if (score < 76) return 'di_bawah_ekspektasi'
  if (score <= 90) return 'sesuai_ekspektasi'
  return 'di_atas_ekspektasi'
}

// Generate automated, professional feedback narrative based on answers for an aspect
export function generateFeedbackAspek(
  aspekDef: RubrikAspekDef,
  jawabanPerIndikator: Record<string, JawabanIndikator>
): string {
  const indikatorList = aspekDef.indikatorList
  const levels = indikatorList.map(ind => jawabanPerIndikator[ind.id]?.level || 'sesuai_ekspektasi')
  const countDiAtas = levels.filter(l => l === 'di_atas_ekspektasi').length
  const countDiBawah = levels.filter(l => l === 'di_bawah_ekspektasi').length
  const countSesuai = levels.filter(l => l === 'sesuai_ekspektasi').length

  if (countDiAtas === 3) {
    return `Sangat memuaskan. Pegawai secara konsisten melampaui standar pada aspek ${aspekDef.nama.toLowerCase()}, menjadi teladan bagi rekan sejawat dan proaktif memberikan dampak positif bagi unit kerja.`
  }

  if (countDiAtas >= 1 && countDiBawah === 0) {
    const diAtasItems = indikatorList
      .filter(ind => jawabanPerIndikator[ind.id]?.level === 'di_atas_ekspektasi')
      .map(ind => ind.kriteria.toLowerCase())
    return `Kinerja perilaku sangat baik dan memenuhi seluruh standar. Menunjukkan keunggulan nyata khususnya dalam ${diAtasItems.join(', ')}.`
  }

  if (countDiBawah >= 2) {
    const diBawahItems = indikatorList
      .filter(ind => jawabanPerIndikator[ind.id]?.level === 'di_bawah_ekspektasi')
      .map(ind => ind.kriteria.toLowerCase())
    return `Perlu pembinaan dan peningkatan disiplin, terutama terkait ${diBawahItems.join(' serta ')}. Diharapkan segera melakukan evaluasi diri dan perbaikan berkelanjutan.`
  }

  if (countDiBawah === 1) {
    const itemKurang = indikatorList.find(ind => jawabanPerIndikator[ind.id]?.level === 'di_bawah_ekspektasi')
    return `Secara umum telah memenuhi standar pelaksanaan tugas, namun perlu perbaikan pada butir ${itemKurang?.kriteria.toLowerCase() || 'terkait'} agar capaian perilaku semakin optimal.`
  }

  return `Menunjukkan perilaku kerja yang stabil, disiplin, dan konsisten memenuhi standar ${aspekDef.nama.toLowerCase()} yang ditetapkan institusi.`
}
