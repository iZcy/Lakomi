const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];

  // Find existing Lakomi tab instead of opening new one
  const pages = ctx.pages();
  console.log('Open tabs:', pages.length);
  for (let i = 0; i < pages.length; i++) {
    const url = pages[i].url();
    console.log(`Tab ${i}: ${url}`);
  }

  let page = pages.find(p => p.url().includes('5173'));
  if (!page) {
    console.log('No Lakomi tab found. Opening one...');
    page = await ctx.newPage();
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  }

  console.log('Using tab:', page.url());
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });

  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons:', JSON.stringify(buttons));

  const text = await page.evaluate(() => document.body.innerText.substring(0, 1500));
  console.log('Content:', text);

})().catch(e => { console.error(e.message); process.exit(1); });
