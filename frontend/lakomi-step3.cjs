const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes('5173'));
  const log = s => console.log(`\n>>> ${s}`);

  // Check wallet is connected
  const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => b.textContent.trim().substring(0, 50)));
  console.log('Buttons:', JSON.stringify(btns));

  const text = await page.evaluate(() => document.body.innerText.substring(0, 600));
  console.log('Current page:', text);

  // Navigate to Simpanan
  log('Simpanan');
  await page.locator('button:has-text("Simpanan")').last().click({ timeout: 10000 });
  await sleep(3000);
  const simText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
  console.log('Simpanan:\n', simText);

  // Pay Simpanan Pokok
  log('Pay Simpanan Pokok');
  const bayarBtns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null && b.textContent.includes('Bayar')).map(b => b.textContent.trim()));
  console.log('Bayar buttons:', JSON.stringify(bayarBtns));

  if (bayarBtns.length > 0) {
    await page.locator('button:has-text("Bayar")').first().scrollIntoViewIfNeeded().catch(() => {});
    await page.locator('button:has-text("Bayar")').first().click({ timeout: 10000 });
    await sleep(5000);
    const after = await page.evaluate(() => document.body.innerText.substring(0, 1500));
    console.log('After Bayar:\n', after);
  }

})().catch(e => { console.error(e.message); process.exit(1); });
