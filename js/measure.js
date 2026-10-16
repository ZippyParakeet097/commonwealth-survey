import { km, fmtDist, fmtWalk } from './geo.js';
import { $, NSS, mk, esc, announce } from './util.js';

// The main quest from the vault to the Courser, stop by stop. After Greenetech the Sole Survivor
// builds a signal interceptor and teleports into the Institute, so that stretch is left out.
export const SEARCH = [
  ['Vault 111', 'Out of Time'],
  ['Sanctuary Hills', 'Out of Time'],
  ['Red Rocket truck stop', 'Out of Time'],
  ['Museum of Freedom', 'When Freedom Calls'],
  ['Diamond City', 'Jewel of the Commonwealth'],
  ['Park Street station', 'Unlikely Valentine'],
  ['Diamond City', 'Getting a Clue'],
  ['Fort Hagen', 'Reunions'],
  ['Goodneighbor', 'Dangerous Minds'],
  ['Rocky cave', 'The Glowing Sea'],
  ['Greenetech Genetics', 'Hunter/Hunted'],
];

const legsOf = pts => pts.slice(1).map((p, i) => km(pts[i], p));

export function createMeasure(map) {
  const g = $('g-meas');
  const casing = mk('polyline', { fill: 'none', stroke: 'var(--halo)', 'stroke-width': 8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, g);
  const line = mk('polyline', { fill: 'none', stroke: 'var(--meas)', 'stroke-width': 3.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, g);
  const band = mk('line', { stroke: 'var(--meas)', 'stroke-width': 1.5, 'stroke-dasharray': '4 4', 'vector-effect': 'non-scaling-stroke' }, g);
  const verts = mk('g', {}, g), labs = mk('g', {}, g);
  const st = { pts: [], active: false, hover: null, title: '' };
  const listeners = [];

  function render(u) {
    const pts = st.pts;
    line.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' ')); casing.setAttribute('points', line.getAttribute('points'));
    const last = pts[pts.length - 1], h = st.active && st.hover && last ? st.hover : null;
    if (h) { band.setAttribute('x1', last.x); band.setAttribute('y1', last.y); band.setAttribute('x2', h.x); band.setAttribute('y2', h.y); }
    band.style.display = h ? '' : 'none';
    verts.textContent = ''; labs.textContent = '';
    pts.forEach((p, i) => mk('circle', { cx: p.x, cy: p.y, r: u * (i === 0 || i === pts.length - 1 ? 4.5 : 3.2), fill: i === 0 ? 'var(--meas)' : 'var(--land)', stroke: 'var(--meas)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, verts));
    // a distance on each leg long enough to hold one, the running total at the end
    legsOf(pts).forEach((d, i) => {
      const a = pts[i], b = pts[i + 1]; if (d / u < 90) return;
      let ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; if (ang > 90 || ang < -90) ang += 180;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      mk('text', { class: 't-meas', x: mx, y: my - u * 5, 'text-anchor': 'middle', transform: `rotate(${ang} ${mx} ${my})` }, labs).textContent = fmtDist(d);
    });
    if (pts.length > 1) mk('text', { class: 't-meas', x: last.x + u * 9, y: last.y - u * 8 }, labs).textContent = `Σ ${fmtDist(total())}`;
    if (h) mk('text', { class: 't-meas', x: h.x + u * 9, y: h.y + u * 14 }, labs).textContent = `+${fmtDist(km(last, h), 2)}`;
  }
  const total = () => legsOf(st.pts).reduce((a, b) => a + b, 0);
  function panel() {
    const n = st.pts.length, t = total();
    $('m-toggle').setAttribute('aria-pressed', st.active); $('m-toggle').textContent = st.active ? 'Done measuring' : 'Measure a route';
    $('m-undo').disabled = !n; $('m-clear').disabled = !n;
    $('modebar').hidden = !st.active; map.svg.classList.toggle('measuring', st.active);
    const from = st.pts[0]?.p, to = st.pts[n - 1]?.p;
    $('m-out').innerHTML = n < 2 ? '' : (st.title ? `<dt>Route</dt><dd class="txt">${esc(st.title)}</dd>` : '')
      + (from && to && !st.title ? `<dt>From</dt><dd class="txt">${esc(from.n)}</dd><dt>To</dt><dd class="txt">${esc(to.n)}</dd>` : '')
      + `<dt>Distance</dt><dd>${fmtDist(t, 2)}</dd><dt>Legs</dt><dd>${n - 1}</dd><dt>On foot, 3 mph</dt><dd>${fmtWalk(t)}</dd>`;
    listeners.forEach(f => f());
  }
  const changed = () => { map.render(); panel(); };
  function setActive(v) { st.active = v; if (!v) st.hover = null; changed();
    announce(v ? 'Measuring. Click the map, or move the crosshair and press Enter, to add points.' : st.pts.length > 1 ? `Stopped measuring: ${fmtDist(total(), 2)} over ${st.pts.length - 1} legs.` : 'Stopped measuring.'); }

  $('m-toggle').onclick = () => setActive(!st.active);
  $('m-undo').onclick = () => api.undo();
  $('m-clear').onclick = () => { st.pts = []; st.title = ''; changed(); };
  document.addEventListener('keydown', e => {
    if (!st.active || e.target.closest('input, select, textarea')) return;
    if (e.key === 'Escape') setActive(false);
    else if (e.key === 'Backspace') { e.preventDefault(); api.undo(); }
  });
  map.hooks.render.push(render);

  const api = {
    get active() { return st.active; },
    // a tap while measuring adds a point, snapped to the place under it if there is one
    add(pt, place) { if (st.title) { st.title = ''; } st.pts.push(place ? { x: place.x, y: place.y, p: place } : { x: pt.x, y: pt.y }); changed();
      announce(`Point ${st.pts.length}${place ? ', ' + place.n : ''}. ${st.pts.length > 1 ? fmtDist(total(), 2) + ' so far.' : ''}`); },
    undo() { st.pts.pop(); if (!st.pts.length) st.title = ''; changed(); announce(st.pts.length ? `Removed a point. ${fmtDist(total(), 2)} so far.` : 'No points left.'); },
    // the rubber band only redraws this layer, not the whole map
    hover(pt) { if (!st.active) return; st.hover = pt; render(map.u); },
    leave() { if (st.hover) { st.hover = null; render(map.u); } },
    route(places, title) { st.pts = places.map(p => ({ x: p.x, y: p.y, p })); st.title = title; st.active = false; changed(); announce(`${title}: ${fmtDist(total(), 1)} over ${places.length - 1} legs, shown on the map.`); },
    onChange: f => listeners.push(f),
    refresh: panel,
  };
  return api;
}
