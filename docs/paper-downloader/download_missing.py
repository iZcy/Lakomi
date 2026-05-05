"""
Download PDFs for papers that already have URLs (no Google search needed).
Reads from library.db (papers without pdf_path) and daftar-pustaka.bib
(entries with URLs but no local PDF).
"""
import asyncio
import json
import re
import time
from pathlib import Path
from playwright.async_api import async_playwright
from rich.console import Console

from config import load_config, to_ezproxy_url
from database import Library

console = Console()
DOWNLOAD_DIR = Path(__file__).parent / "downloads"
COMMAND_FILE = "/tmp/paper-downloader-command.json"


async def wait_for_captcha(page, timeout=300):
    for sel in ['iframe[src*="captcha"]', 'iframe[src*="recaptcha"]',
                'iframe[title*="captcha" i]', '.captcha', '#captcha',
                'div.g-recaptcha']:
        try:
            elem = await page.query_selector(sel)
            if elem and await elem.is_visible():
                console.print("[bold yellow]CAPTCHA! Solve in browser.[/bold yellow]")
                start = time.time()
                while time.time() - start < timeout:
                    try:
                        with open(COMMAND_FILE, 'r') as f:
                            data = json.load(f)
                        if data.get("command") == "continue":
                            with open(COMMAND_FILE, 'w') as f:
                                json.dump({"command": None}, f)
                            console.print("[green]Resuming...[/green]")
                            return True
                    except Exception:
                        pass
                    await asyncio.sleep(2)
        except Exception:
            pass

    body = await page.evaluate("document.body?.innerText?.toLowerCase() || ''")
    for kw in ['verify you are human', 'unusual traffic', 'automated access',
               'before you continue', 'checking your browser', 'one more step']:
        if kw in body:
            console.print(f"[bold yellow]Challenge: '{kw}'. Solve in browser.[/bold yellow]")
            start = time.time()
            while time.time() - start < timeout:
                try:
                    with open(COMMAND_FILE, 'r') as f:
                        data = json.load(f)
                    if data.get("command") == "continue":
                        with open(COMMAND_FILE, 'w') as f:
                            json.dump({"command": None}, f)
                        console.print("[green]Resuming...[/green]")
                        return True
                except Exception:
                    pass
                await asyncio.sleep(2)
    return False


