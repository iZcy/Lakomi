import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PdfViewer } from './PdfViewer'

const PASAL = [
  { pasal: 'Pasal 5(1)', page: 5, title: 'Keanggotaan Terbuka dan Sukarela', lawText: 'Keanggotaan koperasi bersifat sukarela dan terbuka.', contract: 'LakomiToken.registerMember()', evidence: 'Fungsi terbuka untuk semua alamat dompet tanpa persyaratan.', feature: 'Anggota' },
  { pasal: 'Pasal 5(2)', page: 5, title: 'Pengelolaan Demokratis', lawText: 'Pengelolaan koperasi dilakukan secara demokratis.', contract: 'LakomiGovern.castVote()', evidence: 'Satu anggota satu suara, quorum 67%.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 5(3)', page: 5, title: 'Pembagian SHU Adil', lawText: 'SHU dibagi sebanding dengan jasa usaha.', contract: 'LakomiVault.distributeSHU() 6 kategori', evidence: 'Split: cadangan 5%, jasa modal 40%, jasa usaha 40%.', feature: 'Simpanan' },
  { pasal: 'Pasal 18', page: 20, title: 'Pinjaman Anggota', lawText: 'Koperasi dapat memberikan pinjaman kepada anggota.', contract: 'LakomiLoans.requestLoan()', evidence: 'Jaminan LAK 25%, perlu persetujuan pengurus.', feature: 'Pinjaman' },
  { pasal: 'Pasal 18(2)', page: 20, title: 'Non-Transferable', lawText: 'Keanggotaan tidak dapat dipindahtangankan.', contract: 'transfersEnabled = false', evidence: 'Transfer token dinonaktifkan default.', feature: 'Anggota' },
  { pasal: 'Pasal 22(1)', page: 22, title: 'Satu Anggota Satu Suara', lawText: 'Setiap anggota mempunyai hak satu suara.', contract: 'getVotingPower() → 1', evidence: '1 suara per anggota, bukan token.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 22(2)', page: 22, title: 'Simpanan Pokok & Wajib', lawText: 'Anggota wajib membayar simpanan.', contract: 'paySimpananPokok/Wajib()', evidence: 'Pokok wajib daftar, Wajib bulanan.', feature: 'Simpanan' },
  { pasal: 'Pasal 23', page: 23, title: 'Quorum Keputusan', lawText: 'Keputusan diambil musyawarah atau pemungutan suara.', contract: 'quorumNumerator = 67', evidence: 'Quorum 67%. For > Against.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 26', page: 23, title: 'Rapat Anggota', lawText: 'Rapat Anggota kekuasaan tertinggi koperasi.', contract: 'scheduleAnnualRAT()', evidence: 'RAT 1x per tahun.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 27', page: 23, title: 'Penyelenggaraan RAT', lawText: 'RAT minimal 1x setahun.', contract: 'ratPeriod = 365 days', evidence: 'Interval 365 hari.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 31', page: 24, title: 'Pemberhentian Anggota', lawText: 'Anggota diberhentikan berdasarkan RAT.', contract: 'revokeMembership() via governance', evidence: 'Usulan → voting → eksekusi.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 32', page: 24, title: 'Pengurus', lawText: 'Pengurus mengelola koperasi.', contract: 'APPROVER_ROLE / TREASURER_ROLE', evidence: 'Role-based management.', feature: 'Anggota' },
  { pasal: 'Pasal 38', page: 26, title: 'Pengawas', lawText: 'Pengawas mengawasi kebijakan dan pengelolaan.', contract: 'vetoProposal() + PENGAWAS_ROLE', evidence: 'Veto, pause, gagal bayar.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 39(2)', page: 27, title: 'Hak Pengawas Audit', lawText: 'Pengawas meneliti catatan koperasi.', contract: 'getPengawasAuditReport()', evidence: 'Audit: simpanan, SHU, dana.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 41', page: 27, title: 'Simpanan Pokok', lawText: 'Simpanan pokok dibayar sekali saat masuk.', contract: 'paySimpananPokok()', evidence: '100 USDC saat daftar.', feature: 'Simpanan' },
  { pasal: 'Pasal 41', page: 27, title: 'Simpanan Wajib', lawText: 'Simpanan wajib dibayar berkala.', contract: 'paySimpananWajib()', evidence: 'Bulanan via tata kelola.', feature: 'Simpanan' },
  { pasal: 'Pasal 41', page: 27, title: 'Simpanan Sukarela', lawText: 'Simpanan sukarela disetor/diambil bebas.', contract: 'deposit() / withdraw()', evidence: 'Deposit kapan saja.', feature: 'Simpanan' },
  { pasal: 'Pasal 43', page: 28, title: 'Dana Cadangan', lawText: 'Modal sendiri: simpanan, dana cadangan.', contract: 'danaCadangan (5% SHU)', evidence: 'Akumulasi tiap distribusi.', feature: 'Simpanan' },
  { pasal: 'Pasal 45(1)', page: 29, title: 'Sisa Hasil Usaha', lawText: 'SHU = pendapatan - biaya.', contract: 'distributeSHU() → claimSHU()', evidence: 'Revenue bunga → distribusi.', feature: 'Simpanan' },
  { pasal: 'Pasal 45(2)', page: 29, title: 'SHU Multi-Kategori', lawText: '6 kategori: jasa, modal, cadangan.', contract: 'distributeSHU() 6-kategori', evidence: 'Split via setSHUSplit().', feature: 'Simpanan' },
  { pasal: 'Pasal 19-21', page: 21, title: 'Hak & Keluar Sukarela', lawText: 'Anggota berhak hadir RAT, menyampaikan pendapat, memilih, keluar.', contract: 'resignMembership()', evidence: 'Refund simpanan pokok.', feature: 'Anggota' },
  { pasal: 'Pasal 29-30', page: 24, title: 'Pemilihan Pengurus', lawText: 'Pengurus dipilih dari/oleh anggota RAT.', contract: 'beginElection → vote → finalize', evidence: 'Pemilu on-chain.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 33-35', page: 25, title: 'Pembubaran Koperasi', lawText: 'Pembubaran berdasarkan RAT.', contract: 'executeDissolution()', evidence: 'Pause semua kontrak.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 41(3)', page: 28, title: 'Sertifikat Simpanan', lawText: 'Dapat menerbitkan sertifikat simpanan.', contract: 'issueCertificate()', evidence: 'Tercatat on-chain.', feature: 'Simpanan' },
  { pasal: 'Pasal 46-47', page: 30, title: 'Laporan Keuangan Tahunan', lawText: 'Pengurus susun laporan untuk RAT.', contract: 'generateFinancialSnapshot()', evidence: 'Snapshot: aset, dana, SHU.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 44', page: 29, title: 'Pertanggungjawaban Pengurus', lawText: 'Pengurus bertanggung jawab.', contract: 'AccessControl audit trail', evidence: 'On-chain transparent records.', feature: 'Tata Kelola' },
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
          <PdfViewer src="/uu-25-1992.pdf" page={pdfPage} />
        </div>
        <div className="w-1/2 border rounded-r-lg flex flex-col overflow-y-auto">
          <div className="px-3 py-1.5 border-b bg-muted/40 text-[11px] font-semibold flex-shrink-0 sticky top-0 z-10 bg-background">Implementasi Kontrak Pintar — {PASAL.length} ketentuan</div>
          <div className="p-3 space-y-1.5">
            {PASAL.map((item, idx) => {
              const feat = FEATURE_MAP[item.feature]
              return (
                <button
                  key={idx}
                  onClick={() => { setActivePasal(idx); setPdfPage(PASAL[idx].page) }}
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
