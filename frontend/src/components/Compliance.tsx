import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const PASAL = [
  {
    pasal: 'Pasal 5(1)',
    title: 'Keanggotaan Terbuka dan Sukarela',
    lawText: 'Keanggotaan koperasi bersifat sukarela dan terbuka.',
    contract: 'LakomiToken.registerMember()',
    evidence: 'Setiap alamat dompet dapat mendaftar tanpa diskriminasi melalui registerMember().',
    feature: 'Anggota',
  },
  {
    pasal: 'Pasal 5(2)',
    title: 'Pengelolaan Demokratis',
    lawText: 'Pengelolaan koperasi dilakukan secara demokratis.',
    contract: 'LakomiGovern.castVote()',
    evidence: 'Satu anggota satu suara, quorum berdasarkan jumlah anggota.',
    feature: 'Tata Kelola',
  },
  {
    pasal: 'Pasal 5(3)',
    title: 'Pembagian SHU Adil',
    lawText: 'Pembagian sisa hasil usaha dilakukan secara adil sebanding dengan besarnya jasa usaha masing-masing anggota.',
    contract: 'LakomiVault.distributeSHU()',
    evidence: 'SHU didistribusikan proporsional berdasarkan kontribusi simpanan.',
    feature: 'Simpanan',
  },
  {
    pasal: 'Pasal 18',
    title: 'Pinjaman Anggota',
    lawText: 'Koperasi dapat memberikan pinjaman kepada anggota.',
    contract: 'LakomiLoans.requestLoan()',
    evidence: 'Anggota dapat mengajukan pinjaman dengan jaminan LAK 25%, perlu persetujuan pengurus.',
    feature: 'Pinjaman',
  },
  {
    pasal: 'Pasal 18(2)',
    title: 'Keanggotaan Tidak Dapat Dipindahtangankan',
    lawText: 'Keanggotaan koperasi tidak dapat dipindahtangankan.',
    contract: 'LakomiToken.transfersEnabled = false',
    evidence: 'Transfer token LAK dinonaktifkan secara default. Hanya admin yang dapat mengaktifkan.',
    feature: 'Anggota',
  },
  {
    pasal: 'Pasal 22(1)',
    title: 'Satu Anggota Satu Suara',
    lawText: 'Setiap anggota mempunyai hak satu suara.',
    contract: 'LakomiToken.getVotingPower() → 1',
    evidence: 'Setiap anggota memiliki 1 suara, bukan berdasarkan jumlah simpanan.',
    feature: 'Tata Kelola',
  },
  {
    pasal: 'Pasal 22(2)',
    title: 'Simpanan Pokok & Wajib',
    lawText: 'Anggota wajib membayar simpanan pokok dan simpanan wajib.',
    contract: 'LakomiVault.paySimpananPokok() / paySimpananWajib()',
    evidence: 'Simpanan Pokok saat pendaftaran, Simpanan Wajib bulanan.',
    feature: 'Simpanan',
  },
  {
    pasal: 'Pasal 23',
    title: 'Keputusan Rapat Anggota',
    lawText: 'Keputusan Rapat Anggota diambil berdasarkan musyawarah untuk mencapai mufakat. Apabila tidak diperoleh mufakat, pengambilan keputusan dilakukan melalui pemungutan suara.',
    contract: 'LakomiGovern.quorumNumerator = 67',
    evidence: 'Quorum default 67% (2/3 mayoritas). Simple majority (For > Against) untuk kelulusan.',
    feature: 'Tata Kelola',
  },
  {
    pasal: 'Pasal 26',
    title: 'Rapat Anggota',
    lawText: 'Rapat Anggota merupakan pemegang kekuasaan tertinggi dalam koperasi.',
    contract: 'LakomiGovern.scheduleAnnualRAT()',
    evidence: 'RAT terjadwal otomatis 1x per tahun, usulan RAT khusus.',
    feature: 'Tata Kelola',
  },
  {
    pasal: 'Pasal 27',
    title: 'Penyelenggaraan RAT',
    lawText: 'Rapat Anggota diselenggarakan paling sedikit 1 kali dalam 1 tahun.',
    contract: 'LakomiGovern.scheduleAnnualRAT()',
    evidence: 'Pengecekan interval 365 hari, hanya dapat dijadwalkan 1x per tahun.',
    feature: 'Tata Kelola',
  },
  {
    pasal: 'Pasal 31',
    title: 'Pemberhentian Anggota',
    lawText: 'Anggota dapat diberhentikan berdasarkan keputusan Rapat Anggota.',
    contract: 'LakomiToken.revokeMembership() via LakomiGovern',
    evidence: 'Usulan tata kelola tipe Keanggotaan → voting → eksekusi revokeMembership().',
    feature: 'Tata Kelola',
  },
  {
    pasal: 'Pasal 32',
    title: 'Pengurus',
    lawText: 'Pengurus dipilih dari dan oleh anggota dalam Rapat Anggota.',
    contract: 'AccessControl APPROVER_ROLE / TREASURER_ROLE',
    evidence: 'Role-based: Pengurus (APPROVER_ROLE), Bendahara (TREASURER_ROLE).',
    feature: 'Anggota',
  },
  {
    pasal: 'Pasal 38',
    title: 'Pengawas',
    lawText: 'Pengawas bertugas melakukan pengawasan terhadap pelaksanaan kebijakan dan pengelolaan koperasi.',
    contract: 'LakomiGovern.vetoProposal() + PENGAWAS_ROLE',
    evidence: 'Pengawas dapat memveto usulan, pause kontrak, menandai pinjaman gagal bayar.',
    feature: 'Tata Kelola',
  },
  {
    pasal: 'Pasal 39(2)',
    title: 'Hak Pengawas Memeriksa Catatan',
    lawText: 'Pengawas berwenang untuk meneliti catatan dan laporan yang ada pada koperasi.',
    contract: 'LakomiVault.getPengawasAuditReport()',
    evidence: 'Fungsi audit khusus mengembalikan ringkasan lengkap: total simpanan, revenue, SHU, dana cadangan, pendidikan, pengurus, kesejahteraan.',
    feature: 'Tata Kelola',
  },
  {
    pasal: 'Pasal 41',
    title: 'Modal Koperasi — Simpanan Pokok',
    lawText: 'Modal koperasi terdiri dari simpanan pokok, simpanan wajib, dan simpanan sukarela.',
    contract: 'LakomiVault.paySimpananPokok()',
    evidence: 'Simpanan Pokok (100 USDC) dibayarkan satu kali saat pendaftaran.',
    feature: 'Simpanan',
  },
  {
    pasal: 'Pasal 41',
    title: 'Modal Koperasi — Simpanan Wajib',
    lawText: 'Simpanan wajib dibayarkan secara berkala.',
    contract: 'LakomiVault.paySimpananWajib()',
    evidence: 'Simpanan Wajib bulanan, jumlah ditetapkan oleh tata kelola.',
    feature: 'Simpanan',
  },
  {
    pasal: 'Pasal 41',
    title: 'Modal Koperasi — Simpanan Sukarela',
    lawText: 'Simpanan sukarela dapat diambil kembali sewaktu-waktu.',
    contract: 'LakomiVault.deposit() / withdraw()',
    evidence: 'Deposit USDC kapan saja, withdraw sesuai saldo tersedia.',
    feature: 'Simpanan',
  },
  {
    pasal: 'Pasal 43',
    title: 'Dana Cadangan Wajib',
    lawText: 'Modal sendiri koperasi terdiri dari simpanan pokok, simpanan wajib, dana cadangan, dan donasi.',
    contract: 'LakomiVault.danaCadangan + setSHUSplit()',
    evidence: 'Dana cadangan diakumulasi dari 5% SHU setiap distribusi. Dapat disesuaikan melalui tata kelola.',
    feature: 'Simpanan',
  },
  {
    pasal: 'Pasal 45(1)',
    title: 'Sisa Hasil Usaha (SHU)',
    lawText: 'SHU merupakan pendapatan koperasi yang diperoleh dalam satu tahun buku dikurangi biaya, penyusutan, dan kewajiban lainnya.',
    contract: 'LakomiVault.distributeSHU() → claimSHU()',
    evidence: 'Revenue dari bunga pinjaman diakumulasi, distribusi oleh GOVERN_ROLE, klaim per anggota.',
    feature: 'Simpanan',
  },
  {
    pasal: 'Pasal 45(2)',
    title: 'Pembagian SHU Multi-Kategori',
    lawText: 'SHU dibagi untuk: jasa anggota (40%), jasa modal (40%), dana cadangan (5%), dana pendidikan (5%), dana pengurus (5%), dana kesejahteraan sosial (5%).',
    contract: 'LakomiVault.distributeSHU() 6 kategori',
    evidence: 'Split: cadangan 5%, jasa modal 40%, jasa usaha 40%, pendidikan 5%, pengurus 5%, kesejahteraan 5%. Total = 100%.',
    feature: 'Simpanan',
  },
  {
    pasal: 'Pasal 44',
    title: 'Pertanggungjawaban Pengurus',
    lawText: 'Pengurus bertanggung jawab mengenai kegiatan pengelolaan koperasi.',
    contract: 'AccessControl role checks, audit trail',
    evidence: 'Setiap tindakan admin tercatat on-chain, dapat diaudit kapan saja.',
    feature: 'Tata Kelola',
  },
  {
    pasal: 'Pasal 19-21',
    title: 'Hak & Kewajiban Anggota',
    lawText: 'Anggota berhak menghadiri RAT, menyampaikan pendapat, memilih dan dipilih, serta berhak mengundurkan diri.',
    contract: 'LakomiToken.resignMembership()',
    evidence: 'Anggota dapat keluar sukarela dengan refund simpanan pokok, syarat tidak ada pinjaman aktif.',
    feature: 'Anggota',
  },
  {
    pasal: 'Pasal 29-30',
    title: 'Pemilihan Pengurus',
    lawText: 'Pengurus dipilih dari dan oleh anggota koperasi dalam Rapat Anggota.',
    contract: 'LakomiGovern.beginElection() → castElectionVote() → finalizeElection()',
    evidence: 'Sistem pemilu on-chain: pendaftaran kandidat, voting 1-anggota-1-suara, masa jabatan terlacak.',
    feature: 'Tata Kelola',
  },
  {
    pasal: 'Pasal 33-35',
    title: 'Pembubaran Koperasi',
    lawText: 'Pembubaran koperasi dilakukan berdasarkan keputusan Rapat Anggota.',
    contract: 'LakomiGovern.executeDissolution()',
    evidence: 'Usulan pembubaran melalui tata kelola, eksekusi menonaktifkan (pause) semua kontrak.',
    feature: 'Tata Kelola',
  },
  {
    pasal: 'Pasal 41(3)',
    title: 'Sertifikat Simpanan Koperasi',
    lawText: 'Atas simpanan sukarela, koperasi dapat menerbitkan sertifikat simpanan koperasi.',
    contract: 'LakomiVault.issueCertificate()',
    evidence: 'Bendahara dapat menerbitkan sertifikat simpanan tercatat on-chain dengan timestamp.',
    feature: 'Simpanan',
  },
  {
    pasal: 'Pasal 46-47',
    title: 'Laporan Keuangan Tahunan',
    lawText: 'Pengurus wajib menyusun laporan keuangan tahunan dan menyampaikan dalam RAT.',
    contract: 'LakomiVault.generateFinancialSnapshot() + getPengawasAuditReport()',
    evidence: 'Snapshot keuangan lengkap: aset, simpanan, dana, revenue, SHU, jumlah anggota — diverifikasi on-chain.',
    feature: 'Tata Kelola',
  },
]

