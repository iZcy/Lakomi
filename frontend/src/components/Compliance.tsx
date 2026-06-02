import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PdfViewer } from './PdfViewer'

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

const REGULATIONS: { key: Regulation; label: string; full: string; pdf: string }[] = [
  { key: 'uu2592', label: 'UU 25/1992', full: 'UU No. 25 Tahun 1992', pdf: '/uu-25-1992.pdf' },
  { key: 'pp72021', label: 'PP 7/2021', full: 'PP No. 7 Tahun 2021', pdf: '/regulations/pp-7-2021.pdf' },
  { key: 'permenkop92018', label: 'Permenkop 9/2018', full: 'Permenkop No. 9 Tahun 2018', pdf: '/regulations/permenkop-9-2018.pdf' },
  { key: 'permenkop82023', label: 'Permenkop 8/2023', full: 'Permenkop No. 8 Tahun 2023', pdf: '/regulations/permenkop-8-2023.pdf' },
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
  { regulation: 'uu2592', pasal: 'Pasal 41 ayat (1)', title: 'Simpanan Pokok', lawText: 'Modal Koperasi terdiri dari simpanan pokok yang dibayar oleh anggota pada saat masuk menjadi anggota.', contract: 'paySimpananPokok()', evidence: '100 USDC saat pendaftaran.', feature: 'Simpanan' },
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
  const active = PASAL[activePasal]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Kepatuhan Hukum</h2>
        <p className="text-sm text-muted-foreground mt-1">Hierarki: UU 25/1992 → PP 7/2021 → Permenkop 9/2018 · 8/2023</p>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Ringkasan Implementasi — {PASAL.length} Ketentuan</CardTitle>
          <span className="text-[10px] text-muted-foreground">Klik untuk buka detail</span>
        </CardHeader>
        <CardContent className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-[55vh] overflow-y-auto">
          {PASAL.map((item, idx) => {
            const feat = FEATURE_MAP[item.feature]
            const reg = REGULATIONS.find(r => r.key === item.regulation)
            const active = idx === activePasal
            return (
              <button
                key={idx}
                onClick={() => setActivePasal(idx === activePasal ? -1 : idx)}
                className={`text-left p-2 rounded-lg transition-colors border ${active ? 'ring-2 ring-primary border-primary' : 'border-border hover:bg-muted/50'}`}
              >
                <div className="flex items-center gap-1 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-[8px] bg-muted">{reg?.label}</Badge>
                  <Badge className="text-[8px] bg-emerald-500 text-white hover:bg-emerald-500">{item.pasal}</Badge>
                  {feat && <span className={`text-[7px] text-white px-1 py-0.5 rounded ${feat.color}`}>{feat.label}</span>}
                </div>
                <p className="text-[10px] font-medium leading-tight mb-0.5">{item.title}</p>
                {active && (
                  <div className="mt-1 pt-1 border-t border-border space-y-0.5">
                    <p className="text-[9px] text-muted-foreground italic">"{item.lawText}"</p>
                    <p className="text-[9px] text-primary/80"><span className="font-semibold">Kontrak:</span> {item.contract}</p>
                    <p className="text-[9px] text-emerald-500 flex items-center gap-0.5">
                      <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {item.evidence}
                    </p>
                  </div>
                )}
              </button>
            )
          })}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground">Verifikasi mandiri — buka dokumen regulasi di bawah, cari pasal yang dirujuk, dan cocokkan dengan kontrak pintar yang terdaftar.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2" style={{ minHeight: '400px' }}>
        {REGULATIONS.slice(0, 2).map(r => (
          <Card key={r.key} className="flex flex-col">
            <div className="px-2 py-1 border-b bg-muted/40 text-[10px] font-semibold flex-shrink-0">{r.full}</div>
            <iframe src={r.pdf} className="flex-1 w-full border-0 rounded-b-lg" style={{ minHeight: '400px' }} />
          </Card>
        ))}
        {REGULATIONS.slice(2).map(r => (
          <Card key={r.key} className="flex flex-col">
            <div className="px-2 py-1 border-b bg-muted/40 text-[10px] font-semibold flex-shrink-0">{r.full}</div>
            <iframe src={r.pdf} className="flex-1 w-full border-0 rounded-b-lg" style={{ minHeight: '400px' }} />
          </Card>
        ))}
      </div>
    </div>
  )
}
