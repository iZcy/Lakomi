"""
arXiv scraper.

Strategy: arXiv is open access and generally doesn't block bots aggressively,
so we can use a mix of approaches:
  1. Google the query + "site:arxiv.org" (to be consistent and avoid blocks)
  2. Click arXiv results from Google
  3. Extract metadata from arXiv abstract pages

arXiv provides full metadata in a machine-readable <meta> tag format (citation_*)
and has a clean, predictable page structure.
"""

import asyncio
import random
import re
from typing import List, Optional

from playwright.async_api import Page

from models import Paper
from .base import BaseScraper, GoogleFirstMixin


class ArxivScraper(BaseScraper, GoogleFirstMixin):
    """Scraper for arXiv."""

    def __init__(self, page: Page, config: dict, use_ezproxy: bool = True, console=None):
        super().__init__(page, config, use_ezproxy, console)
        self.name = "arxiv"
        self.base_url = "https://arxiv.org"

    async def _is_arxiv_paper_url(self, href: str) -> bool:
        """Check if URL points to an arXiv paper (abs page, not search/list)."""
        if not href or 'arxiv.org' not in href:
            return False
        # Must be an abstract page: /abs/XXXX.XXXXX or /abs/YYMM.NNNNN
        if not re.search(r'/abs/\d{4}\.\d{4,}', href) and not re.search(r'/abs/\d{4}\.\d+', href):
            return False
        # Skip search, list, and format pages
        skip_patterns = ['/search', '/list', '/format', '/pdf/', '/ps/']
        for pat in skip_patterns:
            if pat in href:
                return False
        return True

    async def _extract_paper_from_arxiv_page(self) -> Optional[Paper]:
        """Extract paper metadata from an arXiv abstract page."""
        await asyncio.sleep(random.uniform(2, 4))
        await self.human_scroll()

        try:
            # Title
            title = ""
            for sel in ['meta[name="citation_title"]', 'h1.title', '#abs-title']:
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
                for elem in author_elems[:15]:
                    name = await elem.get_attribute('content')
                    if name:
                        names.append(name.strip())
                authors = ', '.join(names)
            if not authors:
                author_elem = await self.page.query_selector('.authors')
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
                # Try from the "Submitted on" line
                submitted_elem = await self.page.query_selector('.dateline')
                if submitted_elem:
                    submitted_text = await submitted_elem.inner_text()
                    year_match = re.search(r'\b(20\d{2}|19\d{2})\b', submitted_text)
                    if year_match:
                        year = int(year_match.group(1))

            # DOI (arXiv papers sometimes have DOIs)
            doi = None
            doi_elem = await self.page.query_selector('meta[name="citation_doi"]')
            if doi_elem:
                doi = await doi_elem.get_attribute('content')

            # arXiv ID
            arxiv_id = None
            id_match = re.search(r'/abs/(\d{4}\.\d+)', self.page.url)
            if id_match:
                arxiv_id = id_match.group(1)

            # PDF URL — arXiv always has a direct PDF
            pdf_url = None
            pdf_elem = await self.page.query_selector('a[href*="/pdf/"]')
            if pdf_elem:
                href = await pdf_elem.get_attribute('href')
                if href:
                    pdf_url = href if href.startswith('http') else f"https://arxiv.org{href}"
            # Fallback: construct from arXiv ID
            if not pdf_url and arxiv_id:
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}"

            # Journal — arXiv papers may list a journal in comments
            journal = None
            # Check for "Comments:" or "Journal ref:" in the abstract
            comments_elem = await self.page.query_selector('.journal-ref')
            if comments_elem:
                journal = await comments_elem.inner_text()
                journal = journal.strip().lstrip('Journal reference:').strip()

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
        """Search arXiv via Google, then visit paper pages one by one."""

        # Step 1: Google search
        google_query = f"{query} site:arxiv.org/abs"
        success = await self._google_search(google_query)
        if not success:
            return []

        google_search_url = self.page.url

        # Step 2: Collect arXiv paper URLs
        paper_hrefs = await self._collect_paper_hrefs('arxiv.org', self._is_arxiv_paper_url)
        if not paper_hrefs:
            return []

        # Step 3: Visit each paper page
        papers = []
        home_page = self.page

        for i, href in enumerate(paper_hrefs[:max_results]):
            try:
                self.page = home_page

                if i > 0:
                    self.console.print(f"  [dim]Navigating back to Google results...[/dim]")
                    await self.page.goto(google_search_url, wait_until='domcontentloaded', timeout=20000)
                    await asyncio.sleep(random.uniform(3, 5))
                    await self.check_and_wait_captcha()
                    self.console.print(f"  [green]✓ Re-found link for paper [{i+1}/{max_results}][/green]")

                self.console.print(f"  [dim]Visiting paper [{i+1}/{max_results}]...[/dim]")
                active_page, new_page = await self._visit_paper_page(href, home_page, 'arxiv.org')
                if not active_page:
                    continue

                current_url = self.page.url
                self.console.print(f"  [dim]Landed on: {current_url[:80]}...[/dim]")

                # Verify we're on an arXiv abstract page
                if 'arxiv.org/abs/' in current_url:
                    paper = await self._extract_paper_from_arxiv_page()
                    if paper:
                        papers.append(paper)
                        self.console.print(f"  [green]✓ Extracted: {paper.title[:60]}...[/green]")
                    else:
                        self.console.print(f"  [yellow]⚠ Could not extract metadata[/yellow]")
                else:
                    self.console.print(f"  [yellow]⚠ Landed outside arXiv, skipping[/yellow]")

                # Cleanup
                if new_page:
                    try:
                        await new_page.close()
                    except Exception:
                        pass
                    self.page = home_page

                await self._cleanup_extra_tabs(home_page)
                await self.random_mouse_movement()
                await asyncio.sleep(random.uniform(1, 3))

            except Exception as e:
                self.console.print(f"  [WARN] Error processing result {i+1}: {e}")
                self.page = home_page
                continue

        return papers

    async def get_bibtex(self, paper: Paper) -> Optional[str]:
        """Get BibTeX from arXiv (arXiv has a /format/bibtex endpoint)."""
        if not paper.url:
            return None
        try:
            # Convert abs URL to bibtex format URL
            bibtex_url = paper.url.replace('/abs/', '/format/bibtex')
            if self.use_ezproxy:
                bibtex_url = self.proxy_url(bibtex_url)

            response = await self.page.goto(bibtex_url, wait_until='domcontentloaded', timeout=15000)
            if response and response.ok:
                content = await self.page.inner_text('body')
                return content.strip()
        except Exception:
            pass
        return None
