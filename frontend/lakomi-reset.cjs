const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes('5173'));

  console.log('>>> Resetting Anvil and redeploying...');
  await page.locator('button:has-text("Reset Anvil")').click();
  await page.waitForTimeout(5000);

  const text = await page.evaluate(() => document.body.innerText.substring(0, 800));
  console.log('After reset:', text);

})().catch(e => { console.error(e.message); process.exit(1); });
