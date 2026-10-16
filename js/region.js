import { project, KM_PER_MI } from './geo.js';
import { $, NSS, P, esc } from './util.js';

// The Nuka-World figure: southern New England in the same sheet km as the main map, with the survey sheet,
// the game map, the park's theorized site and the fastest real drive to it from the transit center.
export function createRegion({ D, nw, tc }) {
  const svg = $('plan-nw').querySelector('svg'), R = D.region, [x0, y0, x1, y1] = R.box, w = x1 - x0, h = y1 - y0, B = D.base;
  const road = D.nw.features.find(f => f.geometry.type === 'LineString').geometry.coordinates.map(([lon, lat]) => project(lat, lon));
  const roadD = road.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
  // the route label sits on the Mass Pike near Palmer, clear of Worcester
  const pike = road.reduce((a, p) => Math.abs(p.x - (nw.x + 45)) < Math.abs(a.x - (nw.x + 45)) ? p : a);
  const [gx0, , , gy1] = (() => { const n = B.footprint.match(/-?\d+\.?\d*/g).map(Number), xs = n.filter((_, i) => !(i % 2)), ys = n.filter((_, i) => i % 2);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; })();
  const T = (x, y, cls, text, extra = '') => `<text class="t-plan ${cls}" x="${x}" y="${y}" ${extra}>${esc(text)}</text>`;
  svg.setAttribute('viewBox', `${x0} ${y0} ${w} ${h}`);

  function draw() {
    const u = w / (svg.clientWidth || 600);
    svg.style.setProperty('--u', u);
    let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="var(--sea)"/>` + P(R.us, 'var(--land)')
      + `<path d="${R.borders}" fill="none" stroke="var(--rule)" stroke-width="1" ${NSS}/>`
      + `<rect x="0" y="0" width="${B.w}" height="${B.h}" fill="none" stroke="var(--muted)" stroke-width="1" stroke-dasharray="4 3" ${NSS}/>`
      + `<path d="${B.footprint}" fill="var(--fpline)" fill-opacity=".14" stroke="var(--fpline)" stroke-width="1.3" ${NSS}/>`
      + R.states.map(t => `<text class="t-region" x="${t.x}" y="${t.y}" text-anchor="middle">${esc(t.n)}</text>`).join('')
      + T(u * 6, u * 14, 'sub', 'This survey sheet') + T(gx0, gy1 + u * 14, 'fp', 'Game map');
    s += R.cities.map(c => `<circle cx="${c.x}" cy="${c.y}" r="${u * 2.5}" fill="var(--ink)"/>`
      + T(c.x + u * 6, c.y + u * (c.n === 'Springfield' ? -3 : 4), 'sub', c.n)).join('');
    s += `<path d="${roadD}" fill="none" stroke="var(--nw)" stroke-opacity=".55" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" ${NSS}/>`
      + T(pike.x, pike.y - u * 8, 'street', 'Mass Pike (I-90)', 'text-anchor="middle"')
      + `<circle cx="${tc.x}" cy="${tc.y}" r="${u * 4}" fill="var(--land)" stroke="var(--nw)" stroke-width="2" ${NSS}/>` + T(tc.x - u * 8, tc.y - u * 6, 'sub', 'Transit center', 'text-anchor="end"')
      + `<circle cx="${nw.x}" cy="${nw.y}" r="${u * 6}" fill="var(--nw)" stroke="var(--land)" stroke-width="2" ${NSS}/>`
      + T(nw.x, nw.y + u * 20, 'nw', nw.label, 'text-anchor="middle"') + T(nw.x, nw.y + u * 33, 'sub', 'theorized: Six Flags New England', 'text-anchor="middle"');
    // north arrow and a 20-mile scale bar, as on the site plans
    const pad = u * 16, len = 20 * KM_PER_MI, bx = x0 + pad, by = y1 - pad;
    s += `<line x1="${bx}" y1="${by}" x2="${bx + len}" y2="${by}" stroke="var(--ink)" stroke-width="2" ${NSS}/>`
      + [bx, bx + len].map(x => `<line x1="${x}" y1="${by - u * 5}" x2="${x}" y2="${by + u}" stroke="var(--ink)" stroke-width="2" ${NSS}/>`).join('')
      + T(bx, by - u * 8, 'sub', '20 mi')
      + `<path d="M${x1 - pad} ${y0 + pad} l${-u * 6} ${u * 16} l${u * 6} ${-u * 4} l${u * 6} ${u * 4}Z" fill="var(--ink)"/>` + T(x1 - pad, y0 + pad + u * 30, 'sub', 'N', 'text-anchor="middle"');
    svg.innerHTML = s;
  }
  let lastW = 0;
  new ResizeObserver(() => { if (Math.abs(svg.clientWidth - lastW) > 2) { lastW = svg.clientWidth; draw(); } }).observe(svg);
  draw();
}
