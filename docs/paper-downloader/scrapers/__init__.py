"""
Scrapers module for academic databases.
"""

from .base import BaseScraper
from .ieee import IEEEScraper
from .sciencedirect import ScienceDirectScraper
from .springer import SpringerScraper
from .acm import ACMScraper
from .scholar import ScholarScraper
from .arxiv import ArxivScraper

__all__ = [
    'BaseScraper',
    'IEEEScraper',
    'ScienceDirectScraper',
    'SpringerScraper',
    'ACMScraper',
    'ScholarScraper',
    'ArxivScraper',
]
