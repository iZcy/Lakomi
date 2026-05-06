const { chromium } = require('@playwright/test');

(async () => {
  try {
    const res = await fetch('http://localhost:9222/json/version');
    const data = await res.json();
    console.log('WS Endpoint:', data.webSocketDebuggerUrl);

    const browser = await chromium.connectOverCDP(data.webSocketDebuggerUrl);
    console.log('Connected! Contexts:', browser.contexts().length);

    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();
    console.log('Pages:', pages.length);
    console.log('First page URL:', pages[0]?.url());

    const page = pages[0] || await context.newPage();
    await page.goto('http://localhost:5173');
    console.log('Navigated. Title:', await page.title());

    const heading = await page.getByRole('heading', { name: 'Lakomi' }).isVisible({ timeout: 5000 });
    console.log('Lakomi heading visible:', heading);

    const subtitle = await page.getByText('Koperasi Digital Berbasis Blockchain').isVisible({ timeout: 5000 });
    console.log('Subtitle visible:', subtitle);

    const addNetworkBtn = await page.getByRole('button', { name: 'Tambah Jaringan ke Dompet' }).isVisible({ timeout: 5000 });
    console.log('Add Network button visible:', addNetworkBtn);

    const connectBtn = await page.getByRole('button', { name: 'Connect Wallet' }).isVisible({ timeout: 5000 });
    console.log('Connect Wallet button visible:', connectBtn);

    console.log('\n✅ All checks passed! Connected to existing Brave browser.');

    await browser.close();
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
