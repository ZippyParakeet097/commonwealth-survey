import { FT_PER_KM, km } from './geo.js';
import { $, NSS, P, esc } from './util.js';

// Textures for the one-colour screen, where layers differ by pattern rather than hue: marsh tufts for
// wetlands, heavy and light hatching for the Glowing Sea and its theorized reach, stipple for bare
// ground, rows for seating and cross-hatching for Brotherhood of Steel ground. Sizes are screen pixels, scaled by u (sheet km per pixel), so they read
// the same at every zoom; the main map rescales them as it zooms (see data-rot).
export const patterns = (pid, u) => {
  const pt = (id, w, h, rot, body) => `<pattern id="${pid}-${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}" data-rot="${rot}" patternTransform="scale(${u})${rot ? ` rotate(${rot})` : ''}">${body}</pattern>`;
  return '<defs>'
    + pt('tuft', 16, 13, 0, '<path d="M1.5 6h5.5M2.9 6l-.8-3M4.25 6V2.4M5.6 6l.8-3M9.5 12.5h5.5M10.9 12.5l-.8-3M12.25 12.5V8.9M13.6 12.5l.8-3" fill="none" stroke="var(--wet)" stroke-width="1"/>')
    + pt('hatch', 6, 6, 45, '<rect width="2.2" height="6" fill="var(--gs-hatch)"/>')
    + pt('hatch2', 9, 9, 45, '<rect width="1.1" height="9" fill="var(--gs-hatch)"/>')
    + pt('stip', 4, 4, 0, '<circle cx="2" cy="2" r=".85" fill="var(--dirt)"/>')
    + pt('seat', 3.5, 3.5, -30, '<rect width="1.3" height="3.5" fill="var(--line)"/>')
    + pt('bos', 7, 7, 45, '<path d="M0 0H7M0 0V7" stroke="var(--stream)" stroke-width="1.6" fill="none"/>')
    + '</defs>';
};

// Site-plan layers, shared by the main map (zoomed in) and the figures. `pid` names the patterns of
// the drawing they are in. Buildings are outlines with a faint fill, as on the game's local map.
export function fenLayers(F, pid) {
  return P(F.bldg, 'var(--bldg)', `stroke="var(--line)" stroke-width=".8" ${NSS}`)
   + (F.street ? `<path d="${F.street}" fill="none" stroke="var(--street)" stroke-width="5" stroke-linecap="round" ${NSS}/>` : '')
   + P(F.outline, 'var(--stand)', `stroke="var(--ink)" stroke-width="1.6" ${NSS}`)
   + P(F.grass, 'var(--grass)', `stroke="var(--line)" stroke-width="1" ${NSS}`) + P(F.dirt, `url(#${pid}-stip)`) + P(F.seats, `url(#${pid}-seat)`, `stroke="var(--line)" stroke-width=".6" ${NSS}`)
   + P(F.monster, 'var(--monster)') + (F.wall ? `<path d="${F.wall}" fill="none" stroke="var(--ink)" stroke-width="1.2" ${NSS}/>` : '');
}
export function castleLayers(C) {
  return P(C.land, 'var(--land)') + P(C.island, 'var(--land)', `stroke="var(--coast)" stroke-width="1" ${NSS}`) + P(C.grass, 'var(--grass)')
   + (C.street ? `<path d="${C.street}" fill="none" stroke="var(--street)" stroke-width="2.5" stroke-linecap="round" ${NSS}/>` : '')
   + (C.pier ? `<path d="${C.pier}" fill="none" stroke="var(--line)" stroke-width="2" ${NSS}/>` : '')
   + P(C.bldg, 'var(--bldg)', `stroke="var(--line)" stroke-width=".8" ${NSS}`)
   + P(C.fort, 'var(--site)', `stroke="var(--loc)" stroke-width="2" ${NSS}`)
   + (C.wall ? `<path d="${C.wall}" fill="none" stroke="var(--loc)" stroke-width="1.2" ${NSS}/>` : '');
}
export function hangLayers(H) {
  return P(H.land, 'var(--land)') + P(H.water, 'var(--water)', `stroke="var(--coast)" stroke-width="1" ${NSS}`) + P(H.grass, 'var(--grass)')
   + (H.fwy ? `<path d="${H.fwy}" fill="none" stroke="var(--street)" stroke-width="7" stroke-linecap="round" ${NSS}/>` : '')
   + (H.street ? `<path d="${H.street}" fill="none" stroke="var(--street)" stroke-width="4" stroke-linecap="round" ${NSS}/>` : '')
   + P(H.bldg, 'var(--bldg)', `stroke="var(--line)" stroke-width=".8" ${NSS}`)
   + `<path d="${H.alley}" fill="none" stroke="var(--loc)" stroke-width="5" stroke-linecap="round" ${NSS}/>`;
}
export function strongLayers(S, pid) {
  return P(S.island, 'var(--land)', `stroke="var(--coast)" stroke-width="1" ${NSS}`) + P(S.wood, 'var(--grass)') + P(S.beach, `url(#${pid}-stip)`)
   + (S.pier ? `<path d="${S.pier}" fill="none" stroke="var(--line)" stroke-width="2" ${NSS}/>` : '')
   + P(S.bldg, 'var(--bldg)', `stroke="var(--line)" stroke-width=".8" ${NSS}`);
}
export const planDetail = (PL, pid) => hangLayers(PL.hang) + fenLayers(PL.fen, pid) + castleLayers(PL.castle) + strongLayers(PL.strong, pid);

