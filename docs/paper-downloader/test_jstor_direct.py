"""Direct test for JSTOR: navigate directly to a known article, extract metadata, download PDF."""
import asyncio
import json
import time
from pathlib import Path

from playwright.async_api import async_playwright
from rich.console import Console

from config import load_config, to_ezproxy_url
from scrapers.jstor import JSTORScraper
from models import Paper

console = Console()
DOWNLOAD_DIR = Path(__file__).parent / "downloads" / "db_test"
COMMAND_FILE = "/tmp/paper-downloader-command.json"


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


async def main():
    config = load_config()

    console.print("[bold]Launching browser...[/bold]")
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(
        headless=False,
        args=['--disable-blink-features=AutomationControlled', '--ignore-certificate-errors'],
    )
    ctx = await browser.new_context(
        accept_downloads=True,
        ignore_https_errors=True,
        viewport={"width": 1600, "height": 900},
        locale='en-US',
        timezone_id='Asia/Jakarta',
    )
    await ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")
    page = await ctx.new_page()

    ezproxy_url = config['ezproxy']['url']
    console.print("\n[bold yellow]Auto-logging in to ezproxy...[/bold yellow]")
    await page.goto(ezproxy_url, wait_until='load', timeout=60000)

    if 'sso.ugm.ac.id' in page.url:
        try:
            await page.fill('input[name="username"]', 'yitzhakedmundtiomanalu')
            await page.fill('input[name="password"]', 'Z@cky4UGMAcc2022')
            await page.click('input[type="submit"]')
            await page.wait_for_load_state('load', timeout=30000)
            console.print(f"  [green]Logged in! URL: {page.url[:60]}[/green]")
        except Exception as e:
            console.print(f"  [yellow]Auto-login failed: {repr(e)[:50]}, please log in manually[/yellow]")
            console.print("[bold yellow]Login to ezproxy, then tell me 'continue'[/bold yellow]")
            await wait_for_continue(300)
    else:
        console.print(f"  [green]Already logged in![/green]")
        await wait_for_continue(60)

    article_url = "https://www.jstor.org/stable/26591760"
    proxy_url = to_ezproxy_url(article_url)
    console.print(f"  Navigating to: {proxy_url}")

    try:
        await page.goto(proxy_url, wait_until='domcontentloaded', timeout=45000)
    except Exception as e:
        console.print(f"  [red]Nav failed: {repr(e)[:50]}[/red]")

    console.print(f"  Landed: {page.url}")

    if '/sorry/' in page.url or 'captcha' in page.url.lower():
        console.print("[yellow]CAPTCHA! Please solve in browser, then say 'continue'.[/yellow]")
        await wait_for_continue(300)

    if 'login' in page.url.lower() or 'sso' in page.url.lower():
        console.print("[yellow]SSO redirect - auto-logging in...[/yellow]")
        try:
            await page.fill('input[name="username"]', 'yitzhakedmundtiomanalu')
            await page.fill('input[name="password"]', 'Z@cky4UGMAcc2022')
            await page.click('input[type="submit"]')
            await page.wait_for_load_state('load', timeout=30000)
        except Exception as e:
            console.print(f"  [yellow]Auto-login failed: {repr(e)[:50]}[/yellow]")
        try:
            await page.goto(proxy_url, wait_until='domcontentloaded', timeout=45000)
        except Exception:
            pass
        console.print(f"  After login: {page.url}")

    await asyncio.sleep(10)
    if '/sorry/' in page.url or 'captcha' in page.url.lower():
        console.print("[yellow]CAPTCHA! Please solve in browser, then say 'continue'.[/yellow]")
        await wait_for_continue(300)
    console.print(f"  After wait: {page.url}")
    console.print(f"  Title tag: {await page.title()}")

    scraper = JSTORScraper(page, config, use_ezproxy=True, console=console)
    paper = await scraper._extract_metadata()

    if paper:
        console.print(f"  [green]Title: {paper.title}[/green]")
        console.print(f"  [green]Authors: {paper.authors}[/green]")
        console.print(f"  [green]Year: {paper.year}[/green]")
        console.print(f"  [green]PDF URL: {paper.pdf_url}[/green]")
    else:
        console.print(f"  [yellow]No metadata extracted, using fallback[/yellow]")
        paper = Paper(title="jstor_test", authors="", year=2024,
                      url=page.url, pdf_url="", database="jstor")

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    result = await scraper.download_pdf(paper, DOWNLOAD_DIR)

    if result:
        size = Path(result).stat().st_size // 1024
        console.print(f"  [bold green]PDF OK: {Path(result).name} ({size}KB)[/bold green]")
        import subprocess
        fcheck = subprocess.run(['file', result], capture_output=True, text=True)
        console.print(f"  File type: {fcheck.stdout.strip()}")
    else:
        console.print(f"  [red]PDF FAIL[/red]")

    console.print("  Ctrl+C to close.")
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        pass
    await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
