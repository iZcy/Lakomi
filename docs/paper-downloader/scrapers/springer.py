"""
SpringerLink scraper.

Strategy: Arrive via Google, extract via ezproxy.
  1. Google the query + "site:link.springer.com"
  2. Collect Springer article URLs from results
  3. Visit each article via ezproxy and extract metadata
"""

import asyncio
import random
import re
from typing import List, Optional

from playwright.async_api import Page

from models import Paper
from .base import BaseScraper, GoogleFirstMixin


class SpringerScraper(BaseScraper, GoogleFirstMixin):
    """Scraper for SpringerLink."""

    def __init__(self, page: Page, config: dict, use_ezproxy: bool = True, console=None):
        super().__init__(page, config, use_ezproxy, console)
        self.name = "springer"
        self.base_url = "https://link.springer.com"

    async def _is_springer_paper_url(self, href: str) -> bool:
        """Check if URL points to a Springer article page."""
        if not href or 'link.springer.com' not in href:
            return False
        if not re.search(r'/article/10\.\d{4,}', href):
            return False
        skip_patterns = ['/search', '/book/', '/chapter/', '/referencework/', '/series/']
        for pat in skip_patterns:
            if pat in href:
                return False
        return True

    async def _extract_paper_from_springer_page(self) -> Optional[Paper]:
        """Extract paper metadata from a Springer article page."""
        await asyncio.sleep(random.uniform(2, 4))
        await self.human_scroll()

        try:
            # Title
            title = ""
            for sel in ['meta[name="citation_title"]', 'h1.c-article-title', '.c-article-title']:
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
            pdf_elem = await self.page.query_selector('a[href*=".pdf"]')
            if pdf_elem:
                href = await pdf_elem.get_attribute('href')
                if href:
                    pdf_url = href if href.startswith('http') else f"{self.base_url}{href}"

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
        """Search Springer via Google, then visit article pages via ezproxy."""

        # Step 1: Google search
        google_query = f"{query} site:link.springer.com"
        success = await self._google_search(google_query)
        if not success:
            return []

        # Step 2: Collect Springer paper URLs from Google results
        paper_hrefs = await self._collect_paper_hrefs('link.springer.com', self._is_springer_paper_url)
        if not paper_hrefs:
            return []

        # Step 3: Visit each paper via ezproxy
        papers = []
        home_page = self.page

        for i, href in enumerate(paper_hrefs[:max_results]):
            try:
                self.page = home_page

                # Convert to ezproxy URL
                article_url = self.proxy_url(href) if self.use_ezproxy else href

                self.console.print(f"  Visiting paper [{i+1}/{min(len(paper_hrefs), max_results)}]...")
                await self.page.goto(article_url, wait_until='domcontentloaded', timeout=60000)
                await asyncio.sleep(random.uniform(2, 4))
                await self.check_and_wait_captcha()

                current_url = self.page.url
                self.console.print(f"  Landed on: {current_url[:80]}...")

                # Verify we're on a Springer article page
                if 'link.springer.com' in current_url or 'springer' in current_url:
                    paper = await self._extract_paper_from_springer_page()
                    if paper:
                        papers.append(paper)
                        self.console.print(f"  [green]✓ Extracted: {paper.title[:60]}...[/green]")
                    else:
                        self.console.print(f"  [yellow]⚠ Could not extract metadata[/yellow]")
                else:
                    self.console.print(f"  [yellow]⚠ Landed outside Springer, skipping[/yellow]")

                await self.random_mouse_movement()
                await asyncio.sleep(random.uniform(1, 3))

            except Exception as e:
                self.console.print(f"  [WARN] Error processing result {i+1}: {e}")
                self.page = home_page
                continue

        return papers

    async def get_bibtex(self, paper: Paper) -> Optional[str]:
        """Get BibTeX from Springer."""
        return None
