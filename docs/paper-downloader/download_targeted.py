"""
Targeted download of 12 specific missing PDFs.
Navigates directly to known URLs - no Google search.
"""
import asyncio
import json
import re
import time
from pathlib import Path
from playwright.async_api import async_playwright
from rich.console import Console
from config import load_config, to_ezproxy_url

console = Console()
DOWNLOAD_DIR = Path(__file__).parent / "downloads" / "uncategorized"
COMMAND_FILE = "/tmp/paper-downloader-command.json"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

TARGETS = [
    {"key": "alsamhi2025", "title": "Blockchain-Driven Decentralization for Data Sharing in the Metaverse",
     "url": "https://ieeexplore.ieee.org/document/10989309", "db": "ieee"},
    {"key": "na2018", "title": "Web-based Nominal Group Technique Decision Making Tool Using Blockchain",
     "url": "https://ieeexplore.ieee.org/document/8472769", "db": "ieee"},
    {"key": "liu2024", "title": "The Economics of Blockchain Governance Evaluate Liquid Democracy",
     "url": "https://arxiv.org/abs/2404.13768", "db": "arxiv"},
    {"key": "saurabh2024", "title": "Towards novel blockchain DAO led corporate governance",
     "url": "https://www.sciencedirect.com/science/article/abs/pii/S0040162524002130", "db": "sd"},
    {"key": "mannan2026", "title": "Corporate Platforms to Cooperative DAOs",
     "url": "https://www.sciencedirect.com/science/article/pii/S2213297X26000054", "db": "sd"},
    {"key": "santana2022", "title": "Blockchain and the emergence of DAOs",
     "url": "https://www.sciencedirect.com/science/article/pii/S0040162522003304", "db": "sd"},
    {"key": "tan2022", "title": "Blockchain governance in the public sector",
     "url": "https://www.sciencedirect.com/science/article/pii/S0740624X21000617", "db": "sd"},
    {"key": "jungnickel2025", "title": "DAO Governance Voting Power Participation and Controversy",
     "url": "https://dl.acm.org/doi/10.1145/3777416", "db": "acm"},
    {"key": "faqir2020", "title": "An overview of decentralized autonomous organizations on the blockchain",
     "url": "https://dl.acm.org/doi/10.1145/3412569.3412579", "db": "acm"},
    {"key": "sharma2026", "title": "Future of Algorithmic Organization Large Scale Analysis of DAOs",
     "url": "https://dl.acm.org/doi/10.1145/3796547", "db": "acm"},
    {"key": "esposito2025", "title": "Decentralizing governance exploring the dynamics and challenges of digital commons and DAOs",
     "url": "https://www.frontiersin.org/journals/blockchain/articles/10.3389/fbloc.2025.1538227/full", "db": "frontiers"},
    {"key": "nakamoto2008bitcoin", "title": "Bitcoin A Peer-to-Peer Electronic Cash System",
     "url": "https://bitcoin.org/bitcoin.pdf", "db": "direct"},
]


async def wait_captcha(page, timeout=300):
    for sel in ['iframe[src*="captcha"]', 'iframe[src*="recaptcha"]',
                'iframe[title*="captcha" i]']:
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
                            return True
                    except Exception:
                        pass
                    await asyncio.sleep(2)
        except Exception:
            pass
    body = await page.evaluate("document.body?.innerText?.toLowerCase() || ''")
    for kw in ['verify you are human', 'unusual traffic', 'automated access', 'before you continue']:
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
                        return True
                except Exception:
                    pass
                await asyncio.sleep(2)
    return False


