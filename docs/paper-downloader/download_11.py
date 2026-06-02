"""Download 11 missing paper bib references"""
import asyncio, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from scrapers.arxiv import ArxivScraper
from scrapers.generic import GenericScraper
from models import Paper, SourceDB
from config import load_config
from rich.console import Console

config = load_config()
console = Console()
OUT = Path("downloads/bib-references")
OUT.mkdir(parents=True, exist_ok=True)

PAPERS = [
    # arXiv
    ("sun2022multiparty", "2210.11203", "arxiv"),
    ("liu2024economics", "2404.13768", "arxiv"),
    ("sharma2023unpacking", "2304.09822", "arxiv"),
    ("messias2023understanding", "2305.17655", "arxiv"),
    ("ma2023comprehensive", "2311.01433", "arxiv"),
    # Frontiers (open access)
    ("saito2023reputation", "10.3389/fbloc.2022.1083647", "doi"),
    ("tamai2024dao", "10.3389/fbloc.2024.1405516", "doi"),
    # ACM
    ("carata2024smart", "10.1145/3657054.3661165", "doi"),
    ("sharma2024future", "10.1145/3796547", "doi"),
    # IEEE
    ("elamine2024blockchain", "10.1109/AFROS62115.2024.11037097", "doi"),
    # Internet Policy Review
    ("hassan2021dao", "10.14763/2021.2.1556", "doi"),
]

async def download_arxiv(scraper, key, arxiv_id):
    console.print(f"[cyan]Downloading {key} from arXiv:{arxiv_id}...[/]")
    pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    result = await scraper.download(pdf_url, key, OUT)
    if result:
        console.print(f"  [green]✓ {key}[/]")
    else:
        console.print(f"  [red]✗ {key}[/]")
    return result

async def download_doi(scraper, key, doi):
    console.print(f"[cyan]Downloading {key} from doi:{doi}...[/]")
    # Try open access via doi.org
    pdf_url = f"https://doi.org/{doi}"
    result = await scraper.download(pdf_url, key, OUT)
    if result:
        console.print(f"  [green]✓ {key}[/]")
    else:
        console.print(f"  [yellow]? {key} (may require access)[/]")
    return result

async def main():
    async with GenericScraper(config) as scraper:
        for key, rid, rtype in PAPERS:
            if rtype == "arxiv":
                await download_arxiv(scraper, key, rid)
            else:
                await download_doi(scraper, key, rid)
            await asyncio.sleep(2)
    console.print(f"\nDone. Files in {OUT}")

asyncio.run(main())
