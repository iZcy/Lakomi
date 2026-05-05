"""
Test PDF download from each source (IEEE, ScienceDirect, Springer).
Click-only approach: find buttons, click them, handle new tabs/viewers.
"""
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright
from rich.console import Console

from config import load_config

console = Console()

TEST_PAPERS = {
    "springer": {
        "url": "https://link-springer-com.ezproxy.ugm.ac.id/article/10.1007/s10257-023-00659-7",
        "btn_text": "Download PDF",
    },
    "ieee": {
        "url": "https://ieeexplore-ieee-org.ezproxy.ugm.ac.id/document/10216831",
        "btn_text": "PDF",
    },
    "sciencedirect": {
        "url": "https://www-sciencedirect-com.ezproxy.ugm.ac.id/science/article/pii/S2213297X26000054",
        "btn_text": "View PDF",
    },
}

DOWNLOAD_DIR = Path(__file__).parent / "downloads" / "test"
COMMAND_FILE = "/tmp/paper-downloader-command.json"


async def wait_for_continue(timeout=300):
    import json, time
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


async def test_source(ctx, page, source_name, test_info):
    console.rule(f"Testing: {source_name.upper()}")
    btn_text = test_info["btn_text"]
    url = test_info["url"]

    console.print(f"  Going to article page...")
    try:
        await page.goto(url, wait_until='domcontentloaded', timeout=60000)
        await asyncio.sleep(4)
    except Exception as e:
        console.print(f"  [red]Navigation failed: {e}[/red]")
        return False

    console.print(f"  Page: {page.url[:80]}...")
    console.print(f"  Looking for button with text: '{btn_text}'")

    # Find the button/link
    btn = None
    selectors = [
        f'a:has-text("{btn_text}")',
        f'button:has-text("{btn_text}")',
        f'[data-track-action="Download PDF"]',
        'a[href*="content/pdf"]',
        'a[href*="stamp/stamp"]',
        'a[href*="pdfft"]',
    ]

    for sel in selectors:
        try:
            elems = await page.query_selector_all(sel)
            for elem in elems:
                vis = await elem.is_visible()
                if vis:
                    txt = (await elem.inner_text()).strip()[:30]
                    href = await elem.get_attribute('href') or ''
                    console.print(f"  Found: '{txt}' href={href[:50]} vis={vis}")
                    btn = elem
                    break
            if btn:
                break
        except Exception:
            pass

    if not btn:
        console.print("  [red]No visible button found![/red]")
        # Debug: list all visible links
        links = await page.evaluate("""() => {
            const r = [];
            document.querySelectorAll('a').forEach(a => {
                const rect = a.getBoundingClientRect();
                if (rect.width > 0) {
                    const t = a.innerText.trim().substring(0, 30);
                    if (t.toLowerCase().includes('pdf') || t.toLowerCase().includes('download'))
                        r.push(t + ' -> ' + (a.getAttribute('href')||'').substring(0,50));
                }
            });
            return r;
        }""")
        for l in links:
            console.print(f"    visible link: {l}")
        return False

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Scroll to button
    try:
        await btn.scroll_into_view_if_needed(timeout=5000)
        await asyncio.sleep(0.5)
    except Exception:
        pass

    # Click and handle result
    # Strategy: listen for BOTH new page (tab) and download event simultaneously
    console.print(f"  Clicking button...")

    original_pages = ctx.pages[:]
    download_path = DOWNLOAD_DIR / f"{source_name}_test.pdf"

    try:
        # Use Promise.race style: listen for popup AND download
        result = await asyncio.wait_for(
            _click_and_handle(page, ctx, btn, download_path, original_pages),
            timeout=120
        )
        if result:
            return True
    except asyncio.TimeoutError:
        console.print("  [red]Timed out[/red]")
    except Exception as e:
        console.print(f"  [red]Error: {repr(e)[:80]}[/red]")

    return False


