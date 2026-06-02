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
            <span className="text-xs font-semibold">UU No. 25 Tahun 1992 — Perkoperasian</span>
            <span className="text-[10px] text-muted-foreground">Tentang Perkoperasian</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm leading-relaxed">
            <div className="font-bold text-base mb-2">UNDANG-UNDANG REPUBLIK INDONESIA<br/>NOMOR 25 TAHUN 1992<br/>TENTANG PERKOPERASIAN</div>
            <Separator />
            <div className="font-semibold mt-3">BAB II — ASAS DAN TUJUAN</div>
            <div className="text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 2</span> — Koperasi didirikan untuk memajukan kesejahteraan anggotanya pada khususnya dan masyarakat pada umumnya.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 3</span> — Koperasi berlandaskan Pancasila dan Undang-Undang Dasar 1945 serta berdasarkan atas asas kekeluargaan.</p>
            </div>
            <div className="font-semibold mt-3">BAB III — SIFAT DAN FUNGSI</div>
            <div className="text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 4</span> — (1) Koperasi bersifat terbuka dan sukarela. (2) Koperasi bersifat mandiri. (3) Koperasi dikelola secara demokratis.</p>
            </div>
            <div className="font-semibold mt-3">BAB IV — PENDIRIAN DAN PERUBAHAN AD/ART</div>
            <div className="text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 5(1)</span> — Keanggotaan koperasi bersifat sukarela dan terbuka.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 5(2)</span> — Pengelolaan koperasi dilakukan secara demokratis.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 5(3)</span> — Pembagian sisa hasil usaha dilakukan secara adil sebanding dengan besarnya jasa usaha masing-masing anggota.</p>
            </div>
            <div className="font-semibold mt-3">BAB VI — KEANGGOTAAN</div>
            <div className="text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 17</span> — (1) Keanggotaan koperasi didasarkan atas kesamaan kepentingan ekonomi dalam lingkup usaha koperasi. (2) Setiap anggota berkewajiban: a. membayar simpanan pokok dan simpanan wajib; b. berpartisipasi dalam kegiatan usaha yang diselenggarakan oleh koperasi.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 18</span> — (1) Syarat dan tata cara pemberian, penggantian, pencabutan keanggotaan ditetapkan dalam AD/ART. (2) Keanggotaan koperasi tidak dapat dipindahtangankan.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 19</span> — Anggota berhak: a. menghadiri Rapat Anggota; b. menyampaikan pendapat; c. memilih dan/atau dipilih; d. memperoleh keterangan mengenai koperasi.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 20</span> — Setiap anggota mempunyai hak satu suara.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 21</span> — Anggota dapat mengundurkan diri dari koperasi dengan mengajukan permohonan secara tertulis.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 22</span> — (1) Setiap anggota mempunyai hak suara yang sama. (2) Anggota wajib membayar simpanan pokok dan simpanan wajib.</p>
            </div>
            <div className="font-semibold mt-3">BAB VII — RAPAT ANGGOTA</div>
            <div className="text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 23</span> — Keputusan Rapat Anggota diambil berdasarkan musyawarah untuk mencapai mufakat.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 26</span> — Rapat Anggota merupakan pemegang kekuasaan tertinggi dalam koperasi.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 27</span> — (1) Rapat Anggota diselenggarakan paling sedikit 1 kali dalam 1 tahun. (2) Rapat Anggota memiliki wewenang: a. menetapkan kebijakan; b. menetapkan Rencana Kerja; c. mengangkat dan memberhentikan pengurus.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 28</span> — Rapat Anggota dapat menetapkan pemberhentian anggota berdasarkan keputusan Rapat Anggota.</p>
            </div>
            <div className="font-semibold mt-3">BAB VIII — PENGURUS</div>
            <div className="text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 29</span> — Pengurus dipilih dari dan oleh anggota koperasi dalam Rapat Anggota.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 30</span> — (1) Pengurus bertanggung jawab atas pengelolaan koperasi. (2) Masa jabatan pengurus paling lama 5 tahun.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 31</span> — Pemberhentian anggota dapat dilakukan berdasarkan keputusan Rapat Anggota.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 32</span> — Pengurus mengelola koperasi dan usahanya berdasarkan AD/ART.</p>
            </div>
            <div className="font-semibold mt-3">BAB IX — PENGHAPUSAN DAN PELEBURAN KOPERASI</div>
            <div className="text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 33</span> — Penggabungan koperasi dilakukan berdasarkan keputusan Rapat Anggota.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 34</span> — Peleburan koperasi dilakukan berdasarkan keputusan Rapat Anggota.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 35</span> — Pembubaran koperasi dilakukan berdasarkan keputusan Rapat Anggota.</p>
            </div>
            <div className="font-semibold mt-3">BAB X — PENGAWAS</div>
            <div className="text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 38</span> — (1) Untuk melakukan pengawasan, Rapat Anggota mengangkat Pengawas dari dan oleh anggota. (2) Pengawas bertugas mengawasi pelaksanaan kebijakan dan pengelolaan koperasi.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 39</span> — (1) Pengawas berwenang melakukan pemeriksaan terhadap keuangan dan usaha koperasi. (2) Pengawas berwenang meneliti catatan dan laporan yang ada pada koperasi. (3) Pengawas merahasiakan hasil pengawasannya.</p>
            </div>
            <div className="font-semibold mt-3">BAB XI — MODAL KOPERASI</div>
            <div className="text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 41</span> — Modal koperasi terdiri dari: (1) Simpanan pokok yang dibayar oleh anggota saat masuk. (2) Simpanan wajib yang dibayar secara berkala. (3) Atas simpanan sukarela, koperasi dapat menerbitkan sertifikat simpanan koperasi.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 42</span> — Modal koperasi terdiri dari modal sendiri dan modal pinjaman.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 43</span> — Modal sendiri terdiri dari: a. simpanan pokok; b. simpanan wajib; c. dana cadangan; d. hibah; e. sisa hasil usaha yang belum dibagi.</p>
            </div>
            <div className="font-semibold mt-3">BAB XII — SISA HASIL USAHA</div>
            <div className="text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 44</span> — Pengurus bertanggung jawab mengenai kegiatan pengelolaan koperasi.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 45</span> — (1) SHU merupakan pendapatan koperasi yang diperoleh dalam satu tahun buku dikurangi biaya, penyusutan, dan kewajiban lainnya. (2) SHU setelah dikurangi dana cadangan dibagikan kepada anggota sebanding dengan jasa usaha yang dilakukan masing-masing.</p>
            </div>
            <div className="font-semibold mt-3">BAB XIII — PERTANGGUNGJAWABAN DAN LAPORAN</div>
            <div className="text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 46</span> — Pengurus wajib menyusun laporan keuangan tahunan dan menyampaikan dalam RAT.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Pasal 47</span> — Laporan keuangan meliputi: neraca, perhitungan SHU, laporan arus kas, dan catatan atas laporan keuangan.</p>
            </div>
            <div className="text-[10px] text-muted-foreground mt-4 pt-3 border-t">
              Sumber: Lembaran Negara RI Tahun 1992 Nomor 116, Tambahan Lembaran Negara Nomor 3474.
            </div>
          </div>
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
