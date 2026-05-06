import { test, expect, type Page } from '@playwright/test'

test.describe('Lakomi E2E — Brave (connected)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Lakomi' })).toBeVisible({ timeout: 15_000 })
  })

  test('01 - Homepage loads correctly', async ({ page }) => {
    await expect(page.getByText('Koperasi Digital Berbasis Blockchain')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tambah Jaringan ke Dompet' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible()

    const navItems = ['Beranda', 'Simpanan', 'Pinjaman', 'Tata Kelola', 'Kepatuhan Hukum']
    for (const item of navItems) {
      await expect(page.getByText(item, { exact: false }).first()).toBeVisible()
    }
  })

  test('02 - Add Anvil network to wallet', async ({ page }) => {
    await page.getByRole('button', { name: 'Tambah Jaringan ke Dompet' }).click()
    await page.waitForTimeout(20_000)
  })

  test('03 - Connect wallet', async ({ page }) => {
    await page.getByRole('button', { name: 'Connect Wallet' }).click()
    await page.waitForTimeout(20_000)
  })

  test('04 - Navigate all sidebar tabs', async ({ page }) => {
    const tabs = [
      { name: 'Simpanan', expected: 'Pasal 41' },
      { name: 'Pinjaman', expected: 'Pinjaman' },
      { name: 'Tata Kelola', expected: 'Pasal 22' },
      { name: 'Kepatuhan', expected: 'UU 25/1992' },
      { name: 'Beranda', expected: 'Koperasi Digital' },
    ]
    for (const tab of tabs) {
      await page.getByRole('button', { name: new RegExp(tab.name, 'i') }).click()
      await page.waitForTimeout(2_000)
      await expect(page.getByText(tab.expected).first()).toBeVisible({ timeout: 10_000 })
    }
  })

  test('05 - Compliance page shows all pasal items', async ({ page }) => {
    await page.getByRole('button', { name: /Kepatuhan/i }).click()
    await page.waitForTimeout(2_000)

    const pasalItems = [
      'Pasal 5(1)', 'Pasal 22(1)', 'Pasal 26-27', 'Pasal 38',
      'Pasal 41', 'Pasal 43-44', 'Pasal 21',
    ]
    for (const pasal of pasalItems) {
      await expect(page.getByText(pasal).first()).toBeVisible({ timeout: 10_000 })
    }
  })

  test('06 - DevFaucet card visible', async ({ page }) => {
    const faucet = page.getByText(/Faucet|Klaim/i)
    await expect(faucet.first()).toBeVisible({ timeout: 15_000 })
  })

})