async def _click_and_handle(page, ctx, btn, save_path, original_pages):
    """Click button, handle download / new tab / in-page PDF navigation."""

    # Listen for response on current page (handles IEEE stamp.jsp navigation)
    pdf_response_data = {}
    async def handle_response(response):
        ct = response.headers.get('content-type', '')
        url = response.url
        if 'pdf' in ct or 'octet-stream' in ct or '/stamp/' in url:
            pdf_response_data['url'] = url
            pdf_response_data['ct'] = ct
            pdf_response_data['status'] = response.status
            try:
                pdf_response_data['body'] = await response.body()
            except Exception:
                pass

    page.on('response', handle_response)

    try:
        # Try direct download first
        try:
            async with page.expect_download(timeout=30000) as dl_info:
                await btn.click()
            download = await dl_info.value
            await download.save_as(save_path)
            if save_path.exists() and save_path.stat().st_size > 1000:
                kb = save_path.stat().st_size // 1024
                console.print(f"  [bold green]DOWNLOAD OK: {save_path.name} ({kb}KB)[/bold green]")
                return True
        except Exception:
            pass

        # Click already happened above and failed expect_download.
        # Check if page navigated to PDF or if a new tab opened.
        await asyncio.sleep(3)

        # Check if we captured a PDF response
        if pdf_response_data.get('body'):
            body = pdf_response_data['body']
            if len(body) > 1000:
                with open(save_path, 'wb') as f:
                    f.write(body)
                kb = len(body) // 1024
                console.print(f"  [bold green]PDF from response: {save_path.name} ({kb}KB)[/bold green]")
                return True

        # Check current page URL - maybe we navigated to a PDF
        cur_url = page.url
        console.print(f"  After click, page URL: {cur_url[:80]}...")

        # Check for new tabs
        current_pages = ctx.pages
        new_pages = [p for p in current_pages if p not in original_pages]
        if new_pages:
            console.print(f"  New tab opened ({len(new_pages)})")
            new_page = new_pages[0]
            try:
                await new_page.wait_for_load_state('load', timeout=15000)
            except Exception:
                pass

            new_url = new_page.url
            console.print(f"  New tab URL: {new_url[:80]}...")

            # Listen for PDF responses in new tab too
            new_tab_pdf = {}
            async def handle_new_response(resp):
                ct = resp.headers.get('content-type', '')
                if 'pdf' in ct or 'octet-stream' in ct:
                    try:
                        new_tab_pdf['body'] = await resp.body()
                        new_tab_pdf['ct'] = ct
                    except Exception:
                        pass

            new_page.on('response', handle_new_response)

            # Look for download button in the new tab
            await asyncio.sleep(2)
            for sel in ['a[download]', 'button:has-text("Download")', 'a:has-text("Download")']:
                try:
                    dl_btn = await new_page.query_selector(sel)
                    if dl_btn and await dl_btn.is_visible():
                        console.print(f"  Download btn in new tab: {sel}")
                        async with new_page.expect_download(timeout=30000) as dl_info:
                            await dl_btn.click()
                        download = await dl_info.value
                        await download.save_as(save_path)
                        if save_path.exists() and save_path.stat().st_size > 1000:
                            kb = save_path.stat().st_size // 1024
                            console.print(f"  [bold green]DOWNLOAD from tab: {save_path.name} ({kb}KB)[/bold green]")
                            return True
                except Exception:
                    pass

            # Check if new tab captured a PDF response
            if new_tab_pdf.get('body') and len(new_tab_pdf['body']) > 1000:
                with open(save_path, 'wb') as f:
                    f.write(new_tab_pdf['body'])
                kb = len(new_tab_pdf['body']) // 1024
                console.print(f"  [bold green]PDF from new tab response: {save_path.name} ({kb}KB)[/bold green]")
                return True

            # Check iframes in new tab
            for frame in new_page.frames:
                furl = frame.url
                if 'pdf' in furl.lower():
                    console.print(f"  PDF iframe: {furl[:60]}...")
                    try:
                        resp = await new_page.goto(furl, wait_until='load', timeout=15000)
                        if resp:
                            body = await resp.body()
                            if len(body) > 1000:
                                with open(save_path, 'wb') as f:
                                    f.write(body)
                                kb = len(body) // 1024
                                console.print(f"  [bold green]PDF from iframe: {save_path.name} ({kb}KB)[/bold green]")
                                return True
                    except Exception as e:
                        console.print(f"  iframe save failed: {repr(e)[:50]}")

            try:
                await new_page.close()
            except Exception:
                pass

        # If current page is now a PDF viewer (IEEE stamp.jsp)
        if '/stamp/' in cur_url or cur_url.endswith('.pdf'):
            console.print("  Page is now a PDF viewer, trying to save...")
            # Re-navigate to get the response body
            try:
                resp = await page.goto(cur_url, wait_until='load', timeout=30000)
                if resp:
                    body = await resp.body()
                    ct = resp.headers.get('content-type', '')
                    console.print(f"  Response: status={resp.status} ct={ct[:40]} len={len(body)}")
                    if len(body) > 1000:
                        with open(save_path, 'wb') as f:
                            f.write(body)
                        kb = len(body) // 1024
                        console.print(f"  [bold green]PDF saved: {save_path.name} ({kb}KB)[/bold green]")
                        return True
            except Exception as e:
                console.print(f"  Save failed: {repr(e)[:50]}")

        return False
    finally:
        page.remove_listener('response', handle_response)


async def main():
    config = load_config()

    console.print("[bold]Launching browser...[/bold]")
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(
        headless=False,
        args=['--disable-blink-features=AutomationControlled'],
    )
    ctx = await browser.new_context(
        accept_downloads=True,
        viewport={"width": 1600, "height": 900},
        locale='en-US',
        timezone_id='Asia/Jakarta',
    )
    await ctx.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    """)
    page = await ctx.new_page()

    ezproxy_url = config['ezproxy']['url']
    console.print(f"[bold]Opening ezproxy: {ezproxy_url}[/bold]")
    try:
        await page.goto(ezproxy_url, wait_until='load', timeout=60000)
    except Exception as e:
        console.print(f"Login page load issue: {repr(e)[:60]}")

    console.print("\n[bold yellow]Login to ezproxy in the browser, then tell me 'continue'[/bold yellow]")
    await wait_for_continue(300)

    results = {}
    for source, info in TEST_PAPERS.items():
        success = await test_source(ctx, page, source, info)
        results[source] = "PASS" if success else "FAIL"
        await asyncio.sleep(2)

    console.rule("RESULTS")
    for source, result in results.items():
        color = "green" if result == "PASS" else "red"
        console.print(f"  [{color}]{source.upper()}: {result}[/{color}]")

    console.print(f"\n  Files: {DOWNLOAD_DIR}")
    console.print("  Ctrl+C to close browser.")
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        pass
    await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
