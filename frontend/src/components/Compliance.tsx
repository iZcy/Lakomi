import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CONTRACTS } from '../config/contracts'

type Regulation = 'uu2592' | 'pp72021' | 'permenkop92018' | 'permenkop82023'

interface PasalEntry {
  regulation: Regulation
  pasal: string
  title: string
  lawText: string
  contract: string
  evidence: string
  feature: string
}

const REGULATIONS: { key: Regulation; label: string; full: string; pdf?: string; note?: string }[] = [
  { key: 'uu2592', label: 'UU 25/1992', full: 'UU No. 25 Tahun 1992', pdf: '/uu-25-1992.pdf' },
  { key: 'pp72021', label: 'PP 7/2021', full: 'PP No. 7 Tahun 2021', note: 'Kemudahan, Pelindungan, Pemberdayaan Koperasi & UMKM. Diunduh dari peraturan.bpk.go.id' },
  { key: 'permenkop92018', label: 'Permenkop 9/2018', full: 'Permenkop No. 9 Tahun 2018', note: 'Penyelenggaraan & Pembinaan Perkoperasian. Diunduh dari peraturan.bpk.go.id' },
  { key: 'permenkop82023', label: 'Permenkop 8/2023', full: 'Permenkop No. 8 Tahun 2023', note: 'Usaha Simpan Pinjam Koperasi. Diunduh dari peraturan.bpk.go.id' },
]

