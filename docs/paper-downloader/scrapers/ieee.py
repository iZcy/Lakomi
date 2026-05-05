"""
IEEE Xplore scraper.

Strategy: Find papers via Google, then visit via ezproxy for extraction.
  1. Google the query + "site:ieeexplore.ieee.org"
  2. Collect paper URLs from search results
  3. Navigate to ezproxy-proxied version of each URL
  4. Extract metadata from the article page
"""

import asyncio
import random
import re
from typing import List, Optional

from playwright.async_api import Page

from models import Paper
from .base import BaseScraper, GoogleFirstMixin


class IEEEScraper(BaseScraper, GoogleFirstMixin):
    """Scraper for IEEE Xplore."""

    def __init__(self, page: Page, config: dict, use_ezproxy: bool = True, console=None):
        super().__init__(page, config, use_ezproxy, console)
        self.name = "ieee"
        self.base_url = "https://ieeexplore.ieee.org"

    async def _is_ieee_paper_url(self, href: str) -> bool:
        """Check if a URL points to an actual IEEE paper."""
        if not href:
            return False
        if 'ieeexplore.ieee.org' not in href:
            return False
        if not re.search(r'/(abstract/)?document/\d+', href):
            return False
        skip_patterns = ['/stamp/stamp.jsp', '/ielx7/', '/ielx5/']
        for pat in skip_patterns:
            if pat in href:
                return False
        return True

    async def _extract_paper_from_ieee_page(self) -> Optional[Paper]:
        """Extract paper metadata from an IEEE article page."""
        await asyncio.sleep(random.uniform(2, 4))
        await self.human_scroll()

        try:
            # Title
            title = ""
            for sel in ['h1.document-title', 'h1', '.title', 'meta[name="citation_title"]']:
                elem = await self.page.query_selector(sel)
                if elem:
                    title = await elem.get_attribute('content') if sel.startswith('meta') else await elem.inner_text()
                    if title:
                        break
            title = title.strip()
            if not title:
                return None

            # Authors — prefer meta tags; fallback selectors filter out "All Authors"
            authors = ""
            for sel in ['meta[name="citation_author"]', '.author', '[class*="author"]']:
                elems = await self.page.query_selector_all(sel)
                if elems:
                    names = []
                    for elem in elems[:15]:
                        if sel.startswith('meta'):
                            name = await elem.get_attribute('content')
                        else:
                            name = await elem.inner_text()
                        if name:
                            name = name.strip()
                            if 'All Authors' not in name and len(name) < 80:
                                names.append(name)
                    if names:
                        authors = ', '.join(names)
                        break

            # Year
            year = None
            year_elem = await self.page.query_selector('meta[name="citation_date"]')
            if year_elem:
                date_str = await year_elem.get_attribute('content')
                year_match = re.search(r'\b(20\d{2})\b', date_str or '')
                if year_match:
                    year = int(year_match.group(1))
            if not year:
                body_text = await self.page.inner_text('body')
                year_match = re.search(r'\b(20\d{2})\b', body_text[:3000])
                if year_match:
                    year = int(year_match.group(1))

            # DOI
            doi = None
            doi_elem = await self.page.query_selector('meta[name="citation_doi"]')
            if doi_elem:
                doi = await doi_elem.get_attribute('content')

            # PDF URL
            pdf_url = None
            for sel in [
                'a[href*="stamp/stamp"]',
                'a[href*="stamp.jsp"]',
                'a.pdf-download',
                'a[href*=".pdf"]',
            ]:
                pdf_elem = await self.page.query_selector(sel)
                if pdf_elem:
                    href = await pdf_elem.get_attribute('href')
                    if href and href.startswith('http'):
                        pdf_url = href
                        break
            if not pdf_url:
                arnumber_match = re.search(r'/document/(\d+)', self.page.url)
                if arnumber_match:
                    arnumber = arnumber_match.group(1)
                    pdf_url = f"{self.base_url}/stamp/stamp.jsp?arnumber={arnumber}"

            # Journal/Conference
            journal = None
            journal_elem = await self.page.query_selector('meta[name="citation_journal_title"]')
            if journal_elem:
                journal = await journal_elem.get_attribute('content')
            if not journal:
                journal_elem = await self.page.query_selector('meta[name="citation_conference_title"]')
                if journal_elem:
                    journal = await journal_elem.get_attribute('content')

            return Paper(
                title=title,
                authors=authors,
                year=year,
                doi=doi,
                journal=journal,
                url=self.page.url,
                pdf_url=pdf_url,
                database=self.name
            )

        except Exception as e:
            self.console.print(f"  [WARN] Error extracting paper: {e}")
            return None

    async def search(self, query: str, max_results: int) -> List[Paper]:
        """Search IEEE via Google, then visit via ezproxy for extraction."""

        # Step 1: Google search
        google_query = f"{query} site:ieeexplore.ieee.org"
        success = await self._google_search(google_query)
        if not success:
            return []

        # Step 2: Collect IEEE paper URLs from Google results
        paper_hrefs = await self._collect_paper_hrefs('ieeexplore.ieee.org', self._is_ieee_paper_url)
        if not paper_hrefs:
            return []

        # Step 3: Visit each paper via ezproxy
        papers = []
        for i, href in enumerate(paper_hrefs[:max_results]):
            try:
                # Convert to ezproxy URL
                proxy_href = self.proxy_url(href) if self.use_ezproxy else href

                self.console.print(f"  Visiting paper [{i+1}/{min(len(paper_hrefs), max_results)}]...")
                await self.page.goto(proxy_href, wait_until='domcontentloaded', timeout=60000)
                await asyncio.sleep(random.uniform(2, 4))
                await self.check_and_wait_captcha()

                current_url = self.page.url
                self.console.print(f"  Landed on: {current_url[:80]}...")

                if 'ieeexplore' in current_url and '/document/' in current_url:
                    paper = await self._extract_paper_from_ieee_page()
                    if paper:
                        papers.append(paper)
                        self.console.print(f"  [green]✓ Extracted: {paper.title[:60]}...[/green]")
                    else:
                        self.console.print(f"  [yellow]⚠ Could not extract metadata[/yellow]")
                else:
                    self.console.print(f"  [yellow]⚠ Not on IEEE article page, skipping[/yellow]")

                await self.random_mouse_movement()
                await asyncio.sleep(random.uniform(1, 3))

            except Exception as e:
                self.console.print(f"  [WARN] Error processing result {i+1}: {e}")
                continue

        return papers

    async def get_bibtex(self, paper: Paper) -> Optional[str]:
        """Get BibTeX from IEEE."""
        return None
