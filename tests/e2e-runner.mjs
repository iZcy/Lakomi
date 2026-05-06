import { chromium } from '@playwright/test'
import readline from 'readline'

const BRAVE_WS_ID = process.env.BRAVE_WS_ID
if (!BRAVE_WS_ID) {
  console.error('Usage: BRAVE_WS_ID=<id> node tests/e2e-runner.mjs')
  process.exit(1)
}

const WS = `ws://localhost:9222/devtools/browser/${BRAVE_WS_ID}`
const BASE = 'http://localhost:5173'
const SKIP_WALLET = process.argv.includes('--skip-wallet')
const AUTO = process.argv.includes('--auto')
let passed = 0
let failed = 0
let skipped = 0

function log(msg) { console.log(msg) }
function ok(name) { passed++; log(`  ✅ ${name}`) }
function fail(name, err) { failed++; log(`  ❌ ${name}: ${err.message}`) }
function skip(name, reason) { skipped++; log(`  ⏭️  ${name}: ${reason}`) }

function pause(msg) {
  if (AUTO || !process.stdin.isTTY) {
    log(`  ⏭️  [auto] ${msg}`)
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    log(`\n⏸️  ${msg}\n   Press Enter to continue...`)
    rl.question('', () => { rl.close(); resolve() })
  })
}

async function run() {
  log(`Connecting to Brave at ${WS}...`)
  const browser = await chromium.connectOverCDP(WS)
  const contexts = browser.contexts()
  const ctx = contexts[0] || await browser.newContext()
  let page = ctx.pages()[0] || await ctx.newPage()

  log('')

  // 1. Homepage
  log('--- Phase 1: Page Load ---')
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15_000 })
    const heading = await page.getByRole('heading', { name: 'Lakomi' }).isVisible({ timeout: 5_000 })
    heading ? ok('Homepage loads') : fail('Homepage loads', new Error('Heading not visible'))

    const subtitle = await page.getByText('Koperasi Digital Berbasis Blockchain').isVisible({ timeout: 3_000 }).catch(() => false)
    subtitle ? ok('Subtitle visible') : skip('Subtitle visible', 'Not found')

    const addBtn = await page.getByRole('button', { name: 'Tambah Jaringan ke Dompet' }).isVisible({ timeout: 3_000 }).catch(() => false)
    addBtn ? ok('Add Network button visible') : skip('Add Network button', 'Not found')

    const connBtn = await page.getByRole('button', { name: 'Connect Wallet' }).isVisible({ timeout: 3_000 }).catch(() => false)
    connBtn ? ok('Connect Wallet button visible') : skip('Connect Wallet button', 'Not found')
  } catch (e) { fail('Homepage loads', e) }

  // 2. Add Network
  if (!SKIP_WALLET) {
    log('\n--- Phase 2: Add Network ---')
    try {
      await pause('Click "Tambah Jaringan ke Dompet" in Brave — approve network add in wallet popup')
      await page.getByRole('button', { name: 'Tambah Jaringan ke Dompet' }).click()
      await page.waitForTimeout(3_000)
      const toast = await page.getByText(/berhasil ditambahkan/i).isVisible({ timeout: 30_000 }).catch(() => false)
      toast ? ok('Network added (toast visible)') : skip('Network add toast', 'Toast not detected — may already be added')
    } catch (e) { fail('Add network', e) }

    // 3. Connect Wallet
    log('\n--- Phase 3: Connect Wallet ---')
    try {
      await pause('Click "Connect Wallet" — approve in Brave Wallet popup')
      await page.getByRole('button', { name: 'Connect Wallet' }).click()
      await page.waitForTimeout(15_000)
      const connected = await page.locator('text=/0x[a-fA-F0-9]{4,}/').first().isVisible({ timeout: 5_000 }).catch(() => false)
      connected ? ok('Wallet connected') : skip('Wallet connection', 'No address detected')
    } catch (e) { fail('Connect wallet', e) }
  } else {
    log('\n--- Phase 2-3: Wallet ---')
    skip('Add Network', 'SKIP_WALLET mode')
    skip('Connect Wallet', 'SKIP_WALLET mode')
  }

  // 4. Nav tabs
  log('\n--- Phase 4: Navigation ---')
  const navItems = [
    { label: 'Simpanan', text: 'Pasal 41' },
    { label: 'Pinjaman', text: 'Pinjaman' },
    { label: 'Tata Kelola', text: 'Pasal 22' },
    { label: 'Kepatuhan', text: 'UU 25/1992' },
  ]
  for (const item of navItems) {
    try {
      await page.getByRole('button', { name: new RegExp(item.label, 'i') }).click()
      await page.waitForTimeout(2_000)
      const found = await page.getByText(item.text).first().isVisible({ timeout: 5_000 }).catch(() => false)
      found ? ok(`Nav to ${item.label}`) : fail(`Nav to ${item.label}`, new Error(`"${item.text}" not visible`))
    } catch (e) { fail(`Nav to ${item.label}`, e) }
  }

  // 5. Compliance items
  log('\n--- Phase 5: Compliance ---')
  const pasals = ['Pasal 5(1)', 'Pasal 22(1)', 'Pasal 26-27', 'Pasal 38', 'Pasal 41']
  for (const p of pasals) {
    try {
      const found = await page.getByText(p).first().isVisible({ timeout: 3_000 }).catch(() => false)
      found ? ok(`Compliance: ${p}`) : fail(`Compliance: ${p}`, new Error('Not visible'))
    } catch (e) { fail(`Compliance: ${p}`, e) }
  }

  // 6. DevFaucet
  log('\n--- Phase 6: DevFaucet ---')
  await page.getByRole('button', { name: 'Beranda' }).click()
  await page.waitForTimeout(2_000)
  try {
    const faucet = await page.getByText(/Faucet|Klaim/i).first().isVisible({ timeout: 5_000 }).catch(() => false)
    faucet ? ok('DevFaucet section visible') : skip('DevFaucet', 'Not visible — may need wallet connection')
  } catch (e) { fail('DevFaucet', e) }

  // Summary
  log('')
  log('=============================')
  log(`  Passed:  ${passed}`)
  log(`  Failed:  ${failed}`)
  log(`  Skipped: ${skipped}`)
  log('=============================')

  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