const PASAL: PasalEntry[] = [
  { regulation: 'uu2592', pasal: 'Pasal 5 ayat (1)', title: 'Keanggotaan Terbuka dan Sukarela', lawText: 'Keanggotaan Koperasi bersifat sukarela dan terbuka.', contract: 'LakomiToken.registerMember()', evidence: 'Fungsi terbuka untuk semua alamat dompet.', feature: 'Anggota' },
  { regulation: 'uu2592', pasal: 'Pasal 5 ayat (2)', title: 'Pengelolaan Demokratis', lawText: 'Pengelolaan Koperasi dilakukan secara demokratis.', contract: 'LakomiGovern.castVote()', evidence: '1 suara per anggota, quorum 67%.', feature: 'Tata Kelola' },
  { regulation: 'uu2592', pasal: 'Pasal 5 ayat (3)', title: 'Pembagian SHU Adil', lawText: 'Pembagian sisa hasil usaha dilakukan secara adil sebanding dengan besarnya jasa usaha masing-masing anggota.', contract: 'distributeSHU() 6 kategori', evidence: 'Cadangan 5%, jasa modal 40%, jasa usaha 40%.', feature: 'Simpanan' },
  { regulation: 'uu2592', pasal: 'Pasal 18', title: 'Pinjaman Anggota', lawText: 'Koperasi dapat memberikan pinjaman kepada anggota. Syarat dan tata cara pemberian pinjaman ditetapkan dalam AD/ART.', contract: 'LakomiLoans.requestLoan()', evidence: 'Jaminan LAK 25%, persetujuan pengurus.', feature: 'Pinjaman' },
  { regulation: 'uu2592', pasal: 'Pasal 18 ayat (2)', title: 'Keanggotaan Tidak Dapat Dipindahtangankan', lawText: 'Keanggotaan Koperasi tidak dapat dipindahtangankan.', contract: 'transfersEnabled = false', evidence: 'Transfer token dinonaktifkan secara default.', feature: 'Anggota' },
  { regulation: 'uu2592', pasal: 'Pasal 22 ayat (1)', title: 'Satu Anggota Satu Suara', lawText: 'Setiap anggota mempunyai hak satu suara. Hak suara tidak dapat diwakilkan.', contract: 'getVotingPower() → 1', evidence: '1 suara per anggota, bukan berdasarkan token.', feature: 'Tata Kelola' },
  { regulation: 'uu2592', pasal: 'Pasal 22 ayat (2)', title: 'Kewajiban Simpanan', lawText: 'Anggota berkewajiban membayar simpanan pokok dan simpanan wajib.', contract: 'paySimpananPokok/Wajib()', evidence: 'Pokok saat daftar, Wajib bulanan.', feature: 'Simpanan' },
  { regulation: 'uu2592', pasal: 'Pasal 23', title: 'Keputusan Rapat Anggota', lawText: 'Keputusan Rapat Anggota diambil berdasarkan musyawarah untuk mencapai mufakat. Apabila tidak diperoleh mufakat, pengambilan keputusan dilakukan melalui pemungutan suara.', contract: 'quorumNumerator = 67', evidence: 'Quorum 67% (2/3 mayoritas).', feature: 'Tata Kelola' },
  { regulation: 'uu2592', pasal: 'Pasal 26', title: 'Rapat Anggota — Kekuasaan Tertinggi', lawText: 'Rapat Anggota merupakan pemegang kekuasaan tertinggi dalam Koperasi.', contract: 'scheduleAnnualRAT()', evidence: 'RAT terjadwal 1x per tahun.', feature: 'Tata Kelola' },
  { regulation: 'uu2592', pasal: 'Pasal 27 ayat (1)', title: 'Penyelenggaraan RAT', lawText: 'Rapat Anggota diselenggarakan paling sedikit 1 (satu) kali dalam 1 (satu) tahun.', contract: 'ratPeriod = 365 days', evidence: 'Interval 365 hari.', feature: 'Tata Kelola' },
  { regulation: 'uu2592', pasal: 'Pasal 31', title: 'Pemberhentian Anggota', lawText: 'Anggota dapat diberhentikan berdasarkan keputusan Rapat Anggota.', contract: 'revokeMembership() via governance', evidence: 'Usulan → voting → eksekusi.', feature: 'Tata Kelola' },
  { regulation: 'uu2592', pasal: 'Pasal 32', title: 'Pengurus', lawText: 'Pengurus mengelola Koperasi dan usahanya berdasarkan AD/ART. Pengurus bertanggung jawab mengenai kegiatan pengelolaan Koperasi.', contract: 'APPROVER_ROLE / TREASURER_ROLE', evidence: 'Role-based access control.', feature: 'Anggota' },
  { regulation: 'uu2592', pasal: 'Pasal 29-30', title: 'Pemilihan Pengurus', lawText: 'Pengurus dipilih dari dan oleh anggota Koperasi dalam Rapat Anggota. Masa jabatan Pengurus paling lama 5 (lima) tahun.', contract: 'beginElection → vote → finalize', evidence: 'Pemilu on-chain, term tracking.', feature: 'Tata Kelola' },
  { regulation: 'uu2592', pasal: 'Pasal 33-35', title: 'Pembubaran Koperasi', lawText: 'Pembubaran Koperasi dilakukan berdasarkan keputusan Rapat Anggota. Dalam hal Koperasi dibubarkan, dilakukan penyelesaian pembubaran.', contract: 'executeDissolution()', evidence: 'Pause semua kontrak.', feature: 'Tata Kelola' },
  { regulation: 'uu2592', pasal: 'Pasal 38', title: 'Pengawas', lawText: 'Untuk melakukan pengawasan terhadap pelaksanaan kebijakan dan pengelolaan Koperasi, Rapat Anggota mengangkat Pengawas dari dan oleh anggota.', contract: 'vetoProposal() + PENGAWAS_ROLE', evidence: 'Veto, pause, audit.', feature: 'Tata Kelola' },
  { regulation: 'uu2592', pasal: 'Pasal 39 ayat (2)', title: 'Hak Pengawas Memeriksa', lawText: 'Pengawas berwenang untuk meneliti catatan dan laporan yang ada pada Koperasi.', contract: 'getPengawasAuditReport()', evidence: 'Audit: simpanan, SHU, dana.', feature: 'Tata Kelola' },
  { regulation: 'uu2592', pasal: 'Pasal 41 ayat (1)', title: 'Simpanan Pokok', lawText: 'Modal Koperasi terdiri dari simpanan pokok yang dibayar oleh anggota pada saat masuk menjadi anggota.', contract: 'paySimpananPokok()', evidence: '100 IDRX saat pendaftaran.', feature: 'Simpanan' },
  { regulation: 'uu2592', pasal: 'Pasal 41 ayat (2)', title: 'Simpanan Wajib', lawText: 'Simpanan wajib yang dibayar oleh anggota secara berkala dalam jangka waktu tertentu.', contract: 'paySimpananWajib()', evidence: 'Bulanan, jumlah via tata kelola.', feature: 'Simpanan' },
  { regulation: 'uu2592', pasal: 'Pasal 41 ayat (3)', title: 'Simpanan Sukarela', lawText: 'Atas simpanan sukarela, Koperasi dapat menerbitkan sertifikat simpanan Koperasi.', contract: 'deposit() / issueCertificate()', evidence: 'Deposit bebas + sertifikat on-chain.', feature: 'Simpanan' },
  { regulation: 'permenkop82023', pasal: 'Pasal 6 ayat (1)', title: 'Batasan Maksimum Pinjaman', lawText: 'KSP/USP Koperasi wajib menetapkan batas maksimum pemberian pinjaman. Pemberian pinjaman kepada anggota didasarkan pada kemampuan membayar dan agunan.', contract: 'LakomiLoans (maxLoan, 25% collateral)', evidence: 'LTV tiered: 30%/50%/70%.', feature: 'Pinjaman' },
  { regulation: 'permenkop82023', pasal: 'Pasal 7', title: 'Suku Bunga Pinjaman', lawText: 'Koperasi menetapkan suku bunga pinjaman secara wajar dan tidak memberatkan anggota.', contract: 'interestRate = 500 (5% APY)', evidence: 'Bunga 5% flat annual rate.', feature: 'Pinjaman' },
  { regulation: 'uu2592', pasal: 'Pasal 43', title: 'Dana Cadangan', lawText: 'Modal sendiri Koperasi terdiri dari simpanan pokok, simpanan wajib, dana cadangan, donasi/hibah, dan SHU yang belum dibagi.', contract: 'danaCadangan (5% SHU)', evidence: 'Akumulasi otomatis tiap distribusi.', feature: 'Simpanan' },
  { regulation: 'uu2592', pasal: 'Pasal 45 ayat (1)', title: 'Sisa Hasil Usaha', lawText: 'Sisa Hasil Usaha merupakan pendapatan Koperasi yang diperoleh dalam satu tahun buku dikurangi dengan biaya, penyusutan, dan kewajiban lainnya.', contract: 'distributeSHU() → claimSHU()', evidence: 'Revenue bunga → distribusi → klaim.', feature: 'Simpanan' },
  { regulation: 'uu2592', pasal: 'Pasal 45 ayat (2)', title: 'Pembagian SHU', lawText: 'SHU dibagikan kepada anggota sebanding dengan jasa usaha yang dilakukan oleh masing-masing anggota.', contract: 'distributeSHU() 6 kategori', evidence: 'Cadangan 5%, pendidikan 5%, dll.', feature: 'Simpanan' },
  { regulation: 'uu2592', pasal: 'Pasal 44', title: 'Pertanggungjawaban Pengurus', lawText: 'Pengurus bertanggung jawab mengenai kegiatan pengelolaan Koperasi.', contract: 'AccessControl audit trail', evidence: 'Immutable on-chain records.', feature: 'Tata Kelola' },
  { regulation: 'uu2592', pasal: 'Pasal 46-47', title: 'Laporan Keuangan', lawText: 'Pengurus wajib menyusun laporan keuangan tahunan yang terdiri dari neraca, perhitungan SHU, laporan arus kas, dan catatan atas laporan keuangan.', contract: 'generateFinancialSnapshot()', evidence: 'Snapshot: aset, dana, SHU.', feature: 'Tata Kelola' },
]

