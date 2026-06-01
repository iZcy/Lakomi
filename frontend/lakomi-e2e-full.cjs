const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes('5173'));
  if (!page) throw new Error('No Lakomi tab');
  const log = s => console.log(`\n>>> ${s}`);

  // Check current state
  const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => b.textContent.trim().substring(0, 50)));
  console.log('Visible buttons:', JSON.stringify(btns));

  // Register via RPC if not yet registered
  const text = await page.evaluate(() => document.body.innerText.substring(0, 300));
  if (text.includes('Formulir Pendaftaran')) {
    log('Registering via RPC');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find(b => b.textContent.includes('Register via RPC'));
      if (b) { b.scrollIntoView(); b.click(); }
    });
    await sleep(6000);
    console.log('After RPC:', await page.evaluate(() => document.body.innerText.substring(0, 300)));
  }

  // Mint USDC if needed
  const text2 = await page.evaluate(() => document.body.innerText.substring(0, 300));
  if (!text2.includes('2.000 USDC') && !text2.includes('2,000 USDC')) {
    log('Minting USDC');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find(b => b.textContent.includes('1,000 USDC'));
      if (b) { b.scrollIntoView(); b.click(); }
    });
    await sleep(4000);
  }

  // Navigate to Simpanan via bottom nav
  log('Navigating to Simpanan');
  const simBtns = await page.locator('button:has-text("Simpanan")').all();
  for (let i = simBtns.length - 1; i >= 0; i--) {
    try {
      if (await simBtns[i].isVisible()) { await simBtns[i].click(); break; }
    } catch {}
  }
  await sleep(3000);

  const simText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
  console.log('Simpanan page:\n', simText);

  // Click Bayar if visible
  const bayarVisible = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent.includes('Bayar') && b.offsetParent !== null);
    return b ? b.textContent.trim() : null;
  });
  console.log('Bayar button:', bayarVisible);

  if (bayarVisible) {
    log('Clicking Bayar - CONFIRM in wallet popup!');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find(b => b.textContent.includes('Bayar') && b.offsetParent !== null);
      if (b) b.click();
    });
    console.log('Waiting 20s for wallet confirm...');
    await sleep(20000);
    const after = await page.evaluate(() => document.body.innerText.substring(0, 1500));
    console.log('After Bayar:\n', after);
  }

})().catch(e => { console.error(e.message); process.exit(1); });