function northAndScale(g, b, u, ft) {
  const [x0, y0, x1, y1] = b, pad = u * 16, len = ft / FT_PER_KM;
  g.insertAdjacentHTML('beforeend', `<g><line x1="${x0 + pad}" y1="${y1 - pad}" x2="${x0 + pad + len}" y2="${y1 - pad}" stroke="var(--ink)" stroke-width="2" ${NSS}/>`
    + `<line x1="${x0 + pad}" y1="${y1 - pad - u * 5}" x2="${x0 + pad}" y2="${y1 - pad + u * 1}" stroke="var(--ink)" stroke-width="2" ${NSS}/>`
    + `<line x1="${x0 + pad + len}" y1="${y1 - pad - u * 5}" x2="${x0 + pad + len}" y2="${y1 - pad + u * 1}" stroke="var(--ink)" stroke-width="2" ${NSS}/>`
    + `<text class="t-plan sub" x="${x0 + pad}" y="${y1 - pad - u * 8}">${ft} ft</text>`
    + `<path d="M${x1 - pad} ${y0 + pad} l${-u * 6} ${u * 16} l${u * 6} ${-u * 4} l${u * 6} ${u * 4}Z" fill="var(--ink)"/>`
    + `<text class="t-plan sub" x="${x1 - pad}" y="${y0 + pad + u * 30}" text-anchor="middle">N</text></g>`);
}
const T = (x, y, cls, text, extra = '') => `<text class="t-plan ${cls}" x="${x}" y="${y}" ${extra}>${esc(text)}</text>`;