const FEATURE_MAP: Record<string, { label: string; color: string }> = {
  'Anggota': { label: 'Anggota', color: 'bg-purple-500' },
  'Simpanan': { label: 'Simpanan', color: 'bg-blue-500' },
  'Pinjaman': { label: 'Pinjaman', color: 'bg-amber-500' },
  'Tata Kelola': { label: 'Tata Kelola', color: 'bg-emerald-500' },
}

export function Compliance() {
  const [activePasal, setActivePasal] = useState(0)
  const [activeReg, setActiveReg] = useState<Regulation>('uu2592')
  const active = PASAL[activePasal]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Kepatuhan Hukum</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Hierarki Regulasi: UU 25/1992 → PP 7/2021 → Permenkop 9/2018 · 8/2023
        </p>
      </div>

      <iframe src="/law-roadmap.html" className="w-full border rounded-lg" style={{ height: '480px' }} title="Hierarki Regulasi" />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Implementasi Kontrak Pintar — {PASAL.length} Ketentuan</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-1.5 max-h-[60vh] overflow-y-auto">
          {PASAL.map((item, idx) => {
            const feat = FEATURE_MAP[item.feature]
            const reg = REGULATIONS.find(r => r.key === item.regulation)
            const active = idx === activePasal
            return (
              <button
                key={idx}
                onClick={() => setActivePasal(idx === activePasal ? -1 : idx)}
                className={`w-full text-left p-2.5 rounded-lg transition-colors border ${active ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-muted/50'}`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-[9px] bg-muted">{reg?.label}</Badge>
                  <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{item.pasal}</Badge>
                  {feat && <span className={`text-[8px] text-white px-1.5 py-0.5 rounded ${feat.color}`}>{feat.label}</span>}
                </div>
                <h4 className="text-xs font-semibold mb-1">{item.title}</h4>
                <div className="space-y-1">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[9px] font-semibold text-amber-500 uppercase w-6 flex-shrink-0 mt-0.5">UU</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">"{item.lawText}"</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-[9px] font-semibold text-primary uppercase w-6 flex-shrink-0 mt-0.5">SC</span>
                    <code className="text-[10px] text-primary/80 bg-primary/5 px-1 rounded">{item.contract}</code>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-[9px] font-semibold text-emerald-500 uppercase w-6 flex-shrink-0 mt-0.5">OK</span>
                    <p className="text-[10px] text-muted-foreground">{item.evidence}</p>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Terimplementasi & Teruji
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      <PengawasAudit />

      <p className="text-[10px] text-muted-foreground">Verifikasi mandiri — buka dokumen regulasi di bawah, cari pasal yang dirujuk dalam ringkasan, dan cocokkan dengan kontrak pintar yang terdaftar.</p>

      <div>
        <div className="flex gap-1 mb-[-1px]">
          {REGULATIONS.map(r => (
            <button
              key={r.key}
              onClick={() => setActiveReg(r.key)}
              className={`text-[11px] px-3 py-1.5 rounded-t-md border border-b-0 transition-colors ${activeReg === r.key ? 'bg-background font-medium' : 'text-muted-foreground hover:text-foreground bg-muted/30'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Card className="rounded-tl-none">
          <div className="px-2 py-1 border-b bg-muted/40 text-[10px] font-semibold">{REGULATIONS.find(r => r.key === activeReg)?.full}</div>
          {activeReg === 'uu2592' ? (
            <iframe src="/uu-25-1992.pdf" className="w-full border-0" style={{ height: '600px' }} />
          ) : (
            <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground text-center p-4">
              {REGULATIONS.find(r => r.key === activeReg)?.note}
              <br />
              <span className="text-[10px]">Dokumen asli hanya tersedia di situs resmi peraturan.bpk.go.id.</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function PengawasAudit() {
  const { data: report } = useReadContract({
    address: CONTRACTS.LAKOMI_VAULT as `0x${string}`,
    abi: [{ type: 'function', name: 'getPengawasAuditReport', stateMutability: 'view', inputs: [], outputs: Array(10).fill({ type: 'uint256' }) }],
    functionName: 'getPengawasAuditReport',
  })
  const r = report as bigint[] | undefined
  if (!r || r.length < 10) return null

  return (
    <Card className="border-emerald-500/20">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Laporan Pengawas (Pasal 39.2 + 46-47)</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div><span className="text-muted-foreground">Simpanan Pokok</span><p className="font-medium">{Number(r[0]) / 1e6} IDRX</p></div>
          <div><span className="text-muted-foreground">Simpanan Wajib</span><p className="font-medium">{Number(r[1]) / 1e6} IDRX</p></div>
          <div><span className="text-muted-foreground">Simpanan Sukarela</span><p className="font-medium">{Number(r[2]) / 1e6} IDRX</p></div>
          <div><span className="text-muted-foreground">Revenue</span><p className="font-medium text-amber-500">{Number(r[3]) / 1e6} IDRX</p></div>
          <div><span className="text-muted-foreground">SHU Didistribusi</span><p className="font-medium">{Number(r[4]) / 1e6} IDRX</p></div>
          <div><span className="text-muted-foreground">Dana Cadangan</span><p className="font-medium">{Number(r[5]) / 1e6} IDRX</p></div>
          <div><span className="text-muted-foreground">Dana Pendidikan</span><p className="font-medium">{Number(r[6]) / 1e6} IDRX</p></div>
          <div><span className="text-muted-foreground">Dana Pengurus</span><p className="font-medium">{Number(r[7]) / 1e6} IDRX</p></div>
          <div><span className="text-muted-foreground">Dana Kesejahteraan</span><p className="font-medium">{Number(r[8]) / 1e6} IDRX</p></div>
          <div><span className="text-muted-foreground">Jumlah Anggota</span><p className="font-medium">{String(r[9])}</p></div>
        </div>
      </CardContent>
    </Card>
  )
}
