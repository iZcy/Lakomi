"""
Google Scholar scraper.

Strategy: Use Google Scholar directly (it's Google, so same anti-bot approach).
  1. Navigate to Google Scholar
  2. Search for the query
  3. Extract metadata from result snippets (title, authors, year, citations)
  4. Optionally visit paper pages for more details

Note: Google Scholar doesn't require the Google-first redirect trick since
it IS Google. But it has its own rate limiting.
"""

import asyncio
import random
import re
from typing import List, Optional

from playwright.async_api import Page

from models import Paper
from .base import BaseScraper


class ScholarScraper(BaseScraper):
    """Scraper for Google Scholar."""

    def __init__(self, page: Page, config: dict, use_ezproxy: bool = True, console=None):
        super().__init__(page, config, use_ezproxy, console)
        self.name = "scholar"
        self.base_url = "https://scholar.google.com"

    async def _navigate_to_scholar(self) -> bool:
        """Navigate to Google Scholar with retries."""
        for attempt in range(3):
            try:
                self.console.print(f"  [dim]Navigating to Google Scholar (attempt {attempt+1})...[/dim]")
                await self.page.goto(self.base_url, wait_until='domcontentloaded', timeout=15000)
                await asyncio.sleep(2)
                current_url = self.page.url
                if 'scholar.google.com' in current_url:
                    self.console.print(f"  [green]✓ On Google Scholar: {current_url[:60]}[/green]")
                    return True
                else:
                    self.console.print(f"  [yellow]Landed on {current_url[:60]} instead, retrying...[/yellow]")
            except Exception as e:
                self.console.print(f"  [yellow]Navigate failed ({e}), retrying...[/yellow]")
                await asyncio.sleep(2)
        self.console.print("  [red]Could not reach Google Scholar after retries[/red]")
        return False

    async def _search_scholar(self, query: str) -> bool:
        """Search Google Scholar with human-like behavior."""
        self.console.print(f"  [dim]Searching Scholar: {query}[/dim]")

        if not await self._navigate_to_scholar():
            return False

        await asyncio.sleep(random.uniform(2, 4))
        await self.random_mouse_movement()

        # Dismiss consent banner
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
            'input[name="q"], textarea[name="q"], #gs_hdr_tsi', timeout=10000
        )
        if not search_box:
            self.console.print("  [red]Scholar search box not found[/red]")
            return False

        box_rect = await search_box.bounding_box()
        if box_rect:
            x = box_rect['x'] + box_rect['width'] / 2
            y = box_rect['y'] + box_rect['height'] / 2
            await self.page.mouse.click(x, y)
        else:
            await search_box.click()
        await asyncio.sleep(random.uniform(0.5, 1.0))

        # Clear and fill
        await self.page.keyboard.press('Control+a')
        await asyncio.sleep(random.uniform(0.2, 0.4))
        await self.page.keyboard.press('Backspace')
        await asyncio.sleep(random.uniform(0.2, 0.4))

        await search_box.fill(query)
        await asyncio.sleep(random.uniform(0.8, 1.5))
        await self.page.keyboard.press('Enter')
        self.console.print("  [dim]Search submitted, waiting for results...[/dim]")
        await asyncio.sleep(random.uniform(5, 8))

        await self.check_and_wait_captcha()
        await self.human_scroll()
        await asyncio.sleep(random.uniform(1, 2))

        return True

    async def _extract_from_result_item(self, item) -> Optional[Paper]:
        """Extract paper metadata from a single Google Scholar result item."""
        try:
            # Title
            title_elem = await item.query_selector('h3 a, .gs_rt a')
            title = await title_elem.inner_text() if title_elem else ""
            # Google Scholar prefixes: [PDF], [BOOK], [CITATION], [HTML]
            title = re.sub(r'^\[(?:PDF|BOOK|CITATION|HTML)\]\s*', '', title)
            title = title.strip()
            if not title:
                return None

            # URL
            url = None
            if title_elem:
                url = await title_elem.get_attribute('href')

            # Authors + journal + year — from the green text line
            meta_elem = await item.query_selector('.gs_a')
            meta_text = ""
            if meta_elem:
                meta_text = await meta_elem.inner_text()
                meta_text = meta_text.strip()

            authors = ""
            year = None
            journal = None

            if meta_text:
                # Format is typically: "Authors - Journal, Year - Publisher"
                parts = re.split(r'\s*[-–]\s*', meta_text)
                if parts:
                    authors = parts[0].strip()
                # Year from anywhere in meta text
                year_match = re.search(r'\b(20\d{2}|19\d{2})\b', meta_text)
                if year_match:
                    year = int(year_match.group(1))
                # Journal is usually the middle part
                if len(parts) >= 2:
                    journal = parts[1].strip()
                    # Remove year from journal if it got captured
                    journal = re.sub(r',?\s*\b(20\d{2}|19\d{2})\b', '', journal).strip().rstrip(',')

            # PDF link (if available)
            pdf_url = None
            pdf_elem = await item.query_selector('.gs_or_ggsm a[href*=".pdf"], .gs_or_ggsm a[href*="/pdf/"]')
            if pdf_elem:
                pdf_url = await pdf_elem.get_attribute('href')

            # Cite link for BibTeX (we can use this later)
            cite_elem = await item.query_selector('.gs_or_cit')

            return Paper(
                title=title,
                authors=authors,
                year=year,
                journal=journal,
                url=url,
                pdf_url=pdf_url,
                database=self.name
            )

        except Exception as e:
            self.console.print(f"  [WARN] Error parsing result item: {e}")
            return None

    async def search(self, query: str, max_results: int) -> List[Paper]:
        """Search Google Scholar and extract metadata from results."""

        # Step 1: Search
        success = await self._search_scholar(query)
        if not success:
            return []

        # Step 2: Extract from result items
        papers = []
        try:
            items = await self.page.query_selector_all('.gs_r, .gs_ri')
            self.console.print(f"  Found {len(items)} results on Scholar")

            for i, item in enumerate(items[:max_results]):
                try:
                    if i > 0:
                        await self.random_delay()
                        await self.random_mouse_movement()

                    paper = await self._extract_from_result_item(item)
                    if paper:
                        papers.append(paper)
                        self.console.print(f"  [green]✓ [{i+1}/{max_results}] {paper.title[:60]}...[/green]")
                    else:
                        self.console.print(f"  [yellow]⚠ [{i+1}/{max_results}] Could not extract metadata[/yellow]")

                except Exception as e:
                    self.console.print(f"  [WARN] Error processing result {i+1}: {e}")
                    continue

            # Scroll down if we need more results and there are more pages
            if len(items) < max_results:
                next_btn = await self.page.query_selector('a.gs_nma, button[aria-label*="Next"]')
                if next_btn:
                    self.console.print(f"  [dim]Loading more results...[/dim]")
                    await next_btn.click()
                    await asyncio.sleep(random.uniform(3, 5))
                    await self.check_and_wait_captcha()
                    more_items = await self.page.query_selector_all('.gs_r, .gs_ri')
                    for i, item in enumerate(more_items[len(items):max_results]):
                        try:
                            paper = await self._extract_from_result_item(item)
                            if paper:
                                papers.append(paper)
                                self.console.print(f"  [green]✓ [{len(papers)}/{max_results}] {paper.title[:60]}...[/green]")
                        except Exception:
                            continue

        except Exception as e:
            self.console.print(f"  [ERROR] Scholar search failed: {e}")

        return papers

    async def get_bibtex(self, paper: Paper) -> Optional[str]:
        """Get BibTeX from Google Scholar (click Cite -> BibTeX)."""
        return None
