import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useIsMember } from '../hooks/useContractRead'
import { useRegisterMember } from '../hooks/useContractWrite'
import { useToast } from './Toast'

interface MemberData {
  namaLengkap: string
  nik: string
  tempatLahir: string
  tanggalLahir: string
  alamat: string
  nomorTelepon: string
  pekerjaan: string
}

function saveMemberData(address: string, data: MemberData) {
  const stored = JSON.parse(localStorage.getItem('lakomi_members') || '{}')
  stored[address.toLowerCase()] = data
  localStorage.setItem('lakomi_members', JSON.stringify(stored))
}

function getMemberData(address: string): MemberData | null {
  const stored = JSON.parse(localStorage.getItem('lakomi_members') || '{}')
  return stored[address.toLowerCase()] || null
}

export function MemberRegistration() {
  const { address, isConnected } = useAccount()
  const { data: isMember } = useIsMember(address)
  const { registerMember, isPending, isSuccess, error } = useRegisterMember()
  const { addToast } = useToast()

  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const existing = address ? getMemberData(address) : null
  const [form, setForm] = useState<MemberData>(existing || {
    namaLengkap: '', nik: '', tempatLahir: '', tanggalLahir: '',
    alamat: '', nomorTelepon: '', pekerjaan: '',
  })

  if (!isConnected || isMember === undefined || isMember === true) return null

  const update = (key: keyof MemberData, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const isFormValid =
    form.namaLengkap.trim().length >= 3 &&
    form.nik.length === 16 &&
    form.tempatLahir.trim().length >= 2 &&
    form.tanggalLahir.length > 0 &&
    form.alamat.trim().length >= 5 &&
    form.nomorTelepon.trim().length >= 8

  const handleRegister = async () => {
    try {
      await registerMember()
      saveMemberData(address!, form)
      addToast('Berhasil terdaftar sebagai anggota koperasi!', 'success')
      setStep('form')
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Transaksi gagal'
      if (msg.includes('User rejected') || msg.includes('denied') || msg.includes('rejected')) {
        addToast('Transaksi dibatalkan oleh pengguna', 'error')
      } else {
        addToast(`Gagal mendaftar: ${msg}`, 'error')
      }
      setStep('form')
    }
  }

  if (step === 'confirm') {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Konfirmasi Pendaftaran</CardTitle>
          <CardDescription>Periksa data Anda sebelum mendaftar di blockchain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DataPreview form={form} />
          <Separator />
          <p className="text-xs text-muted-foreground">
            Dengan mendaftar, Anda menyetujui bahwa data di atas benar dan menjadi anggota koperasi Lakomi
            sesuai Pasal 5(1) UU 25/1992 tentang Perkoperasian.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('form')} className="flex-1">Kembali</Button>
            <Button onClick={handleRegister} disabled={isPending} className="flex-1">
              {isPending ? 'Menunggu Konfirmasi...' : 'Konfirmasi & Daftar'}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-400 mt-1">
              {error.message.includes('reverted') ? 'Anda sudah terdaftar sebagai anggota' : error.message}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base">Formulir Pendaftaran Anggota</CardTitle>
            <CardDescription>Sesuai Pasal 5(1) UU 25/1992: Keanggotaan terbuka dan sukarela</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup>
            <Label htmlFor="nama">Nama Lengkap <span className="text-red-400">*</span></Label>
            <Input id="nama" placeholder="Contoh: Budi Santoso" value={form.namaLengkap} onChange={(e) => update('namaLengkap', e.target.value)} />
            <p className="text-[10px] text-muted-foreground">Sesuai KTP</p>
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="nik">NIK (16 digit) <span className="text-red-400">*</span></Label>
            <Input id="nik" placeholder="3201234567890001" maxLength={16} value={form.nik} onChange={(e) => update('nik', e.target.value.replace(/\D/g, ''))} />
            <p className="text-[10px] text-muted-foreground">{form.nik.length}/16 digit</p>
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="tempatLahir">Tempat Lahir <span className="text-red-400">*</span></Label>
            <Input id="tempatLahir" placeholder="Contoh: Jakarta" value={form.tempatLahir} onChange={(e) => update('tempatLahir', e.target.value)} />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="tanggalLahir">Tanggal Lahir <span className="text-red-400">*</span></Label>
            <Input id="tanggalLahir" type="date" value={form.tanggalLahir} onChange={(e) => update('tanggalLahir', e.target.value)} />
          </FieldGroup>

          <FieldGroup className="sm:col-span-2">
            <Label htmlFor="alamat">Alamat Lengkap <span className="text-red-400">*</span></Label>
            <Input id="alamat" placeholder="Jl. Contoh No. 123, Kota, Provinsi" value={form.alamat} onChange={(e) => update('alamat', e.target.value)} />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="telepon">Nomor Telepon <span className="text-red-400">*</span></Label>
            <Input id="telepon" placeholder="081234567890" value={form.nomorTelepon} onChange={(e) => update('nomorTelepon', e.target.value)} />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="pekerjaan">Pekerjaan</Label>
            <Input id="pekerjaan" placeholder="Contoh: Wiraswasta" value={form.pekerjaan} onChange={(e) => update('pekerjaan', e.target.value)} />
          </FieldGroup>
        </div>

        <Button onClick={() => setStep('confirm')} disabled={!isFormValid} className="w-full">
          Lanjut ke Konfirmasi
        </Button>
        {!isFormValid && <p className="text-[10px] text-muted-foreground text-center">Lengkapi semua field wajib (*) untuk melanjutkan</p>}
      </CardContent>
    </Card>
  )
}

function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className || ''}`}>{children}</div>
}

function DataPreview({ form }: { form: MemberData }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <div><p className="text-[10px] text-muted-foreground">Nama</p><p className="font-medium">{form.namaLengkap}</p></div>
      <div><p className="text-[10px] text-muted-foreground">NIK</p><p className="font-mono text-xs">{form.nik}</p></div>
      <div><p className="text-[10px] text-muted-foreground">TTL</p><p>{form.tempatLahir}, {form.tanggalLahir}</p></div>
      <div><p className="text-[10px] text-muted-foreground">Telepon</p><p>{form.nomorTelepon}</p></div>
      <div className="col-span-2"><p className="text-[10px] text-muted-foreground">Alamat</p><p>{form.alamat}</p></div>
      {form.pekerjaan && <div className="col-span-2"><p className="text-[10px] text-muted-foreground">Pekerjaan</p><p>{form.pekerjaan}</p></div>}
    </div>
  )
}

export function PaySimpananPokokPrompt() {
  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardContent className="">
        <p className="text-sm text-amber-500 font-medium">Simpanan Pokok Belum Dibayar</p>
        <p className="text-xs text-muted-foreground mt-1">Bayar Simpanan Pokok terlebih dahulu untuk mengakses layanan simpanan dan pinjaman (Pasal 41)</p>
      </CardContent>
    </Card>
  )
}
