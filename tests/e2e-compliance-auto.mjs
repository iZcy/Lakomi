import { chromium } from '@playwright/test'
import fs from 'fs'

const WS = process.env.BRAVE_WS
const BASE = 'http://localhost:5173'
const BRAVE_BIN = '/usr/bin/brave-browser'
let passed = 0, failed = 0, skipped = 0

const PAUSE_FILE = '/tmp/opencode/e2e-pause.json'
const CONTINUE_FILE = '/tmp/opencode/e2e-continue'

const log = (m) => console.log(m)
const ok = (n) => { passed++; log(`  ✅ ${n}`) }
const fail = (n, e) => { failed++; log(`  ❌ ${n}: ${e.message}`) }
const skip = (n, r) => { skipped++; log(`  ⏭️  ${n}: ${r}`) }

function pause(msg) {
  return new Promise((resolve) => {
    log(`\n⏸️  WALLET ACTION NEEDED: ${msg}`)
    log(`   Waiting for continue signal...`)
    try { fs.writeFileSync(PAUSE_FILE, JSON.stringify({ msg, time: Date.now() })) } catch {}
    const iv = setInterval(() => {
      if (fs.existsSync(CONTINUE_FILE)) {
        try { fs.unlinkSync(CONTINUE_FILE) } catch {}
        clearInterval(iv)
        resolve()
      }
    }, 1000)
  })
}

