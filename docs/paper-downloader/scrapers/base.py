"""
Base scraper class for academic databases.
"""

import asyncio
import random
import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Optional

from playwright.async_api import Page
from rich.console import Console

from config import to_ezproxy_url
from models import Paper


class BaseScraper(ABC):
    """Abstract base class for database scrapers."""

    def __init__(self, page: Page, config: dict, use_ezproxy: bool = True, console: Console = None):
        self.page = page
        self.config = config
        self.name = "base"
        self.use_ezproxy = use_ezproxy
        self.console = console or Console()

    def proxy_url(self, url: str) -> str:
        """Transform URL to ezproxy format if proxy is enabled."""
        if self.use_ezproxy:
            return to_ezproxy_url(url)
        return url

    async def random_delay(self):
        """Add random delay between requests (simulates reading time)."""
        delay_min = self.config['download']['delay_min']
        delay_max = self.config['download']['delay_max']
        await asyncio.sleep(random.uniform(delay_min, delay_max))

    async def page_delay(self):
        """Add random delay between page navigations (simulates page load + reading)."""
        page_min = self.config['download'].get('delay_page_min', 8)
        page_max = self.config['download'].get('delay_page_max', 15)
        await asyncio.sleep(random.uniform(page_min, page_max))

    async def human_scroll(self):
        """Simulate human-like scrolling behavior."""
        # Get page height
        page_height = await self.page.evaluate("document.body.scrollHeight")
        viewport_height = await self.page.evaluate("window.innerHeight")

        if page_height <= viewport_height:
            # Page is short, just do a small scroll and back
            scroll_amount = random.randint(100, 300)
            await self._smooth_scroll(scroll_amount)
            await asyncio.sleep(random.uniform(0.5, 1.5))
            await self._smooth_scroll(-scroll_amount)
            return

        # Decide how far to scroll (30-80% of page)
        target_position = int(page_height * random.uniform(0.3, 0.8))

        # Scroll in small increments like a human
        current_position = 0
        while current_position < target_position:
            step = random.randint(100, 350)
            current_position += step
            if current_position > target_position:
                current_position = target_position
            await self._smooth_scroll(current_position)
            # Variable pause between scroll steps
            await asyncio.sleep(random.uniform(0.3, 1.2))

        # Sometimes scroll back up a bit (human indecision)
        if random.random() > 0.4:
            back_amount = random.randint(100, 400)
            new_position = max(0, current_position - back_amount)
            await self._smooth_scroll(new_position)
            await asyncio.sleep(random.uniform(0.5, 2.0))

    async def _smooth_scroll(self, target_y: int):
        """Scroll to a Y position smoothly."""
        await self.page.evaluate(f"window.scrollTo({{top: {target_y}, behavior: 'smooth'}})")
        await asyncio.sleep(random.uniform(0.2, 0.5))

    async def human_type(self, selector: str, text: str):
        """Simulate human-like typing with variable speed and occasional pauses."""
        element = await self.page.wait_for_selector(selector, timeout=10000)
        if not element:
            return

        await element.click()
        await asyncio.sleep(random.uniform(0.3, 0.8))

        # Type character by character with variable delays
        for char in text:
            await element.type(char, delay=random.randint(50, 180))

            # Random micro-pauses (simulating thinking)
            if random.random() < 0.08:  # ~8% chance per character
                await asyncio.sleep(random.uniform(0.3, 1.0))

            # Slightly longer pause after spaces (word boundaries)
            if char == ' ':
                await asyncio.sleep(random.uniform(0.05, 0.15))

    async def random_mouse_movement(self):
        """Move the mouse to a random position on the page (natural idle behavior)."""
        viewport = await self.page.evaluate("({width: window.innerWidth, height: window.innerHeight})")
        x = random.randint(100, viewport['width'] - 100)
        y = random.randint(100, viewport['height'] - 100)
        steps = random.randint(3, 8)

        current_x, current_y = await self.page.evaluate(
            "(() => { const m = document.createEvent('MouseEvents'); return [window.innerWidth/2, window.innerHeight/2]; })()"
        )

        for i in range(steps):
            progress = (i + 1) / steps
            # Ease-in-out curve for natural movement
            ease = progress * progress * (3 - 2 * progress)
            target_x = current_x + (x - current_x) * ease
            target_y = current_y + (y - current_y) * ease
            await self.page.mouse.move(target_x, target_y)
            await asyncio.sleep(random.uniform(0.01, 0.05))

    async def wait_for_selector(self, selector: str, timeout: int = 15000) -> bool:
        """Wait for selector with error handling."""
        try:
            await self.page.wait_for_selector(selector, timeout=timeout)
            return True
        except:
            return False

    # ── Captcha detection & wait ──────────────────────────────────────────

    # Common captcha selectors across Google, IEEE, ScienceDirect, Springer
    CAPTCHA_SELECTORS = [
        'iframe[src*="recaptcha"]',
        'iframe[src*="captcha"]',
        'iframe[src*="arkose"]',
        'iframe[src*="hcaptcha"]',
        'iframe[title*="captcha" i]',
        'iframe[title*="challenge" i]',
        '#captcha',
        '.captcha-container',
        '[class*="captcha" i]',
        '#cf-challenge-running',
        '.cf-turnstile',
        'iframe[src*="challenges.cloudflare"]',
        '#px-captcha',
        '[class*="px-captcha"]',
        'iframe[src*="funcaptcha"]',
        '#challenge-running',
    ]

    async def check_and_wait_captcha(self, wait_seconds: int = 300):
        """Check if a captcha is visible, write flag file, and poll for continue."""
        for selector in self.CAPTCHA_SELECTORS:
            try:
                elem = await self.page.query_selector(selector)
                if elem:
                    is_visible = await elem.is_visible()
                    if is_visible:
                        self._write_status("captcha", f"CAPTCHA detected ({selector})")
                        self.console.print(
                            f"\n[bold yellow]⚠️  CAPTCHA detected! ({selector})[/bold yellow]\n"
                            f"  Solve it in the browser. Polling for continue signal..."
                        )
                        await self._poll_for_continue(wait_seconds)
                        self.console.print("[green]✓ Resuming...[/green]")
                        return True
            except Exception:
                pass

        # Also check page content for common captcha text clues
        try:
            body_text = await self.page.evaluate("document.body?.innerText?.toLowerCase() || ''")
            captcha_keywords = [
                'verify you are human',
                'prove you are not a robot',
                'are you a robot',
                'solve this puzzle',
                'please complete the security check',
                'automated access has been detected',
                'unusual traffic',
                'before you continue',
                'checking your browser',
                'one more step',
                'please wait',
                'cf-browser-verification',
            ]
            for keyword in captcha_keywords:
                if keyword in body_text:
                    self._write_status("captcha", f"Challenge detected (\"{keyword}\")")
                    self.console.print(
                        f"\n[bold yellow]⚠️  Security challenge! (\"{keyword}\")[/bold yellow]\n"
                        f"  Solve it in the browser. Polling for continue signal..."
                    )
                    await self._poll_for_continue(wait_seconds)
                    self.console.print("[green]✓ Resuming...[/green]")
                    return True
        except Exception:
            pass

        return False

    async def wait_for_user_continue(self, reason: str, timeout: int = 300):
        """Write a status flag and poll until user says continue or timeout."""
        self._write_status("waiting", reason)
        self.console.print(
            f"\n[bold cyan]⏸️  {reason}[/bold cyan]\n"
            f"  Polling for continue signal (max {timeout}s)..."
        )
        await self._poll_for_continue(timeout)

    # ── File-flag communication ────────────────────────────────────────────

    STATUS_FILE = "/tmp/paper-downloader-status.json"
    COMMAND_FILE = "/tmp/paper-downloader-command.json"

    def _write_status(self, state: str, message: str):
        """Write current status for the monitor to read."""
        import json, time
        data = {
            "state": state,
            "message": message,
            "timestamp": time.time(),
            "url": self.page.url if self.page else "",
        }
        with open(self.STATUS_FILE, 'w') as f:
            json.dump(data, f, indent=2)

    def _read_command(self) -> Optional[str]:
        """Read a command from the command file. Returns command or None."""
        import json, os
        if not os.path.exists(self.COMMAND_FILE):
            return None
        try:
            with open(self.COMMAND_FILE, 'r') as f:
                data = json.load(f)
            cmd = data.get("command")
            # Clear command after reading
            if cmd:
                with open(self.COMMAND_FILE, 'w') as f:
                    json.dump({"command": None}, f)
            return cmd
        except Exception:
            return None

    def _send_command(cmd: str):
        """Static helper — write a command for the script to pick up."""
        import json
        with open("/tmp/paper-downloader-command.json", 'w') as f:
            json.dump({"command": cmd, "timestamp": __import__('time').time()}, f)

    async def _poll_for_continue(self, timeout: int = 60, poll_interval: float = 2.0):
        """Poll command file until 'continue' or timeout. Checks for abort too."""
        import time
        start = time.time()
        while time.time() - start < timeout:
            cmd = self._read_command()
            if cmd == "continue":
                self._write_status("running", "Resumed")
                return True
            elif cmd == "abort":
                self._write_status("aborted", "User aborted")
                raise RuntimeError("User aborted via command")
            elif cmd == "skip":
                self._write_status("running", "Skipped (user)")
                return False
            await asyncio.sleep(poll_interval)
        # Timeout — auto-continue
        self.console.print("[dim]Timeout reached, auto-continuing...[/dim]")
        self._write_status("running", "Auto-continued (timeout)")
        return True

    async def navigate_and_handle_captcha(self, url: str, wait_until: str = 'load', timeout: int = 45000):
        """Navigate to URL and handle any captcha that appears."""
        self._write_status("navigating", url)
        await self.page.goto(url, wait_until=wait_until, timeout=timeout)

        # Wait a moment for page to fully render captcha if present
        await asyncio.sleep(random.uniform(1, 3))

        # Check for captcha — loop in case solving one triggers another
        max_captcha_rounds = 3
        for _ in range(max_captcha_rounds):
            found = await self.check_and_wait_captcha()
            if not found:
                break

            # After captcha solve, page may redirect
            await asyncio.sleep(random.uniform(2, 4))

        # Final scroll to confirm page loaded
        await asyncio.sleep(random.uniform(1, 2))
        self._write_status("running", "Page loaded")

    @abstractmethod
    async def search(self, query: str, max_results: int) -> List[Paper]:
        """Search for papers. Must be implemented by subclasses."""
        pass

    @abstractmethod
    async def get_bibtex(self, paper: Paper) -> Optional[str]:
        """Get BibTeX citation for paper."""
        pass

    async def download_pdf(self, paper: Paper, download_dir: Path) -> Optional[str]:
        """Download PDF by clicking the download/view-PDF button on the page.

        Deterministic click-only flow (no direct URL navigation):
          1. Find visible PDF/Download button
          2. Click it
          3. Handle result:
             a) Download event triggered -> save file
             b) New tab opened (ScienceDirect, etc.) -> switch + page.pdf()
             c) Page navigated to PDF viewer (IEEE, Wiley) -> page.pdf()
        """
        try:
            download_dir.mkdir(parents=True, exist_ok=True)

            safe_title = re.sub(r'[^\w\s-]', '', paper.title)
            safe_title = re.sub(r'[-\s]+', '_', safe_title)[:80]
            filename = f"{safe_title}.pdf"
            filepath = download_dir / filename

            if filepath.exists():
                self.console.print(f"  [dim]    PDF already exists: {filename}[/dim]")
                return str(filepath)

            await asyncio.sleep(random.uniform(1, 3))

            btn = await self._find_pdf_button()
            if not btn:
                btn = await self._find_download_button_fallback()
            if not btn:
                self.console.print(f"  [dim]    No PDF download button found on page[/dim]")
                return None

            original_url = self.page.url
            original_pages = list(self.page.context.pages)

            self.console.print(f"  Clicking download: {btn['text'][:30]}")

            if btn.get('href') and btn['href'].startswith('/') and '/doi/pdf/' in btn['href'] and 'epub' in btn['text'].lower():
                full_href = f"https://{self.page.url.split('//')[1].split('/')[0]}{btn['href']}"
                self.console.print(f"  [dim]    request.get({full_href[:60]})[/dim]")
                try:
                    resp = await self.page.request.get(full_href)
                    if resp.ok:
                        body = await resp.body()
                        if len(body) > 1000 and b'%PDF' in body[:20]:
                            filepath.write_bytes(body)
                            size_kb = filepath.stat().st_size // 1024
                            self.console.print(f"  [dim]    PDF saved: {filename} ({size_kb}KB)[/dim]")
                            return str(filepath)
                        else:
                            self.console.print(f"  [dim]    Got {len(body)} bytes, not PDF[/dim]")
                except Exception as e:
                    self.console.print(f"  [dim]    request.get failed: {repr(e)[:40]}[/dim]")
                return None

            try:
                await btn['elem'].scroll_into_view_if_needed(timeout=5000)
                await asyncio.sleep(0.5)
            except Exception:
                pass

            # Click and handle all possible outcomes
            saved = await self._click_and_save_pdf(btn['elem'], filepath, original_pages)
            if saved:
                size_kb = filepath.stat().st_size // 1024
                self.console.print(f"  [dim]    PDF saved: {filename} ({size_kb}KB)[/dim]")
                return str(filepath)

            # Fallback: navigate directly to the button's href
            btn_href = btn.get('href', '')
            if btn_href and ('pdf' in btn_href.lower() or 'download' in btn_href.lower()):
                if btn_href.startswith('/'):
                    full_href = f"https://{self.page.url.split('//')[1].split('/')[0]}{btn_href}"
                elif btn_href.startswith('http'):
                    full_href = btn_href
                else:
                    full_href = None
                if full_href:
                    self.console.print(f"  [dim]    Fallback: fetching {full_href[:60]}[/dim]")
                    # Try request.get first
                    try:
                        resp = await self.page.request.get(full_href, timeout=60000)
                        if resp.ok:
                            body = await resp.body()
                            if len(body) > 1000 and b'%PDF' in body[:20]:
                                filepath.write_bytes(body)
                                size_kb = filepath.stat().st_size // 1024
                                self.console.print(f"  [dim]    PDF saved (fallback): {filename} ({size_kb}KB)[/dim]")
                                return str(filepath)
                            else:
                                self.console.print(f"  [dim]    request.get got {len(body)} bytes, not PDF[/dim]")
                    except Exception as e:
                        self.console.print(f"  [dim]    request.get failed: {repr(e)[:40]}[/dim]")
                    # Try fetch from page context (works when request.get times out)
                    try:
                        body_b64 = await self.page.evaluate("""async (url) => {
                            const resp = await fetch(url);
                            if (!resp.ok) return null;
                            const buffer = await resp.arrayBuffer();
                            const bytes = new Uint8Array(buffer);
                            const isPDF = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
                            if (!isPDF) return null;
                            let binary = '';
                            for (let i = 0; i < buffer.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                            return btoa(binary);
                        }""", full_href)
                        if body_b64:
                            import base64
                            body = base64.b64decode(body_b64)
                            if len(body) > 1000:
                                filepath.write_bytes(body)
                                size_kb = filepath.stat().st_size // 1024
                                self.console.print(f"  [dim]    PDF saved (fetch): {filename} ({size_kb}KB)[/dim]")
                                return str(filepath)
                    except Exception as e:
                        self.console.print(f"  [dim]    fetch failed: {repr(e)[:40]}[/dim]")

            # Cambridge-specific: construct PDF URL from article ID
            cur_host = self.page.url.split('//')[1].split('/')[0] if '//' in self.page.url else ''
            if 'cambridge' in cur_host and '/core/' in self.page.url:
                article_id = self.page.url.rstrip('/').split('/')[-1]
                if article_id and len(article_id) > 10:
                    base = self.page.url.split('/core/')[0]
                    cam_pdf_url = f"{base}/core/services/aop-cambridge-core/content/view/{article_id}"
                    self.console.print(f"  [dim]    Cambridge PDF: {cam_pdf_url[:60]}[/dim]")
                    try:
                        body_b64 = await self.page.evaluate("""async (url) => {
                            const resp = await fetch(url);
                            if (!resp.ok) return null;
                            const buffer = await resp.arrayBuffer();
                            const bytes = new Uint8Array(buffer);
                            if (bytes[0] !== 0x25 || bytes[1] !== 0x50) return null;
                            let binary = '';
                            for (let i = 0; i < buffer.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                            return btoa(binary);
                        }""", cam_pdf_url)
                        if body_b64:
                            import base64
                            body = base64.b64decode(body_b64)
                            if len(body) > 1000:
                                filepath.write_bytes(body)
                                size_kb = filepath.stat().st_size // 1024
                                self.console.print(f"  [dim]    PDF saved (Cambridge): {filename} ({size_kb}KB)[/dim]")
                                return str(filepath)
                    except Exception as e:
                        self.console.print(f"  [dim]    Cambridge fetch failed: {repr(e)[:40]}[/dim]")

            # Restore: if page navigated away, go back
            if self.page.url != original_url:
                await self.page.go_back(wait_until='domcontentloaded', timeout=15000)
                await asyncio.sleep(1)

            # Close any extra tabs we opened
            current_pages = list(self.page.context.pages)
            for p in current_pages:
                if p not in original_pages and p != self.page:
                    try:
                        await p.close()
                    except Exception:
                        pass

            return None

        except Exception as e:
            self.console.print(f"  [WARN] PDF download failed: {e}")
            return None

    async def _find_pdf_button(self) -> Optional[dict]:
        """Find a visible PDF download/view button on the page using JS evaluation."""
        result = await self.page.evaluate("""() => {
            const pageHost = location.hostname;
            const candidates = [];

            function isSameOrigin(href) {
                if (!href) return false;
                if (href.startsWith('/') || href.startsWith('#') || href.startsWith('..')) return true;
                if (href.startsWith('http')) {
                    try {
                        const u = new URL(href, location.href);
                        if (u.hostname === pageHost) return true;
                        if (pageHost.includes('ezproxy')) {
                            const ezBase = pageHost.replace('.ezproxy.ugm.ac.id', '').replace(/-/g, '.');
                            const ezParts = ezBase.split('.');
                            const domain = ezParts.slice(-2).join('.');
                            return href.includes(domain) || u.hostname === pageHost;
                        }
                        const base = pageHost.replace(/-/g, '.').split('.').slice(0, -3).join('.');
                        if (href.includes(base)) return true;
                    } catch(e) { return false; }
                }
                return false;
            }

            function isPDFLink(href) {
                if (!href) return false;
                const h = href.toLowerCase();
                return h.includes('/content/pdf/') || h.includes('/doi/pdf/') ||
                       h.includes('/doi/am-pdf/') || h.includes('stamp/stamp') ||
                       h.includes('stamp.jsp') || h.includes('pdfft') ||
                       h.includes('/article-pdf/') || h.includes('/pdf/') ||
                       h.endsWith('.pdf') || h.includes('.pdf?');
            }

            const specificSelectors = [
                'a[data-track-action="Download PDF"]',
                'a[href*="/content/pdf/"]',
                'a[href*="/doi/pdf/"]',
                'a[href*="/doi/am-pdf/"]',
                'a[href*="stamp/stamp"]',
                'a[href*="stamp.jsp"]',
                'a[href*="pdfft"]',
                'a[href*="/article-pdf/"]',
                'a.pdf-download',
                '.c-pdf-download a',
                '#downloadLink',
                'a.download-pdf',
                'a[title*="PDF"]',
                'a[aria-label*="PDF"]',
                'a[aria-label*="Download"]',
                '.article-tools__pdf a',
                'a.request-download',
                '.pdf-link a',
                'a.pdf-download-link',
                'button[data-target*="pdf"]',
                '.work-access__download a',
                '.download-content a[href*="pdf"]',
                '.article-actions a[href*="pdf"]',
                'a.button--download',
                '.medium-menu a[href*="pdf"]',
                '.content-container a[href*="pdf"]',
                'a[href*="/stable/pdf/"]',
                'a[href*="/article-pdf/"]',
                'a[href*="/downloadpdf"]',
                'a[href*="/pdf/"]',
                'a[href*="/doi/reader/"]',
                'a[href*="/doi/suppl/"][href*="sj-pdf"]',
            ];

            for (const sel of specificSelectors) {
                document.querySelectorAll(sel).forEach(a => {
                    const rect = a.getBoundingClientRect();
                    const visible = rect.width > 0 && rect.height > 0;
                    const text = (a.innerText || '').trim().substring(0, 40);
                    let href = a.getAttribute('href') || '';
                    if (href.includes('/doi/reader/')) {
                        href = href.replace('/doi/reader/', '/doi/pdf/');
                    }
                    if (visible && !href.toLowerCase().startsWith('javascript') && isSameOrigin(href)) {
                        candidates.push({selector: sel, text: text, href: href, priority: 1});
                    }
                });
            }

            const downloadTexts = [
                'download pdf', 'view pdf', 'full text pdf', 'download article',
                'get pdf', 'pdf download', 'open pdf', 'access pdf',
                'full text (pdf)', 'read and download', 'open the pdf', 'save pdf',
            ];
            document.querySelectorAll('a, button').forEach(el => {
                const text = (el.innerText || '').trim().toLowerCase();
                const href = el.getAttribute('href') || '';
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const isMatch = downloadTexts.some(dt => text.includes(dt)) || text === 'pdf';
                    const isPDFEPUB = text.includes('pdf') && text.includes('epub') && (href.includes('/doi/pdf/') || href.includes('/doi/reader/'));
                    const isDownloadBtn = text === 'download' && (
                        el.closest('[aria-label*="Download"]') ||
                        el.closest('[aria-label*="download"]') ||
                        el.closest('.download-options') ||
                        el.closest('[class*="download"]') ||
                        el.getAttribute('aria-label')?.toLowerCase().includes('download')
                    );
                    const sameOrigin = !href || isSameOrigin(href);
                    if ((isMatch || isDownloadBtn || isPDFEPUB) && sameOrigin &&
                        !candidates.find(c => c.text.toLowerCase() === text && c.priority === 2)) {
                        let actualHref = href;
                        if (isPDFEPUB && href.includes('/doi/reader/')) {
                            actualHref = href.replace('/doi/reader/', '/doi/pdf/');
                        }
                        candidates.push({selector: 'text:' + text.substring(0, 20), text: (el.innerText||'').trim().substring(0,40),
                                         href: actualHref, priority: 2});
                    }
                }
            });

            document.querySelectorAll('a[href*=".pdf"]').forEach(a => {
                const rect = a.getBoundingClientRect();
                const visible = rect.width > 0 && rect.height > 0;
                const href = a.getAttribute('href') || '';
                const text = (a.innerText || '').trim().substring(0, 40);
                if (visible && isSameOrigin(href) && !candidates.find(c => c.href === href)) {
                    candidates.push({selector: 'a[href*=".pdf"]', text: text, href: href, priority: 3});
                }
            });

            candidates.sort((a, b) => (a.priority || 3) - (b.priority || 3));
            return candidates[0] || null;
        }""")

        if not result:
            return None

        sel = result['selector']
        if sel.startswith('text:'):
            text = sel.replace('text:', '')
            elem = await self.page.query_selector(f'a:has-text("{text}")')
            if not elem:
                elem = await self.page.query_selector(f'button:has-text("{text}")')
        else:
            elem = await self.page.query_selector(sel)

        if not elem:
            return None

        return {'elem': elem, 'text': result['text'], 'href': result['href']}

    async def _find_download_button_fallback(self) -> Optional[dict]:
        """Fallback: look for any visible button with 'Download' as exact text or aria-label."""
        result = await self.page.evaluate("""() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                const text = (btn.innerText || '').trim().toLowerCase();
                const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    if (text === 'download' || ariaLabel === 'download') {
                        return {text: (btn.innerText||'').trim().substring(0,40), ariaLabel: btn.getAttribute('aria-label')||''};
                    }
                }
            }
            return null;
        }""")
        if not result:
            return None
        text = result['text'] or result['ariaLabel']
        elem = await self.page.query_selector(f'button:has-text("{text}")')
        if not elem:
            elem = await self.page.query_selector('button[aria-label="Download"]')
        if not elem:
            return None
        return {'elem': elem, 'text': result['text'], 'href': ''}

    async def _click_and_save_pdf(self, elem, filepath: Path, original_pages: list) -> bool:
        """Click the PDF button and handle all outcomes (download, new tab, page nav)."""

        original_url = self.page.url

        # Strategy 1: Try download event (Springer-style)
        try:
            async with self.page.expect_download(timeout=8000) as dl_info:
                await elem.click(force=True, timeout=5000)
            download = await dl_info.value
            await download.save_as(filepath)
            if filepath.exists() and filepath.stat().st_size > 1000:
                return True
            filepath.unlink(missing_ok=True)
            return False
        except Exception:
            pass

        await asyncio.sleep(3)

        # Check for popup/new page opened by click
        current_pages = list(self.page.context.pages)
        new_pages = [p for p in current_pages if p not in original_pages]
        if new_pages:
            new_page = new_pages[0]
            new_url = new_page.url
            # Skip chrome:// pages (not useful)
            if new_url.startswith('chrome://'):
                try:
                    await new_page.close()
                except Exception:
                    pass
                new_pages = []

        if new_pages:
            new_page = new_pages[0]
            try:
                await new_page.wait_for_load_state('load', timeout=15000)
            except Exception:
                pass

            new_url = new_page.url
            self.console.print(f"  [dim]    New tab: {new_url[:60]}...[/dim]")

            try:
                resp = await new_page.request.get(new_url, timeout=60000)
                if resp.ok:
                    body = await resp.body()
                    if len(body) > 1000 and b'%PDF' in body[:20]:
                        filepath.write_bytes(body)
                        if filepath.exists() and filepath.stat().st_size > 1000:
                            return True
            except Exception:
                pass

            # Try fetch from page context
            try:
                body_b64 = await new_page.evaluate("""async () => {
                    const resp = await fetch(location.href);
                    if (!resp.ok) return null;
                    const buffer = await resp.arrayBuffer();
                    const bytes = new Uint8Array(buffer);
                    if (bytes[0] !== 0x25 || bytes[1] !== 0x50) return null;
                    let binary = '';
                    for (let i = 0; i < buffer.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                    return btoa(binary);
                }""")
                if body_b64:
                    import base64
                    body = base64.b64decode(body_b64)
                    if len(body) > 1000:
                        filepath.write_bytes(body)
                        if filepath.exists() and filepath.stat().st_size > 1000:
                            return True
            except Exception:
                pass

            try:
                await new_page.pdf(path=str(filepath))
                if filepath.exists() and filepath.stat().st_size > 1000:
                    return True
            except Exception:
                pass

            try:
                await new_page.close()
            except Exception:
                pass
            return False

        # Strategy 3: Page navigated to PDF viewer (IEEE/Wiley-style)
        cur_url = self.page.url
        is_pdf_viewer = (
            '/stamp/' in cur_url
            or '/doi/pdf' in cur_url
            or '/article-pdf/' in cur_url
            or '/article/pdf/' in cur_url
            or '/download/pdf' in cur_url
            or cur_url.lower().endswith('.pdf')
            or '/pdfft' in cur_url
            or '.pdf?' in cur_url
        )
        if is_pdf_viewer:
            self.console.print(f"  [dim]    Page is PDF viewer, saving...[/dim]")
            try:
                await self.page.wait_for_load_state('load', timeout=10000)
            except Exception:
                pass
            try:
                resp = await self.page.request.get(cur_url)
                if resp.ok:
                    body = await resp.body()
                    self.console.print(f"  [dim]    request.get: {len(body)} bytes, starts: {body[:20]}[/dim]")
                    if len(body) > 1000 and b'%PDF' in body[:20]:
                        filepath.write_bytes(body)
                        if filepath.exists() and filepath.stat().st_size > 1000:
                            return True
                else:
                    self.console.print(f"  [dim]    request.get status: {resp.status}[/dim]")
            except Exception as e:
                self.console.print(f"  [dim]    request.get err: {repr(e)[:40]}[/dim]")
            try:
                await self.page.pdf(path=str(filepath))
                if filepath.exists() and filepath.stat().st_size > 1000:
                    self.console.print(f"  [dim]    page.pdf: {filepath.stat().st_size} bytes[/dim]")
                    return True
            except Exception:
                pass

        return False


