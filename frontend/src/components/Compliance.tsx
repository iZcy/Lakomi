import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const PASAL = [
  { pasal: 'Pasal 5(1)', page: 4, title: 'Keanggotaan Terbuka dan Sukarela', lawText: 'Keanggotaan koperasi bersifat sukarela dan terbuka.', contract: 'LakomiToken.registerMember()', evidence: 'Fungsi terbuka untuk semua alamat dompet tanpa persyaratan.', feature: 'Anggota' },
  { pasal: 'Pasal 5(2)', page: 4, title: 'Pengelolaan Demokratis', lawText: 'Pengelolaan koperasi dilakukan secara demokratis.', contract: 'LakomiGovern.castVote()', evidence: 'Satu anggota satu suara, quorum 67% dari jumlah anggota.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 5(3)', page: 4, title: 'Pembagian SHU Adil', lawText: 'SHU dibagi sebanding dengan jasa usaha masing-masing anggota.', contract: 'LakomiVault.distributeSHU() 6 kategori', evidence: 'Split: cadangan 5%, jasa modal 40%, jasa usaha 40%, pendidikan 5%, pengurus 5%, kesejahteraan 5%.', feature: 'Simpanan' },
  { pasal: 'Pasal 18', page: 8, title: 'Pinjaman Anggota', lawText: 'Koperasi dapat memberikan pinjaman kepada anggota.', contract: 'LakomiLoans.requestLoan()', evidence: 'Anggota mengajukan pinjaman, jaminan LAK 25%, perlu persetujuan pengurus.', feature: 'Pinjaman' },
  { pasal: 'Pasal 18(2)', page: 8, title: 'Keanggotaan Tidak Dapat Dipindahtangankan', lawText: 'Keanggotaan koperasi tidak dapat dipindahtangankan.', contract: 'LakomiToken.transfersEnabled = false', evidence: 'Transfer token LAK dinonaktifkan default.', feature: 'Anggota' },
  { pasal: 'Pasal 22(1)', page: 9, title: 'Satu Anggota Satu Suara', lawText: 'Setiap anggota mempunyai hak satu suara.', contract: 'LakomiToken.getVotingPower() → 1', evidence: '1 suara per anggota, bukan berdasarkan jumlah token.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 22(2)', page: 9, title: 'Simpanan Pokok & Wajib', lawText: 'Anggota wajib membayar simpanan pokok dan simpanan wajib.', contract: 'LakomiVault.paySimpananPokok/Wajib()', evidence: 'Simpanan Pokok wajib saat pendaftaran, Simpanan Wajib bulanan.', feature: 'Simpanan' },
  { pasal: 'Pasal 23', page: 10, title: 'Keputusan Rapat Anggota (Quorum)', lawText: 'Keputusan diambil berdasarkan musyawarah atau pemungutan suara.', contract: 'LakomiGovern.quorumNumerator = 67', evidence: 'Quorum 67%. Proposal lulus jika For > Against + capai quorum.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 26', page: 11, title: 'Rapat Anggota — Kekuasaan Tertinggi', lawText: 'Rapat Anggota merupakan pemegang kekuasaan tertinggi dalam koperasi.', contract: 'LakomiGovern.scheduleAnnualRAT()', evidence: 'RAT terjadwal otomatis 1x per tahun.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 27', page: 11, title: 'Penyelenggaraan RAT', lawText: 'RAT minimal 1x setahun, berwenang menetapkan kebijakan & memilih pengurus.', contract: 'LakomiGovern.ratPeriod = 365 days', evidence: 'Pengecekan interval 365 hari.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 31', page: 13, title: 'Pemberhentian Anggota', lawText: 'Anggota dapat diberhentikan berdasarkan keputusan Rapat Anggota.', contract: 'LakomiToken.revokeMembership() via governance', evidence: 'Usulan Keanggotaan → voting → eksekusi → revokeMembership().', feature: 'Tata Kelola' },
  { pasal: 'Pasal 32', page: 13, title: 'Pengurus', lawText: 'Pengurus mengelola koperasi berdasarkan AD/ART.', contract: 'APPROVER_ROLE / TREASURER_ROLE', evidence: 'Role-based: Pengurus (setuju pinjaman), Bendahara (treasury).', feature: 'Anggota' },
  { pasal: 'Pasal 38', page: 16, title: 'Pengawas (Supervisor)', lawText: 'Pengawas mengawasi pelaksanaan kebijakan dan pengelolaan koperasi.', contract: 'LakomiGovern.vetoProposal() + PENGAWAS_ROLE', evidence: 'Veto proposal, pause governance, tandai pinjaman gagal bayar.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 39(2)', page: 17, title: 'Hak Pengawas Memeriksa Catatan', lawText: 'Pengawas berwenang meneliti semua catatan dan laporan koperasi.', contract: 'LakomiVault.getPengawasAuditReport()', evidence: 'Audit: simpanan, revenue, SHU, dana cadangan, pendidikan, pengurus.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 41', page: 18, title: 'Simpanan Pokok', lawText: 'Modal koperasi terdiri dari simpanan pokok (dibayar sekali saat masuk).', contract: 'LakomiVault.paySimpananPokok()', evidence: '100 USDC dibayarkan saat pendaftaran anggota.', feature: 'Simpanan' },
  { pasal: 'Pasal 41', page: 18, title: 'Simpanan Wajib', lawText: 'Simpanan wajib dibayarkan secara berkala oleh anggota.', contract: 'LakomiVault.paySimpananWajib()', evidence: 'Simpanan Wajib bulanan, jumlah ditetapkan tata kelola.', feature: 'Simpanan' },
  { pasal: 'Pasal 41', page: 18, title: 'Simpanan Sukarela', lawText: 'Simpanan sukarela dapat disetor dan diambil kembali sewaktu-waktu.', contract: 'LakomiVault.deposit() / withdraw()', evidence: 'Deposit USDC kapan saja, withdraw sesuai saldo.', feature: 'Simpanan' },
  { pasal: 'Pasal 43', page: 19, title: 'Dana Cadangan Wajib', lawText: 'Modal sendiri: simpanan, dana cadangan, hibah, dan SHU.', contract: 'LakomiVault.danaCadangan (5% SHU)', evidence: 'Dana cadangan diakumulasi setiap distribusi SHU.', feature: 'Simpanan' },
  { pasal: 'Pasal 45(1)', page: 21, title: 'Sisa Hasil Usaha (SHU)', lawText: 'SHU = pendapatan dikurangi biaya, penyusutan, dan kewajiban.', contract: 'LakomiVault.distributeSHU() → claimSHU()', evidence: 'Revenue bunga pinjaman → distribusi → klaim anggota.', feature: 'Simpanan' },
  { pasal: 'Pasal 45(2)', page: 21, title: 'Pembagian SHU Multi-Kategori', lawText: 'SHU dibagi: jasa anggota (40%), jasa modal (40%), cadangan (5%), pendidikan (5%), pengurus (5%), kesejahteraan (5%).', contract: 'distributeSHU() 6-kategori', evidence: 'Split via setSHUSplit(), diubah melalui governance.', feature: 'Simpanan' },
  { pasal: 'Pasal 19-21', page: 8, title: 'Hak & Kewajiban — Keluar Sukarela', lawText: 'Anggota berhak menghadiri RAT, menyampaikan pendapat, memilih/dipilih, mengundurkan diri.', contract: 'LakomiToken.resignMembership()', evidence: 'Keluar sukarela + refund simpanan pokok.', feature: 'Anggota' },
  { pasal: 'Pasal 29-30', page: 12, title: 'Pemilihan Pengurus', lawText: 'Pengurus dipilih dari/oleh anggota RAT. Masa jabatan maksimal 5 tahun.', contract: 'beginElection → vote → finalizeElection', evidence: 'Pemilu on-chain: kandidat, voting 1-suara, masa jabatan terlacak.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 33-35', page: 14, title: 'Pembubaran Koperasi', lawText: 'Pembubaran koperasi berdasarkan keputusan Rapat Anggota.', contract: 'LakomiGovern.executeDissolution()', evidence: 'Usulan pembubaran via governance, pause semua kontrak.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 41(3)', page: 19, title: 'Sertifikat Simpanan', lawText: 'Atas simpanan sukarela, dapat diterbitkan sertifikat simpanan.', contract: 'LakomiVault.issueCertificate()', evidence: 'Bendahara menerbitkan sertifikat tercatat on-chain.', feature: 'Simpanan' },
  { pasal: 'Pasal 46-47', page: 22, title: 'Laporan Keuangan Tahunan', lawText: 'Pengurus wajib menyusun laporan keuangan tahunan untuk RAT.', contract: 'generateFinancialSnapshot()', evidence: 'Snapshot: aset, simpanan, dana, revenue, SHU, memberCount.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 44', page: 20, title: 'Pertanggungjawaban Pengurus', lawText: 'Pengurus bertanggung jawab mengenai pengelolaan koperasi.', contract: 'AccessControl audit trail', evidence: 'Tindakan admin tercatat on-chain, dapat diaudit kapan saja.', feature: 'Tata Kelola' },
]

