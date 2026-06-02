import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const PASAL_IDS = [
  'ps-5a','ps-5b','ps-5c','ps-18','ps-18b','ps-22a','ps-22b','ps-23','ps-26','ps-27',
  'ps-31','ps-32','ps-38','ps-39b','ps-41a','ps-41b','ps-41c','ps-43','ps-45a','ps-45b',
  'ps-19','ps-29','ps-33','ps-41d','ps-46',
]

const PASAL = [
  { pasal: 'Pasal 5(1)', title: 'Keanggotaan Terbuka dan Sukarela', lawText: 'Keanggotaan koperasi bersifat sukarela dan terbuka.', contract: 'LakomiToken.registerMember()', evidence: 'Fungsi terbuka untuk semua alamat dompet tanpa persyaratan.', feature: 'Anggota' },
  { pasal: 'Pasal 5(2)', title: 'Pengelolaan Demokratis', lawText: 'Pengelolaan koperasi dilakukan secara demokratis.', contract: 'LakomiGovern.castVote()', evidence: 'Satu anggota satu suara, quorum 67% dari jumlah anggota.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 5(3)', title: 'Pembagian SHU Adil', lawText: 'SHU dibagi sebanding dengan jasa usaha masing-masing anggota.', contract: 'LakomiVault.distributeSHU() 6 kategori', evidence: 'Split: cadangan 5%, jasa modal 40%, jasa usaha 40%, pendidikan 5%, pengurus 5%, kesejahteraan 5%.', feature: 'Simpanan' },
  { pasal: 'Pasal 18', title: 'Pinjaman Anggota', lawText: 'Koperasi dapat memberikan pinjaman kepada anggota.', contract: 'LakomiLoans.requestLoan()', evidence: 'Anggota mengajukan pinjaman, jaminan LAK 25%, perlu persetujuan pengurus.', feature: 'Pinjaman' },
  { pasal: 'Pasal 18(2)', title: 'Keanggotaan Tidak Dapat Dipindahtangankan', lawText: 'Keanggotaan koperasi tidak dapat dipindahtangankan.', contract: 'LakomiToken.transfersEnabled = false', evidence: 'Transfer token LAK dinonaktifkan default, hanya admin yang dapat mengaktifkan.', feature: 'Anggota' },
  { pasal: 'Pasal 22(1)', title: 'Satu Anggota Satu Suara', lawText: 'Setiap anggota mempunyai hak satu suara.', contract: 'LakomiToken.getVotingPower() → 1', evidence: 'Setiap anggota memiliki 1 suara, bukan berdasarkan jumlah token/simpanan.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 22(2)', title: 'Simpanan Pokok & Wajib', lawText: 'Anggota wajib membayar simpanan pokok dan simpanan wajib.', contract: 'LakomiVault.paySimpananPokok/Wajib()', evidence: 'Simpanan Pokok wajib saat pendaftaran, Simpanan Wajib bulanan.', feature: 'Simpanan' },
  { pasal: 'Pasal 23', title: 'Keputusan Rapat Anggota (Quorum)', lawText: 'Keputusan Rapat Anggota diambil berdasarkan musyawarah-mufakat atau pemungutan suara.', contract: 'LakomiGovern.quorumNumerator = 67', evidence: 'Quorum default 67% (2/3 mayoritas). Proposal lulus jika For > Against + capai quorum.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 26', title: 'Rapat Anggota — Kekuasaan Tertinggi', lawText: 'Rapat Anggota merupakan pemegang kekuasaan tertinggi dalam koperasi.', contract: 'LakomiGovern.scheduleAnnualRAT()', evidence: 'RAT terjadwal otomatis 1x per tahun, usulan RAT khusus untuk agenda tahunan.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 27', title: 'Penyelenggaraan RAT', lawText: 'RAT diselenggarakan minimal 1x setahun, berwenang menetapkan kebijakan & memilih pengurus.', contract: 'LakomiGovern.ratPeriod = 365 days', evidence: 'Pengecekan interval 365 hari, hanya dapat dijadwalkan 1x per tahun.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 31', title: 'Pemberhentian Anggota', lawText: 'Anggota dapat diberhentikan berdasarkan keputusan Rapat Anggota.', contract: 'LakomiToken.revokeMembership() via governance', evidence: 'Usulan Keanggotaan → voting → antrean → eksekusi → revokeMembership(address) via govern.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 32', title: 'Pengurus', lawText: 'Pengurus mengelola koperasi dan usahanya berdasarkan AD/ART.', contract: 'AccessControl: APPROVER_ROLE / TREASURER_ROLE', evidence: 'Role-based: Pengurus (setuju pinjaman), Bendahara (kelola treasury).', feature: 'Anggota' },
  { pasal: 'Pasal 38', title: 'Pengawas (Supervisor)', lawText: 'Pengawas mengawasi pelaksanaan kebijakan dan pengelolaan koperasi.', contract: 'LakomiGovern.vetoProposal() + PENGAWAS_ROLE', evidence: 'Pengawas dapat memveto usulan, pause governance, menandai pinjaman gagal bayar.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 39(2)', title: 'Hak Pengawas Memeriksa Catatan', lawText: 'Pengawas berwenang meneliti semua catatan dan laporan koperasi.', contract: 'LakomiVault.getPengawasAuditReport()', evidence: 'Fungsi audit khusus: simpanan, revenue, SHU, dana cadangan, pendidikan, pengurus, kesejahteraan.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 41', title: 'Simpanan Pokok', lawText: 'Modal koperasi terdiri dari simpanan pokok (dibayar sekali saat masuk).', contract: 'LakomiVault.paySimpananPokok()', evidence: 'Simpanan Pokok 100 USDC dibayarkan saat pendaftaran anggota.', feature: 'Simpanan' },
  { pasal: 'Pasal 41', title: 'Simpanan Wajib', lawText: 'Simpanan wajib dibayarkan secara berkala oleh anggota.', contract: 'LakomiVault.paySimpananWajib()', evidence: 'Simpanan Wajib bulanan, jumlah ditetapkan oleh tata kelola.', feature: 'Simpanan' },
  { pasal: 'Pasal 41', title: 'Simpanan Sukarela', lawText: 'Simpanan sukarela dapat disetor dan diambil kembali sewaktu-waktu.', contract: 'LakomiVault.deposit() / withdraw()', evidence: 'Deposit USDC kapan saja, withdraw sesuai saldo tersedia.', feature: 'Simpanan' },
  { pasal: 'Pasal 43', title: 'Dana Cadangan Wajib', lawText: 'Modal sendiri meliputi: simpanan, dana cadangan, hibah, dan SHU yang belum dibagi.', contract: 'LakomiVault.danaCadangan (5% SHU)', evidence: 'Dana cadangan diakumulasi setiap distribusi SHU. Dapat disesuaikan via setSHUSplit().', feature: 'Simpanan' },
  { pasal: 'Pasal 45(1)', title: 'Sisa Hasil Usaha (SHU)', lawText: 'SHU = pendapatan 1 tahun buku dikurangi biaya, penyusutan, dan kewajiban.', contract: 'LakomiVault.distributeSHU() → claimSHU()', evidence: 'Revenue dari bunga pinjaman diakumulasi → distribusi → klaim per anggota.', feature: 'Simpanan' },
  { pasal: 'Pasal 45(2)', title: 'Pembagian SHU Multi-Kategori', lawText: 'SHU dibagi: jasa anggota (40%), jasa modal (40%), cadangan (5%), pendidikan (5%), pengurus (5%), kesejahteraan (5%).', contract: 'LakomiVault.distributeSHU() 6-kategori', evidence: 'Split persentase dikonfigurasi via setSHUSplit(), bisa diubah melalui governance.', feature: 'Simpanan' },
  { pasal: 'Pasal 19-21', title: 'Hak & Kewajiban — Keluar Sukarela', lawText: 'Anggota berhak menghadiri RAT, menyampaikan pendapat, memilih/dipilih, dan mengundurkan diri.', contract: 'LakomiToken.resignMembership()', evidence: 'Anggota bisa keluar sukarela + refund simpanan pokok, syarat tidak ada pinjaman aktif.', feature: 'Anggota' },
  { pasal: 'Pasal 29-30', title: 'Pemilihan Pengurus', lawText: 'Pengurus dipilih dari dan oleh anggota dalam RAT. Masa jabatan maksimal 5 tahun.', contract: 'LakomiGovern.election system: beginElection → vote → finalizeElection', evidence: 'Pemilu on-chain: pendaftaran kandidat, voting 1-suara, masa jabatan terlacak (roleTermStart).', feature: 'Tata Kelola' },
  { pasal: 'Pasal 33-35', title: 'Pembubaran Koperasi', lawText: 'Pembubaran koperasi dilakukan berdasarkan keputusan Rapat Anggota.', contract: 'LakomiGovern.executeDissolution()', evidence: 'Usulan pembubaran via governance, eksekusi menonaktifkan (pause) semua kontrak.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 41(3)', title: 'Sertifikat Simpanan', lawText: 'Atas simpanan sukarela, koperasi dapat menerbitkan sertifikat simpanan.', contract: 'LakomiVault.issueCertificate()', evidence: 'Bendahara menerbitkan sertifikat tercatat on-chain dengan timestamp.', feature: 'Simpanan' },
  { pasal: 'Pasal 46-47', title: 'Laporan Keuangan Tahunan', lawText: 'Pengurus wajib menyusun laporan keuangan dan menyampaikan dalam RAT.', contract: 'LakomiVault.generateFinancialSnapshot()', evidence: 'Snapshot lengkap: aset, simpanan, dana, revenue, SHU, memberCount.', feature: 'Tata Kelola' },
  { pasal: 'Pasal 44', title: 'Pertanggungjawaban Pengurus', lawText: 'Pengurus bertanggung jawab mengenai kegiatan pengelolaan koperasi.', contract: 'AccessControl audit trail', evidence: 'Setiap tindakan admin tercatat on-chain secara transparan, dapat diaudit kapan saja.', feature: 'Tata Kelola' },
]

