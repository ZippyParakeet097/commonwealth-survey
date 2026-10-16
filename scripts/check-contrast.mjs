// Checks both looks against WCAG 2.2 AA: the Pip-Boy for every tint, its casing, and the field survey kit. `npm run check`.
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
  ['c', 'glass', 4.5, 'text on the lit middle of the glass'], ['body', 'glass', 4.5, 'reading text on the glass'], ['text2', 'glass', 4.5, 'secondary text on the glass'], ['line', 'glass', 3, 'edges of controls on the glass'],
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

// The field survey kit sets plain hex colours in its own block, and raises a few under prefers-contrast: more
const block = sel => { const i = css.indexOf(sel); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
const hexes = b => Object.fromEntries([...b.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(m => [m[1], m[2]]));

// The Pip-Boy's casing is fixed paint on metal, the same for every tint: the tabs' labels on the lamp plate
const casing = hexes(block('html[data-theme="pip"] {'));
const CASE_PAIRS = [['paint', 'plate-hi', 4.5, 'a tab\'s label on the lamp plate'], ['paint-on', 'plate-hi', 4.5, 'the open tab\'s label'], ['paint', 'plate-hi', 3, 'focus ring on the lamp plate']];
{ const rows = CASE_PAIRS.map(([f, b, min, what]) => {
    if (!casing[f] || !casing[b]) { bad++; return `FAIL  --${casing[f] ? b : f} is not a hex colour in the Pip-Boy block`; }
    const r = ratio(hex(casing[f]), hex(casing[b])), ok = r >= min; if (!ok) bad++; return `${ok ? ' ok ' : 'FAIL'} ${r.toFixed(2).padStart(5)} ≥ ${min}  ${f} on ${b}: ${what}`; });
  const show = process.argv.includes('--verbose') ? rows : rows.filter(r => r.startsWith('FAIL'));
  if (show.length) console.log(`Pip-Boy casing\n  ${show.join('\n  ')}`); }
const field = hexes(block('html[data-theme="field"] {'));
const fieldMore = hexes(block('html[data-theme="field"] { --text2'));
const FIELD_PAIRS = [
  ['c', 'bg', 4.5, 'text on paper'], ['c', 'bg2', 4.5, 'text on a panel'], ['c', 'card', 4.5, 'text on the index card'], ['c', 'land', 4.5, 'map labels on land'], ['c', 'hover', 4.5, 'text on a hovered row or tab'],
  ['bg', 'od', 4.5, 'text on a pressed button and the selection bar'], ['body', 'bg', 4.5, 'reading text'], ['body', 'bg2', 4.5, 'reading text on a panel'],
  ['text2', 'bg', 4.5, 'secondary text'], ['text2', 'bg2', 4.5, 'secondary text on a panel'], ['text2', 'card', 4.5, 'secondary text on the index card'], ['text2', 'land', 4.5, 'town and river names on land'], ['text2', 'hover', 4.5, 'secondary text on a hovered row or tab'],
  ['pencil', 'bg', 4.5, 'grease pencil on paper'], ['pencil', 'card', 4.5, 'the rubber stamp'], ['pencil', 'land', 4.5, 'measurements on land'],
  ['line', 'bg', 3, 'edges of fields'], ['line', 'bg2', 3, 'edges of fields on a panel'], ['pencil', 'bg', 3, 'focus ring'],
  ['coast', 'land', 3, 'coastline against land'], ['coast', 'sea', 3, 'coastline against sea'],
];
let fieldCount = 0;
for (const [label, set] of [['', field], [' (more contrast)', { ...field, ...fieldMore }]]) {
  const rows = FIELD_PAIRS.map(([f, b, min, what]) => {
    if (!set[f] || !set[b]) { bad++; return `FAIL  --${set[f] ? b : f} is not a hex colour in the field block`; }
    const r = ratio(hex(set[f]), hex(set[b])), ok = r >= min; if (!ok) bad++; return `${ok ? ' ok ' : 'FAIL'} ${r.toFixed(2).padStart(5)} ≥ ${min}  ${f} on ${b}: ${what}`; });
  const show = process.argv.includes('--verbose') ? rows : rows.filter(r => r.startsWith('FAIL'));
  if (show.length) console.log(`field survey kit${label}\n  ${show.join('\n  ')}`);
  fieldCount = FIELD_PAIRS.length;
}

if (bad) { console.error(`${bad} contrast check(s) failed`); process.exit(1); }
console.log(`Contrast OK: ${Object.keys(tints).length} tints × ${PAIRS.length} pairs, the Pip-Boy casing's ${CASE_PAIRS.length}, and the field kit's ${fieldCount} pairs, meet WCAG 2.2 AA`);
