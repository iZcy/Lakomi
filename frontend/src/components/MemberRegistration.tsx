import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useIsMember } from '../hooks/useContractRead'
import { useRegisterMember, usePaySimpananPokok, useApproveUsdc } from '../hooks/useContractWrite'
import { CONTRACTS } from '../config/contracts'
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
  const { registerMember, isPending, isSuccess, isConfirming } = useRegisterMember()
  const { paySimpananPokok, isPending: paying } = usePaySimpananPokok()
  const { approve, isPending: approving } = useApproveUsdc()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const handledSuccess = useRef(false)

  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [regStep, setRegStep] = useState<'idle' | 'approve' | 'pay' | 'register'>('idle')
  const existing = address ? getMemberData(address) : null
  const [form, setForm] = useState<MemberData>(existing || {
    namaLengkap: '', nik: '', tempatLahir: '', tanggalLahir: '',
    alamat: '', nomorTelepon: '', pekerjaan: '',
  })

  useEffect(() => {
    if (isSuccess && !handledSuccess.current) {
      handledSuccess.current = true
      if (address) saveMemberData(address, form)
      addToast('Berhasil terdaftar sebagai anggota koperasi!', 'success')
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
      refetch()
    }
    if (!isSuccess) handledSuccess.current = false
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
      setRegStep('approve')
      await approve(CONTRACTS.LAKOMI_VAULT, BigInt(100_000_000))
      setRegStep('pay')
      await paySimpananPokok(address as `0x${string}`)
      setRegStep('register')
      await registerMember()
    } catch (err: any) {
      setRegStep('idle')
      const msg = err?.shortMessage || err?.message || ''
      if (msg.includes('User rejected') || msg.includes('denied')) {
        addToast('Transaksi dibatalkan', 'error')
      } else {
        addToast(`Gagal mendaftar: ${msg}`, 'error')
      }
    }
  }

  const busy = isPending || isConfirming || paying || approving
  const stepIdx = regStep === 'approve' ? 1 : regStep === 'pay' ? 2 : regStep === 'register' ? 3 : 0

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
            Simpanan Pokok 100 USDC akan dibayarkan terlebih dahulu sesuai Pasal 22(2) jo. Pasal 41 UU 25/1992
          </p>
          <div className="space-y-2">
            {busy && (
              <div className="flex gap-1 mb-2">
                {[1,2,3].map(n => (
                  <div key={n} className={`flex-1 h-1 rounded-full ${stepIdx >= n ? 'bg-primary' : stepIdx === n-1 ? 'bg-primary/30 animate-pulse' : 'bg-muted'}`} />
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { setStep('form'); setRegStep('idle') }} className="flex-1" disabled={busy}>
                Kembali
              </Button>
              <Button onClick={handleRegister} disabled={busy} className="flex-1">
                {regStep === 'approve' ? '1/3 Setujui USDC...' : regStep === 'pay' ? '2/3 Bayar Pokok...' : regStep === 'register' ? '3/3 Mendaftar...' : 'Konfirmasi & Daftar'}
              </Button>
            </div>
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const names = ['Budi Santoso', 'Siti Aminah', 'Ahmad Fauzi', 'Dewi Lestari', 'Rudi Hartono']
              setForm({
                namaLengkap: names[Math.floor(Math.random() * names.length)],
                nik: String(Math.floor(Math.random() * 90000000) + 10000000000000000).slice(0, 16),
                tempatLahir: ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Semarang'][Math.floor(Math.random() * 5)],
                tanggalLahir: `${1950 + Math.floor(Math.random() * 50)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
                alamat: `Jl. Merdeka No. ${Math.floor(Math.random() * 100) + 1}`,
                nomorTelepon: `08${String(Math.floor(Math.random() * 9000000000) + 1000000000)}`,
                pekerjaan: ['Wiraswasta', 'Petani', 'Guru', 'Pedagang', 'Nelayan'][Math.floor(Math.random() * 5)],
              })
            }}
            className="flex-1 text-xs"
            size="sm"
          >
            Isi Acak
          </Button>
          <Button
            onClick={() => setStep('confirm')}
            disabled={!isFormValid || busy}
            className="flex-[2]"
        >
          {busy ? 'Memproses...' : 'Lanjut ke Konfirmasi'}
        </Button>
        </div>
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