const FEATURE_MAP: Record<string, { label: string; color: string }> = {
  'Anggota': { label: 'Anggota', color: 'bg-purple-500' },
  'Simpanan': { label: 'Simpanan', color: 'bg-blue-500' },
  'Pinjaman': { label: 'Pinjaman', color: 'bg-amber-500' },
  'Tata Kelola': { label: 'Tata Kelola', color: 'bg-emerald-500' },
}

export function Compliance() {
  const [activePasal, setActivePasal] = useState(0)
  const [leftTab, setLeftTab] = useState<'pdf' | 'teks'>('pdf')
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  const scrollToPasal = (idx: number) => {
    setActivePasal(idx)
    setLeftTab('teks')
    setTimeout(() => {
      const el = leftRef.current?.querySelector(`#${PASAL_IDS[idx]}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Kepatuhan Hukum</h2>
        <p className="text-sm text-muted-foreground mt-1">UU No. 25 Tahun 1992 — Tentang Perkoperasian</p>
      </div>

      <div className="flex gap-1 mb-[-12px]">
        <button onClick={() => setLeftTab('pdf')} className={`text-[11px] px-3 py-1.5 rounded-t-md ${leftTab === 'pdf' ? 'bg-background border border-b-0 border-border font-medium' : 'text-muted-foreground hover:text-foreground'}`}>PDF UU 25/1992</button>
        <button onClick={() => setLeftTab('teks')} className={`text-[11px] px-3 py-1.5 rounded-t-md ${leftTab === 'teks' ? 'bg-background border border-b-0 border-border font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Teks Pasal</button>
      </div>

      <div className="grid grid-cols-2 gap-0 border rounded-lg overflow-hidden" style={{ minHeight: '600px', maxHeight: 'calc(100vh - 250px)' }}>
        <div className="border-r bg-muted/20 overflow-y-auto">
          <div style={{ display: leftTab === 'pdf' ? 'block' : 'none' }} className="h-full">
            <iframe src="/uu-25-1992.pdf" className="w-full border-0" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }} title="UU 25/1992" />
          </div>
          <div ref={leftRef} style={{ display: leftTab === 'teks' ? 'block' : 'none' }} className="p-4 text-sm leading-relaxed">
          <div className="font-bold text-base mb-2 text-center">UNDANG-UNDANG REPUBLIK INDONESIA<br/>NOMOR 25 TAHUN 1992<br/>TENTANG PERKOPERASIAN</div>
          <Separator className="mb-3" />

          <div className="font-semibold">BAB II — ASAS DAN TUJUAN</div>
          <p className="text-muted-foreground mb-3"><span className="font-semibold text-foreground">Pasal 2</span> — Koperasi didirikan untuk memajukan kesejahteraan anggotanya pada khususnya dan masyarakat pada umumnya.</p>

          <div className="font-semibold">BAB IV — PENDIRIAN</div>
          <p id="ps-5a" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(0)}><span className="font-semibold text-foreground">Pasal 5(1)</span> — Keanggotaan koperasi bersifat sukarela dan terbuka.</p>
          <p id="ps-5b" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(1)}><span className="font-semibold text-foreground">Pasal 5(2)</span> — Pengelolaan koperasi dilakukan secara demokratis.</p>
          <p id="ps-5c" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(2)}><span className="font-semibold text-foreground">Pasal 5(3)</span> — Pembagian SHU dilakukan secara adil.</p>

          <div className="font-semibold mt-4">BAB VI — KEANGGOTAAN</div>
          <p id="ps-18" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(3)}><span className="font-semibold text-foreground">Pasal 18</span> — (1) Syarat keanggotaan ditetapkan AD/ART. (2) Keanggotaan tidak dapat dipindahtangankan.</p>
          <p id="ps-18b" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(4)}><span className="font-semibold text-foreground">Pasal 18(2)</span> — Keanggotaan koperasi tidak dapat dipindahtangankan.</p>
          <p id="ps-22a" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(5)}><span className="font-semibold text-foreground">Pasal 20-22(1)</span> — Setiap anggota mempunyai hak satu suara.</p>
          <p id="ps-22b" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(6)}><span className="font-semibold text-foreground">Pasal 22(2)</span> — Anggota wajib membayar simpanan pokok dan simpanan wajib.</p>
          <p id="ps-19" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(20)}><span className="font-semibold text-foreground">Pasal 19-21</span> — Anggota berhak: menghadiri RAT, menyampaikan pendapat, memilih/dipilih, dan mengundurkan diri.</p>

          <div className="font-semibold mt-4">BAB VII — RAPAT ANGGOTA</div>
          <p id="ps-23" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(7)}><span className="font-semibold text-foreground">Pasal 23</span> — Keputusan Rapat Anggota diambil berdasarkan musyawarah untuk mufakat.</p>
          <p id="ps-26" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(8)}><span className="font-semibold text-foreground">Pasal 26</span> — Rapat Anggota merupakan pemegang kekuasaan tertinggi.</p>
          <p id="ps-27" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(9)}><span className="font-semibold text-foreground">Pasal 27</span> — RAT minimal 1x setahun, berwenang menetapkan kebijakan & memilih pengurus.</p>
          <p id="ps-31" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(10)}><span className="font-semibold text-foreground">Pasal 28 & 31</span> — Pemberhentian anggota berdasarkan keputusan Rapat Anggota.</p>

          <div className="font-semibold mt-4">BAB VIII — PENGURUS</div>
          <p id="ps-29" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(21)}><span className="font-semibold text-foreground">Pasal 29-30</span> — Pengurus dipilih dari/oleh anggota RAT. Masa jabatan maksimal 5 tahun.</p>
          <p id="ps-32" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(11)}><span className="font-semibold text-foreground">Pasal 32</span> — Pengurus mengelola koperasi berdasarkan AD/ART.</p>

          <div className="font-semibold mt-4">BAB IX — PEMBUBARAN</div>
          <p id="ps-33" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(22)}><span className="font-semibold text-foreground">Pasal 33-35</span> — Pembubaran koperasi berdasarkan keputusan Rapat Anggota.</p>

          <div className="font-semibold mt-4">BAB X — PENGAWAS</div>
          <p id="ps-38" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(12)}><span className="font-semibold text-foreground">Pasal 38</span> — Pengawas mengawasi pelaksanaan kebijakan dan pengelolaan koperasi.</p>
          <p id="ps-39b" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(13)}><span className="font-semibold text-foreground">Pasal 39(2)</span> — Pengawas berwenang meneliti catatan dan laporan koperasi.</p>

          <div className="font-semibold mt-4">BAB XI — MODAL KOPERASI</div>
          <p id="ps-41a" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(14)}><span className="font-semibold text-foreground">Pasal 41(1)</span> — Simpanan pokok dibayar oleh anggota saat masuk.</p>
          <p id="ps-41b" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(15)}><span className="font-semibold text-foreground">Pasal 41(2)</span> — Simpanan wajib dibayar secara berkala.</p>
          <p id="ps-41c" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(16)}><span className="font-semibold text-foreground">Pasal 41(3)</span> — Simpanan sukarela dapat disetorkan kapan saja.</p>
          <p id="ps-41d" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(23)}><span className="font-semibold text-foreground">Pasal 41(3)</span> — Atas simpanan sukarela, dapat diterbitkan sertifikat simpanan.</p>
          <p id="ps-43" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(17)}><span className="font-semibold text-foreground">Pasal 43</span> — Modal sendiri: simpanan pokok, simpanan wajib, dana cadangan, hibah, SHU yang belum dibagi.</p>

          <div className="font-semibold mt-4">BAB XII — SISA HASIL USAHA</div>
          <p id="ps-45a" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(18)}><span className="font-semibold text-foreground">Pasal 45(1)</span> — SHU = pendapatan 1 tahun buku dikurangi biaya dan kewajiban.</p>
          <p id="ps-45b" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(19)}><span className="font-semibold text-foreground">Pasal 45(2)</span> — SHU dibagi sebanding jasa usaha masing-masing anggota.</p>

          <div className="font-semibold mt-4">BAB XIII — PERTANGGUNGJAWABAN</div>
          <p id="ps-46" className="text-muted-foreground cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-colors" onClick={() => scrollToPasal(24)}><span className="font-semibold text-foreground">Pasal 46-47</span> — Pengurus wajib menyusun laporan keuangan tahunan untuk RAT.</p>

          <div className="text-[10px] text-muted-foreground mt-4 pt-3 border-t">
            Sumber: Lembaran Negara RI Tahun 1992 Nomor 116, Tambahan Lembaran Negara Nomor 3474.
          </div>
        </div>
        </div>

        <div className="flex flex-col overflow-y-auto">
          <div className="px-4 py-2 border-b bg-muted/40 flex items-center gap-2 sticky top-0 z-10">
            <span className="text-xs font-semibold">Implementasi Kontrak Pintar</span>
            <span className="text-[10px] text-muted-foreground">{PASAL.length} ketentuan</span>
          </div>
          <div ref={rightRef} className="p-3 space-y-2">
              {PASAL.map((item, idx) => {
                const feat = FEATURE_MAP[item.feature]
                return (
                  <button
                    key={idx}
                    onClick={() => { setActivePasal(idx); scrollToPasal(idx) }}
                    className={`w-full text-left p-3 rounded-lg transition-colors border ${idx === activePasal ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-muted/50'}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{item.pasal}</Badge>
                      {feat && <span className={`text-[9px] text-white px-1.5 py-0.5 rounded ${feat.color}`}>{feat.label}</span>}
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
