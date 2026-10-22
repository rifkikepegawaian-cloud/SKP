import { AspekBerakhlakDef, RatingPerilaku } from '@/lib/types'

export const ASPEK_BERAKHLAK: AspekBerakhlakDef[] = [
  {
    id: 1,
    nama: 'Berorientasi pelayanan',
    tagline: 'Komitmen memberikan pelayanan prima demi kepuasan masyarakat & stakeholder',
    icon: 'sentiment_satisfied',
    color: 'sky',
    panduan: [
      'Memahami dan memenuhi kebutuhan masyarakat',
      'Ramah, cekatan, solutif, dan dapat diandalkan',
      'Melakukan perbaikan tiada henti',
    ],
    defaultEkspektasi: 'Lebih mengutamakan pelayanan kpd stakeholder daripada kepentingan pribadi',
  },
  {
    id: 2,
    nama: 'Akuntabel',
    tagline: 'Bertanggung jawab atas kepercayaan yang diberikan',
    icon: 'verified_user',
    color: 'emerald',
    panduan: [
      'Melaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin, dan berintegritas tinggi',
      'Menggunakan kekayaan dan barang milik negara secara bertanggung jawab, efektif, dan efisien',
      'Tidak menyalahgunakan kewenangan jabatan',
    ],
    defaultEkspektasi: 'Menjalin komunikasi dan koordinasi yang baik dengan atasan langsung',
  },
  {
    id: 3,
    nama: 'Kompeten',
    tagline: 'Terus belajar dan mengembangkan kapabilitas diri',
    icon: 'school',
    color: 'indigo',
    panduan: [
      'Meningkatkan kompetensi diri untuk menjawab tantangan yang selalu berubah',
      'Membantu orang lain belajar',
      'Melaksanakan tugas dengan kualitas terbaik',
    ],
    defaultEkspektasi: 'Pembelajar yang baik',
  },
  {
    id: 4,
    nama: 'Harmonis',
    tagline: 'Saling peduli dan menghargai perbedaan latar belakang',
    icon: 'diversity_3',
    color: 'amber',
    panduan: [
      'Menghargai setiap orang apapun latar belakangnya',
      'Suka menolong orang lain',
      'Membangun lingkungan kerja yang kondusif',
    ],
    defaultEkspektasi: 'Fleksibel (luwes)',
  },
  {
    id: 5,
    nama: 'Loyal',
    tagline: 'Berdedikasi dan mengutamakan kepentingan Bangsa dan Negara',
    icon: 'flag',
    color: 'rose',
    panduan: [
      'Memegang teguh ideologi Pancasila, Undang-Undang Dasar Negara Republik Indonesia Tahun 1945, setia pada Negara Kesatuan Republik Indonesia serta pemerintahan yang sah',
      'Menjaga nama baik sesama ASN, Pimpinan, Instansi, dan Negara',
      'Menjaga rahasia jabatan dan negara',
    ],
    defaultEkspektasi: 'Berakhlaq mulia',
  },
  {
    id: 6,
    nama: 'Adaptif',
    tagline: 'Terus berinovasi dan antusias dalam menggerakkan ataupun menghadapi perubahan',
    icon: 'autorenew',
    color: 'cyan',
    panduan: [
      'Cepat menyesuaikan diri menghadapi perubahan',
      'Terus berinovasi dan mengembangkan kreativitas',
      'Bertindak proaktif',
    ],
    defaultEkspektasi: 'Profesional dalam bekerja',
  },
  {
    id: 7,
    nama: 'Kolaboratif',
    tagline: 'Membangun kerja sama yang sinergis dan menghasilkan nilai tambah',
    icon: 'groups',
    color: 'purple',
    panduan: [
      'Memberi kesempatan kepada berbagai pihak untuk berkontribusi',
      'Terbuka dalam bekerja sama untuk menghasilkan nilai tambah',
      'Menggerakkan pemanfaatan berbagai sumberdaya untuk tujuan bersama',
    ],
    defaultEkspektasi: 'Tidak bersifat egois',
  },
]

export const RATING_PERILAKU_CONFIG: Record<
  RatingPerilaku,
  { label: string; badgeClass: string; icon: string; description: string }
> = {
  di_atas_ekspektasi: {
    label: 'Di Atas Ekspektasi',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: 'star',
    description: 'Secara konsisten melampaui standar panduan perilaku & ekspektasi pimpinan',
  },
  sesuai_ekspektasi: {
    label: 'Sesuai Ekspektasi',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    icon: 'check_circle',
    description: 'Konsisten memenuhi seluruh standar perilaku kerja dan arahan pimpinan',
  },
  di_bawah_ekspektasi: {
    label: 'Di Bawah Ekspektasi',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: 'warning',
    description: 'Belum memenuhi standar perilaku kerja yang diharapkan dan butuh bimbingan',
  },
}
