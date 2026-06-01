const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes('5173'));
  
  console.log('Reloading with cache bypass...');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const allBtns = await page.evaluate(() => 
    [...document.querySelectorAll('button')].map(b => b.textContent.trim().substring(0, 40))
  );
  console.log('All buttons:', JSON.stringify(allBtns));
})().catch(e => { console.error(e.message); process.exit(1); });
