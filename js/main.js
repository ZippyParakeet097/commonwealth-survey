import { units, project, unproject, fmtLatLon } from './geo.js';
import { $, on, prefs, announce } from './util.js';
import { loadData, buildPlaces, buildNukaWorld } from './data.js';
import { createMap } from './map.js';
import { createGrid } from './grid.js';
import { createMeasure } from './measure.js';
import { createCard } from './card.js';
import { createPanels } from './panels.js';
import { makePlans } from './plans.js';
import { createRegion } from './region.js';
import { createPipBoy } from './pipboy.js';

async function main() {
  const pip = createPipBoy();
  let D;
  try { D = await loadData(); } catch (err) {
    $('loading').innerHTML = location.protocol === 'file:'
      ? 'This page loads its map data with <code>fetch</code>, which browsers block for files opened from disk.<br>Run <code>npm start</code> in the project folder, or build the single-file version with <code>npm run build</code>.'
      : `Could not load the map data (${String(err.message || err).replace(/</g, '&lt;')}).`;
    return;
  }
  units.unit = prefs.get('unit', 'mi') === 'km' ? 'km' : 'mi';
  const places = buildPlaces(D.csv);
  const nw = buildNukaWorld(D.nw);  // off the sheet, so kept out of the place lists and tables
  const byId = new Map([...places, nw].map(p => [p.id, p]));
  const map = createMap({ D, places, byId, nw });
  // the grid covers the game map and the theorized Glowing Sea south and west of it
  const g = map.gameBox, s = D.gs.zone.box;
  const grid = createGrid(map, [Math.min(g[0], s[0]), Math.min(g[1], s[1]), Math.max(g[2], s[2]), Math.max(g[3], s[3])]);
  const measure = createMeasure(map);
  const card = createCard({ map, grid, byId, D });
  createRegion({ D, nw, tc: byId.get('Nuka-World transit center') });
  const plans = makePlans(D.plans, byId);
  // anything that shows a place from another tab switches to the map first (the map needs its size
  // to fit a view), then brings the map into view and gives it focus, so keyboard users land on it
  // (focus waits a frame, until the caller has moved the view, so the crosshair starts on the new place)
  const showMap = () => { if (pip.tab !== 'map') pip.show('map'); map.wrap.scrollIntoView({ block: 'nearest' }); requestAnimationFrame(() => map.svg.focus({ preventScroll: true })); };
  const panels = createPanels({ map, card, measure, byId, D, showMap });

  const reveal = p => { if (p.kind === 'unm' && !on('unm')) $('L-unm').click(); if (p.bos && !on('bos')) $('L-bos').click(); };
  map.hooks.tap = (pt, p) => {
    if (measure.active) measure.add(pt, p);
    else if (p) { card.select(p); announce(`Selected ${p.n}${p.town ? ', ' + p.town : ''}. Details are in the place card.`); }
    else { card.pin(pt); const [lat, lon] = unproject(pt.x, pt.y); announce(`Dropped a pin at ${fmtLatLon(lat, lon)}.`); }
  };
  // what the crosshair is over, said once the keys stop
  let kbdTimer = 0;
  map.hooks.kbd = (pt, p) => { clearTimeout(kbdTimer); kbdTimer = setTimeout(() => {
    const ref = grid.ref(pt); announce(p ? `Crosshair on ${p.n}${ref ? ', square ' + ref : ''}.` : ref ? `Crosshair in square ${ref}.` : ''); }, 700); };
  map.hooks.move = pt => {
    const [lat, lon] = unproject(pt.x, pt.y), ref = grid.ref(pt), c = $('cursor');
    c.textContent = fmtLatLon(lat, lon) + (ref ? ` · ${ref}` : ''); c.hidden = false;
    measure.hover(pt);
  };
  map.hooks.leave = () => { $('cursor').hidden = true; measure.leave(); };
  grid.onChange(() => card.refresh());

  // find a place
  const dl = $('places');
  [...places, nw].sort((a, b) => (a.kind === 'unm') - (b.kind === 'unm') || a.id.localeCompare(b.id)).forEach(p => { const o = document.createElement('option'); o.value = p.id; if (p.kind === 'unm') o.label = 'unmarked'; dl.appendChild(o); });
  $('q').addEventListener('change', e => { const p = byId.get(e.target.value.trim()); if (p) { reveal(p); card.select(p, true); announce(`Selected ${p.n}. The map is centred on it.`); } });
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { map.VIEWS[b.dataset.view](); announce(`Map view: ${b.textContent}.`); });

  // units
  const unitButtons = document.querySelectorAll('[data-unit]');
  const setUnit = u => { units.unit = u; prefs.set('unit', u); unitButtons.forEach(b => b.setAttribute('aria-pressed', b.dataset.unit === u)); grid.unitChanged(); card.refresh(); panels.render(); measure.refresh(); };
  unitButtons.forEach(b => b.onclick = () => setUnit(b.dataset.unit));
  unitButtons.forEach(b => b.setAttribute('aria-pressed', b.dataset.unit === units.unit));

  // site plans sit on hidden tabs until opened, so each redraws when it first gets (or changes) its width
  const planW = new Map();
  const planRO = new ResizeObserver(es => { if (es.some(e => { const w = e.contentRect.width; if (!w || Math.abs(w - (planW.get(e.target) || 0)) <= 2) return false; planW.set(e.target, w); return true; })) plans.draw(); });
  document.querySelectorAll('.plan:not(#plan-nw) svg').forEach(s => planRO.observe(s));
  document.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { showMap(); map.fitBox(plans.PLANS[b.dataset.plan].box); announce(`Showing ${b.closest('.plan').querySelector('h3').firstChild.textContent} on the map.`); });

  // a shared link opens on its place or pin: #place=Diamond%20City, #pin=42.35,-71.06
  const h = new URLSearchParams(location.hash.slice(1));
  const linked = h.get('place') && byId.get(h.get('place')), pin = (h.get('pin') || '').split(',').map(Number);
  if (linked) { reveal(linked); card.select(linked, true); }
  else if (pin.length === 2 && pin.every(Number.isFinite)) { const pt = project(pin[0], pin[1]); card.pin(pt); map.focus(pt); }
  else { map.VIEWS.game(); card.select(byId.get('Sanctuary Hills')); }
  measure.refresh();
  $('loading').hidden = true;
}
main();
