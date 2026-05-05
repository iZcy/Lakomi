"""
Test: For each database, Google search for a relevant paper,
navigate to it via ezproxy, extract metadata, download PDF.
This tests the REAL flow end-to-end.
"""
import asyncio
import json
import time
import re
from pathlib import Path

from playwright.async_api import async_playwright
from rich.console import Console

from config import load_config
from scrapers.ieee import IEEEScraper
from scrapers.sciencedirect import ScienceDirectScraper
from scrapers.springer import SpringerScraper
from scrapers.jstor import JSTORScraper
from scrapers.generic import GenericJournalScraper
from models import Paper

console = Console()
DOWNLOAD_DIR = Path(__file__).parent / "downloads" / "db_test"
COMMAND_FILE = "/tmp/paper-downloader-command.json"

# One search per database, focused on thesis topic
TEST_QUERIES = [
    {"db": "springer", "domain": "link.springer.com", "query": "blockchain cooperative DAO governance site:link.springer.com"},
    {"db": "ieee", "domain": "ieeexplore.ieee.org", "query": "blockchain DAO governance cooperative site:ieeexplore.ieee.org"},
    {"db": "sciencedirect", "domain": "sciencedirect.com", "query": "blockchain cooperative governance DAO site:sciencedirect.com"},
    {"db": "wiley", "domain": "onlinelibrary.wiley.com", "query": "blockchain governance DAO cooperative site:onlinelibrary.wiley.com"},
    {"db": "emerald", "domain": "emerald.com", "query": "blockchain governance cooperative site:emerald.com"},
    {"db": "taylorfrancis", "domain": "tandfonline.com", "query": "blockchain governance DAO site:tandfonline.com"},
    {"db": "sage", "domain": "journals.sagepub.com", "query": "blockchain governance DAO cooperative site:journals.sagepub.com/doi"},
    {"db": "cambridge", "domain": "cambridge.org", "query": "blockchain governance challenges site:cambridge.org/core/journals"},
    {"db": "oxford", "domain": "academic.oup.com", "query": "blockchain DAO governance decentralized autonomous organization site:academic.oup.com"},
    {"db": "jstor", "domain": "jstor.org", "query": "blockchain cooperative governance journal site:jstor.org/stable"},
]


async def wait_for_continue(timeout=300):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with open(COMMAND_FILE, 'r') as f:
                data = json.load(f)
            if data.get("command") == "continue":
                with open(COMMAND_FILE, 'w') as f:
                    json.dump({"command": None}, f)
                return True
        except Exception:
            pass
        await asyncio.sleep(2)
    return False