async def download_pdf_from_page(page, url, output_path, config):
    console.print(f"  Navigating: {url[:80]}...")
    try:
        await page.goto(url, wait_until='domcontentloaded', timeout=60000)
    except Exception as e:
        console.print(f"  [yellow]Nav timeout, trying anyway: {repr(e)[:50]}[/yellow]")

    await asyncio.sleep(3)
    await wait_for_captcha(page)

    current_url = page.url
    domain_hint = ''
    for d in ['ieeexplore', 'springer', 'sciencedirect', 'wiley', 'emerald',
              'tandfonline', 'sagepub', 'cambridge', 'oup.com', 'jstor']:
        if d in current_url:
            domain_hint = d
            break

    # Strategy 1: Find and click download/PDF button
    pdf_btn_texts = ['PDF', 'Download PDF', 'View PDF', 'Full Text PDF',
                     'Download', 'Save PDF', 'Full Text', 'Get PDF']
    for text in pdf_btn_texts:
        try:
            btn = page.get_by_role('link', name=text)
            if await btn.count() > 0:
                href = await btn.first.get_attribute('href') or ''
                if href and not href.startswith('javascript'):
                    # IEEE stamp.jsp needs special handling - extract iframe
                    if 'stamp.jsp' in href:
                        console.print(f"  Found IEEE stamp button, navigating...")
                        try:
                            if href.startswith('/'):
                                from urllib.parse import urlparse
                                parsed = urlparse(current_url)
                                href = f"{parsed.scheme}://{parsed.netloc}{href}"
                            await page.goto(href, wait_until='domcontentloaded', timeout=30000)
                            await asyncio.sleep(4)
                            iframe = await page.query_selector('iframe[src*="stampPDF"], iframe[src*="pdf"]')
                            if iframe:
                                iframe_src = await iframe.get_attribute('src')
                                if iframe_src:
                                    console.print(f"  Stamp iframe: {iframe_src[:60]}...")
                                    return await _fetch_pdf(page, iframe_src, output_path, current_url)
                        except Exception as e:
                            console.print(f"  [dim]Stamp nav failed: {repr(e)[:50]}[/dim]")
                        # If iframe not found, try fetch from page context
                        doc_id = re.search(r'arnumber=(\d+)', href)
                        if doc_id:
                            stamp_pdf = f"https://ieeexplore-ieee-org.ezproxy.ugm.ac.id/stampPDF/getPDF.jsp?tp=&arnumber={doc_id.group(1)}"
                            console.print(f"  Trying stampPDF fetch...")
                            return await _fetch_pdf(page, stamp_pdf, output_path, current_url)
                        continue

                    console.print(f"  Found button '{text}': {href[:60]}...")
                    return await _fetch_pdf(page, href, output_path, current_url)
        except Exception:
            pass

    # Strategy 2: Try meta citation_pdf_url
    try:
        meta = await page.query_selector('meta[name="citation_pdf_url"]')
        if meta:
            pdf_url = await meta.get_attribute('content')
            if pdf_url:
                console.print(f"  Found citation_pdf_url: {pdf_url[:60]}...")
                return await _fetch_pdf(page, pdf_url, output_path, current_url)
    except Exception:
        pass

    # Strategy 2.5: Direct PDF URLs (arxiv, bitcoin, etc.)
    if '/abs/' in url and 'arxiv' in url:
        pdf_url = url.replace('/abs/', '/pdf/')
        console.print(f"  Trying arxiv PDF: {pdf_url[:60]}...")
        return await _fetch_pdf(page, pdf_url, output_path, current_url)

    if url.endswith('.pdf'):
        console.print(f"  Direct PDF URL, fetching...")
        return await _fetch_pdf(page, url, output_path, current_url)

    # Strategy 3: Try known URL patterns
    if 'springer' in current_url:
        try:
            api_url = current_url.rstrip('/') + '/pdf'
            return await _fetch_pdf(page, api_url, output_path, current_url)
        except Exception:
            pass

    if 'ieeexplore' in current_url:
        doc_id = re.search(r'/document/(\d+)', current_url)
        if not doc_id:
            doc_id = re.search(r'arnumber=(\d+)', current_url)
        if doc_id:
            # Try the ieeexplore PDF API endpoint
            pdf_api = f"https://ieeexplore-ieee-org.ezproxy.ugm.ac.id/rest/pdf/{doc_id.group(1)}/download"
            console.print(f"  Trying IEEE PDF API: {pdf_api[:60]}...")
            ok = await _fetch_pdf(page, pdf_api, output_path, current_url)
            if ok:
                return True

            # Try navigating to stamp page and extracting iframe src
            stamp_url = f"https://ieeexplore-ieee-org.ezproxy.ugm.ac.id/stamp/stamp.jsp?tp=&arnumber={doc_id.group(1)}"
            console.print(f"  Trying IEEE stamp page: {stamp_url[:60]}...")
            try:
                await page.goto(stamp_url, wait_until='domcontentloaded', timeout=30000)
                await asyncio.sleep(3)
                # Look for iframe with PDF
                iframe = await page.query_selector('iframe[src*="stampPDF"]')
                if not iframe:
                    iframe = await page.query_selector('iframe[src*="pdf"]')
                if iframe:
                    iframe_src = await iframe.get_attribute('src')
                    if iframe_src:
                        console.print(f"  Found iframe: {iframe_src[:60]}...")
                        return await _fetch_pdf(page, iframe_src, output_path, current_url)
                # Try direct stampPDF URL
                stamp_pdf = f"https://ieeexplore-ieee-org.ezproxy.ugm.ac.id/stampPDF/getPDF.jsp?tp=&arnumber={doc_id.group(1)}"
                return await _fetch_pdf(page, stamp_pdf, output_path, current_url)
            except Exception as e:
                console.print(f"  [dim]Stamp page failed: {repr(e)[:50]}[/dim]")

    if 'sciencedirect' in current_url:
        pii = re.search(r'/pii/(\w+)', current_url)
        if pii:
            pdf_url = f"https://www-sciencedirect-com.ezproxy.ugm.ac.id/science/article/pii/{pii.group(1)}/pdfft"
            console.print(f"  Trying SD pdfft: {pdf_url[:60]}...")
            return await _fetch_pdf(page, pdf_url, output_path, current_url)

    if 'jstor' in current_url:
        stable_id = re.search(r'/stable/(\d+)', current_url)
        if stable_id:
            pdf_url = f"https://www-jstor-org.ezproxy.ugm.ac.id/stable/pdf/{stable_id.group(1)}.pdf"
            console.print(f"  Trying JSTOR PDF: {pdf_url[:60]}...")
            return await _fetch_pdf(page, pdf_url, output_path, current_url)

    if 'cambridge' in current_url:
        article_id = re.search(r'/article/([^/]+)', current_url)
        if article_id:
            aid = article_id.group(1)
            pdf_url = f"https://www-cambridge-org.ezproxy.ugm.ac.id/core/services/aop-cambridge-core/content/view/{aid}"
            console.print(f"  Trying Cambridge: {pdf_url[:60]}...")
            return await _fetch_pdf(page, pdf_url, output_path, current_url)

    if 'oup.com' in current_url:
        try:
            pdf_url = re.sub(r'/article(/|$)', r'/article-pdf\1', current_url)
            if pdf_url != current_url:
                return await _fetch_pdf(page, pdf_url, output_path, current_url)
            pdf_url = current_url.rstrip('/') + '/article-pdf'
            return await _fetch_pdf(page, pdf_url, output_path, current_url)
        except Exception:
            pass

    # Strategy 4: page.pdf() as last resort
    console.print("  [dim]Falling back to page.pdf()...[/dim]")
    try:
        await page.pdf(path=str(output_path))
        size = output_path.stat().st_size
        if size > 10000:
            console.print(f"  [green]page.pdf(): {size//1024}KB[/green]")
            return True
    except Exception:
        pass

    console.print("  [red]No PDF found[/red]")
    return False


