const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes('5173'));
  const log = s => console.log(`\n>>> ${s}`);

  // Click Beranda to refresh
  log('Click Beranda to refresh');
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent.trim() === 'Beranda' && b.offsetParent !== null);
    if (b) b.click();
  });
  await sleep(3000);

  const text = await page.evaluate(() => document.body.innerText.substring(0, 800));
  console.log('Dashboard:', text);

  // Navigate to Simpanan
  log('Simpanan');
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent.trim() === 'Simpanan' && b.offsetParent !== null);
    if (b) b.click();
  });
  await sleep(3000);

  const simText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
  console.log('Simpanan:', simText);

  // Click Bayar 100 USDC
  log('Click Bayar 100 USDC - confirm in wallet!');
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent.includes('Bayar') && b.offsetParent !== null);
    if (b) b.click();
  });
  console.log('Waiting 20s for wallet confirm...');
  await sleep(20000);

  const after = await page.evaluate(() => document.body.innerText.substring(0, 1500));
  console.log('After Bayar:', after);

})().catch(e => { console.error(e.message); process.exit(1); });
