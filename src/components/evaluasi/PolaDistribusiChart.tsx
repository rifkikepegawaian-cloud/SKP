import React from 'react'

export type CapaianOrganisasiType = 
  | 'ISTIMEWA' 
  | 'BAIK' 
  | 'BUTUH PERBAIKAN' 
  | 'KURANG' 
  | 'SANGAT KURANG'

interface PolaDistribusiChartProps {
  capaian: CapaianOrganisasiType
  width?: number
  height?: number
  className?: string
}

export const PolaDistribusiChart: React.FC<PolaDistribusiChartProps> = ({
  capaian = 'ISTIMEWA',
  width = 500,
  height = 230,
  className = '',
}) => {
  // SVG coordinates:
  // ViewBox: 0 0 520 240
  // Margins: left: 70, right: 30, top: 25, bottom: 45
  // Categories:
  // 0: Sangat Kurang       (x = 70)
  // 1: Kurang/Misconduct   (x = 175)
  // 2: Butuh Perbaikan     (x = 280)
  // 3: Baik                (x = 385)
  // 4: Sangat Baik         (x = 490)
  //
  // Y-axis:
  // 30 -> y = 25
  // 20 -> y = 86.7
  // 10 -> y = 148.3
  // 0  -> y = 210

  const getCurvePath = (type: CapaianOrganisasiType) => {
    switch (type) {
      case 'ISTIMEWA':
        // Matches exact curve in PermenPAN-RB No.6 / Evaluasi SKP Rifki.pdf
        // Flat at 0 for Sangat Kurang & Kurang, slight curve at Butuh Perbaikan,
        // steep rise through Baik (~15) and peak at Sangat Baik (~30).
        return 'M 70 210 C 120 210, 160 210, 200 210 C 240 208, 260 205, 280 202 C 320 190, 355 160, 385 118 C 420 72, 455 35, 490 25'

      case 'BAIK':
        // Normal bell curve symmetric at Baik (peak ~28)
        return 'M 70 210 C 110 210, 145 200, 175 192 C 215 182, 250 145, 280 120 C 325 80, 360 38, 385 38 C 410 38, 445 80, 490 125'

      case 'BUTUH PERBAIKAN':
        // Shifted left, peak at Butuh Perbaikan (~26)
        return 'M 70 200 C 110 195, 145 165, 175 142 C 215 110, 250 48, 280 48 C 315 48, 350 115, 385 145 C 425 180, 460 205, 490 208'

      case 'KURANG':
        // Skewed left, peak at Kurang/Misconduct (~28)
        return 'M 70 165 C 105 110, 140 40, 175 40 C 210 40, 245 115, 280 145 C 320 180, 355 202, 385 208 C 425 210, 460 210, 490 210'

      case 'SANGAT KURANG':
        // Peak at Sangat Kurang (~28), falls to 0
        return 'M 70 38 C 105 38, 140 120, 175 152 C 215 185, 250 205, 280 208 C 320 210, 355 210, 385 210 C 425 210, 460 210, 490 210'

      default:
        return 'M 70 210 C 120 210, 160 210, 200 210 C 240 208, 260 205, 280 202 C 320 190, 355 160, 385 118 C 420 72, 455 35, 490 25'
    }
  }

  const curveD = getCurvePath(capaian)

  return (
    <div className={`w-full flex justify-center items-center py-2 bg-white ${className}`}>
      <svg
        viewBox="0 0 520 245"
        className="w-full max-w-[480px] h-auto select-none"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Chart Background Box */}
        <rect x="70" y="25" width="420" height="185" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.75" />

        {/* Horizontal Gridlines and Y-Axis Ticks */}
        {/* 30 */}
        <line x1="70" y1="25" x2="490" y2="25" stroke="#e2e8f0" strokeWidth="0.75" />
        <text x="60" y="29" textAnchor="end" fontSize="10" fill="#334155" fontWeight="500">30</text>

        {/* 20 */}
        <line x1="70" y1="86.7" x2="490" y2="86.7" stroke="#e2e8f0" strokeWidth="0.75" />
        <text x="60" y="90.7" textAnchor="end" fontSize="10" fill="#334155" fontWeight="500">20</text>

        {/* 10 */}
        <line x1="70" y1="148.3" x2="490" y2="148.3" stroke="#e2e8f0" strokeWidth="0.75" />
        <text x="60" y="152.3" textAnchor="end" fontSize="10" fill="#334155" fontWeight="500">10</text>

        {/* 0 */}
        <line x1="70" y1="210" x2="490" y2="210" stroke="#94a3b8" strokeWidth="1" />
        <text x="60" y="213" textAnchor="end" fontSize="10" fill="#334155" fontWeight="500">0</text>

        {/* Y-Axis Label: FREKUENSI PEGAWAI (Rotated 90 deg counter-clockwise) */}
        <text
          x="-117"
          y="28"
          transform="rotate(-90)"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="#1e293b"
          letterSpacing="0.5"
        >
          FREKUENSI PEGAWAI
        </text>

        {/* The Distribution Curve Line */}
        <path
          d={curveD}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Category Ticks & Labels */}
        {/* 1. Sangat Kurang */}
        <line x1="70" y1="210" x2="70" y2="214" stroke="#64748b" strokeWidth="1" />
        <text x="70" y="226" textAnchor="middle" fontSize="8" fill="#1e293b" fontWeight="600">
          <tspan x="70" dy="0">Sangat</tspan>
          <tspan x="70" dy="9">Kurang</tspan>
        </text>

        {/* 2. Kurang / Misconduct */}
        <line x1="175" y1="210" x2="175" y2="214" stroke="#64748b" strokeWidth="1" />
        <text x="175" y="226" textAnchor="middle" fontSize="8" fill="#1e293b" fontWeight="600">
          <tspan x="175" dy="0">Kurang/</tspan>
          <tspan x="175" dy="9">Misconduct</tspan>
        </text>

        {/* 3. Butuh Perbaikan */}
        <line x1="280" y1="210" x2="280" y2="214" stroke="#64748b" strokeWidth="1" />
        <text x="280" y="226" textAnchor="middle" fontSize="8" fill="#1e293b" fontWeight="600">
          <tspan x="280" dy="0">Butuh</tspan>
          <tspan x="280" dy="9">Perbaikan</tspan>
        </text>

        {/* 4. Baik */}
        <line x1="385" y1="210" x2="385" y2="214" stroke="#64748b" strokeWidth="1" />
        <text x="385" y="229" textAnchor="middle" fontSize="8" fill="#1e293b" fontWeight="600">
          Baik
        </text>

        {/* 5. Sangat Baik */}
        <line x1="490" y1="210" x2="490" y2="214" stroke="#64748b" strokeWidth="1" />
        <text x="490" y="226" textAnchor="middle" fontSize="8" fill="#1e293b" fontWeight="600">
          <tspan x="490" dy="0">Sangat</tspan>
          <tspan x="490" dy="9">Baik</tspan>
        </text>
      </svg>
    </div>
  )
}