async def _fetch_pdf(page, href, output_path, page_url):
    if href.startswith('/'):
        from urllib.parse import urlparse
        parsed = urlparse(page_url)
        href = f"{parsed.scheme}://{parsed.netloc}{href}"

    # Try request.get first (captures actual PDF bytes)
    try:
        resp = await page.context.request.get(href, timeout=45000)
        if resp.ok:
            content_type = resp.headers.get('content-type', '')
            body = await resp.body()
            if len(body) > 5000 and ('pdf' in content_type or body[:5] == b'%PDF-'):
                output_path.write_bytes(body)
                console.print(f"  [green]request.get: {len(body)//1024}KB[/green]")
                return True
            elif 'html' in content_type or body[:5] != b'%PDF-':
                console.print(f"  [dim]request.get got HTML ({len(body)} bytes), not PDF[/dim]")
            else:
                console.print(f"  [dim]request.get: too small ({len(body)} bytes)[/dim]")
    except Exception as e:
        console.print(f"  [dim]request.get failed: {repr(e)[:50]}[/dim]")

    # Try fetch from page context
    try:
        result = await page.evaluate("""async (url) => {
            try {
                const r = await fetch(url, {credentials: 'include'});
                const b = await r.arrayBuffer();
                const u = new Uint8Array(b);
                const isPdf = u[0]===0x25 && u[1]===0x50 && u[2]===0x44 && u[3]===0x46;
                if (isPdf && u.length > 5000) {
                    const chunks = [];
                    for (let i = 0; i < u.length; i += 8192) chunks.push(String.fromCharCode(...u.slice(i, i+8192)));
                    return btoa(chunks.join(''));
                }
            } catch(e) {}
            return null;
        }""", href)
        if result:
            import base64
            pdf_bytes = base64.b64decode(result)
            output_path.write_bytes(pdf_bytes)
            console.print(f"  [green]fetch(): {len(pdf_bytes)//1024}KB[/green]")
            return True
    except Exception as e:
        console.print(f"  [dim]fetch failed: {repr(e)[:50]}[/dim]")

    return False


