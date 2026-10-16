import { project } from './geo.js';

const FILES = { base: 'basemap.json', sites: 'sites.json', plans: 'plans.json', gs: 'glowing-sea.json', csv: 'locations.csv' };

// The standalone build inlines every data file as window.__SURVEY_DATA__; the site fetches them.
export async function loadData() {
  if (window.__SURVEY_DATA__) return window.__SURVEY_DATA__;
  const out = {};
  await Promise.all(Object.entries(FILES).map(async ([k, f]) => {
    const r = await fetch('data/' + f);
    if (!r.ok) throw new Error(`data/${f}: HTTP ${r.status}`);
    out[k] = f.endsWith('.csv') ? await r.text() : await r.json();
  }));
  return out;
}

// RFC 4180 CSV: quoted fields may hold commas, doubled quotes and newlines
export function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.length > 1 || r[0]);
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// How each place was positioned (the CSV's `position` column)
const POSITION = {
  'real landmark': { k: 1 },
  'likely real analogue': { k: 1, likely: true },
  'shares a real site': { k: 2 },
  'placed from game clues': { k: 3 },
  'extrapolated': { k: 0 },
  'extrapolated, moved to shore': { k: 0, snap: true },
};

// One record per CSV row. `id` is the name, made unique where the game reuses one (several unmarked "Red Rocket"s).
export function buildPlaces(csvText) {
  const seen = new Map();
  return parseCSV(csvText).map(r => {
    const lat = +r.lat, lon = +r.lon, pos = POSITION[r.position] || { k: 0 };
    const c = (seen.get(r.name) || 0) + 1; seen.set(r.name, c);
    return {
      id: c > 1 ? `${r.name} (${c})` : r.name, n: r.name, label: r.label || r.name, t: r.type,
      kind: r.marked === 'yes' ? 'loc' : 'unm', key: +r.key || 0, mm: r.workshop, bos: r.faction === 'Brotherhood of Steel',
      lat, lon, ...project(lat, lon), k: pos.k, likely: !!pos.likely, snap: !!pos.snap,
      real: r.real_counterpart, town: r.town, gs: r.glowing_sea === 'yes', note: r.note, gx: +r.game_x, gy: +r.game_y,
    };
  });
}
