"""
Generic journal scraper.

Works for ANY ezproxy-proxied journal by:
  1. Google search with site: filter
  2. Collecting article URLs from results
  3. Navigating to ezproxy-proxied version
  4. Extracting metadata from universal <meta> tags (citation_title, etc.)
  5. Using generic download_pdf() from BaseScraper
"""

import asyncio
import random
import re
from typing import List, Optional

from playwright.async_api import Page

from models import Paper
from .base import BaseScraper, GoogleFirstMixin


class GenericJournalScraper(BaseScraper, GoogleFirstMixin):
    """Generic scraper for any journal via Google search + ezproxy."""

    def __init__(self, page: Page, config: dict, use_ezproxy: bool = True, console=None,
                 domain: str = "", db_name: str = "generic"):
        super().__init__(page, config, use_ezproxy, console)
        self.name = db_name
        self.domain = domain
        self.base_url = f"https://{domain}"

    def _is_article_url(self, href: str) -> bool:
        if not href or self.domain not in href:
            return False
        skip = ['/search', '/topics', '/journal/', '/browse', '/action/',
                '/page/', '/category/', '/tag/', '/authors/', '/editorial-board']
        for s in skip:
            if s in href.lower():
                return False
        if href.endswith(self.domain) or href.endswith(self.domain + '/'):
            return False
        parts = href.replace(f'https://{self.domain}', '').strip('/')
        if '/' not in parts:
            return False
        return True

    async def _extract_metadata(self) -> Optional[Paper]:
        await asyncio.sleep(random.uniform(2, 4))
        await self.human_scroll()

        try:
            if 'jstor' in self.page.url.lower():
                try:
                    await self.page.wait_for_selector('h1', timeout=15000)
                    await asyncio.sleep(2)
                except Exception:
                    pass

            title = ""
            for sel in [
                'meta[name="citation_title"]',
                'meta[name="dc.Title"]',
                'meta[name="WT.pg_type"]',
            ]:
                elem = await self.page.query_selector(sel)
                if elem:
                    val = await elem.get_attribute('content')
                    if val and val.strip():
                        title = val.strip()
                        break
            if not title:
                page_title = await self.page.title()
                if page_title and ' on JSTOR' in page_title:
                    title = page_title.replace(' on JSTOR', '').strip()
                    if len(title) < 5:
                        title = ""
            if not title:
                for sel in ['h1', '.article-title', '.title', 'meta[property="og:title"]']:
                    elem = await self.page.query_selector(sel)
                    if elem:
                        if sel.startswith('meta'):
                            val = await elem.get_attribute('content')
                        else:
                            val = await elem.inner_text()
                        if val and len(val.strip()) > 10:
                            title = val.strip()
                            break
            if not title or len(title) < 5:
                return None

            authors = ""
            author_elems = await self.page.query_selector_all('meta[name="citation_author"]')
            if not author_elems:
                author_elems = await self.page.query_selector_all('meta[name="dc.Creator"]')
            if author_elems:
                names = []
                for elem in author_elems[:10]:
                    name = await elem.get_attribute('content')
                    if name:
                        names.append(name.strip())
                authors = ', '.join(names)

            year = None
            year_elem = await self.page.query_selector('meta[name="citation_date"]')
            if not year_elem:
                year_elem = await self.page.query_selector('meta[name="dc.Date"]')
            if year_elem:
                date_str = await year_elem.get_attribute('content')
                if date_str:
                    m = re.search(r'\b(20\d{2})\b', date_str)
                    if m:
                        year = int(m.group(1))
            if not year:
                body = await self.page.inner_text('body')
                m = re.search(r'\b(20\d{2})\b', body[:3000])
                if m:
                    year = int(m.group(1))

            doi = None
            doi_elem = await self.page.query_selector('meta[name="citation_doi"]')
            if not doi_elem:
                doi_elem = await self.page.query_selector('meta[name="dc.Identifier"]')
            if doi_elem:
                doi = await doi_elem.get_attribute('content')

            journal = None
            journal_elem = await self.page.query_selector('meta[name="citation_journal_title"]')
            if not journal_elem:
                journal_elem = await self.page.query_selector('meta[name="citation_conference_title"]')
            if not journal_elem:
                journal_elem = await self.page.query_selector('meta[name="dc.Source"]')
            if journal_elem:
                journal = await journal_elem.get_attribute('content')

            pdf_url = None
            page_host = self.page.url.split('/')[2] if '://' in self.page.url else ''
            for sel in [
                'meta[name="citation_pdf_url"]',
                'a[href*="/content/pdf/"]',
                'a[href*="/doi/pdf/"]',
                'a[href*="/article-pdf/"]',
                'a[href*="stamp/stamp"]',
                'a[href*="pdfft"]',
            ]:
                elem = await self.page.query_selector(sel)
                if elem:
                    if sel.startswith('meta'):
                        href = await elem.get_attribute('content')
                    else:
                        href = await elem.get_attribute('href')
                    if href and not href.lower().startswith('javascript'):
                        if href.startswith('/') or page_host in href or 'ezproxy' in page_host:
                            pdf_url = href
                            break

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
            self.console.print(f"  [WARN] Error extracting: {e}")
            return None

    async def search(self, query: str, max_results: int) -> List[Paper]:
        google_query = f"{query} site:{self.domain}"
        success = await self._google_search(google_query)
        if not success:
            return []

        paper_hrefs = await self._collect_paper_hrefs(self.domain, self._is_article_url)
        if not paper_hrefs:
            return []

        papers = []
        for i, href in enumerate(paper_hrefs[:max_results]):
            try:
                proxy_href = self.proxy_url(href) if self.use_ezproxy else href
                self.console.print(f"  Visiting paper [{i+1}/{min(len(paper_hrefs), max_results)}]...")
                await self.page.goto(proxy_href, wait_until='domcontentloaded', timeout=60000)
                await asyncio.sleep(random.uniform(2, 4))
                await self.check_and_wait_captcha()

                current_url = self.page.url
                self.console.print(f"  Landed on: {current_url[:80]}...")

                if self.domain in current_url or self.domain.replace('.', '-') in current_url or 'ezproxy' in current_url:
                    paper = await self._extract_metadata()
                    if paper:
                        papers.append(paper)
                        self.console.print(f"  [green]✓ Extracted: {paper.title[:60]}...[/green]")
                    else:
                        self.console.print(f"  [yellow]⚠ Could not extract metadata[/yellow]")
                else:
                    self.console.print(f"  [yellow]⚠ Landed outside expected domain, skipping[/yellow]")

                await self.random_mouse_movement()
                await asyncio.sleep(random.uniform(1, 3))
            except Exception as e:
                self.console.print(f"  [WARN] Error processing result {i+1}: {e}")
                continue

        return papers

    async def get_bibtex(self, paper: Paper) -> Optional[str]:
        return None
