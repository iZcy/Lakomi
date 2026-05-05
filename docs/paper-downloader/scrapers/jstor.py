"""JSTOR-specific scraper.

JSTOR has a unique flow:
1. Article page auto-redirects to viewer (?seq=1)
2. Need to navigate to /stable/pdf/{id}.pdf directly
3. May need to accept Terms & Conditions first
4. PDF opens in browser (not download event)
"""

import asyncio
import re
from typing import List, Optional
from playwright.async_api import Page
from models import Paper
from .base import BaseScraper, GoogleFirstMixin


class JSTORScraper(BaseScraper, GoogleFirstMixin):
    def __init__(self, page: Page, config: dict, use_ezproxy: bool = True, console=None):
        super().__init__(page, config, use_ezproxy, console)
        self.name = "jstor"

    def _is_article_url(self, href: str) -> bool:
        return '/stable/' in href and '/stable/i' not in href

    async def _extract_metadata(self) -> Optional[Paper]:
        try:
            await asyncio.sleep(3)
            await self.human_scroll()

            title = ""
            page_title = await self.page.title()
            if ' on JSTOR' in page_title:
                title = page_title.replace(' on JSTOR', '').strip()

            if not title:
                elem = await self.page.query_selector('h1')
                if elem:
                    val = await elem.inner_text()
                    if val and len(val.strip()) > 5:
                        title = val.strip()

            if not title or len(title) < 5:
                return None

            authors = ""
            author_elems = await self.page.query_selector_all('meta[name="citation_author"]')
            if not author_elems:
                for sel in ['.m-jstor__author a', '[data-testid="author-link"]', '.article-author a']:
                    elems = await self.page.query_selector_all(sel)
                    if elems:
                        names = []
                        for e in elems[:10]:
                            n = await e.inner_text()
                            if n:
                                names.append(n.strip())
                        authors = ', '.join(names)
                        break

            year = None
            body = await self.page.inner_text('body')
            m = re.search(r'Vol\.\s*\d+.*?\((\d{4})\)', body[:3000])
            if m:
                year = int(m.group(1))
            if not year:
                m = re.search(r'\b(20\d{2})\b', body[:3000])
                if m:
                    year = int(m.group(1))

            doi = None
            doi_elem = await self.page.query_selector('meta[name="citation_doi"]')
            if doi_elem:
                doi = await doi_elem.get_attribute('content')

            journal = None
            journal_elem = await self.page.query_selector('meta[name="citation_journal_title"]')
            if not journal_elem:
                for sel in ['.m-jstor__journal-name', '[data-testid="journal-title"]']:
                    journal_elem = await self.page.query_selector(sel)
                    if journal_elem:
                        break
            if journal_elem:
                if journal_elem.tagName and journal_elem.tagName.lower() == 'meta':
                    journal = await journal_elem.get_attribute('content')
                else:
                    journal = await journal_elem.inner_text()

            stable_id = ""
            url_match = re.search(r'/stable/(\d+)', self.page.url)
            if url_match:
                stable_id = url_match.group(1)

            pdf_url = f"/stable/pdf/{stable_id}.pdf" if stable_id else ""

            return Paper(
                title=title,
                authors=authors,
                year=year,
                doi=doi,
                journal=journal,
                url=self.page.url,
                pdf_url=pdf_url,
                database=self.name,
            )
        except Exception as e:
            self.console.print(f"  [WARN] JSTOR extract error: {e}")
            return None

    async def _get_stable_id(self, url: str) -> str:
        m = re.search(r'/stable/(\d+)', url)
        return m.group(1) if m else ""

    async def download_pdf(self, paper: Paper, download_dir) -> Optional[str]:
        """JSTOR-specific download: navigate to PDF, accept T&C if needed, fetch bytes."""
        from pathlib import Path

        try:
            download_dir = Path(download_dir)
            download_dir.mkdir(parents=True, exist_ok=True)

            safe_title = re.sub(r'[^\w\s-]', '', paper.title)
            safe_title = re.sub(r'[-\s]+', '_', safe_title)[:80]
            filename = f"{safe_title}.pdf"
            filepath = download_dir / filename

            if filepath.exists():
                self.console.print(f"  [dim]    PDF already exists: {filename}[/dim]")
                return str(filepath)

            stable_id = ""
            if paper.pdf_url and '/stable/pdf/' in paper.pdf_url:
                m = re.search(r'/stable/pdf/(\d+)', paper.pdf_url)
                if m:
                    stable_id = m.group(1)
            if not stable_id:
                stable_id = await self._get_stable_id(self.page.url)
            if not stable_id:
                stable_id = await self._get_stable_id(paper.url)

            if not stable_id:
                self.console.print(f"  [dim]    Could not determine JSTOR article ID[/dim]")
                return None

            pdf_url = f"/stable/pdf/{stable_id}.pdf"
            if self.use_ezproxy:
                base = self.page.url.split('/stable/')[0]
                pdf_url = f"{base}{pdf_url}"

            # Step 1: Accept T&C by navigating and submitting the form
            self.console.print(f"  [dim]    Step 1: Navigate to PDF...[/dim]")
            try:
                await self.page.goto(pdf_url, wait_until='domcontentloaded', timeout=60000)
            except Exception:
                pass
            await asyncio.sleep(5)
            cur_url = self.page.url

            # Check for CAPTCHA / challenge page
            is_captcha = False
            try:
                is_captcha = await self.page.evaluate("""() => {
                    const body = document.body.innerText.toLowerCase();
                    return body.includes('captcha') || body.includes('are you a robot') ||
                           body.includes('are you human') || body.includes('verify you are') ||
                           body.includes('challenge') || !!document.querySelector('iframe[src*="captcha"]');
                }""")
            except Exception:
                pass
            if is_captcha or '/sorry/' in cur_url or 'captcha' in cur_url.lower():
                self.console.print(f"  [yellow]CAPTCHA on JSTOR! Please solve in browser.[/yellow]")
                await self.check_and_wait_captcha()
                try:
                    await self.page.goto(pdf_url, wait_until='domcontentloaded', timeout=60000)
                except Exception:
                    pass
                await asyncio.sleep(5)
                cur_url = self.page.url

            # Also check page content for T&C (URL might not change on client redirect)
            has_tc_form = False
            try:
                has_tc_form = await self.page.evaluate("""() => {
                    return !!document.querySelector('form[action*="/tc/verify"]');
                }""")
            except Exception:
                pass

            if '/tc/accept' in cur_url or has_tc_form:
                self.console.print(f"  [dim]    T&C page, accepting...[/dim]")
                try:
                    await self.page.evaluate("""() => {
                        const f = document.querySelector('form[action*="/tc/verify"]');
                        if (f) f.submit();
                    }""")
                except Exception:
                    pass
                for _ in range(15):
                    await asyncio.sleep(1)
                    cur_url = self.page.url
                    if '/tc/accept' not in cur_url:
                        break
                self.console.print(f"  [dim]    After T&C: {cur_url[:60]}[/dim]")
            else:
                self.console.print(f"  [dim]    No T&C. URL: {cur_url[:60]}[/dim]")

            self.console.print(f"  [dim]    Step 2: request.get({pdf_url[:60]})[/dim]")
            try:
                resp = await self.page.request.get(pdf_url)
                self.console.print(f"  [dim]    Status: {resp.status}[/dim]")
                if resp.ok:
                    body = await resp.body()
                    if len(body) > 1000 and b'%PDF' in body[:20]:
                        filepath.write_bytes(body)
                        size_kb = len(body) // 1024
                        self.console.print(f"  [dim]    PDF saved: {filename} ({size_kb}KB)[/dim]")
                        return str(filepath)
                    else:
                        self.console.print(f"  [dim]    Got {len(body)} bytes, not PDF[/dim]")
            except Exception as e:
                self.console.print(f"  [dim]    request.get failed: {repr(e)[:50]}[/dim]")

            # Step 3: Try page.pdf() as last resort
            if '/stable/pdf/' in cur_url:
                self.console.print(f"  [dim]    Step 3: Trying page.pdf()...[/dim]")
                try:
                    await self.page.pdf(path=str(filepath))
                    if filepath.exists() and filepath.stat().st_size > 1000:
                        size_kb = filepath.stat().st_size // 1024
                        self.console.print(f"  [dim]    PDF saved (page.pdf): {filename} ({size_kb}KB)[/dim]")
                        return str(filepath)
                except Exception:
                    pass

            self.console.print(f"  [dim]    Could not save PDF, URL: {cur_url[:60]}[/dim]")
            return None

        except Exception as e:
            self.console.print(f"  [WARN] JSTOR download error: {e}")
            return None

    async def search(self, query: str, max_results: int) -> List[Paper]:
        google_query = f"{query} site:jstor.org"
        success = await self._google_search(google_query)
        if not success:
            return []

        domain = "jstor.org"
        paper_hrefs = await self._collect_paper_hrefs(domain, self._is_article_url)
        if not paper_hrefs:
            return []

        papers = []
        for i, href in enumerate(paper_hrefs[:max_results]):
            try:
                proxy_href = self.proxy_url(href) if self.use_ezproxy else href
                self.console.print(f"  Visiting paper [{i+1}/{min(len(paper_hrefs), max_results)}]...")
                await self.page.goto(proxy_href, wait_until='domcontentloaded', timeout=45000)
                await asyncio.sleep(3)
                await self.check_and_wait_captcha()

                current_url = self.page.url
                self.console.print(f"  Landed on: {current_url[:80]}...")

                try:
                    await self.page.wait_for_selector('h1', timeout=60000)
                    await asyncio.sleep(2)
                except Exception:
                    pass

                paper = await self._extract_metadata()
                if paper:
                    papers.append(paper)
                    self.console.print(f"  [green]✓ Extracted: {paper.title[:60]}...[/green]")
                else:
                    self.console.print(f"  [yellow]⚠ Could not extract metadata[/yellow]")

                await self.random_mouse_movement()
                await asyncio.sleep(1)
            except Exception as e:
                self.console.print(f"  [WARN] Error processing result {i+1}: {e}")
                continue

        return papers

    async def get_bibtex(self, paper: Paper) -> Optional[str]:
        return None
