import { useState } from 'react'
import { cn } from '@/lib/utils'

const steps = [
  {
    id: 'problem',
    label: 'Masalah',
    icon: '⚠',
    color: 'rose',
    title: 'Koperasi Indonesia: 4 Masalah Struktural',
    points: [
      '127.000+ koperasi, 27 juta anggota — tapi 40% tidak aktif',
      'Tata kelola opak: keputusan tertutup, catatan manual',
      'Manipulasi buku anggota — tidak ada audit trail',
      'SHU didistribusikan tidak adil — perhitungan manual, rawan kecurangan',
      'Kasus besar: Indosurya Rp106T, KSP Pandawa Rp3.9T',
    ],
  },
  {
    id: 'gap',
    label: 'Celah',
    icon: '🔍',
    color: 'amber',
    title: 'DAO ≠ Koperasi: 1 Token ≠ 1 Suara',
    points: [
      'DAO transparan & otomatis — tapi voting berbobot token',
      'Pasal 22(1) UU 25/1992: "Setiap anggota mempunyai hak satu suara"',
      'Belum ada sistem blockchain yang memetakan 26 pasal UU 25/1992',
      'Belum ada yang memisahkan kontribusi finansial dari hak suara',
    ],
  },
  {
    id: 'design',
    label: 'Rancangan',
    icon: '🏗',
    color: 'emerald',
    title: 'Lakomi: 4 Smart Contract × 26 Pasal',
    points: [
      'LakomiToken: registry keanggotaan, non-transferable',
      'LakomiVault: 3 jenis simpanan + SHU 6 kategori',
      'LakomiGovern: 1-anggota-1-suara, kuorum 67%, pemilu on-chain',
      'LakomiLoans: LTV bertingkat (30/50/70%), bunga 5% APY, agunan 25%',
      'Dual-track: hak suara tetap 1, LTV naik seiring kontribusi',
      '8 peran RBAC + veto pengawas (Pasal 38-39)',
    ],
  },
  {
    id: 'implementation',
    label: 'Implementasi',
    icon: '⚙',
    color: 'blue',
    title: 'Solidity 0.8.20 + DChain + React',
    points: [
      'Hardhat framework, OpenZeppelin (AccessControl + ReentrancyGuard)',
      'Deploy di DChain — EVM consortium, 13 universitas Indonesia',
      'Frontend: React 18 + TypeScript + wagmi v2 + MetaMask',
      'Halaman Kepatuhan: 26 pasal ditampilkan dengan bukti implementasi',
      'Pengujian: fungsional (26 pasal) + gas analysis + immutability',
    ],
  },
  {
    id: 'results',
    label: 'Hasil',
    icon: '✓',
    color: 'violet',
    title: '100% Kepatuhan, Gas Terukur',
    points: [
      '26 dari 26 pasal terimplementasi dan terverifikasi',
      'Deploy: 1,58M–2,22M gas/kontrak — satu kali',
      'Operasi: 72K–210K gas — setara ≤4× transfer ERC-20',
      'Perbandingan: Lakomi satu-satunya yang menggabungkan kepatuhan UU + transparansi blockchain + 1-suara egaliter',
    ],
  },
]

export function THESIS_ROADMAP() {
  const [step, setStep] = useState(0)

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1))
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const s = steps[step]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-8">
      {/* Progress bar */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex gap-1.5">
          {steps.map((st, i) => (
            <button
              key={st.id}
              onClick={() => setStep(i)}
              className={cn(
                'flex-1 h-2 rounded-full transition-all duration-300 cursor-pointer border-0',
                i <= step
                  ? `bg-${st.color}-500 shadow-sm shadow-${st.color}-500/30`
                  : 'bg-zinc-800 hover:bg-zinc-700'
              )}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 px-1">
          {steps.map((st, i) => (
            <span
              key={st.id}
              className={cn(
                'text-[10px] uppercase tracking-wider font-medium transition-colors',
                i <= step ? `text-${st.color}-400` : 'text-zinc-600'
              )}
            >
              {st.label}
            </span>
          ))}
        </div>
      </div>

      {/* Step card */}
      <div
        className={cn(
          'w-full max-w-2xl rounded-xl border p-6 transition-all duration-300',
          `border-${s.color}-500/30 bg-zinc-900/80`
        )}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{s.icon}</span>
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              Langkah {step + 1} dari {steps.length}
            </div>
            <h2 className={`text-lg font-bold text-${s.color}-400`}>{s.title}</h2>
          </div>
        </div>

        <ul className="space-y-2.5 mb-6">
          {s.points.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-zinc-300 leading-relaxed">
              <span className={`text-${s.color}-400 mt-0.5 shrink-0`}>▸</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>

        {/* Nav */}
        <div className="flex justify-between pt-2">
          <button
            onClick={prev}
            disabled={step === 0}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              step === 0
                ? 'text-zinc-600 cursor-default'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
            )}
          >
            ← Sebelumnya
          </button>
          <span className="text-xs text-zinc-600 self-center">
            {step + 1}/{steps.length}
          </span>
          <button
            onClick={next}
            disabled={step === steps.length - 1}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              step === steps.length - 1
                ? 'text-zinc-600 cursor-default'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
            )}
          >
            Selanjutnya →
          </button>
        </div>
      </div>
    </div>
  )
}
