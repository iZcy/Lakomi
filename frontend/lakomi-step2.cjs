const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes('5173'));
  const log = s => console.log(`\n>>> ${s}`);

  // Reload to pick up new state
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);

  const text = await page.evaluate(() => document.body.innerText.substring(0, 1200));
  console.log('After reload:\n', text);

  // Navigate to Simpanan
  log('Step 3: Simpanan');
  await page.locator('button:has-text("Simpanan")').last().click({ timeout: 10000 });
  await sleep(3000);
  const simText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
  console.log('Simpanan:\n', simText);

  // Pay Simpanan Pokok
  log('Step 4: Pay Simpanan Pokok');
  const bayar = page.locator('button:has-text("Bayar")');
  if (await bayar.first().isVisible().catch(() => false)) {
    await bayar.first().scrollIntoViewIfNeeded().catch(() => {});
    await bayar.first().click({ timeout: 10000 });
    await sleep(5000);
    const after = await page.evaluate(() => document.body.innerText.substring(0, 1500));
    console.log('After Bayar:\n', after);
  } else {
    console.log('No Bayar button - all buttons:');
    const allBtns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => b.textContent.trim()));
    console.log(JSON.stringify(allBtns));
  }

})().catch(e => { console.error(e.message); process.exit(1); });
