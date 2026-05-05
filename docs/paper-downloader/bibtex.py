"""
BibTeX handling for paper downloader.
"""

import hashlib
import re
from pathlib import Path
from typing import Optional

from database import Library
from models import Paper


class BibTexMerger:
    """Handles merging BibTeX entries into existing file."""

    def __init__(self, bibtex_path: str, library: Library):
        self.bibtex_path = Path(bibtex_path)
        self.library = library

    def generate_key(self, paper: Paper) -> str:
        if paper.authors:
            first_author = paper.authors.split(',')[0].split(';')[0].split(' and ')[0].strip()
            last_name = first_author.split()[-1].lower()
            last_name = re.sub(r'[^a-z0-9]', '', last_name)
            if last_name in ('authors', 'unknown', 'panel', 'author'):
                if paper.title:
                    words = re.findall(r'[a-zA-Z]+', paper.title)
                    last_name = words[0].lower() if words else 'unknown'
        else:
            last_name = "unknown"

        # Base key: lastname + year
        base_key = f"{last_name}{paper.year or 'nodate'}"

        # Ensure uniqueness
        existing_keys = self.library.get_existing_keys()
        if base_key not in existing_keys:
            return base_key

        # Add letter suffix
        for letter in 'abcdefghijklmnopqrstuvwxyz':
            new_key = f"{base_key}{letter}"
            if new_key not in existing_keys:
                return new_key

        # Fallback to hash
        return f"{base_key}{hashlib.md5(paper.title.encode()).hexdigest()[:6]}"

    @staticmethod
    def clean_authors(authors: str) -> str:
        cleaned = re.sub(r'\bAll Authors\b,?\s*', '', authors)
        cleaned = re.sub(r'Author links open overlay panel,?\s*', '', cleaned)
        cleaned = re.sub(r',\s*,', ',', cleaned)
        parts = [p.strip() for p in cleaned.split(',') if p.strip()]
        seen = set()
        unique = []
        for p in parts:
            norm = re.sub(r'\s+', ' ', p.lower())
            if norm not in seen and len(norm) > 1:
                seen.add(norm)
                unique.append(p)
        return ', '.join(unique) if unique else authors

    def create_bibtex_entry(self, paper: Paper) -> tuple:
        key = paper.bibtex_key or self.generate_key(paper)
        authors = self.clean_authors(paper.authors) if paper.authors else ""

        entry_type = "article"
        if paper.journal:
            journal_lower = paper.journal.lower()
            if any(x in journal_lower for x in ['conference', 'proceedings', 'symposium']):
                entry_type = "inproceedings"

        lines = [f"@{entry_type}{{{key},"]
        if authors:
            lines.append(f"    author = {{{authors}}},")
        lines.append(f"    title = {{{paper.title}}},")
        if paper.year:
            lines.append(f"    year = {{{paper.year}}},")
        if paper.journal:
            lines.append(f"    journal = {{{paper.journal}}},")
        if paper.doi:
            lines.append(f"    doi = {{{paper.doi}}},")
        if paper.url:
            lines.append(f"    url = {{{paper.url}}},")
        lines.append("}")

        return '\n'.join(lines), key

    def merge(self, paper: Paper) -> tuple:
        try:
            if self.bibtex_path.exists():
                existing = self.bibtex_path.read_text(encoding='utf-8').lower()
                title_norm = re.sub(r'\s+', ' ', paper.title.lower().strip())
                if title_norm in existing:
                    return "duplicate", None

            bibtex_entry, key = self.create_bibtex_entry(paper)
            paper.bibtex_key = key
            paper.bibtex_raw = bibtex_entry

            if not self.bibtex_path.exists():
                self.bibtex_path.parent.mkdir(parents=True, exist_ok=True)
                self.bibtex_path.write_text("")

            with open(self.bibtex_path, 'a', encoding='utf-8') as f:
                f.write(f"\n\n{bibtex_entry}")

            return "added", key
        except Exception as e:
            return f"error: {str(e)}", None