const FEATURE_MAP: Record<string, { label: string; color: string }> = {
  'Anggota': { label: 'Anggota', color: 'bg-purple-500' },
  'Simpanan': { label: 'Simpanan', color: 'bg-blue-500' },
  'Pinjaman': { label: 'Pinjaman', color: 'bg-amber-500' },
  'Tata Kelola': { label: 'Tata Kelola', color: 'bg-emerald-500' },
}

export function Compliance() {
  const [activePasal, setActivePasal] = useState(0)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Kepatuhan Hukum</h2>
        <p className="text-sm text-muted-foreground mt-1">
          UU No. 25 Tahun 1992 — Tentang Perkoperasian
        </p>
      </div>

      <div className="grid grid-cols-1 grid-cols-2 gap-0 border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}>
        <div className="border-r bg-muted/20 flex flex-col">
          <div className="px-4 py-2 border-b bg-muted/40 flex items-center justify-between">
            <span className="text-xs font-semibold">UU No. 25 Tahun 1992</span>
            <a
              href="/uu-25-1992.pdf"
              download
              className="text-[10px] text-primary hover:underline"
            >
              Unduh PDF
            </a>
          </div>
          <iframe
            src="/uu-25-1992.pdf#toolbar=0&navpanes=0"
            className="flex-1 w-full border-0"
            title="UU No. 25 Tahun 1992 tentang Perkoperasian"
          />
        </div>

        <div className="flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b bg-muted/40 flex items-center gap-2">
            <span className="text-xs font-semibold">Implementasi Kontrak Pintar</span>
            <span className="text-[10px] text-muted-foreground">{PASAL.length} ketentuan</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-2">
              {PASAL.map((item, idx) => {
                const feat = FEATURE_MAP[item.feature]
                return (
                  <button
                    key={idx}
                    onClick={() => setActivePasal(idx)}
                    className={`w-full text-left p-3 rounded-lg transition-colors border ${idx === activePasal ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-muted/50'}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        {item.pasal}
                      </Badge>
                      {feat && (
                        <span className={`text-[9px] text-white px-1.5 py-0.5 rounded ${feat.color}`}>
                          {feat.label}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold mb-1">{item.title}</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-semibold text-amber-500 uppercase w-10 flex-shrink-0 mt-0.5">UU</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{item.lawText}</p>
                      </div>
                      <Separator className="opacity-30" />
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-semibold text-primary uppercase w-10 flex-shrink-0 mt-0.5">Kontrak</span>
                        <code className="text-[11px] text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">{item.contract}</code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-semibold text-emerald-500 uppercase w-10 flex-shrink-0 mt-0.5">Bukti</span>
                        <p className="text-[11px] text-muted-foreground">{item.evidence}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Terimplementasi & Teruji
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

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
            <li>Antoni & Razaga (2024) — Permasalahan Hukum KSP</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