export function makePlans(PL, byId) {
  const dc = byId.get('Diamond City'), hang = byId.get("Hangman's Alley");
  const PLANS = {
    fen: { box: PL.fen.box, ft: 200, draw: u => {
      const F = PL.fen, [hx, hy] = F.home, [mx, my] = F.monster_c;
      let s = fenLayers(F, 'p-fen');
      s += F.labels.filter(l => l.n !== 'Boylston St').map(l => T(l.x, l.y, 'street', l.n, `text-anchor="middle" transform="rotate(${l.r} ${l.x} ${l.y})" dy="${u * 4}"`)).join('');
      s += `<rect x="${hx - u * 4}" y="${hy - u * 4}" width="${u * 8}" height="${u * 8}" fill="var(--land)" stroke="var(--ink)" stroke-width="1.5" ${NSS} transform="rotate(45 ${hx} ${hy})"/>`;
      s += T(hx + u * 10, hy + u * 16, '', 'Home plate');
      s += T(mx, my + u * 18, 'mon', 'Green Monster', 'text-anchor="middle"') + T(mx, my + u * 30, 'sub', 'left-field wall', 'text-anchor="middle"');
      const fx = hx + (mx - hx) * .4 + u * 34, fy = hy + (my - hy) * .4;
      s += T(fx, fy, 'loc', 'Field', 'text-anchor="middle"') + T(fx, fy + u * 13, 'sub', 'market & homes (game)', 'text-anchor="middle"');
      return s; } },
    castle: { box: PL.castle.box, ft: 200, draw: u => {
      const C = PL.castle; let s = castleLayers(C);
      const cx = C.bastions.reduce((a, p) => a + p[0], 0) / 5, cy = C.bastions.reduce((a, p) => a + p[1], 0) / 5;
      C.bastions.forEach((p, i) => {
        s += `<circle cx="${p[0]}" cy="${p[1]}" r="${u * 9}" fill="var(--loc)"/>` + `<text class="t-plan" x="${p[0]}" y="${p[1] + u * 4}" text-anchor="middle" style="fill:var(--panel);stroke:none;font-size:calc(var(--u)*10px)">${i + 1}</text>`; });
      s += T(cx, cy - u * 4, 'loc', 'Fort Independence', 'text-anchor="middle"') + T(cx, cy + u * 10, 'sub', 'five bastions', 'text-anchor="middle"');
      return s; } },
    hang: { box: PL.hang.box, ft: 200, draw: u => {
      const H = PL.hang; let s = hangLayers(H);
      s += H.labels.map(l => T(l.x, l.y, 'street', l.n, `text-anchor="middle" transform="rotate(${l.r} ${l.x} ${l.y})" dy="${u * 4}"`)).join('');
      const [bx, by] = H.bridge; s += T(bx + u * 12, by, 'sub', 'Harvard Bridge to CIT ↑');
      H.ends.forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="${u * 5}" fill="var(--land)" stroke="var(--loc)" stroke-width="2" ${NSS}/>`; });
      const [mx, my] = H.mid;
      s += T(mx, my - u * 14, 'loc', "Hangman's Alley", 'text-anchor="middle"') + T(mx, my - u * 27, 'sub', 'Back Street', 'text-anchor="middle"');
      s += T(H.ends[0][0] - u * 8, H.ends[0][1] + u * 18, 'sub', 'Charlesgate gate', 'text-anchor="end"') + T(H.ends[1][0] + u * 8, H.ends[1][1] - u * 10, 'sub', 'bridge-foot gate');
      s += T(H.box[0] + u * 16, H.box[3] - u * 50, 'sub', `↙ Diamond City, ${(km(hang, dc) / 1.609344).toFixed(2)} mi`);
      return s; } },
    strong: { box: PL.strong.box, ft: 500, draw: u => {
      const S = PL.strong; let s = strongLayers(S, 'p-strong');
      const fort = S.points.find(q => q.kind === 'fort');
      [...S.points].sort((a, b) => a.y - b.y).forEach((p, i) => {
        if (p.kind === 'fort') return;
        const shape = p.kind === 'light' ? `<circle cx="${p.x}" cy="${p.y}" r="${u * 5}" fill="var(--land)" stroke="var(--ink)" stroke-width="2" ${NSS}/>`
          : `<rect x="${p.x - u * 4}" y="${p.y - u * 4}" width="${u * 8}" height="${u * 8}" fill="var(--bos)"/>`;
        const left = p.x < fort.x;
        s += shape + T(p.x + (left ? -u * 10 : u * 10), p.y + u * 4 + (i % 2 ? u * 4 : -u * 2), p.kind === 'light' ? 'sub' : '', p.n.replace('Battery ', 'Bty '), left ? 'text-anchor="end"' : '');
      });
      s += T(fort.x - u * 70, fort.y - u * 60, 'bos', 'Fort Strong', 'text-anchor="middle"') + T(fort.x - u * 70, fort.y - u * 47, 'sub', 'ruined batteries', 'text-anchor="middle"');
      s += T(S.box[0] + u * 16, S.box[3] - u * 50, 'sub', 'Long Island runs on southwest');
      return s; } },
  };
  function draw() {
    for (const key in PLANS) {
      const el = $('plan-' + key).querySelector('svg'), pl = PLANS[key], b = pl.box, w = b[2] - b[0], h = b[3] - b[1];
      el.setAttribute('viewBox', `${b[0]} ${b[1]} ${w} ${h}`);
      const u = w / (el.clientWidth || 400);
      el.style.setProperty('--u', u);
      el.innerHTML = patterns('p-' + key, u) + `<rect x="${b[0]}" y="${b[1]}" width="${w}" height="${h}" fill="var(--sea)"/>` + pl.draw(u);
      northAndScale(el, b, u, pl.ft);
    }
  }
  return { PLANS, draw };
}
