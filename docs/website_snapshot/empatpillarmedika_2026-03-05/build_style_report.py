import re
import json
from pathlib import Path
from collections import Counter

root = Path(__file__).resolve().parent
css_dir = root / 'css'
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))

color_hex = re.compile(r'#[0-9a-fA-F]{3,8}\b')
color_rgb = re.compile(r'rgba?\([^\)]*\)')
font_family = re.compile(r'font-family\s*:\s*([^;]+);', re.I)
selector_re = re.compile(r'([^{}]+)\{')

plugin_keys = {
    'elementor': 'Elementor',
    'metform': 'MetForm',
    'swiper': 'Swiper',
    'bootstrap': 'Bootstrap',
    'fontawesome': 'Font Awesome',
    'wp-content/themes': 'WordPress Theme',
    'wp-content/plugins': 'WordPress Plugin',
}

colors, fonts, selectors, stack = Counter(), Counter(), Counter(), Counter()
files = []

for f in css_dir.glob('*.css'):
    txt = f.read_text(encoding='utf-8', errors='ignore')
    files.append((f.name, f.stat().st_size))
    for m in color_hex.findall(txt):
        colors[m.lower()] += 1
    for m in color_rgb.findall(txt):
        colors[re.sub(r'\s+', '', m.lower())] += 1
    for m in font_family.findall(txt):
        fonts[re.sub(r'\s+', ' ', m.strip())] += 1
    for m in selector_re.findall(txt):
        m = re.sub(r'\s+', ' ', m.strip())
        if 0 < len(m) < 90:
            selectors[m] += 1
    low = txt.lower() + '\n' + f.name.lower()
    for key, label in plugin_keys.items():
        if key in low:
            stack[label] += 1

files.sort(key=lambda x: x[1], reverse=True)

out = []
out.append('# CSS Style Comprehension Report')
out.append('')
out.append(f"- CSS files analyzed: {len(files)}")
out.append(f"- URLs captured in snapshot: {manifest.get('total_urls_discovered', 0)}")
out.append('')
out.append('## Largest CSS Files')
for name, size in files[:20]:
    out.append(f"- {name} ({size} bytes)")
out.append('')
out.append('## Frequent Colors')
for c, n in colors.most_common(30):
    out.append(f"- {c}: {n}")
out.append('')
out.append('## Frequent Font Declarations')
for ff, n in fonts.most_common(20):
    out.append(f"- {ff}: {n}")
out.append('')
out.append('## Detected Stack Markers')
for label, n in stack.most_common():
    out.append(f"- {label}: {n} files")
out.append('')
out.append('## Common Selectors')
for sel, n in selectors.most_common(40):
    out.append(f"- {sel}: {n}")

(root / 'STYLE_REPORT.md').write_text('\n'.join(out) + '\n', encoding='utf-8')

readme = f"""# Empat Pillar Medika Snapshot

- Date: 2026-03-05
- Total URLs discovered: {manifest.get('total_urls_discovered', 0)}
- Total processed records: {manifest.get('total_pages_processed', 0)}
- Unique CSS downloaded: {manifest.get('total_unique_css_downloaded', 0)}

## Structure
- html/: raw HTML snapshots per URL
- css/: downloaded external CSS + extracted inline CSS
- manifest.json: URL-to-files mapping and metadata
- CONTENT_DIGEST.md: text digest subset
- CONTENT_DIGEST_ALL.md: text digest snippets for all captured HTML pages
- CONTENT_INDEX.md: mapping page titles/URLs to local HTML snapshots
- STYLE_REPORT.md: CSS style analysis (colors, fonts, selectors, stack markers)
"""
(root / 'README.md').write_text(readme, encoding='utf-8')

print('OK')
