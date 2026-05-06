import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
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
  const { data: isMember, refetch } = useIsMember(address)
  const { registerMember, isPending, isSuccess } = useRegisterMember()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [pendingForm, setPendingForm] = useState<MemberData | null>(null)
  const existing = address ? getMemberData(address) : null
  const [form, setForm] = useState<MemberData>(existing || {
    namaLengkap: '', nik: '', tempatLahir: '', tanggalLahir: '',
    alamat: '', nomorTelepon: '', pekerjaan: '',
  })

  useEffect(() => {
    if (isSuccess && pendingForm) {
      saveMemberData(address!, pendingForm)
      addToast('Berhasil terdaftar sebagai anggota koperasi!', 'success')
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
      refetch()
      setPendingForm(null)
      setStep('form')
    }
  }, [isSuccess])

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
      setPendingForm({ ...form })
      await registerMember()
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Transaksi gagal'
      if (msg.includes('User rejected') || msg.includes('denied') || msg.includes('rejected')) {
        addToast('Transaksi dibatalkan oleh pengguna', 'error')
      } else if (msg.includes('already imported') || msg.includes('nonce')) {
        addToast('Nonce dompet tidak sinkron. Klik "Fix Nonce" di Dev Faucet, lalu coba lagi.', 'error')
      } else if (msg.includes('Already registered')) {
        addToast('Anda sudah terdaftar sebagai anggota!', 'success')
        queryClient.invalidateQueries({ queryKey: ['readContract'] })
        refetch()
      } else {
        addToast(`Gagal mendaftar: ${msg}`, 'error')
      }
      setPendingForm(null)
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
            Sesuai Pasal 5(1) UU 25/1992: Keanggotaan terbuka dan sukarela
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep('form')} className="flex-1" disabled={isPending}>
              Kembali
            </Button>
            <Button onClick={handleRegister} disabled={isPending} className="flex-1">
              {isPending ? 'Memproses...' : 'Konfirmasi & Daftar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Formulir Pendaftaran Anggota</CardTitle>
        <CardDescription>
          Sesuai Pasal 5(1) UU 25/1992: Keanggotaan terbuka dan sukarela
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nama Lengkap</Label>
            <Input
              placeholder="Masukkan nama lengkap"
              value={form.namaLengkap}
              onChange={(e) => update('namaLengkap', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">NIK</Label>
            <Input
              placeholder="16 digit NIK"
              value={form.nik}
              onChange={(e) => update('nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tempat Lahir</Label>
            <Input
              placeholder="Kota/Kabupaten"
              value={form.tempatLahir}
              onChange={(e) => update('tempatLahir', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tanggal Lahir</Label>
            <Input
              type="date"
              value={form.tanggalLahir}
              onChange={(e) => update('tanggalLahir', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Alamat</Label>
          <Input
            placeholder="Alamat lengkap"
            value={form.alamat}
            onChange={(e) => update('alamat', e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nomor Telepon</Label>
            <Input
              placeholder="08xxxxxxxxxx"
              value={form.nomorTelepon}
              onChange={(e) => update('nomorTelepon', e.target.value.replace(/\D/g, '').slice(0, 15))}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pekerjaan</Label>
            <Input
              placeholder="Pekerjaan saat ini"
              value={form.pekerjaan}
              onChange={(e) => update('pekerjaan', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <Button
          onClick={() => setStep('confirm')}
          disabled={!isFormValid || isPending}
          className="w-full"
        >
          {isPending ? 'Memproses...' : 'Lanjut ke Konfirmasi'}
        </Button>
      </CardContent>
    </Card>
  )
}

function DataPreview({ form }: { form: MemberData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <div><span className="text-muted-foreground">Nama:</span> {form.namaLengkap}</div>
      <div><span className="text-muted-foreground">NIK:</span> <span className="font-mono text-xs">{form.nik}</span></div>
      <div><span className="text-muted-foreground">Tempat Lahir:</span> {form.tempatLahir}</div>
      <div><span className="text-muted-foreground">Tanggal Lahir:</span> {form.tanggalLahir}</div>
      <div className="sm:col-span-2"><span className="text-muted-foreground">Alamat:</span> {form.alamat}</div>
      <div><span className="text-muted-foreground">Telepon:</span> {form.nomorTelepon}</div>
      <div><span className="text-muted-foreground">Pekerjaan:</span> {form.pekerjaan}</div>
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