async def fetch_pdf(page, href, output_path, page_url):
    if href.startswith('/'):
        from urllib.parse import urlparse
        parsed = urlparse(page_url)
        href = f"{parsed.scheme}://{parsed.netloc}{href}"

    try:
        resp = await page.context.request.get(href, timeout=60000)
        if resp.ok:
            ct = resp.headers.get('content-type', '')
            body = await resp.body()
            if len(body) > 5000 and ('pdf' in ct or body[:5] == b'%PDF-'):
                output_path.write_bytes(body)
                console.print(f"  [green]request.get: {len(body)//1024}KB[/green]")
                return True
    except Exception as e:
        console.print(f"  [dim]request.get: {repr(e)[:50]}[/dim]")

    try:
        result = await page.evaluate("""async (url) => {
            try {
                const r = await fetch(url, {credentials: 'include'});
                const b = await r.arrayBuffer();
                const u = new Uint8Array(b);
                if (u[0]===0x25 && u[1]===0x50 && u[2]===0x44 && u[3]===0x46 && u.length > 5000) {
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
        console.print(f"  [dim]fetch: {repr(e)[:50]}[/dim]")
    return False


async def download_one(page, target, config):
    key = target['key']
    title = target['title'][:50]
    db = target['db']
    url = target['url']

    safe = re.sub(r'[^\w\s-]', '', title)[:60].strip().replace(' ', '_')
    pdf_path = DOWNLOAD_DIR / f"{safe}.pdf"

    if pdf_path.exists() and pdf_path.stat().st_size > 10000:
        console.print(f"  [dim]Already have: {pdf_path.name}[/dim]")
        return True

    # Ezproxy the URL (except direct PDFs and arxiv)
    if db not in ('direct', 'arxiv'):
        url = to_ezproxy_url(url)

    console.print(f"\n[bold cyan][{key}][/bold cyan] [{db}] {title}...")
    console.print(f"  URL: {url[:80]}")

    # Special: arxiv -> replace /abs/ with /pdf/
    if db == 'arxiv':
        pdf_url = url.replace('/abs/', '/pdf/')
        console.print(f"  Direct arxiv PDF: {pdf_url[:60]}")
        return await fetch_pdf(page, pdf_url, pdf_path, pdf_url)

    # Special: bitcoin direct PDF
    if db == 'direct':
        console.print(f"  Direct PDF download...")
        # bitcoin.org might not be ezproxied, try direct
        try:
            resp = await page.context.request.get(url, timeout=30000)
            if resp.ok:
                body = await resp.body()
                if len(body) > 5000:
                    output_path = DOWNLOAD_DIR / "Bitcoin_A_Peer_to_Peer_Electronic_Cash_System.pdf"
                    output_path.write_bytes(body)
                    console.print(f"  [green]Direct: {len(body)//1024}KB[/green]")
                    return True
        except Exception as e:
            console.print(f"  [dim]Direct failed: {repr(e)[:50]}[/dim]")
        return False

    # Navigate to page
    try:
        await page.goto(url, wait_until='domcontentloaded', timeout=60000)
    except Exception as e:
        console.print(f"  [yellow]Nav timeout: {repr(e)[:50]}[/yellow]")

    await asyncio.sleep(3)
    await wait_captcha(page)
    current_url = page.url

    # Try citation_pdf_url meta
    try:
        meta = await page.query_selector('meta[name="citation_pdf_url"]')
        if meta:
            pdf_url = await meta.get_attribute('content')
            if pdf_url:
                if pdf_url.startswith('/'):
                    from urllib.parse import urlparse
                    p = urlparse(current_url)
                    pdf_url = f"{p.scheme}://{p.netloc}{pdf_url}"
                console.print(f"  citation_pdf_url: {pdf_url[:60]}")
                ok = await fetch_pdf(page, pdf_url, pdf_path, current_url)
                if ok:
                    return True
    except Exception:
        pass

    # Try PDF button
    for text in ['PDF', 'Download PDF', 'View PDF', 'Full Text PDF', 'Download']:
        try:
            btn = page.get_by_role('link', name=text)
            if await btn.count() > 0:
                href = await btn.first.get_attribute('href') or ''
                if href and not href.startswith('javascript'):
                    if 'stamp.jsp' in href:
                        # IEEE stamp
                        if href.startswith('/'):
                            from urllib.parse import urlparse
                            p = urlparse(current_url)
                            href = f"{p.scheme}://{p.netloc}{href}"
                        try:
                            await page.goto(href, wait_until='domcontentloaded', timeout=30000)
                            await asyncio.sleep(4)
                            iframe = await page.query_selector('iframe[src*="stampPDF"], iframe[src*="pdf"]')
                            if iframe:
                                src = await iframe.get_attribute('src')
                                if src:
                                    ok = await fetch_pdf(page, src, pdf_path, current_url)
                                    if ok: return True
                        except Exception:
                            pass
                        doc_id = re.search(r'arnumber=(\d+)', href)
                        if doc_id:
                            stamp = f"https://ieeexplore-ieee-org.ezproxy.ugm.ac.id/stampPDF/getPDF.jsp?tp=&arnumber={doc_id.group(1)}"
                            ok = await fetch_pdf(page, stamp, pdf_path, current_url)
                            if ok: return True
                        continue
                    console.print(f"  Button '{text}': {href[:60]}")
                    ok = await fetch_pdf(page, href, pdf_path, current_url)
                    if ok: return True
        except Exception:
            pass

    # DB-specific fallbacks
    if 'sciencedirect' in current_url or 'sciencedirect' in url:
        pii = re.search(r'/pii/(\w+)', current_url)
        if pii:
            pdf_url = f"https://www-sciencedirect-com.ezproxy.ugm.ac.id/science/article/pii/{pii.group(1)}/pdfft"
            console.print(f"  SD pdfft: {pdf_url[:60]}")
            ok = await fetch_pdf(page, pdf_url, pdf_path, current_url)
            if ok: return True

    if 'dl.acm' in current_url:
        doi = re.search(r'/doi/(10\.\d+/[^?]+)', current_url)
        if doi:
            pdf_url = f"https://dl-acm-org.ezproxy.ugm.ac.id/doi/pdf/{doi.group(1)}"
            console.print(f"  ACM PDF: {pdf_url[:60]}")
            ok = await fetch_pdf(page, pdf_url, pdf_path, current_url)
            if ok: return True

    if 'frontiersin' in current_url:
        pdf_url = current_url.rstrip('/') + '/pdf'
        console.print(f"  Frontiers PDF: {pdf_url[:60]}")
        ok = await fetch_pdf(page, pdf_url, pdf_path, current_url)
        if ok: return True

    # Last resort: page.pdf()
    try:
        await page.pdf(path=str(pdf_path))
        if pdf_path.exists() and pdf_path.stat().st_size > 10000:
            console.print(f"  [yellow]page.pdf(): {pdf_path.stat().st_size//1024}KB[/yellow]")
            return True
    except Exception:
        pass

    console.print(f"  [red]Failed[/red]")
    return False


async def main():
    config = load_config('config.yaml')
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(
        headless=False, args=['--ignore-certificate-errors'])
    ctx = await browser.new_context(
        accept_downloads=True, ignore_https_errors=True,
        viewport={'width': 1600, 'height': 900},
        user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36")
    page = await ctx.new_page()

    # Auto-login
    console.print("[dim]Auto-login ezproxy...[/dim]")
    try:
        await page.goto(config['ezproxy']['url'], wait_until='load', timeout=30000)
        await page.locator('input[name="user"], input[type="text"]').first.fill(config['ezproxy'].get('username', ''))
        await page.locator('input[name="pass"], input[type="password"]').first.fill(config['ezproxy'].get('password', ''))
        await page.locator('button[type="submit"], input[type="submit"]').first.click()
        await asyncio.sleep(5)
        console.print("[green]Logged in[/green]")
    except Exception as e:
        console.print(f"[yellow]Login: {e}[/yellow]")

    ok = 0
    fail = 0
    for t in TARGETS:
        if await download_one(page, t, config):
            ok += 1
        else:
            fail += 1
        await asyncio.sleep(5)

    console.print(f"\n[bold]Done! {ok} downloaded, {fail} failed[/bold]")
    await pw.stop()


if __name__ == '__main__':
    asyncio.run(main())
