"""
ACM Digital Library scraper.

Strategy: Always arrive via Google. Never navigate directly to ACM URLs.
  1. Google the query + "site:dl.acm.org"
  2. Click ACM results from Google
  3. Extract metadata from the paper pages
"""

import asyncio
import random
import re
from typing import List, Optional

from playwright.async_api import Page

from models import Paper
from .base import BaseScraper, GoogleFirstMixin


class ACMScraper(BaseScraper, GoogleFirstMixin):
    """Scraper for ACM Digital Library."""

    def __init__(self, page: Page, config: dict, use_ezproxy: bool = True, console=None):
        super().__init__(page, config, use_ezproxy, console)
        self.name = "acm"
        self.base_url = "https://dl.acm.org"

    async def _is_acm_paper_url(self, href: str) -> bool:
        """Check if URL points to an ACM paper page."""
        if not href or 'dl.acm.org' not in href:
            return False
        # Must be a full-text article: /doi/10.xxxx/...
        if not re.search(r'/doi/(10\.\d{4,}/)', href):
            return False
        # Skip search/category pages
        skip_patterns = ['/action/doSearch', '/search', '/series/', '/proceedings/']
        for pat in skip_patterns:
            if pat in href:
                return False
        return True

    async def _extract_paper_from_acm_page(self) -> Optional[Paper]:
        """Extract paper metadata from an ACM article page."""
        await asyncio.sleep(random.uniform(2, 4))
        await self.human_scroll()

        try:
            # Title
            title = ""
            for sel in ['meta[name="citation_title"]', 'h1.citation__title', '.header__title', 'h1']:
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
                author_elem = await self.page.query_selector('.authors, .loa__list')
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
                year_elem = await self.page.query_selector('meta[name="citation_online_date"]')
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
            for sel in ['a[href*="/doi/pdf/"]', 'a[href*="pdf"]', 'a.download']:
                pdf_elem = await self.page.query_selector(sel)
                if pdf_elem:
                    href = await pdf_elem.get_attribute('href')
                    if href and 'pdf' in href.lower():
                        pdf_url = href if href.startswith('http') else f"{self.base_url}{href}"
                        break

            # Journal/Conference
            journal = None
            for sel in ['meta[name="citation_journal_title"]', 'meta[name="citation_conference_title"]', '.issue-item__title']:
                journal_elem = await self.page.query_selector(sel)
                if journal_elem:
                    journal = await journal_elem.get_attribute('content') if sel.startswith('meta') else await journal_elem.inner_text()
                    if journal:
                        break

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
        """Search ACM via Google, then visit paper pages one by one."""

        # Step 1: Google search
        google_query = f"{query} site:dl.acm.org"
        success = await self._google_search(google_query)
        if not success:
            return []

        google_search_url = self.page.url

        # Step 2: Collect ACM paper URLs
        paper_hrefs = await self._collect_paper_hrefs('dl.acm.org', self._is_acm_paper_url)
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
                active_page, new_page = await self._visit_paper_page(href, home_page, 'dl.acm.org')
                if not active_page:
                    continue

                current_url = self.page.url
                self.console.print(f"  [dim]Landed on: {current_url[:80]}...[/dim]")

                # Verify we're on an ACM paper page
                if 'dl.acm.org/doi/' in current_url:
                    paper = await self._extract_paper_from_acm_page()
                    if paper:
                        papers.append(paper)
                        self.console.print(f"  [green]✓ Extracted: {paper.title[:60]}...[/green]")
                    else:
                        self.console.print(f"  [yellow]⚠ Could not extract metadata[/yellow]")
                else:
                    self.console.print(f"  [yellow]⚠ Landed outside ACM, skipping[/yellow]")

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
        """Get BibTeX from ACM."""
        return None
