"""Quick diagnostic: check what PDF buttons are on each failing page."""
import asyncio
from playwright.async_api import async_playwright
from rich.console import Console

console = Console()

PAGES = [
    ("sage", "https://journals-sagepub-com.ezproxy.ugm.ac.id/doi/10.1177/02683962251389979"),
    ("cambridge", "https://www-cambridge-org.ezproxy.ugm.ac.id/core/books/abs/blockchain-regulation-and-governance/55B3A7BDBBAFCD7DDE9C1EBB17CC56F5"),
    ("oxford", "https://academic-oup-com.ezproxy.ugm.ac.id/cmlj/article/20/3/kmaf011/8249442"),
]

async def main():
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=True, args=['--ignore-certificate-errors'])
    ctx = await browser.new_context(ignore_https_errors=True, viewport={"width": 1600, "height": 900})
    page = await ctx.new_page()

    # Login first
    await page.goto("https://ezproxy.ugm.ac.id/login", wait_until='domcontentloaded', timeout=30000)
    if 'sso.ugm.ac.id' in page.url:
        await page.fill('input[name="username"]', 'yitzhakedmundtiomanalu')
        await page.fill('input[name="password"]', 'Z@cky4UGMAcc2022')
        await page.click('input[type="submit"]')
        await page.wait_for_load_state('load', timeout=30000)
        console.print(f"[green]Logged in![/green]")

    for name, url in PAGES:
        console.rule(f"[bold]{name.upper()}[/bold]")
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=30000)
            await asyncio.sleep(3)
        except Exception as e:
            console.print(f"  [red]Navigation error: {repr(e)[:60]}[/red]")
            continue

        result = await page.evaluate("""() => {
            const candidates = [];
            document.querySelectorAll('a, button').forEach(el => {
                const text = (el.innerText || '').trim().substring(0, 60);
                const href = el.getAttribute('href') || '';
                const rect = el.getBoundingClientRect();
                const visible = rect.width > 0 && rect.height > 0;
                if (visible && text) {
                    const tl = text.toLowerCase();
                    if (tl.includes('pdf') || tl.includes('download') || tl.includes('full text') || 
                        tl.includes('view') || tl.includes('read') || tl.includes('access') ||
                        tl.includes('get ') || tl.includes('open')) {
                        candidates.push({text, href: href.substring(0, 80), tag: el.tagName, id: el.id || '', cls: (el.className||'').substring(0,60)});
                    }
                }
            });
            // Also check all links with pdf in href
            document.querySelectorAll('a[href*="pdf"], a[href*="PDF"]').forEach(a => {
                const href = a.getAttribute('href') || '';
                const text = (a.innerText || '').trim().substring(0, 60);
                const rect = a.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    if (!candidates.find(c => c.href === href.substring(0, 80))) {
                        candidates.push({text: text || '(no text)', href: href.substring(0, 80), tag: 'A', id: '', cls: (a.className||'').substring(0,60)});
                    }
                }
            });
            return {url: location.href, buttons: candidates};
        }""")

        console.print(f"  URL: {result['url'][:70]}")
        console.print(f"  Candidates ({len(result['buttons'])}):")
        for b in result['buttons']:
            console.print(f"    [cyan]{b['tag']}[/cyan] text=[yellow]{b['text'][:40]}[/yellow] href=[green]{b['href'][:50]}[/green]")

    await browser.close()

asyncio.run(main())
