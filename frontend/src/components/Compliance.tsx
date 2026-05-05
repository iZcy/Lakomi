import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const ITEMS = [
  { pasal: 'Pasal 5(1)', title: 'Keanggotaan Terbuka dan Sukarela', desc: 'Setiap orang dapat menjadi anggota tanpa diskriminasi melalui registerMember().', contract: 'LakomiToken.registerMember()', evidence: 'Fungsi terbuka untuk semua alamat dompet tanpa persyaratan.' },
  { pasal: 'Pasal 22(1)', title: 'Satu Anggota Satu Suara', desc: 'Setiap anggota memiliki hak suara yang sama (1 suara), terlepas dari jumlah simpanan.', contract: 'LakomiToken.getVotingPower() → 1', evidence: 'Mengembalikan 1 untuk setiap anggota, bukan berdasarkan token.' },
  { pasal: 'Pasal 26-27', title: 'Rapat Anggota Tahunan (RAT)', desc: 'Koperasi wajib menyelenggarakan RAT tahunan.', contract: 'LakomiGovern.scheduleAnnualRAT()', evidence: 'Fungsi khusus dengan pengecekan hanya 1x per tahun.' },
  { pasal: 'Pasal 38', title: 'Pengawas (Supervisor)', desc: 'Pengawas dapat memveto keputusan yang merugikan.', contract: 'LakomiGovern.vetoProposal() + PENGAWAS_ROLE', evidence: 'Role khusus dengan kemampuan veto dan pause.' },
  { pasal: 'Pasal 41', title: 'Simpanan (Pokok, Wajib, Sukarela)', desc: 'Tiga jenis simpanan: Pokok, Wajib, dan Sukarela.', contract: 'LakomiVault.paySimpananPokok/Wajib/deposit()', evidence: 'Tiga fungsi terpisah dengan validasi sesuai jenis.' },
  { pasal: 'Pasal 45', title: 'Sisa Hasil Usaha (SHU)', desc: 'SHU didistribusikan berdasarkan proporsi simpanan sukarela.', contract: 'LakomiVault.distributeSHU() → claimSHU()', evidence: 'Cadangan 10%, pembagian berdasarkan kepemilikan saham.' },
]

export function Compliance() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Kepatuhan Hukum</h2>
        <p className="text-sm text-muted-foreground mt-1">Kepatuhan kontrak pintar terhadap UU No. 25 Tahun 1992</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3">
          <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-xs text-muted-foreground">Setiap item menunjukkan pasal UU 25/1992, fungsi kontrak terkait, dan bukti implementasi yang telah diuji.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="text-center"><p className="text-2xl sm:text-3xl font-bold text-emerald-500">{ITEMS.length}</p><p className="text-xs text-muted-foreground mt-1">Pasal Diimplementasikan</p></CardContent></Card>
        <Card><CardContent className="text-center"><p className="text-2xl sm:text-3xl font-bold text-primary">4</p><p className="text-xs text-muted-foreground mt-1">Kontrak Pintar</p></CardContent></Card>
        <Card><CardContent className="text-center"><p className="text-2xl sm:text-3xl font-bold text-purple-500">25</p><p className="text-xs text-muted-foreground mt-1">Pengujian Berhasil</p></CardContent></Card>
      </div>

      <div className="space-y-3">
        {ITEMS.map((item) => (
          <Card key={item.pasal}>
            <CardContent className="flex items-start gap-4">
              <Badge variant="outline" className="mt-0.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs flex-shrink-0">{item.pasal}</Badge>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-semibold text-primary uppercase w-12 flex-shrink-0">Kontrak</span>
                    <code className="text-[11px] text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded break-all">{item.contract}</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-semibold text-emerald-500 uppercase w-12 flex-shrink-0">Bukti</span>
                    <p className="text-[11px] text-muted-foreground">{item.evidence}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Terimplementasi & Teruji
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Referensi Hukum</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>UU No. 25 Tahun 1992 — Tentang Perkoperasian</li>
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
