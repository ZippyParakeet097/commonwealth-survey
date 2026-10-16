import { units, perUnit, fmtArea } from './geo.js';
import { $, NSS, mk, prefs } from './util.js';

// The scale grid: even squares of real ground over the survey area (the game map plus the
// theorized Glowing Sea beyond its edge), counted from that area's northwest corner.
// Columns are lettered (A…Z, AA…) and rows numbered, so every square has a reference like F7.
const SIZES = { mi: [0.25, 0.5, 1, 2, 5, 10], km: [0.5, 1, 2, 5, 10, 20] };
const AUTO = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50];
const MIN_PX = 7;  // squares smaller than this on screen are not drawn

export const colName = i => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

export function createGrid(map, [ox, oy, ex, ey]) {
  const state = { on: prefs.get('grid.on', true), size: prefs.get('grid.size', 1) };  // size in the current unit, or 'auto'
  const lines = mk('path', { fill: 'none', stroke: 'var(--grid)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', 'shape-rendering': 'crispEdges' }, $('g-grid'));
  const major = mk('path', { fill: 'none', stroke: 'var(--grid)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'shape-rendering': 'crispEdges' }, $('g-grid'));
  const labs = $('g-gridlab');
  const listeners = [];
  let cellKm = 0, lastAuto = 0;

  // the size of one square in the current unit, honouring 'auto'
  function sizeNow(u) {
    if (state.size !== 'auto') return state.size;
    const pxPerUnit = perUnit() / u;
    return AUTO.find(s => s * pxPerUnit >= 56) || AUTO[AUTO.length - 1];
  }
  function render(u) {
    const size = sizeNow(u);
    cellKm = size * perUnit();
    if (state.size === 'auto' && size !== lastAuto) { lastAuto = size; queueMicrotask(() => listeners.forEach(f => f())); }
    const px = cellKm / u, show = state.on && px >= MIN_PX;
    $('g-grid').style.display = labs.style.display = show ? '' : 'none';
    readout(size, px);
    if (!show) return;
    const vb = map.vb, x0 = Math.max(ox, vb.x), x1 = Math.min(ex, vb.x + vb.w), y0 = Math.max(oy, vb.y), y1 = Math.min(ey, vb.y + vb.h);
    labs.textContent = '';
    if (x1 <= x0 || y1 <= y0) { lines.setAttribute('d', ''); major.setAttribute('d', ''); return; }
    const i0 = Math.ceil((x0 - ox) / cellKm), i1 = Math.floor((x1 - ox) / cellKm), j0 = Math.ceil((y0 - oy) / cellKm), j1 = Math.floor((y1 - oy) / cellKm);
    // every fifth line is heavier, so counting squares across a long stretch is easy; the area's edge is heavy too
    let d = '', dm = '';
    for (let i = i0; i <= i1; i++) { const s = `M${ox + i * cellKm} ${y0}V${y1}`; if (i % 5) d += s; else dm += s; }
    for (let j = j0; j <= j1; j++) { const s = `M${x0} ${oy + j * cellKm}H${x1}`; if (j % 5) d += s; else dm += s; }
    if (ex <= vb.x + vb.w) dm += `M${ex} ${y0}V${y1}`;
    if (ey <= vb.y + vb.h) dm += `M${x0} ${ey}H${x1}`;
    lines.setAttribute('d', d); major.setAttribute('d', dm);
    // references along the top and left edges of the view, thinned when squares are small
    const cs = Math.max(1, Math.ceil(30 / px)), rs = Math.max(1, Math.ceil(18 / px));
    const ty = y0 + u * 12, lx = x0 + u * 5;
    for (let i = Math.floor((x0 - ox) / cellKm); ox + i * cellKm < x1; i += 1) {
      if (i % cs) continue; const cx = ox + (i + .5) * cellKm; if (cx < x0 + u * 8 || cx > x1 - u * 8) continue;
      mk('text', { class: 't-grid', x: cx, y: ty, 'text-anchor': 'middle' }, labs).textContent = colName(i);
    }
    for (let j = Math.floor((y0 - oy) / cellKm); oy + j * cellKm < y1; j += 1) {
      if (j % rs) continue; const cy = oy + (j + .5) * cellKm; if (cy < y0 + u * 22 || cy > y1 - u * 4) continue;
      mk('text', { class: 't-grid', x: lx, y: cy + u * 3.5 }, labs).textContent = j + 1;
    }
  }
  function readout(size, px) {
    const area = fmtArea(cellKm * cellKm), dims = `${size} × ${size} ${units.unit}`;
    $('gridread').textContent = `${state.size === 'auto' ? 'Auto: ' : ''}${dims} = ${area}`;
    const key = $('gridkey');
    key.hidden = !state.on;
    key.textContent = !state.on ? '' : px >= MIN_PX ? `grid ${size} ${units.unit} square` : `zoom in for the ${size} ${units.unit} grid`;
  }
  function fillSizes() {
    const sel = $('gridsize');
    sel.innerHTML = `<option value="auto">Auto (fits the zoom)</option>` + SIZES[units.unit].map(s => `<option value="${s}">${s} ${units.unit}</option>`).join('');
    if (state.size !== 'auto' && !SIZES[units.unit].includes(state.size)) state.size = 1;
    sel.value = String(state.size);
  }
  const changed = () => { prefs.set('grid.on', state.on); prefs.set('grid.size', state.size); map.render(); listeners.forEach(f => f()); };
  $('L-grid').checked = state.on;
  $('L-grid').onchange = e => { state.on = e.target.checked; changed(); };
  $('gridsize').onchange = e => { state.size = e.target.value === 'auto' ? 'auto' : +e.target.value; changed(); };
  fillSizes();
  map.hooks.render.push(render);

  return {
    state,
    onChange: f => listeners.push(f),
    unitChanged() { fillSizes(); changed(); },
    // the square a sheet point falls in, e.g. "F7", or '' when the grid is off or the point is outside the survey area
    ref(p) { if (!state.on || !cellKm || p.x < ox || p.y < oy || p.x > ex || p.y > ey) return ''; return colName(Math.floor((p.x - ox) / cellKm)) + (Math.floor((p.y - oy) / cellKm) + 1); },
    label() { return `${toFixedSize(cellKm / perUnit())} ${units.unit} grid`; },
  };
}
const toFixedSize = v => +v.toFixed(2);
