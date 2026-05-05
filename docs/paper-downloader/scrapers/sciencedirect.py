"""
ScienceDirect scraper.

Strategy: Find papers via Google, then visit ezproxy-proxied versions.
  1. Google the query + "site:sciencedirect.com"
  2. Collect paper URLs from Google results
  3. Navigate to ezproxy-proxied version of each URL for extraction
"""

import asyncio
import random
import re
from typing import List, Optional

from playwright.async_api import Page

from models import Paper
from .base import BaseScraper, GoogleFirstMixin


class ScienceDirectScraper(BaseScraper, GoogleFirstMixin):
    """Scraper for ScienceDirect."""

    def __init__(self, page: Page, config: dict, use_ezproxy: bool = True, console=None):
        super().__init__(page, config, use_ezproxy, console)
        self.name = "sciencedirect"
        self.base_url = "https://www.sciencedirect.com"

    async def _is_sd_paper_url(self, href: str) -> bool:
        """Check if URL points to a ScienceDirect article page."""
        if not href or 'sciencedirect.com' not in href:
            return False
        if not re.search(r'/science/article/pii/', href):
            return False
        skip_patterns = ['/search', '/topics', '/journal/']
        for pat in skip_patterns:
            if pat in href:
                return False
        return True

    async def _extract_paper_from_sd_page(self) -> Optional[Paper]:
        """Extract paper metadata from a ScienceDirect article page."""
        await asyncio.sleep(random.uniform(2, 4))
        await self.human_scroll()

        try:
            # Title
            title = ""
            for sel in ['meta[name="citation_title"]', 'h1.title-text', '.title-text']:
                elem = await self.page.query_selector(sel)
                if elem:
                    title = await elem.get_attribute('content') if sel.startswith('meta') else await elem.inner_text()
                    if title:
                        break
            title = title.strip()
            if not title:
                return None

            # Authors
            authors = ""
            author_elems = await self.page.query_selector_all('meta[name="citation_author"]')
            if author_elems:
                names = []
                for elem in author_elems[:10]:
                    name = await elem.get_attribute('content')
                    if name:
                        names.append(name.strip())
                authors = ', '.join(names)
            if not authors:
                author_elem = await self.page.query_selector('.author-group, .authors')
                if author_elem:
                    authors = await author_elem.inner_text()
                    authors = authors.strip().replace('\n', ', ')

            # Year
            year = None
            year_elem = await self.page.query_selector('meta[name="citation_date"]')
            if year_elem:
                date_str = await year_elem.get_attribute('content')
                year_match = re.search(r'\b(20\d{2}|19\d{2})\b', date_str or '')
                if year_match:
                    year = int(year_match.group(1))
            if not year:
                body_text = await self.page.inner_text('body')
                year_match = re.search(r'\b(20\d{2}|19\d{2})\b', body_text[:3000])
                if year_match:
                    year = int(year_match.group(1))

            # DOI
            doi = None
            doi_elem = await self.page.query_selector('meta[name="citation_doi"]')
            if doi_elem:
                doi = await doi_elem.get_attribute('content')

            # PDF URL
            pdf_url = None
            pdf_elem = await self.page.query_selector('a[href*="pdfft"], a.pdf-download')
            if pdf_elem:
                href = await pdf_elem.get_attribute('href')
                if href:
                    pdf_url = href if href.startswith('http') else f"{self.base_url}{href}"
            if not pdf_url and '/article/pii/' in self.page.url:
                # Derive from current (possibly proxied) URL
                pdf_url = f"{self.page.url}/pdfft"

            # Journal
            journal = None
            journal_elem = await self.page.query_selector('meta[name="citation_journal_title"]')
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
        """Search ScienceDirect via Google, visit ezproxy-proxied article pages."""

        # Step 1: Google search
        google_query = f"{query} site:sciencedirect.com"
        success = await self._google_search(google_query)
        if not success:
            return []

        # Step 2: Collect ScienceDirect paper URLs
        paper_hrefs = await self._collect_paper_hrefs('sciencedirect.com', self._is_sd_paper_url)
        if not paper_hrefs:
            return []

        self.console.print(f"  Found {len(paper_hrefs)} paper links")

        # Step 3: Visit each paper page via ezproxy
        papers = []

        for i, href in enumerate(paper_hrefs[:max_results]):
            try:
                # Convert to ezproxy URL
                article_url = self.proxy_url(href) if self.use_ezproxy else href

                self.console.print(f"  Visiting paper [{i+1}/{min(len(paper_hrefs), max_results)}]...")
                await self.page.goto(article_url, wait_until='domcontentloaded', timeout=60000)
                await asyncio.sleep(random.uniform(2, 4))
                await self.check_and_wait_captcha()

                current_url = self.page.url
                self.console.print(f"  Landed on: {current_url[:80]}...")

                if 'sciencedirect.com' in current_url or 'sciencedirect-com' in current_url:
                    paper = await self._extract_paper_from_sd_page()
                    if paper:
                        papers.append(paper)
                        self.console.print(f"  [green]✓ Extracted: {paper.title[:60]}...[/green]")
                    else:
                        self.console.print(f"  [yellow]⚠ Could not extract metadata[/yellow]")
                else:
                    self.console.print(f"  [yellow]⚠ Landed outside ScienceDirect, skipping[/yellow]")

                await self.random_mouse_movement()
                await asyncio.sleep(random.uniform(1, 3))

            except Exception as e:
                self.console.print(f"  [WARN] Error processing result {i+1}: {e}")
                continue

        return papers

    async def get_bibtex(self, paper: Paper) -> Optional[str]:
        """Get BibTeX from ScienceDirect."""
        return None
