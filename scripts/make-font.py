"""Makes assets/fonts/survey-mono.woff2, the Pip-Boy's typeface.

Fallout 3 and New Vegas set the Pip-Boy in Monofonto, whose free licence does not cover the web.
Survey Mono stands in for it: Inconsolata (SIL Open Font License 1.1) fixed at 82% width, where it
measures like Monofonto (advance 0.68 of the cap height, and stems 0.18 of it at weight 800), with
the plain zero of its ss02 set made the default, as Monofonto's zero is plain. The weight axis is
kept, from 400 to 800.

Only needed to remake the font; the site itself needs nothing but Node. Needs Python 3 with
fontTools and brotli (`pip install fonttools brotli`), and Inconsolata's variable font:
https://github.com/google/fonts/raw/main/ofl/inconsolata/Inconsolata%5Bwdth%2Cwght%5D.ttf

    python3 scripts/make-font.py path/to/Inconsolata[wdth,wght].ttf
"""
import io
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

src = sys.argv[1]
out = Path(__file__).resolve().parent.parent / 'assets' / 'fonts' / 'survey-mono.woff2'
font = TTFont(src)

# 82% width, weights 400–800; written out and read back so the subsetter sees whole tables
font = instancer.instantiateVariableFont(font, {'wdth': 82, 'wght': (400, 800)})
buf = io.BytesIO(); font.save(buf); buf.seek(0); font = TTFont(buf)

# the plain zero by default
for table in font['cmap'].tables:
    if table.isUnicode() and 0x30 in table.cmap:
        table.cmap[0x30] = 'zero.ss02'

# Latin text, the punctuation and signs the survey prints, arrows
text = ''.join(chr(c) for c in [*range(0x20, 0x7F), *range(0xA0, 0x100)]) + '–—‘’“”…•·−×÷≈≤≥≠±°′″←↑→↓↗↘№✓€£'
opts = subset.Options()
opts.layout_features = ['ccmp', 'locl', 'mark', 'mkmk', 'kern', 'case']
opts.name_IDs = ['*']
opts.name_languages = ['*']
opts.notdef_outline = True
opts.flavor = 'woff2'
sub = subset.Subsetter(opts)
sub.populate(text=text)
sub.subset(font)

# a new name, as the font is changed; the copyright and licence stay
names = {1: 'Survey Mono', 2: 'Regular', 3: 'Survey Mono; based on Inconsolata', 4: 'Survey Mono', 6: 'SurveyMono-Regular', 16: 'Survey Mono', 17: 'Regular', 25: 'SurveyMono'}
name = font['name']
for rec in list(name.names):
    if rec.nameID in names:
        name.setName(names[rec.nameID], rec.nameID, rec.platformID, rec.platEncID, rec.langID)
for inst in font['fvar'].instances:
    inst.postscriptNameID = 0xFFFF
font['name'].setName('Based on Inconsolata by The Inconsolata Project Authors, fixed at 82% width with the plain zero as the default.', 10, 3, 1, 0x409)

out.parent.mkdir(parents=True, exist_ok=True)
font.flavor = 'woff2'
font.save(out)
print(f'{out.relative_to(Path.cwd()) if out.is_relative_to(Path.cwd()) else out}: {out.stat().st_size / 1024:.0f} KB')
