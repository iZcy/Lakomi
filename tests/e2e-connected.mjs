import { chromium } from '@playwright/test'

const BRAVE_WS_ID = process.env.BRAVE_WS_ID
if (!BRAVE_WS_ID) {
  console.error('Usage: BRAVE_WS_ID=<id> node tests/e2e-connected.mjs')
  process.exit(1)
}

const WS = `ws://localhost:9222/devtools/browser/${BRAVE_WS_ID}`
const BASE = 'http://localhost:5173'
let passed = 0
let failed = 0

function log(msg) { console.log(msg) }
function ok(name) { passed++; log(`  ✅ ${name}`) }
function fail(name, err) { failed++; log(`  ❌ ${name}: ${err.message}`) }

async function run() {
  log(`Connecting to Brave at ${WS}...`)
  const browser = await chromium.connectOverCDP(WS)
  const contexts = browser.contexts()
  const ctx = contexts[0] || await browser.newContext()
  let page = ctx.pages()[0] || await ctx.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15_000 })
  await page.waitForTimeout(3_000)

  log('\n=== Connected State Tests ===\n')

  // 1. Dashboard shows DevFaucet
  log('--- Dashboard ---')
  try {
    const faucet = page.getByText('Dev Faucet')
    const vis = await faucet.isVisible({ timeout: 10_000 })
    vis ? ok('DevFaucet visible') : fail('DevFaucet visible', new Error('Not found'))
  } catch (e) { fail('DevFaucet visible', e) }

  try {
    const ethBtn = page.getByRole('button', { name: '10 ETH' })
    const vis = await ethBtn.isVisible({ timeout: 5_000 })
    vis ? ok('10 ETH button visible') : fail('10 ETH button', new Error('Not found'))
  } catch (e) { fail('10 ETH button', e) }

  try {
    const usdcBtn = page.getByRole('button', { name: '1,000 USDC' })
    const vis = await usdcBtn.isVisible({ timeout: 5_000 })
    vis ? ok('1,000 USDC button visible') : fail('1,000 USDC button', new Error('Not found'))
  } catch (e) { fail('1,000 USDC button', e) }

  try {
    const fixNonce = page.getByRole('button', { name: 'Fix Nonce' })
    const vis = await fixNonce.isVisible({ timeout: 5_000 })
    vis ? ok('Fix Nonce button visible') : fail('Fix Nonce button', new Error('Not found'))
  } catch (e) { fail('Fix Nonce button', e) }

  try {
    const resetBtn = page.getByRole('button', { name: 'Reset Anvil' })
    const vis = await resetBtn.isVisible({ timeout: 5_000 })
    vis ? ok('Reset Anvil button visible') : fail('Reset Anvil button', new Error('Not found'))
  } catch (e) { fail('Reset Anvil button', e) }

  // 2. Simpanan tab
  log('\n--- Simpanan (Pasal 41) ---')
  await page.getByRole('button', { name: /Simpanan/i }).click()
  await page.waitForTimeout(3_000)

  try {
    const regOrSimpanan = page.getByText(/Nama Lengkap|Simpanan|Pasal 41/)
    const vis = await regOrSimpanan.first().isVisible({ timeout: 10_000 })
    vis ? ok('Simpanan tab loaded (registration or vault)') : fail('Simpanan tab', new Error('No content'))
  } catch (e) { fail('Simpanan tab', e) }

  // 3. Pinjaman tab
  log('\n--- Pinjaman ---')
  await page.getByRole('button', { name: /Pinjaman/i }).click()
  await page.waitForTimeout(3_000)

  try {
    const content = page.getByText(/Pinjaman|Nama Lengkap/)
    const vis = await content.first().isVisible({ timeout: 10_000 })
    vis ? ok('Pinjaman tab loaded') : fail('Pinjaman tab', new Error('No content'))
  } catch (e) { fail('Pinjaman tab', e) }

  // 4. Tata Kelola tab
  log('\n--- Tata Kelola (Pasal 22) ---')
  await page.getByRole('button', { name: /Tata Kelola/i }).click()
  await page.waitForTimeout(3_000)

  try {
    const content = page.getByText(/Tata Kelola|Nama Lengkap|proposal/i)
    const vis = await content.first().isVisible({ timeout: 10_000 })
    vis ? ok('Tata Kelola tab loaded') : fail('Tata Kelola tab', new Error('No content'))
  } catch (e) { fail('Tata Kelola tab', e) }

  // 5. Kepatuhan tab
  log('\n--- Kepatuhan Hukum (UU 25/1992) ---')
  await page.getByRole('button', { name: /Kepatuhan/i }).click()
  await page.waitForTimeout(3_000)

  const pasalList = ['Pasal 5(1)', 'Pasal 22(1)', 'Pasal 26-27', 'Pasal 38', 'Pasal 41']
  for (const pasal of pasalList) {
    try {
      const els = page.getByText(pasal)
      const count = await els.count()
      count > 0 ? ok(`Compliance: ${pasal}`) : fail(`Compliance: ${pasal}`, new Error('Not found'))
    } catch (e) { fail(`Compliance: ${pasal}`, e) }
  }

  log(`\n=============================\n  Passed:  ${passed}\n  Failed:  ${failed}\n=============================\n`)

  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((e) => { console.error(e); process.exit(1) })
