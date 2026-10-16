// Validates data/locations.csv so a correction can't break the map: `npm run check`.
import { readFile } from 'node:fs/promises';
import { parseCSV } from '../js/data.js';
import { project } from '../js/geo.js';

const root = new URL('..', import.meta.url);
const rows = parseCSV(await readFile(new URL('data/locations.csv', root), 'utf8'));
const base = JSON.parse(await readFile(new URL('data/basemap.json', root), 'utf8'));
const nuka = JSON.parse(await readFile(new URL('data/nuka-world.geojson', root), 'utf8'));
const COLUMNS = ['name', 'label', 'type', 'marked', 'key', 'workshop', 'faction', 'game_x', 'game_y', 'lat', 'lon', 'position', 'real_counterpart', 'town', 'glowing_sea', 'note'];
const ENUM = {
  marked: ['yes', 'no'], key: ['0', '1', '2'], glowing_sea: ['yes', ''],
  workshop: ['', 'Base game', 'Automatron', 'Vault-Tec Workshop'], faction: ['', 'Brotherhood of Steel'],
  position: ['real landmark', 'likely real analogue', 'shares a real site', 'placed from game clues', 'extrapolated', 'extrapolated, moved to shore'],
};
// places the page refers to by name (route, hubs, site plans, Glowing Sea panel)
const REQUIRED = ['Sanctuary Hills', 'Diamond City', 'The Castle', 'Vault 111', 'Red Rocket truck stop', 'Museum of Freedom', 'Park Street station', 'Fort Hagen',
  'Goodneighbor', 'Rocky cave', 'Nuka-World transit center', 'Greenetech Genetics', 'The Institute', "Hangman's Alley", 'C.I.T. ruins', 'Fort Strong', 'Crater of Atom', 'Abernathy farm', 'The Prydwen'];

const errors = [];
const missingCols = COLUMNS.filter(c => !(c in (rows[0] || {})));
if (missingCols.length) errors.push(`missing columns: ${missingCols.join(', ')}`);
rows.forEach((r, i) => {
  const at = `row ${i + 2} (${r.name || 'no name'})`;
  if (!r.name.trim()) errors.push(`${at}: empty name`);
  for (const [c, ok] of Object.entries(ENUM)) if (!ok.includes(r[c])) errors.push(`${at}: ${c} "${r[c]}" is not one of ${ok.map(v => `"${v}"`).join(', ')}`);
  const lat = Number(r.lat), lon = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) { errors.push(`${at}: lat/lon must be numbers`); return; }
  const { x, y } = project(lat, lon);
  if (x < 0 || y < 0 || x > base.w || y > base.h) errors.push(`${at}: ${lat}, ${lon} falls outside the sheet`);
  if (r.marked === 'no' && (r.workshop || r.faction || r.key !== '0')) errors.push(`${at}: unmarked places take no workshop, faction or key`);
});
const marked = new Set(rows.filter(r => r.marked === 'yes').map(r => r.name));
for (const n of REQUIRED) if (!marked.has(n)) errors.push(`required place missing or unmarked: ${n}`);
// Nuka-World (data/nuka-world.geojson): one park point, and a road route from the transit center to it
{ const pt = nuka.features.find(f => f.geometry.type === 'Point'), ln = nuka.features.find(f => f.geometry.type === 'LineString'), tc = rows.find(r => r.name === 'Nuka-World transit center');
  if (!pt || !ln) errors.push('nuka-world.geojson: needs a Point (the park) and a LineString (the road route)');
  else if (tc) { const same = ([lon, lat], la, lo) => Math.abs(lat - la) < 1e-5 && Math.abs(lon - lo) < 1e-5, c = ln.geometry.coordinates;
    if (!same(c[0], +tc.lat, +tc.lon)) errors.push('nuka-world.geojson: the road route must start at the Nuka-World transit center in locations.csv');
    if (!same(c[c.length - 1], pt.geometry.coordinates[1], pt.geometry.coordinates[0])) errors.push('nuka-world.geojson: the road route must end at the park'); } }
const workshops = rows.filter(r => r.workshop).length;
if (workshops !== 30) errors.push(`expected 30 workshop settlements, found ${workshops}`);

if (errors.length) { console.error(errors.join('\n')); console.error(`\n${errors.length} problem(s) in data/locations.csv`); process.exit(1); }
console.log(`data/locations.csv OK: ${rows.length} places, ${marked.size} marked, ${workshops} workshop settlements`);