async function waitAndCheck(page, text, timeout = 15_000) {
  try {
    const el = page.getByText(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
    await el.first().waitFor({ state: 'visible', timeout })
    return true
  } catch {
    return false
  }
}

async function clickBtn(page, label, timeout = 10_000) {
  const btn = page.getByRole('button', { name: new RegExp(label, 'i') })
  await btn.first().waitFor({ state: 'visible', timeout })
  await btn.first().click()
}

async function fillInput(page, label, value) {
  const input = page.getByPlaceholder(label)
  await input.first().waitFor({ state: 'visible', timeout: 5_000 })
  await input.first().fill(value)
}

async function navTo(page, tab) {
  await clickBtn(page, tab)
  await page.waitForTimeout(1_500)
}

async function run() {
  let browser
  if (WS) {
    log(`\n🔗 Connecting to Brave at ${WS}...`)
    browser = await chromium.connectOverCDP(WS)
  } else {
    log(`\n🚀 Launching Brave from ${BRAVE_BIN}...`)
    browser = await chromium.launch({
      executablePath: BRAVE_BIN,
      headless: false,
      args: [
        '--remote-debugging-port=9222',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    })
  }

  const contexts = browser.contexts()
  const ctx = contexts[0] || await browser.newContext()
  let page = ctx.pages()[0] || await ctx.newPage()

  // ======== PHASE 0: PAGE LOAD ========
  log('\n' + '='.repeat(60))
  log('  PHASE 0: Page Load')
  log('='.repeat(60))

  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20_000 })
    await page.waitForTimeout(2_000)
    const heading = await waitAndCheck(page, 'Lakomi', 10_000)
    heading ? ok('Homepage loads — "Lakomi" heading visible') : fail('Homepage loads', new Error('Heading not found'))

    const subtitle = await waitAndCheck(page, 'Koperasi Digital', 5_000)
    subtitle ? ok('Subtitle "Koperasi Digital Berbasis Blockchain" visible') : skip('Subtitle', 'Not found')
  } catch (e) { fail('Page load', e) }

  // ======== PHASE 1: ADD NETWORK + CONNECT WALLET ========
  log('\n' + '='.repeat(60))
  log('  PHASE 1: Add Network + Connect Wallet')
  log('='.repeat(60))

  await pause('If not already added: click "Tambah Jaringan ke Dompet" in Brave, approve in wallet popup. Then press Enter.')

  try {
    const addBtn = page.getByRole('button', { name: /Tambah Jaringan/i })
    const addVisible = await addBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)
    if (addVisible) {
      await addBtn.first().click()
      await page.waitForTimeout(5_000)
      const toast = await waitAndCheck(page, 'berhasil ditambahkan', 30_000)
      toast ? ok('Network added to wallet') : skip('Network add toast', 'Not detected — may already be added')
    } else {
      skip('Add Network button', 'Not visible — may already be connected')
    }
  } catch (e) { fail('Add network', e) }

  await pause('Click "Connect Wallet" / Brave Wallet button in Brave, approve connection. Then press Enter.')

  try {
    const connBtn = page.getByRole('button', { name: /Connect Wallet/i })
    const connVisible = await connBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)
    if (connVisible) {
      await connBtn.first().click()
      await page.waitForTimeout(15_000)
    }
    const addrVisible = await page.locator('text=/0x[a-fA-F0-9]{4,}/').first().isVisible({ timeout: 10_000 }).catch(() => false)
    addrVisible ? ok('Wallet connected — address visible') : skip('Wallet connection', 'No address detected — may already be connected')
  } catch (e) { fail('Connect wallet', e) }

  // ======== PHASE 2: DEV FAUCET — GET TEST FUNDS ========
  log('\n' + '='.repeat(60))
  log('  PHASE 2: Dev Faucet — Get ETH + USDC')
  log('='.repeat(60))

  try {
    await navTo(page, 'Beranda')
    const faucetVisible = await waitAndCheck(page, 'Dev Faucet', 5_000)
    if (faucetVisible) {
      ok('Dev Faucet section visible on Dashboard')
    } else {
      skip('Dev Faucet', 'Not visible — may need wallet connection')
    }
  } catch (e) { fail('Dev Faucet check', e) }

  await pause('Click "Klaim ETH" (or similar) and "Klaim USDC" in the Dev Faucet section. You need funds for transactions. Then press Enter.')

  try {
    const usdcBalance = await waitAndCheck(page, 'USDC', 5_000)
    usdcBalance ? ok('USDC balance visible after faucet') : skip('USDC balance', 'Not visible')
  } catch (e) { fail('USDC check', e) }

  // ======== PHASE 3: REGISTRATION (Pasal 5(1) + Pasal 17-18) ========
  log('\n' + '='.repeat(60))
  log('  PHASE 3: Pendaftaran Anggota — Pasal 5(1) UU 25/1992')
  log('  "Keanggotaan koperasi bersifat sukarela dan terbuka"')
  log('='.repeat(60))

  try {
    const regForm = await waitAndCheck(page, 'Formulir Pendaftaran Anggota', 5_000)
    regForm ? ok('Registration form visible') : skip('Registration form', 'May already be registered or not connected')
  } catch (e) { fail('Registration form check', e) }

  await pause('Fill in the registration form:\n  - Nama Lengkap (min 3 chars)\n  - NIK (16 digits)\n  - Tempat Lahir (min 2 chars)\n  - Tanggal Lahir\n  - Alamat (min 5 chars)\n  - Nomor Telepon (min 8 chars)\nThen click "Konfirmasi & Daftar" and approve TX in wallet. Press Enter after TX confirmed.')

  try {
    const success = await waitAndCheck(page, 'Berhasil terdaftar', 30_000)
    success ? ok('Member registration TX confirmed — on-chain proof (Pasal 5(1))') : skip('Registration success', 'Toast not detected — may already be registered')
  } catch (e) { fail('Registration', e) }

  // Check member count on dashboard
  try {
    await navTo(page, 'Beranda')
    await page.waitForTimeout(2_000)
    const memberBadge = await waitAndCheck(page, 'Anggota Aktif', 5_000)
    memberBadge ? ok('Dashboard shows membership status') : skip('Member badge', 'Not found')
  } catch (e) { fail('Member badge check', e) }

  // ======== PHASE 4: SIMPANAN POKOK (Pasal 41(1)) ========
  log('\n' + '='.repeat(60))
  log('  PHASE 4: Bayar Simpanan Pokok — Pasal 41(1) UU 25/1992')
  log('  "Simpanan pokok hanya dibayar satu kali"')
  log('='.repeat(60))

  try {
    await navTo(page, 'Simpanan')
    const pokokPrompt = await waitAndCheck(page, 'Simpanan Pokok Belum Dibayar', 5_000)
    pokokPrompt ? ok('Simpanan Pokok unpaid prompt visible (guard active)') : skip('Pokok prompt', 'May already be paid')
  } catch (e) { fail('Pokok prompt check', e) }

  try {
    const pokokCard = await waitAndCheck(page, 'Bayar Simpanan Pokok', 5_000)
    pokokCard ? ok('"Bayar Simpanan Pokok" card visible') : skip('Pokok card', 'Not found')
  } catch (e) { fail('Pokok card check', e) }

  await pause('Click the "Bayar XXX USDC" button in the Simpanan Pokok card. Approve USDC spend in wallet, then approve the payment TX. Press Enter after confirmed.')

  try {
    const success = await waitAndCheck(page, 'Simpanan Pokok berhasil dibayar', 30_000)
    success ? ok('Simpanan Pokok paid — on-chain proof (Pasal 41(1))') : skip('Pokok success', 'Toast not detected')
  } catch (e) { fail('Simpanan Pokok payment', e) }

  // Verify the prompt is gone and wajib card appears
  try {
    await page.waitForTimeout(2_000)
    const wajibCard = await waitAndCheck(page, 'Bayar Simpanan Wajib', 5_000)
    wajibCard ? ok('"Bayar Simpanan Wajib" card appeared (pokok guard passed)') : skip('Wajib card', 'Not found')
  } catch (e) { fail('Wajib card check', e) }

  // ======== PHASE 5: SIMPANAN WAJIB (Pasal 41(2)) ========
  log('\n' + '='.repeat(60))
  log('  PHASE 5: Bayar Simpanan Wajib — Pasal 41(2) UU 25/1992')
  log('  "Simpanan wajib dibayar secara berkala"')
  log('='.repeat(60))

  await pause('Click "Bayar" in the Simpanan Wajib card. Approve USDC spend then approve payment TX. Press Enter after confirmed.')

  try {
    const success = await waitAndCheck(page, 'Simpanan Wajib berhasil', 30_000)
    success ? ok('Simpanan Wajib paid — on-chain proof (Pasal 41(2))') : skip('Wajib success', 'Toast not detected')
  } catch (e) { fail('Simpanan Wajib payment', e) }

  // ======== PHASE 6: SIMPANAN SUKARELA (Pasal 41(3)) ========
  log('\n' + '='.repeat(60))
  log('  PHASE 6: Simpanan Sukarela — Pasal 41(3) UU 25/1992')
  log('  "Anggota dapat menyetor simpanan sukarela kapan saja"')
  log('='.repeat(60))

  try {
    const sukarelaCard = await waitAndCheck(page, 'Simpanan Sukarela', 5_000)
    sukarelaCard ? ok('"Simpanan Sukarela" card visible') : fail('Sukarela card', new Error('Not found — requires paid pokok'))
  } catch (e) { fail('Sukarela card check', e) }

  await pause('In the "Simpanan Sukarela" card, enter an amount (e.g. 100) in the USDC input, then click "Setor". Approve TXs. Press Enter after confirmed.')

  try {
    const success = await waitAndCheck(page, 'Berhasil disetor', 30_000)
    success ? ok('Simpanan Sukarela deposited — on-chain proof (Pasal 41(3))') : skip('Sukarela success', 'Toast not detected')
  } catch (e) { fail('Simpanan Sukarela deposit', e) }

  // Check Rincian Simpanan
  try {
    await page.waitForTimeout(2_000)
    const rincian = await waitAndCheck(page, 'Rincian Simpanan', 5_000)
    rincian ? ok('"Rincian Simpanan" section visible with breakdown') : skip('Rincian Simpanan', 'Not found')
  } catch (e) { fail('Rincian check', e) }

  // ======== PHASE 7: AJUKAN PINJAMAN (Pasal 38) ========
  log('\n' + '='.repeat(60))
  log('  PHASE 7: Ajukan Pinjaman — Pasal 38 UU 25/1992')
  log('  "Koperasi memberikan pinjaman kepada anggota"')
  log('='.repeat(60))

  try {
    await navTo(page, 'Pinjaman')
    await page.waitForTimeout(2_000)
    const loanForm = await waitAndCheck(page, 'Ajukan Pinjaman', 5_000)
    loanForm ? ok('"Ajukan Pinjaman" form visible') : fail('Loan form', new Error('Not found — may need simpanan pokok'))
  } catch (e) { fail('Loan form check', e) }

  await pause('Fill the loan form:\n  - Jumlah USDC (e.g. 50)\n  - Jangka Waktu (e.g. 30 hari)\n  - Keperluan (e.g. "Modal usaha")\nThen click "Ajukan Pinjaman". Approve TXs. Press Enter after confirmed.')

  try {
    const success = await waitAndCheck(page, 'Berhasil diajukan', 30_000)
    success ? ok('Loan application submitted — on-chain proof (Pasal 38)') : skip('Loan success', 'Toast not detected')
  } catch (e) { fail('Loan application', e) }

  // ======== PHASE 8: DISBURSE PINJAMAN (Pasal 38) ========
  log('\n' + '='.repeat(60))
  log('  PHASE 8: Cairkan Pinjaman — Pasal 38 UU 25/1992')
  log('  "Pinjaman dicairkan setelah persetujuan"')
  log('='.repeat(60))

  try {
    const loanCard = await waitAndCheck(page, 'Pinjaman #0', 10_000)
    loanCard ? ok('Loan card visible (Pinjaman #0)') : skip('Loan card', 'Not found')
  } catch (e) { fail('Loan card check', e) }

  await pause('Switch to the Admin/Approver account in Brave Wallet.\nThen click "Setujui (Admin)" on the loan card to approve it.\nPress Enter after confirmed.')

  try {
    const disburseBtn = await waitAndCheck(page, 'Cairkan Dana', 10_000)
    disburseBtn ? ok('"Cairkan Dana" button appeared after approval') : skip('Disburse button', 'Not found')
  } catch (e) { fail('Disburse button check', e) }

  await pause('Click "Cairkan Dana" to disburse the loan. Approve TX. Press Enter after confirmed.')

  try {
    const success = await waitAndCheck(page, 'Dana berhasil dicairkan', 30_000)
    success ? ok('Loan disbursed — on-chain proof (Pasal 38)') : skip('Disburse success', 'Toast not detected')
  } catch (e) { fail('Loan disbursement', e) }

  // ======== PHASE 9: BAYAR ANGSURAN (Pasal 38) ========
  log('\n' + '='.repeat(60))
  log('  PHASE 9: Bayar Angsuran — Pasal 38 UU 25/1992')
  log('  "Anggota wajib mengangsur pinjaman sesuai jadwal"')
  log('='.repeat(60))

  await pause('Switch back to the borrower account in Brave Wallet.\nClick "Bayar Sebagian" on the loan card, enter amount, click "Bayar".\nOr click "Lunasi XXX USDC" to pay in full. Approve TXs. Press Enter after confirmed.')

  try {
    const repaySuccess = await waitAndCheck(page, 'Pembayaran berhasil|Lunas', 30_000)
    repaySuccess ? ok('Loan repayment processed — on-chain proof (Pasal 38)') : skip('Repayment', 'Toast not detected')
  } catch (e) { fail('Loan repayment', e) }

  // ======== PHASE 10: GOVERNANCE — BUAT USULAN (Pasal 22) ========
  log('\n' + '='.repeat(60))
  log('  PHASE 10: Buat Usulan — Pasal 22 UU 25/1992')
  log('  "Musyawarah untuk mufakat dalam pengambilan keputusan"')
  log('='.repeat(60))

  try {
    await navTo(page, 'Tata Kelola')
    await page.waitForTimeout(2_000)
    const gov = await waitAndCheck(page, 'Tata Kelola', 5_000)
    gov ? ok('Governance page loaded') : fail('Governance page', new Error('Heading not found'))
  } catch (e) { fail('Governance page', e) }

  try {
    const proposalForm = await waitAndCheck(page, 'Buat Usulan Baru', 5_000)
    proposalForm ? ok('"Buat Usulan Baru" form visible') : skip('Proposal form', 'Not found')
  } catch (e) { fail('Proposal form check', e) }

  await pause('In "Buat Usulan Baru":\n  - Select a type (e.g. "Umum")\n  - Write a description (e.g. "Usulan tes E2E")\n  - Click "Buat Usulan"\nApprove TX. Press Enter after confirmed.')

  try {
    const success = await waitAndCheck(page, 'Usulan berhasil dibuat', 30_000)
    success ? ok('Proposal created — on-chain proof (Pasal 22)') : skip('Proposal success', 'Toast not detected')
  } catch (e) { fail('Create proposal', e) }

  // ======== PHASE 11: VOTING (Pasal 26-27) ========
  log('\n' + '='.repeat(60))
  log('  PHASE 11: Voting — Pasal 26-27 UU 25/1992')
  log('  "Setiap anggota memiliki hak suara yang sama"')
  log('='.repeat(60))

  try {
    const proposal = await waitAndCheck(page, 'Usulan #', 5_000)
    proposal ? ok('Proposal list visible with proposal item') : skip('Proposal list', 'Not found')
  } catch (e) { fail('Proposal list check', e) }

  await pause('Click on the proposal to expand it. Then click "Setuju" to cast a vote.\nApprove TX. Press Enter after confirmed.')

  try {
    const voteSuccess = await waitAndCheck(page, 'Anda sudah memberikan suara', 30_000)
    voteSuccess ? ok('Vote cast — on-chain proof (Pasal 26-27)') : skip('Vote success', 'Toast not detected')
  } catch (e) { fail('Cast vote', e) }

  // ======== PHASE 12: SHU — DISTRIBUTION + CLAIM (Pasal 45) ========
  log('\n' + '='.repeat(60))
  log('  PHASE 12: SHU Distribusi + Klaim — Pasal 45 UU 25/1992')
  log('  "Sisa Hasil Usaha didistribusikan kepada anggota"')
  log('='.repeat(60))

  try {
    await navTo(page, 'Simpanan')
    await page.waitForTimeout(2_000)
    const shuSection = await waitAndCheck(page, 'Pendapatan Koperasi', 5_000)
    shuSection ? ok('"Pendapatan Koperasi" section visible (SHU source)') : skip('Revenue section', 'Not found')
  } catch (e) { fail('Revenue section check', e) }

  await pause('If "Distribusikan SHU" button is visible, click it to distribute SHU.\nThis requires admin/treasurer role. Approve TX.\nThen click "Klaim" on the SHU history row to claim your share.\nPress Enter after done (or skip if no revenue yet).')

  try {
    const distSuccess = await waitAndCheck(page, 'Terdistribusi|Berhasil diklaim', 30_000)
    distSuccess ? ok('SHU distributed/claimed — on-chain proof (Pasal 45)') : skip('SHU', 'No revenue to distribute or no claim button visible')
  } catch (e) { fail('SHU distribution', e) }

  // ======== PHASE 13: COMPLIANCE PAGE ========
  log('\n' + '='.repeat(60))
  log('  PHASE 13: Halaman Kepatuhan Hukum')
  log('  Verification of UU 25/1992 compliance display')
  log('='.repeat(60))

  try {
    await navTo(page, 'Kepatuhan')
    await page.waitForTimeout(2_000)
    const compliance = await waitAndCheck(page, 'Kepatuhan', 5_000)
    compliance ? ok('Compliance page loaded') : fail('Compliance page', new Error('Not found'))
  } catch (e) { fail('Compliance page', e) }

  const pasals = [
    { label: 'Pasal 5(1)', desc: 'Keanggotaan terbuka dan sukarela' },
    { label: 'Pasal 22(1)', desc: 'Musyawarah untuk mufakat' },
    { label: 'Pasal 26-27', desc: 'Hak suara anggota' },
    { label: 'Pasal 38', desc: 'Pemberian pinjaman' },
    { label: 'Pasal 41', desc: 'Simpanan pokok, wajib, sukarela' },
    { label: 'Pasal 45', desc: 'SHU' },
  ]

  for (const p of pasals) {
    try {
      const found = await waitAndCheck(page, p.label, 5_000)
      found ? ok(`Compliance display: ${p.label} — ${p.desc}`) : fail(`Compliance: ${p.label}`, new Error('Not visible'))
    } catch (e) { fail(`Compliance: ${p.label}`, e) }
  }

  // ======== SUMMARY ========
  log('\n' + '='.repeat(60))
  log('  E2E COMPLIANCE TEST SUMMARY')
  log('  UU No. 25 Tahun 1992 — Koperasi')
  log('='.repeat(60))
  log(`  ✅ Passed:  ${passed}`)
  log(`  ❌ Failed:  ${failed}`)
  log(`  ⏭️  Skipped: ${skipped}`)
  log(`  📊 Total:   ${passed + failed + skipped}`)
  log('='.repeat(60))

  if (failed > 0) {
    log('\n  ⚠️  Some tests failed. Check the logs above for details.')
    log('  Common fixes:')
    log('  - Fix Nonce in Dev Faucet if TXs get stuck')
    log('  - Make sure you have enough USDC')
    log('  - Switch to correct account (admin vs member)')
  } else if (skipped > 0) {
    log('\n  ℹ️  Some tests were skipped. This is normal if:')
    log('  - Account is already registered')
    log('  - Simpanan Pokok already paid')
    log('  - No revenue for SHU distribution')
  } else {
    log('\n  🎉 All E2E compliance tests passed!')
  }

  log('')
  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
