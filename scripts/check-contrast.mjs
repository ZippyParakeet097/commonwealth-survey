// Checks the Pip-Boy palette against WCAG 2.2 AA for every tint: `npm run check`.
// Every shade in css/survey.css is a mix of the tint with black (color-mix in srgb), so this reads
// the tints and the mix percentages straight from the stylesheet and works out each pair's contrast.
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../css/survey.css', import.meta.url), 'utf8');
const tints = Object.fromEntries([...css.matchAll(/html\[data-tint="(\w+)"\]\s*\{\s*--c:\s*(#[0-9a-f]{6})/gi)].map(m => [m[1], m[2]]));
const root = css.slice(css.indexOf(':root {'), css.indexOf('html[data-tint="'));
const mixes = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*color-mix\(in srgb, var\(--c\) ([\d.]+)%, #000\)/g)].map(m => [m[1], +m[2] / 100]));
// prefers-contrast: more raises some shades; check that block's values too
const more = css.slice(css.indexOf('@media (prefers-contrast: more)'));
const moreMixes = Object.fromEntries([...more.slice(0, more.indexOf('\n}\n')).matchAll(/--([\w-]+):\s*color-mix\(in srgb, var\(--c\) ([\d.]+)%, #000\)/g)].map(m => [m[1], +m[2] / 100]));

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = rgb => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [foreground, background, minimum, what it is]
const PAIRS = [
  ['c', 'bg', 4.5, 'text on the screen'], ['c', 'bg2', 4.5, 'text on a panel'], ['c', 'land', 4.5, 'map labels on land'], ['c', 'hover', 4.5, 'text on a hovered row'],
  ['bg', 'c', 4.5, 'text on the selection bar and key caps'],
  ['body', 'bg', 4.5, 'reading text'], ['body', 'bg2', 4.5, 'reading text on a panel'],
  ['text2', 'bg', 4.5, 'secondary text'], ['text2', 'bg2', 4.5, 'secondary text on a panel'], ['text2', 'land', 4.5, 'town and river names on land'], ['text2', 'hover', 4.5, 'secondary text on a hovered row'],
  ['line', 'bg', 3, 'edges of buttons and fields'], ['line', 'bg2', 3, 'edges of buttons and fields on a panel'],
  ['c', 'bg', 3, 'focus ring'], ['coast', 'land', 3, 'coastline against land'], ['coast', 'bg', 3, 'coastline against sea'],
];

let bad = 0;
for (const [name, tint] of Object.entries(tints)) {
  for (const [label, set] of [['', mixes], [' (more contrast)', { ...mixes, ...moreMixes }]]) {
    const T = hex(tint), col = k => k === 'c' ? T : T.map(v => Math.round(v * set[k]));
    const rows = PAIRS.map(([f, b, min, what]) => { const r = ratio(col(f), col(b)), ok = r >= min; if (!ok) bad++; return `${ok ? ' ok ' : 'FAIL'} ${r.toFixed(2).padStart(5)} ≥ ${min}  ${f} on ${b}: ${what}`; });
    const show = process.argv.includes('--verbose') ? rows : rows.filter(r => r.startsWith('FAIL'));
    if (show.length) console.log(`${name} ${tint}${label}\n  ${show.join('\n  ')}`);
  }
}
for (const k of new Set(PAIRS.flatMap(p => [p[0], p[1]]))) if (k !== 'c' && !(k in mixes)) { console.error(`--${k} is not a color-mix of --c with black in :root`); bad++; }
if (!Object.keys(tints).length) { console.error('no tints found in css/survey.css'); bad++; }
if (bad) { console.error(`${bad} contrast check(s) failed`); process.exit(1); }
console.log(`Contrast OK: ${Object.keys(tints).length} tints × ${PAIRS.length} pairs meet WCAG 2.2 AA`);