class GoogleFirstMixin:
    """Shared logic for Google-first navigation pattern.

    Scrapers that arrive at papers via Google search (to avoid bot detection)
    should use this mixin. Provides:
      - _google_search(query) → navigate to Google, search, wait for results
      - _collect_paper_hrefs(site_filter, url_filter_fn) → collect unique paper URLs
      - _visit_paper_page(href, home_page, site_domain) → click link, find the right tab
      - _cleanup_extra_tabs(home_page) → close stray tabs
    """

    async def _google_search(self, query: str) -> bool:
        """Perform a Google search with human-like behavior."""
        self.console.print(f"  [dim]Googling: {query}[/dim]")

        # Navigate to Google — must succeed, retry if needed
        for attempt in range(3):
            try:
                self.console.print(f"  [dim]Navigating to Google (attempt {attempt+1})...[/dim]")
                await self.page.goto("https://www.google.com", wait_until='domcontentloaded', timeout=15000)
                await asyncio.sleep(2)
                current_url = self.page.url
                if 'google.com' in current_url:
                    self.console.print(f"  [green]✓ On Google: {current_url[:60]}[/green]")
                    break
                else:
                    self.console.print(f"  [yellow]Landed on {current_url[:60]} instead, retrying...[/yellow]")
            except Exception as e:
                self.console.print(f"  [yellow]Navigate failed ({e}), retrying...[/yellow]")
                await asyncio.sleep(2)
        else:
            self.console.print("  [red]Could not reach Google after retries[/red]")
            return False

        await asyncio.sleep(random.uniform(2, 4))
        await self.random_mouse_movement()

        # Dismiss consent/cookie banner
        try:
            for btn_text in ['Reject all', 'Accept all', 'I agree', 'Agree']:
                btn = self.page.get_by_role('button', name=btn_text)
                if await btn.count() > 0:
                    await btn.first.click()
                    self.console.print(f"  [dim]Dismissed consent banner: {btn_text}[/dim]")
                    await asyncio.sleep(1)
                    break
        except Exception:
            pass

        # Find search box
        search_box = await self.page.wait_for_selector(
            'textarea[name="q"], input[name="q"]', timeout=10000
        )
        if not search_box:
            self.console.print("  [red]Google search box not found[/red]")
            return False

        box_rect = await search_box.bounding_box()
        if box_rect:
            x = box_rect['x'] + box_rect['width'] / 2
            y = box_rect['y'] + box_rect['height'] / 2
            await self.page.mouse.click(x, y)
        else:
            await search_box.click()
        await asyncio.sleep(random.uniform(0.5, 1.0))

        # Clear existing text
        await self.page.keyboard.press('Control+a')
        await asyncio.sleep(random.uniform(0.2, 0.4))
        await self.page.keyboard.press('Backspace')
        await asyncio.sleep(random.uniform(0.2, 0.4))

        # Fill and search
        await search_box.fill(query)
        await asyncio.sleep(random.uniform(0.8, 1.5))
        await self.page.keyboard.press('Enter')
        self.console.print("  [dim]Search submitted, waiting for results...[/dim]")
        await asyncio.sleep(random.uniform(5, 8))

        await self.check_and_wait_captcha()
        await self.human_scroll()
        await asyncio.sleep(random.uniform(1, 2))

        return True

    async def _collect_paper_hrefs(self, site_filter: str, url_filter_fn=None) -> List[str]:
        # Use h3-based approach (matches test_all_dbs.py which worked for all 10 DBs)
        all_hrefs = await self.page.evaluate("""(domain) => {
            const results = [];
            document.querySelectorAll('h3').forEach(h3 => {
                const a = h3.closest('a') || h3.parentElement.closest('a');
                if (!a) return;
                const href = a.getAttribute('href') || '';
                const dataHref = a.getAttribute('data-href') || '';
                const text = a.innerText || '';
                const combined = href + ' ' + dataHref + ' ' + text;
                if (combined.includes(domain)) {
                    results.push({href: href || dataHref, text: h3.innerText});
                }
            });
            return results;
        }""", site_filter)

        paper_hrefs = []
        seen = set()
        for item in all_hrefs:
            href = item.get('href', '')

            # Extract actual URL from Google redirector URLs
            if href and ('scholar.google' in href or 'google.com/url' in href or '/url?' in href):
                import urllib.parse
                parsed = urllib.parse.urlparse(href)
                params = urllib.parse.parse_qs(parsed.query)
                if 'url' in params:
                    href = params['url'][0]
                elif 'q' in params:
                    href = params['q'][0]
                elif site_filter in href:
                    import re as _re
                    m = _re.search(r'(https?://[^&\s]*' + _re.escape(site_filter) + r'[^&\s]*)', href)
                    if m:
                        href = m.group(1)

            if not href or site_filter not in href:
                continue

            base_url = href.split('#')[0].rstrip('/')
            if base_url in seen:
                continue
            if url_filter_fn:
                try:
                    if not await url_filter_fn(base_url):
                        continue
                except Exception:
                    continue
            seen.add(base_url)
            paper_hrefs.append(base_url)

        self.console.print(f"  Found {len(paper_hrefs)} paper links (from {len(all_hrefs)} total)")
        return paper_hrefs

    async def _visit_paper_page(self, href, home_page, site_domain: str):
        """Click a Google result link, find the right tab/page, return (page, new_page).

        Returns:
            (active_page, new_page_or_none) — new_page is set if a separate tab opened
        """
        # Re-find the link
        target = await self.page.query_selector(f'a[href="{href}"]')
        if not target:
            target = await self.page.query_selector(f'a[href^="{href}"]')
        if not target:
            self.console.print(f"  [yellow]Could not re-find link: {href[:80]}...[/yellow]")
            return None, None

        await target.hover()
        await asyncio.sleep(random.uniform(0.5, 1.2))

        # Track pages before click
        pages_before = set(id(p) for p in self.page.context.pages)

        # JS click to bypass Google's link wrappers
        try:
            await target.evaluate("el => el.click()")
        except Exception:
            box = await target.bounding_box()
            if box:
                x = box['x'] + box['width'] / 2
                y = box['y'] + box['height'] / 2
                await self.page.mouse.click(x, y)
            else:
                await target.click()

        # Wait for navigation
        for _ in range(15):
            await asyncio.sleep(1)
            current = self.page.url
            if 'google.com' not in current:
                break
            for p in reversed(self.page.context.pages):
                if id(p) not in pages_before:
                    url = p.url
                    if 'chromewebstore' not in url and 'newtab' not in url:
                        break
            else:
                continue
            break

        # Find the target page
        target_page = None
        new_page = None
        all_pages = self.page.context.pages
        for p in reversed(all_pages):
            url = p.url
            if site_domain in url:
                target_page = p
                break

        if target_page and target_page != home_page:
            self.console.print(f"  [dim]Switched to tab: {target_page.url[:60]}...[/dim]")
            self.page = target_page
            new_page = target_page
        elif site_domain in home_page.url:
            self.page = home_page
            new_page = None
            self.console.print(f"  [dim]Navigated in same tab[/dim]")
        else:
            self.console.print(f"  [yellow]Click didn't navigate to {site_domain}, skipping[/yellow]")
            return None, None

        await self.check_and_wait_captcha()
        return self.page, new_page

    async def _cleanup_extra_tabs(self, home_page):
        """Close stray chromewebstore/newtab tabs."""
        try:
            for p in list(self.page.context.pages):
                if p != home_page:
                    url = p.url
                    if 'chromewebstore' in url or 'newtab' in url:
                        await p.close()
        except Exception:
            pass
