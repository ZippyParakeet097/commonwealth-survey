import { units, project, unproject, fmtLatLon } from './geo.js';
import { $, on, prefs } from './util.js';
import { loadData, buildPlaces } from './data.js';
import { createMap } from './map.js';
import { createGrid } from './grid.js';
import { createMeasure } from './measure.js';
import { createCard } from './card.js';
import { createPanels } from './panels.js';
import { makePlans } from './plans.js';

async function main() {
  let D;
  try { D = await loadData(); } catch (err) {
    $('loading').innerHTML = location.protocol === 'file:'
      ? 'This page loads its map data with <code>fetch</code>, which browsers block for files opened from disk.<br>Run <code>npm start</code> in the project folder, or build the single-file version with <code>npm run build</code>.'
      : `Could not load the map data (${String(err.message || err).replace(/</g, '&lt;')}).`;
    return;
  }
  units.unit = prefs.get('unit', 'mi') === 'km' ? 'km' : 'mi';
  const places = buildPlaces(D.csv);
  const byId = new Map(places.map(p => [p.id, p]));
  const map = createMap({ D, places, byId });
  // the grid covers the game map and the theorized Glowing Sea south and west of it
  const g = map.gameBox, s = D.gs.zone.box;
  const grid = createGrid(map, [Math.min(g[0], s[0]), Math.min(g[1], s[1]), Math.max(g[2], s[2]), Math.max(g[3], s[3])]);
  const measure = createMeasure(map);
  const card = createCard({ map, grid, byId, D });
  const plans = makePlans(D.plans, byId);
  const panels = createPanels({ map, card, measure, byId, D });

  const reveal = p => { if (p.kind === 'unm' && !on('unm')) $('L-unm').click(); if (p.bos && !on('bos')) $('L-bos').click(); };
  map.hooks.tap = (pt, p) => { if (measure.active) measure.add(pt, p); else if (p) card.select(p); else card.pin(pt); };
  map.hooks.move = pt => {
    const [lat, lon] = unproject(pt.x, pt.y), ref = grid.ref(pt), c = $('cursor');
    c.textContent = fmtLatLon(lat, lon) + (ref ? ` · ${ref}` : ''); c.hidden = false;
    measure.hover(pt);
  };
  map.hooks.leave = () => { $('cursor').hidden = true; measure.leave(); };
  grid.onChange(() => card.refresh());

  // find a place
  const dl = $('places');
  [...places].sort((a, b) => (a.kind === 'unm') - (b.kind === 'unm') || a.id.localeCompare(b.id)).forEach(p => { const o = document.createElement('option'); o.value = p.id; if (p.kind === 'unm') o.label = 'unmarked'; dl.appendChild(o); });
  $('q').addEventListener('change', e => { const p = byId.get(e.target.value.trim()); if (p) { reveal(p); card.select(p, true); } });
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => map.VIEWS[b.dataset.view]());

  // units
  const unitButtons = document.querySelectorAll('[data-unit]');
  const setUnit = u => { units.unit = u; prefs.set('unit', u); unitButtons.forEach(b => b.setAttribute('aria-pressed', b.dataset.unit === u)); grid.unitChanged(); card.refresh(); panels.render(); measure.refresh(); };
  unitButtons.forEach(b => b.onclick = () => setUnit(b.dataset.unit));
  unitButtons.forEach(b => b.setAttribute('aria-pressed', b.dataset.unit === units.unit));

  // site plans redraw when their width changes
  let planW = 0;
  new ResizeObserver(() => { const w = document.querySelector('.plan svg').clientWidth; if (Math.abs(w - planW) > 2) { planW = w; plans.draw(); } }).observe(document.querySelector('.plans'));
  document.querySelectorAll('.plan-go[data-plan]').forEach(b => b.onclick = () => { map.fitBox(plans.PLANS[b.dataset.plan].box); map.wrap.scrollIntoView({ behavior: 'smooth', block: 'center' }); });

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
