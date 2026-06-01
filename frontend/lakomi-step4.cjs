const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes('5173'));

  console.log('>>> Step 4: Confirm registration on-chain');
  await page.locator('button:has-text("Konfirmasi & Daftar")').click();
  console.log('Clicked Konfirmasi & Daftar — waiting for wallet popup...');
  await page.waitForTimeout(8000);

  const text = await page.evaluate(() => document.body.innerText.substring(0, 1500));
  console.log('After confirm:', text);

})().catch(e => { console.error(e.message); process.exit(1); });