async def main():
    config = load_config('config.yaml')
    lib = Library(config['paths']['database'])

    # Collect papers needing PDFs from DB
    db_papers = lib.list_papers()
    todo = [p for p in db_papers if not p.get('pdf_path') and p.get('url')]
    # Filter out garbage
    todo = [p for p in todo if p.get('title', '').lower() not in ('404 not found', 'search results')]

    # Also collect BibTeX entries with URLs but no DB record
    bib = Path(config['paths']['bibtex']).read_text()
    db_titles = {re.sub(r'\s+', '', p.get('title', '').lower()) for p in db_papers}
    bib_entries = []
    for m in re.finditer(r'@(\w+)\{([^,]+),([^@]+)', bib, re.DOTALL):
        entry_type, key, body = m.groups()
        title_m = re.search(r'title\s*=\s*\{([^}]+)\}', body)
        url_m = re.search(r'url\s*=\s*\{([^}]+)\}', body)
        year_m = re.search(r'year\s*=\s*\{([^}]+)\}', body)
        if title_m and url_m:
            title = title_m.group(1)
            norm = re.sub(r'\s+', '', title.lower())
            if norm not in db_titles:
                bib_entries.append({
                    'title': title,
                    'url': url_m.group(1),
                    'year': int(year_m.group(1)) if year_m else None,
                    'key': key,
                })

    console.print(f"\n[bold]Papers needing PDFs:[/bold]")
    console.print(f"  From DB (no pdf_path): {len(todo)}")
    console.print(f"  From BibTeX (not in DB): {len(bib_entries)}")
    console.print(f"  Total: {len(todo) + len(bib_entries)}\n")

    # Launch browser
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(
        headless=config['download'].get('headless', False),
        args=['--ignore-certificate-errors'],
    )
    import random
    ctx = await browser.new_context(
        accept_downloads=True,
        ignore_https_errors=True,
        viewport={'width': 1600, 'height': 900},
        user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    )
    page = await ctx.new_page()

    # Auto-login to ezproxy
    console.print("[dim]Auto-logging in to ezproxy...[/dim]")
    try:
        await page.goto(config['ezproxy']['url'], wait_until='load', timeout=30000)
        user = config['ezproxy'].get('username', '')
        pw_ = config['ezproxy'].get('password', '')
        if user and pw_:
            await page.locator('input[name="user"], input[type="text"]').first.fill(user)
            await page.locator('input[name="pass"], input[type="password"]').first.fill(pw_)
            await page.locator('button[type="submit"], input[type="submit"]').first.click()
            await asyncio.sleep(5)
            console.print("[green]Login done[/green]")
    except Exception as e:
        console.print(f"[yellow]Login issue: {e}[/yellow]")

    results = {'success': 0, 'failed': 0, 'skipped': 0}

    # Process DB papers
    for i, paper in enumerate(todo):
        url = paper['url']
        title = paper.get('title', '')[:50]
        db = paper.get('database', '')
        console.print(f"\n[bold cyan][{i+1}/{len(todo)}][/{'bold cyan'}] [{db}] {title}...")

        topic = paper.get('topic', 'uncategorized')
        topic_dir = DOWNLOAD_DIR / topic
        topic_dir.mkdir(parents=True, exist_ok=True)

        safe_title = re.sub(r'[^\w\s-]', '', title)[:60].strip().replace(' ', '_')
        pdf_path = topic_dir / f"{safe_title}.pdf"

        if pdf_path.exists() and pdf_path.stat().st_size > 10000:
            console.print(f"  [dim]PDF exists: {pdf_path.name} ({pdf_path.stat().st_size//1024}KB)[/dim]")
            lib.update_paper_pdf(paper.get('title', ''), pdf_path=str(pdf_path))
            results['success'] += 1
            continue

        ok = await download_pdf_from_page(page, url, pdf_path, config)
        if ok:
            lib.update_paper_pdf(paper.get('title', ''), pdf_path=str(pdf_path))
            results['success'] += 1
        else:
            results['failed'] += 1

        await asyncio.sleep(random.uniform(5, 10))

    # Process BibTeX-only entries
    for i, entry in enumerate(bib_entries):
        url = entry['url']
        title = entry['title'][:50]
        key = entry['key']
        console.print(f"\n[bold cyan][BibTeX {i+1}/{len(bib_entries)}][/bold cyan] {title}...")

        topic_dir = DOWNLOAD_DIR / 'uncategorized'
        topic_dir.mkdir(parents=True, exist_ok=True)

        safe_title = re.sub(r'[^\w\s-]', '', title)[:60].strip().replace(' ', '_')
        pdf_path = topic_dir / f"{safe_title}.pdf"

        if pdf_path.exists() and pdf_path.stat().st_size > 10000:
            console.print(f"  [dim]PDF exists: {pdf_path.name}[/dim]")
            results['success'] += 1
            continue

        # Ensure URL is ezproxy-ified
        if 'ezproxy.ugm.ac.id' not in url:
            url = to_ezproxy_url(url)

        ok = await download_pdf_from_page(page, url, pdf_path, config)
        if ok:
            results['success'] += 1
        else:
            results['failed'] += 1

        await asyncio.sleep(random.uniform(5, 10))

    console.print(f"\n[bold]Done! Success: {results['success']}, Failed: {results['failed']}, Skipped: {results['skipped']}[/bold]")
    await pw.stop()


if __name__ == '__main__':
    asyncio.run(main())
