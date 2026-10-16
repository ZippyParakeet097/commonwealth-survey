import { km, compass, fmtDist, fmtLatLon, unproject } from './geo.js';
import { $, esc } from './util.js';

const rings = d => d.match(/M[^M]+/g).map(s => { const n = s.match(/-?\d+\.?\d*/g).map(Number); return n.filter((_, i) => !(i % 2)).map((x, i) => [x, n[2 * i + 1]]); });
const inside = (rs, x, y) => { let c = false; for (const r of rs) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const links = (lat, lon) => `<div class="links"><a href="https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&amp;mlon=${lon.toFixed(5)}#map=16/${lat.toFixed(5)}/${lon.toFixed(5)}" target="_blank" rel="noopener">OpenStreetMap ↗</a><a href="https://www.google.com/maps/search/?api=1&amp;query=${lat.toFixed(5)},${lon.toFixed(5)}" target="_blank" rel="noopener">Google Maps ↗</a></div>`;

export function createCard({ map, grid, byId, D }) {
  const tc = byId.get('Nuka-World transit center'), sanct = byId.get('Sanctuary Hills'), dc = byId.get('Diamond City'), castle = byId.get('The Castle');
  const A = D.gs.craters.atom, C = D.gs.craters.cam;
  const CRATER = { 'Crater of Atom': `Nuclear crater · ~${(A.kt / 1000).toFixed(0)} Mt`, 'Cambridge crater': `Nuclear crater · ~${C.kt} kt` };
  const gameArea = rings(D.base.footprint);
  let cur = null;  // {place} or {pin}
  const listeners = [];

  // distances to the three hubs, leaving out the one being shown
  const hubs = p => [[sanct, true], [dc], [castle]].filter(([h]) => h !== p).map(([h, dir]) => `<dt>${esc(h.n)}</dt><dd>${fmtDist(km(h, p))}${dir ? ' ' + compass(h, p) : ''}</dd>`).join('');
  const gridRow = p => { const r = grid.ref(p); return r ? `<dt>Grid square</dt><dd>${r} <span class="small">(${grid.label()})</span></dd>` : ''; };
  const setHash = h => { try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch { /* sandboxed */ } };

  function chipsFor(p) {
    if (p.kind === 'off') return '<span class="chip nw">Theorized location</span><span class="chip est">Off the sheet</span>';
    let c = p.kind === 'unm' ? '<span class="chip unm">Unmarked location</span>' : '';
    c += p.k === 2 ? '<span class="chip real">Shares a real site</span>'
      : p.k === 3 ? '<span class="chip real">Placed from game clues</span>'
      : p.k === 1 ? `<span class="chip real">${p.likely ? 'Likely real analogue' : 'Real landmark'}</span>`
      : '<span class="chip est">Estimated from game map</span>' + (p.snap ? '<span class="chip warn">Moved to shore</span>' : '');
    if (CRATER[p.n]) c += `<span class="chip gs">${CRATER[p.n]}</span>`;
    if (p.gs) c += '<span class="chip gs">Glowing Sea</span>';
    if (p.mm) c = `<span class="chip mm"><svg class="mmi" viewBox="0 0 556 359" aria-hidden="true"><use href="#mm-flag"/></svg>Workshop settlement · ${esc(p.mm)}</span>` + c;
    if (p.bos) c = '<span class="chip bos"><svg class="bosi" viewBox="0 0 100 100" aria-hidden="true"><use href="#bos-flat"/></svg>Brotherhood of Steel</span>' + c;
    return c;
  }
  // the field kit stamps the card; the chips already say the same in words
  const stampFor = p => p.bos ? 'Brotherhood' : p.mm ? 'Minutemen' : p.gs || CRATER[p.n] ? 'Hot zone' : '';
  function showPlace(p) {
    const stamp = stampFor(p);
    $('info').innerHTML = `<h2>Selected</h2>${stamp ? `<span class="rubber" aria-hidden="true">${stamp}</span>` : ''}<p class="place-name">${esc(p.n)}</p><div class="chips">${chipsFor(p)}</div>${p.note ? `<p class="lore">${esc(p.note)}</p>` : ''}
     <dl class="kv">${p.real ? `<dt>Real site</dt><dd class="txt">${esc(p.real)}</dd>` : ''}${p.town ? `<dt>Real town</dt><dd class="txt">${esc(p.town)}</dd>` : ''}${p.t && p.t !== p.n && p.t !== 'Unmarked' ? `<dt>Game type</dt><dd class="txt">${esc(p.t)}</dd>` : ''}
     <dt>Lat, lon</dt><dd>${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</dd>${gridRow(p)}${p.kind === 'off' ? `<dt>${esc(tc.n)}</dt><dd>${fmtDist(km(tc, p))} ${compass(tc, p)}</dd>` : ''}${hubs(p)}</dl>
     ${p.snap ? '<p class="small">The warp put this site in the sea. It was moved to the nearest shore.</p>' : ''}${p.sources?.length ? `<p class="small">Sources: ${p.sources.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('; ')}.</p>` : ''}${links(p.lat, p.lon)}`;
  }
  function showPin(pt) {
    const [lat, lon] = unproject(pt.x, pt.y);
    let best = null, bd = Infinity; map.locs.forEach(l => { const d = km(l, pt); if (d < bd) { bd = d; best = l; } });
    const inGame = inside(gameArea, pt.x, pt.y);
    $('info').innerHTML = `<h2>Dropped pin</h2><p class="place-name">${fmtLatLon(lat, lon)}</p><div class="chips">${inGame ? '<span class="chip mm">Inside the game map</span>' : '<span class="chip est">Outside the game map</span>'}</div>
     <dl class="kv">${gridRow(pt)}<dt>Nearest place</dt><dd class="txt">${esc(best.n)}</dd><dt>…away</dt><dd>${fmtDist(bd, 2)} ${compass(best, pt)}</dd>${hubs(pt)}</dl>
     <p class="small">Click a location to select it instead, or empty ground to move the pin.</p>${links(lat, lon)}`;
  }
  const api = {
    select(p, zoom) {
      cur = { place: p }; map.sel = p; map.setPin(null);
      if (zoom) map.focus(p);
      showPlace(p); setHash('place=' + encodeURIComponent(p.id)); listeners.forEach(f => f(cur));
    },
    pin(pt) {
      cur = { pin: pt }; map.sel = null; map.setPin(pt);
      showPin(pt); const [lat, lon] = unproject(pt.x, pt.y); setHash(`pin=${lat.toFixed(5)},${lon.toFixed(5)}`); listeners.forEach(f => f(cur));
    },
    refresh() { if (cur?.place) showPlace(cur.place); else if (cur?.pin) showPin(cur.pin); },
    // f({place} or {pin}) after each selection
    onChange: f => listeners.push(f),
  };
  return api;
}