async def test_database(ctx, page, config, test_info):
    """Search Google, click first result, extract metadata, download PDF."""
    db_name = test_info["db"]
    domain = test_info["domain"]
    query = test_info["query"]

    console.rule(f"[bold]{db_name.upper()}[/bold] ({domain})")

    # Step 1: Google search
    console.print(f"  Googling: {query[:60]}...")
    try:
        await page.goto(f"https://www.google.com/search?q={query.replace(' ', '+')}",
                        wait_until='domcontentloaded', timeout=30000)
        await asyncio.sleep(3)
    except Exception as e:
        console.print(f"  [red]Google failed: {repr(e)[:50]}[/red]")
        return "GOOGLE_FAIL"

    # Check for CAPTCHA
    if '/sorry/' in page.url or 'captcha' in page.url.lower():
        console.print(f"  [yellow]CAPTCHA! Please solve in browser, then say 'continue'.[/yellow]")
        await wait_for_continue(300)
        # Re-navigate to search after solving
        try:
            await page.goto(f"https://www.google.com/search?q={query.replace(' ', '+')}",
                            wait_until='domcontentloaded', timeout=30000)
            await asyncio.sleep(3)
        except Exception as e:
            console.print(f"  [red]Re-search failed: {repr(e)[:50]}[/red]")
            return "GOOGLE_FAIL"
        if '/sorry/' in page.url or 'captcha' in page.url.lower():
            console.print(f"  [yellow]CAPTCHA again after re-search! Please solve, then 'continue'.[/yellow]")
            await wait_for_continue(300)

    # Step 2: Find first result link matching domain
    links = await page.evaluate("""(domain) => {
        const results = [];
        document.querySelectorAll('h3').forEach(h3 => {
            const a = h3.closest('a') || h3.parentElement.closest('a');
            if (!a) return;
            const href = a.getAttribute('href') || '';
            if (href.includes(domain)) {
                results.push({href: href, title: h3.innerText.trim()});
            }
        });
        return results;
    }""", domain)

    if not links:
        console.print(f"  [red]No results found for {domain}[/red]")
        return "NO_RESULTS"

    article_url = links[0]['href']
    console.print(f"  Found: {links[0]['title'][:60]}...")
    console.print(f"  URL: {article_url[:70]}...")

    # Step 3: Navigate to ezproxy-proxied version
    from config import to_ezproxy_url
    proxy_url = to_ezproxy_url(article_url)
    console.print(f"  Navigating via ezproxy...")
    try:
        async with page.expect_download(timeout=10000) as dl_info:
            await page.goto(proxy_url, wait_until='domcontentloaded', timeout=60000)
        dl = await dl_info.value
        tmp = await dl.path()
        if tmp and tmp.exists():
            import shutil
            safe_name = re.sub(r'[^\w\s-]', '', db_name) + '_auto_download.pdf'
            dest = DOWNLOAD_DIR / safe_name
            shutil.copy2(str(tmp), str(dest))
            console.print(f"  [green]Direct download captured: {dest.name} ({dest.stat().st_size // 1024}KB)[/green]")
            return "PASS"
    except Exception:
        pass
    try:
        await page.goto(proxy_url, wait_until='domcontentloaded', timeout=60000)
        await asyncio.sleep(4)
    except Exception as e:
        console.print(f"  [red]Navigation failed: {repr(e)[:50]}[/red]")
        return "NAV_FAIL"
    current_url = page.url
    console.print(f"  Landed: {current_url[:70]}...")

    if '/sorry/' in current_url or 'captcha' in current_url.lower():
        console.print(f"  [yellow]CAPTCHA on article page! Please solve, then 'continue'.[/yellow]")
        await wait_for_continue(300)
        try:
            await page.goto(proxy_url, wait_until='domcontentloaded', timeout=45000)
            await asyncio.sleep(4)
        except Exception:
            pass
        current_url = page.url

    if 'login' in current_url.lower() and ('ezproxy' in current_url.lower() or 'sso.ugm' in current_url.lower()):
        console.print(f"  [yellow]SSO redirect - auto-logging in...[/yellow]")
        try:
            await page.fill('input[name="username"]', 'yitzhakedmundtiomanalu')
            await page.fill('input[name="password"]', 'Z@cky4UGMAcc2022')
            await page.click('input[type="submit"]')
            await page.wait_for_load_state('load', timeout=30000)
        except Exception:
            pass
        try:
            await page.goto(proxy_url, wait_until='domcontentloaded', timeout=45000)
            await asyncio.sleep(4)
        except Exception as e:
            console.print(f"  [yellow]Re-nav after login: {repr(e)[:50]}[/yellow]")
        current_url = page.url
        console.print(f"  After login: {current_url[:70]}...")

    # Step 4: Create scraper and extract metadata
    if db_name == "ieee":
        scraper = IEEEScraper(page, config, use_ezproxy=True, console=console)
        paper = await scraper._extract_paper_from_ieee_page()
    elif db_name == "sciencedirect":
        scraper = ScienceDirectScraper(page, config, use_ezproxy=True, console=console)
        paper = await scraper._extract_paper_from_sd_page()
    elif db_name == "springer":
        scraper = SpringerScraper(page, config, use_ezproxy=True, console=console)
        paper = await scraper._extract_metadata() if hasattr(scraper, '_extract_metadata') else None
    elif db_name == "jstor":
        scraper = JSTORScraper(page, config, use_ezproxy=True, console=console)
        try:
            await page.wait_for_selector('h1', timeout=30000)
            await asyncio.sleep(2)
        except Exception:
            pass
        paper = await scraper._extract_metadata()
    else:
        scraper = GenericJournalScraper(page, config, use_ezproxy=True, console=console,
                                        domain=domain, db_name=db_name)
        paper = await scraper._extract_metadata()

    if paper:
        console.print(f"  [green]Title: {paper.title[:60]}...[/green]")
    else:
        console.print(f"  [yellow]Could not extract title, using fallback[/yellow]")
        paper = Paper(title=db_name + "_test", authors="", year=2024,
                      url=current_url, pdf_url="", database=db_name)

    # Step 5: Download PDF
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    result = await scraper.download_pdf(paper, DOWNLOAD_DIR)

    if result:
        size = Path(result).stat().st_size // 1024
        console.print(f"  [bold green]PDF OK: {Path(result).name} ({size}KB)[/bold green]")
        return "PASS"
    else:
        console.print(f"  [red]PDF FAIL[/red]")
        return "NO_PDF"


async def main():
    config = load_config()

    console.print("[bold]Launching browser...[/bold]")
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(
        headless=False,
        args=['--disable-blink-features=AutomationControlled', '--ignore-certificate-errors'],
    )
    ctx = await browser.new_context(
        ignore_https_errors=True,
        accept_downloads=True,
        viewport={"width": 1600, "height": 900},
        locale='en-US',
        timezone_id='Asia/Jakarta',
    )
    await ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")
    page = await ctx.new_page()

    ezproxy_url = config['ezproxy']['url']
    console.print(f"[bold]Opening ezproxy: {ezproxy_url}[/bold]")
    try:
        await page.goto(ezproxy_url, wait_until='load', timeout=60000)
    except Exception:
        pass

    console.print("\n[bold yellow]Auto-logging in to ezproxy...[/bold yellow]")
    if 'sso.ugm.ac.id' in page.url:
        try:
            await page.fill('input[name="username"]', 'yitzhakedmundtiomanalu')
            await page.fill('input[name="password"]', 'Z@cky4UGMAcc2022')
            await page.click('input[type="submit"]')
            await page.wait_for_load_state('load', timeout=30000)
            console.print(f"  [green]Logged in![/green]")
        except Exception as e:
            console.print(f"  [yellow]Auto-login failed: {repr(e)[:50]}[/yellow]")
            await wait_for_continue(300)
    else:
        console.print(f"  [green]Already logged in![/green]")
        await wait_for_continue(60)

    results = {}
    for test_info in TEST_QUERIES:
        try:
            result = await test_database(ctx, page, config, test_info)
            results[test_info["db"]] = result
        except Exception as e:
            console.print(f"  [red]Error: {repr(e)[:60]}[/red]")
            results[test_info["db"]] = "ERROR"
        await asyncio.sleep(2)

    console.rule("[bold]FINAL RESULTS[/bold]")
    for db, result in results.items():
        color = "green" if result == "PASS" else "red"
        console.print(f"  [{color}]{db}: {result}[/{color}]")

    passed = sum(1 for r in results.values() if r == "PASS")
    console.print(f"\n  {passed}/{len(results)} databases with PDF download")

    console.print("  Ctrl+C to close.")
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        pass
    await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