const FEATURE_MAP: Record<string, { label: string; color: string }> = {
  'Anggota': { label: 'Anggota', color: 'bg-purple-500' },
  'Simpanan': { label: 'Simpanan', color: 'bg-blue-500' },
  'Pinjaman': { label: 'Pinjaman', color: 'bg-amber-500' },
  'Tata Kelola': { label: 'Tata Kelola', color: 'bg-emerald-500' },
}

export function Compliance() {
  const [activePasal, setActivePasal] = useState(0)
  const [pdfPage, setPdfPage] = useState(1)
  const [iframeKey, setIframeKey] = useState(0)

  const handlePasalClick = (idx: number) => {
    setActivePasal(idx)
    const page = PASAL[idx].page
    setPdfPage(page)
    setIframeKey(k => k + 1)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Kepatuhan Hukum</h2>
        <p className="text-sm text-muted-foreground mt-1">UU No. 25 Tahun 1992 — Tentang Perkoperasian</p>
      </div>

      <div className="flex" style={{ height: 'calc(100vh - 180px)', minHeight: '600px' }}>
        <div className="w-1/2 border border-r-0 rounded-l-lg bg-muted/20 flex flex-col">
          <div className="px-3 py-1.5 border-b bg-muted/40 text-[11px] font-semibold flex-shrink-0 flex items-center justify-between">
            <span>UU No. 25 Tahun 1992</span>
            <span className="text-muted-foreground font-normal">Hal. {pdfPage}</span>
          </div>
          <embed key={iframeKey} src={`/uu-25-1992.pdf#page=${pdfPage}`} type="application/pdf" className="flex-1 w-full rounded-bl-lg" />
        </div>
        <div className="w-1/2 border rounded-r-lg flex flex-col overflow-y-auto">
          <div className="px-3 py-1.5 border-b bg-muted/40 text-[11px] font-semibold flex-shrink-0 sticky top-0 z-10 bg-background">Implementasi Kontrak Pintar — {PASAL.length} ketentuan</div>
          <div className="p-3 space-y-1.5">
            {PASAL.map((item, idx) => {
              const feat = FEATURE_MAP[item.feature]
              return (
                <button
                  key={idx}
                  onClick={() => handlePasalClick(idx)}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors border ${idx === activePasal ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-muted/50'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{item.pasal}</Badge>
                    {feat && <span className={`text-[9px] text-white px-1.5 py-0.5 rounded ${feat.color}`}>{feat.label}</span>}
                  </div>
                  <h4 className="text-xs font-semibold mb-1">{item.title}</h4>
                  <div className="space-y-1">
                    <div className="flex items-start gap-1.5">
                      <span className="text-[9px] font-semibold text-amber-500 uppercase w-8 flex-shrink-0">UU</span>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{item.lawText}</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[9px] font-semibold text-primary uppercase w-8 flex-shrink-0">Kontrak</span>
                      <code className="text-[10px] text-primary/80 bg-primary/5 px-1 rounded">{item.contract}</code>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[9px] font-semibold text-emerald-500 uppercase w-8 flex-shrink-0">Bukti</span>
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
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Hierarki Regulasi & Landasan Akademik</CardTitle></CardHeader>
        <CardContent className="p-0">
          <iframe src="/law-roadmap.html" className="w-full border-0" style={{ height: '480px' }} title="Hierarki Regulasi" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Referensi Hukum & Akademik</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>UU No. 25 Tahun 1992 — Tentang Perkoperasian</li>
            <li>PP No. 7 Tahun 2021 — Kemudahan, Pelindungan, dan Pemberdayaan Koperasi dan UMKM</li>
            <li>Permenkop No. 9 Tahun 2018 — Penyelenggaraan dan Pembinaan Perkoperasian</li>
            <li>Permenkop No. 8 Tahun 2023 — Usaha Simpan Pinjam Koperasi</li>
            <li>Arisudhana et al. (2025) — Prinsip Koperasi pada Blockchain</li>
            <li>Sailana et al. (2023) — Simpanan dan SHU via Smart Contract</li>
            <li>Kartika et al. (2024) — Peran Pengawas Koperasi</li>
            <li>Maryam (2025) — Analisis Yuridis UU 25/1992</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
