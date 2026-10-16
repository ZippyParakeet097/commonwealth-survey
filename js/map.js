import { KM_PER_MI, FT_PER_KM, units } from './geo.js';
import { $, NSS, P, esc, mk, on } from './util.js';
import { placeLabels } from './labels.js';
import { planDetail, patterns } from './plans.js';
import { keysOn } from './pipboy.js';

// sites inside Diamond City: folded into its marker until zoomed in close
const IN_DC = new Set(['Home Plate', 'Diamond City market']);
const MIN_W = 0.45;  // closest zoom, in sheet km across

// bounding box of every coordinate in an SVG path made of M/L/Z commands
const pathBox = d => { const n = d.match(/-?\d+\.?\d*/g).map(Number), xs = n.filter((_, i) => !(i % 2)), ys = n.filter((_, i) => i % 2);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };

export function createMap({ D, places, byId, nw }) {
  const svg = $('map'), wrap = $('mapwrap');
  const B = D.base, G = D.gs.zone, CR = D.gs.craters;
  const locs = places.filter(p => p.kind === 'loc'), unm = places.filter(p => p.kind === 'unm');
  const mmList = locs.filter(l => l.mm);
  locs.forEach(l => { if (l.mm) l.key = Math.max(l.key, 1); });
  const sanct = byId.get('Sanctuary Hills'), dc = byId.get('Diamond City'), castle = byId.get('The Castle');
  const hooks = { render: [], tap: null, move: null, leave: null, kbd: null };

  // ---- layers, bottom to top ----
  // one colour: sea and lakes are the dark screen, land a dim fill, and a bright line marks every shore
  const shore = w => `stroke="var(--coast)" stroke-width="${w}" stroke-linejoin="round" ${NSS}`;
  let html = patterns('m', 1) + `<defs><clipPath id="gs-clip"><path d="${G.zone}"/></clipPath></defs>`;
  html += `<rect x="0" y="0" width="${B.w}" height="${B.h}" fill="var(--sea)"/>`;
  html += P(B.land, 'var(--land)', shore(.9));
  html += `<g id="g-wet">${P(B.wet, 'url(#m-tuft)')}</g>`;
  html += P(B.water, 'var(--water)', shore(.7));
  html += `<g id="g-coast"><rect x="${B.coast.box[0]}" y="${B.coast.box[1]}" width="${B.coast.box[2] - B.coast.box[0]}" height="${B.coast.box[3] - B.coast.box[1]}" fill="var(--sea)"/>`
       + P(B.coast.land, 'var(--land)', shore(.9)) + `<g id="g-wet2">${P(B.coast.wet, 'url(#m-tuft)')}</g></g>`;  // detailed harbor coast, shown when zoomed in
  html += `<path d="${B.streams}" fill="none" stroke="var(--stream)" stroke-width="1.1" ${NSS} stroke-linecap="round"/>`;
  html += `<path d="${B.bounds}" fill="none" stroke="var(--rule)" stroke-width=".8" stroke-dasharray="4 3" ${NSS}/>`;
  // a nuclear crater at its theorized true size: the bowl, a dashed lip at twice its radius, and a small ring so it reads when zoomed out
  const craterMarks = (c, k) => `<circle cx="${c[0]}" cy="${c[1]}" r="${k.r}" fill="var(--gs-fill)" stroke="var(--gs)" stroke-width="1.5" ${NSS}/>`
    + `<circle cx="${c[0]}" cy="${c[1]}" r="${k.lip}" fill="none" stroke="var(--gs)" stroke-width="1" stroke-dasharray="3 3" ${NSS}/>`
    + `<circle class="crater-dot" cx="${c[0]}" cy="${c[1]}" r="0" fill="none" stroke="var(--gs)" stroke-width="1.5" ${NSS}/>`;
  // the Sea is a bright edge with a band of heavy hatching just inside it, so the wetlands in the
  // crater's basin still show through; its theorized reach beyond the map edge gets light hatching
  html += `<g id="g-gs">` + P(G.zone, 'var(--gs-fill)') + P(G.beyond, 'url(#m-hatch2)')
       + `<g clip-path="url(#gs-clip)"><path d="${G.edge}" fill="none" stroke="url(#m-hatch)" stroke-width="18" stroke-linejoin="round" ${NSS}/></g>`
       + `<path d="${G.edge}" fill="none" stroke="var(--halo)" stroke-width="4.5" ${NSS}/><path d="${G.edge}" fill="none" stroke="var(--gs)" stroke-width="2" ${NSS}/>`
       + `<path d="${G.arc}" fill="none" stroke="var(--gs)" stroke-width="1.6" stroke-dasharray="6 4" ${NSS}/>`
       + `<path d="${G.hiarc}" fill="none" stroke="var(--gs)" stroke-width="1.2" stroke-dasharray="1 4" stroke-linecap="round" opacity=".8" ${NSS}/>`
       + `<line x1="${G.crater[0]}" y1="${G.crater[1]}" x2="${G.tick[0]}" y2="${G.tick[1]}" stroke="var(--gs)" stroke-width="1" stroke-dasharray="2 3" ${NSS}/>`
       + `<path id="gs-arrow" fill="var(--gs)"/>`
       + craterMarks(G.crater, CR.atom)
       + `<g id="gs-labels"></g></g>`;
  html += `<g id="g-cc">${craterMarks(CR.cam.c, CR.cam)}</g>`;
  // With one colour the Brotherhood can't be red, so its ground is cross-hatched inside a double-line
  // border, like a military reservation on an old map; it hides with the Brotherhood layer, leaving the
  // airport as a plain real-site outline
  const bosGround = d => `<g class="bos">${P(d, 'url(#m-bos)')}<path d="${d}" fill="none" stroke="var(--bos)" stroke-width="4.5" stroke-linejoin="round" ${NSS}/>`
    + `<path d="${d}" fill="none" stroke="var(--bg)" stroke-width="1.6" stroke-linejoin="round" ${NSS}/></g>`;
  html += `<g id="g-site"><g id="site-shapes">` + D.sites.map(s => P(s.d, 'var(--site)', `stroke="var(--loc)" stroke-width="1" stroke-opacity=".7" ${NSS}`) + (s.n === 'Logan Airport' ? bosGround(s.d) : '')).join('') + `</g>`
       + `<g id="plan-detail">${planDetail(D.plans, 'm')}</g><g id="site-labels"></g></g>`;
  html += `<g id="g-fp"><path d="${B.footprint}" fill="var(--fp)" stroke="var(--fpline)" stroke-width="1.5" stroke-dasharray="9 4 2 4" ${NSS}/></g>`;
  html += `<g id="g-grid"></g>`;
  html += `<g id="g-river">` + B.rivers.map(r => `<text class="t-river" x="${r.lx}" y="${r.ly}" text-anchor="middle">${esc(r.n)}</text>`).join('') + `</g>`;
  html += `<g id="g-town">` + B.towns.map((t, i) => `<text class="t-town${t.p >= 40000 ? ' big' : ''}" data-i="${i}" x="${t.x}" y="${t.y}" text-anchor="middle">${esc(t.n)}</text>`).join('') + `</g>`;
  html += `<g id="g-unm"><g id="unm-dots"></g><g id="unm-labels"></g></g>`;
  html += `<g id="g-loc"><g id="loc-dots"></g><g id="loc-labels"></g></g><g id="g-mm"></g><g id="g-meas"></g><g id="g-gridlab"></g><g id="g-sel"></g>`;
  svg.innerHTML = html;
  const pats = [...svg.querySelectorAll('pattern')];

  locs.forEach(l => {
    const col = l.bos ? 'var(--bos)' : 'var(--loc)';
    // Brotherhood places carry the Brotherhood emblem, everything else a circle; render() sizes the
    // emblem and keeps its half-width in r, which label placement reads as the marker's size
    l.dot = l.bos ? mk('use', { href: '#bos-mark', class: 'bos' }, $('loc-dots'))
      : mk('circle', { cx: l.x, cy: l.y, fill: l.k ? col : 'var(--land)', stroke: col, 'stroke-width': 1.3, 'vector-effect': 'non-scaling-stroke' }, $('loc-dots'));
    if (l.n === 'The Prydwen') { const g = mk('g', { class: 'bos' }, $('g-loc')); l.tether = mk('line', { stroke: 'var(--bos)', 'stroke-width': 1, 'stroke-dasharray': '2 2', 'vector-effect': 'non-scaling-stroke' }, g); l.icon = mk('use', { href: '#prydwen' }, g); }
    l.lab = mk('text', { x: l.x, y: l.y, class: (l.key ? 't-loc' : 't-minor') + (l.bos ? ' bos' : '') }, $('loc-labels')); l.lab.textContent = l.label;
  });
  unm.forEach(l => {
    l.dot = mk('circle', { cx: l.x, cy: l.y, fill: 'var(--unm)', stroke: 'var(--land)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }, $('unm-dots'));
    l.lab = mk('text', { x: l.x, y: l.y, class: 't-unm' }, $('unm-labels')); l.lab.textContent = l.label;
  });
  D.sites.forEach(s => { s.lab = mk('text', { x: s.x, y: s.y, class: 't-site', 'text-anchor': 'middle' }, $('site-labels')); s.lab.textContent = s.n; });
  mmList.forEach(l => { l.flag = mk('use', { href: '#mm-flag' }, $('g-mm')); l.fr = mk('rect', { fill: 'none', stroke: 'var(--land)', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' }, $('g-mm')); });
  const gsT = ['The Glowing Sea', 'theorized, beyond the map edge', 'fallout drift, NE wind', 'outer limit, if the hills had not held it']
    .map((s, i) => { const t = mk('text', { class: ['t-gs', 't-gs sub', 't-gs r', 't-gs sub'][i], 'text-anchor': 'middle' }, $('gs-labels')); t.textContent = s; return t; });
  const tc = byId.get('Nuka-World transit center');
  // the selected place gets the Pip-Boy's corner brackets, on a dark halo so they read over hatching
  const selHalo = mk('path', { fill: 'none', stroke: 'var(--halo)', 'stroke-width': 5, 'vector-effect': 'non-scaling-stroke' }, $('g-sel'));
  const sel = mk('path', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, $('g-sel'));
  // the keyboard crosshair at the middle of the view; CSS shows it only while the map has keyboard focus
  const xhair = mk('g', { id: 'xhair' }, $('g-sel'));
  const xHalo = mk('path', { fill: 'none', stroke: 'var(--halo)', 'stroke-width': 5, 'vector-effect': 'non-scaling-stroke' }, xhair);
  const xLine = mk('path', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, xhair);
  const pinMark = mk('path', { fill: 'var(--ink)', stroke: 'var(--land)', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' }, $('g-sel'));

  // places sharing one spot (the Institute under CIT, Vault 114 under Park Street...): one dot, labels stacked
  const stacks = (() => { const m = new Map(); locs.forEach(l => { if (IN_DC.has(l.n) || l.icon) return; const k = Math.round(l.x * 40) + ',' + Math.round(l.y * 40); if (!m.has(k)) m.set(k, []); m.get(k).push(l); });
    return [...m.values()].filter(g => g.length > 1); })();

  // ---- view ----
  let vb = { x: 0, y: 0, w: B.w, h: B.h }, pin = null;
  function fit(x0, y0, x1, y1) {
    const W = svg.clientWidth || 800, H = svg.clientHeight || 600, a = W / H;
    let w = Math.max(x1 - x0, MIN_W), h = y1 - y0; if (w / h > a) h = w / a; else w = h * a;
    vb = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h }; render();
  }
  const fitBox = b => fit(b[0], b[1], b[2], b[3]);
  const gameBox = pathBox(B.footprint);
  const VIEWS = {
    game: () => fitBox(gameBox), all: () => fit(0, 0, B.w, B.h),
    concord: () => fit(sanct.x - 7, sanct.y - 6, sanct.x + 12, sanct.y + 8),
    boston: () => fit(dc.x - 6, dc.y - 10, castle.x + 9, castle.y + 8),
    gs: () => fit(G.box[0] - 3, G.box[1] - 2, G.box[2] + 3, G.box[3] + 2),
  };

  // label widths are measured once; measure again when the web fonts arrive
  if (document.fonts) document.fonts.ready.then(() => { places.forEach(l => { l.lab._w = undefined; }); render(); });

  function render() {
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const u = vb.w / (svg.clientWidth || 800), z = B.w / vb.w;
    svg.style.setProperty('--u', u);
    const r = u * 3.6, off = u * 6, mmOn = on('mm');
    locs.forEach(l => {
      l.dot.setAttribute('r', l.key ? r * 1.15 : r * .8);
      if (l.bos) { const s = u * (l.key ? 20 : 16); l.dot.setAttribute('r', s / 2);
        l.dot.setAttribute('x', l.x - s / 2); l.dot.setAttribute('y', l.y - s / 2); l.dot.setAttribute('width', s); l.dot.setAttribute('height', s); }
      const fo = l.mm && mmOn ? u * 13 : l.bos ? u * 13 : off;
      l.lab.setAttribute('x', l.x + fo); l.lab.setAttribute('y', l.y + u * 4);
      if (l.icon) {  // grows from 16 px (whole sheet) to 42 px (harbor close-up)
        const px = Math.max(16, Math.min(42, 16 + 9 * Math.log2(z))), w = u * px, h = w * 285 / 480, top = l.y - h - u * px * .38; l.dot.setAttribute('r', 0);
        l.icon.setAttribute('x', l.x - w / 2); l.icon.setAttribute('y', top); l.icon.setAttribute('width', w); l.icon.setAttribute('height', h);
        l.tether.setAttribute('x1', l.x); l.tether.setAttribute('y1', top + h * .9); l.tether.setAttribute('x2', l.x); l.tether.setAttribute('y2', l.y);
        l.lab.setAttribute('x', l.x + w / 2 + u * 3); l.lab.setAttribute('y', top + h / 2 + u * 4); l.dot.setAttribute('width', 0); l.dot.setAttribute('height', 0);
      }
      l.lab.style.display = l.key ? (z >= 1.4 || l.key === 2 ? '' : 'none') : (z >= 6 ? '' : 'none');
      l.hid = IN_DC.has(l.n) && z < 90; l.dot.style.display = l.hid ? 'none' : ''; if (l.hid) l.lab.style.display = 'none';
      l.stacked = false;
    });
    unm.forEach(l => { l.dot.setAttribute('r', r * .55); l.lab.setAttribute('x', l.x + off); l.lab.setAttribute('y', l.y + u * 4); l.lab.style.display = z >= 8 || l === api.sel ? '' : 'none'; });
    stacks.forEach(g => {
      g.sort((a, b) => (!!b.mm - !!a.mm) || (b.key - a.key));
      const vis = g.filter(l => l.lab.style.display !== 'none' && !l.hid), x = Math.max(...vis.map(l => +l.lab.getAttribute('x')));
      vis.forEach((l, i) => { l.lab.setAttribute('x', x); l.lab.setAttribute('y', g[0].y + u * 4 + i * u * 13); l.stacked = true; });
      g.slice(1).forEach(l => { if (!l.mm) l.dot.style.display = 'none'; });
    });
    const fw = u * 20, fh = u * 13;
    mmList.forEach(l => { for (const e of [l.flag, l.fr]) { e.setAttribute('x', l.x - fw / 2); e.setAttribute('y', l.y - fh / 2); e.setAttribute('width', fw); e.setAttribute('height', fh); } });
    const busy = placeLabels({ vb, u, off, fw, fh, locs, unm, sel: api.sel, show: { mm: mmOn, loc: on('loc'), bos: on('bos'), unm: on('unm') } });
    // real-site names, unless one would sit on a visible location label (e.g. Quincy Quarries over Vault 88)
    const shown = locs.filter(l => l.lab.style.display !== 'none' && !l.hid).map(l => { const b = l.box || [0, 0, 0, 0]; return { x: b[0], y: b[3], w: b[2] - b[0] }; });
    D.sites.forEach(s => { const y = s.y + u * 14, w = s.n.length * u * 5.6; s.lab.setAttribute('y', y);
      const hit = shown.some(q => Math.abs(q.y - y) < u * 12 && q.x < s.x + w / 2 && q.x + q.w > s.x - w / 2);
      s.lab.style.display = z >= 35 && !hit ? '' : 'none'; });
    $('plan-detail').style.display = z >= 25 ? '' : 'none';
    $('g-coast').style.display = z >= 3 ? '' : 'none';
    for (const e of svg.querySelectorAll('.crater-dot')) e.setAttribute('r', u * 9);
    gsT[0].setAttribute('x', G.label[0]); gsT[0].setAttribute('y', G.label[1] - u * 14);
    gsT[1].setAttribute('x', G.beyond_label[0]); gsT[1].setAttribute('y', G.beyond_label[1]);
    const tx = (G.crater[0] + G.tick[0]) / 2, ty = (G.crater[1] + G.tick[1]) / 2, ta = Math.atan2(G.tick[1] - G.crater[1], G.tick[0] - G.crater[0]) * 180 / Math.PI + 180;
    gsT[2].setAttribute('x', tx); gsT[2].setAttribute('y', ty - u * 4); gsT[2].setAttribute('transform', `rotate(${ta} ${tx} ${ty})`);
    { const dx = G.tick[0] - G.crater[0], dy = G.tick[1] - G.crater[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, s = u * 9;
      $('gs-arrow').setAttribute('d', `M${G.tick[0]} ${G.tick[1]} L${G.tick[0] - ux * s - uy * s * .45} ${G.tick[1] - uy * s + ux * s * .45} L${G.tick[0] - ux * s + uy * s * .45} ${G.tick[1] - uy * s - ux * s * .45} Z`); }
    gsT[3].setAttribute('x', G.hi_tip[0]); gsT[3].setAttribute('y', G.hi_tip[1] + u * 14);
    gsT[1].style.display = gsT[2].style.display = gsT[3].style.display = z >= 1.6 ? '' : 'none';
    const minPop = z < 1.6 ? 40000 : z < 3 ? 15000 : z < 6 ? 4000 : 0;
    for (const t of $('g-town').children) t.style.display = B.towns[+t.dataset.i].p >= minPop && z < 40 ? '' : 'none';
    // town and river names give way to place labels and markers
    const yieldTo = t => { if (t.style.display === 'none') return; const b = t.getBBox(); if (b.x > vb.x + vb.w || b.x + b.width < vb.x || b.y > vb.y + vb.h || b.y + b.height < vb.y) return;
      if (busy([b.x, b.y, b.x + b.width, b.y + b.height], null)) t.style.display = 'none'; };
    for (const t of $('g-town').children) yieldTo(t);
    for (const t of $('g-river').children) { t.style.display = ''; yieldTo(t); }
    let sd = '';
    if (api.sel && api.sel.kind !== 'off') { const { x, y } = api.sel, a = u * 13, b = u * 5;
      sd = `M${x - a} ${y - a + b}V${y - a}H${x - a + b}M${x + a - b} ${y - a}H${x + a}V${y - a + b}M${x + a} ${y + a - b}V${y + a}H${x + a - b}M${x - a + b} ${y + a}H${x - a}V${y + a - b}`; }
    sel.setAttribute('d', sd); selHalo.setAttribute('d', sd);
    { const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2, i = u * 5, o = u * 16;
      const xd = `M${cx - o} ${cy}H${cx - i}M${cx + i} ${cy}H${cx + o}M${cx} ${cy - o}V${cy - i}M${cx} ${cy + i}V${cy + o}`;
      xLine.setAttribute('d', xd + `M${cx - u} ${cy}h${u * 2}`); xHalo.setAttribute('d', xd); }
    for (const p of pats) p.setAttribute('patternTransform', `scale(${u})${+p.dataset.rot ? ` rotate(${p.dataset.rot})` : ''}`);
    pinMark.setAttribute('d', pin ? `M${pin.x} ${pin.y}l${-u * 6} ${-u * 13}a${u * 6} ${u * 6} 0 1 1 ${u * 12} 0z` : '');
    scaleBar(u);
    hooks.render.forEach(f => f(u, z));
  }
  function scaleBar(u) {
    const pxPerKm = 1 / u;
    if (units.unit === 'mi') {
      if (pxPerKm * KM_PER_MI * 0.25 >= 70) { // switch to feet when zoomed onto a site
        const pxPerFt = pxPerKm / FT_PER_KM, ft = [100, 200, 500, 1000, 2000].find(n => n * pxPerFt >= 60) || 2000;
        $('scalebar').style.width = (ft * pxPerFt) + 'px'; $('scalet').textContent = ft.toLocaleString() + ' ft'; return;
      }
      const m = [0.25, 0.5, 1, 2, 5, 10, 20].find(n => n * KM_PER_MI * pxPerKm >= 70) || 20;
      $('scalebar').style.width = (m * KM_PER_MI * pxPerKm) + 'px'; $('scalet').textContent = m + ' mi';
    } else {
      if (pxPerKm * 0.25 >= 70) {
        const m = [25, 50, 100, 200, 500].find(n => n / 1000 * pxPerKm >= 60) || 500;
        $('scalebar').style.width = (m / 1000 * pxPerKm) + 'px'; $('scalet').textContent = m + ' m'; return;
      }
      const k = [0.25, 0.5, 1, 2, 5, 10, 20, 50].find(n => n * pxPerKm >= 70) || 50;
      $('scalebar').style.width = (k * pxPerKm) + 'px'; $('scalet').textContent = k + ' km';
    }
  }
  function zoomAt(f, cx, cy) {
    const nw = Math.min(B.w * 1.2, Math.max(MIN_W, vb.w / f)), k = nw / vb.w;
    vb = { x: cx - (cx - vb.x) * k, y: cy - (cy - vb.y) * k, w: nw, h: vb.h * k }; render();
  }
  const zoomMid = f => zoomAt(f, vb.x + vb.w / 2, vb.y + vb.h / 2);
  const pan = (fx, fy) => { vb.x += vb.w * fx; vb.y += vb.h * fy; render(); };

  // ---- input ----
  const toMap = (px, py) => { const b = svg.getBoundingClientRect(); return [vb.x + (px - b.left) / b.width * vb.w, vb.y + (py - b.top) / b.height * vb.h]; };
  svg.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = toMap(e.clientX, e.clientY); zoomAt(Math.exp(-e.deltaY * 0.0015), x, y); }, { passive: false });
  const ptrs = new Map(); let moved = 0, pinch0 = null;
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; svg.classList.add('dragging');
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
  svg.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) { hover(e); return; }
    const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); const [x, y] = toMap((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); if (pinch0) zoomAt(d / pinch0, x, y); pinch0 = d; moved += 10; return; }
    const b = svg.getBoundingClientRect(), dx = e.clientX - prev[0], dy = e.clientY - prev[1]; moved += Math.abs(dx) + Math.abs(dy);
    vb.x -= dx / b.width * vb.w; vb.y -= dy / b.height * vb.h; render();
  });
  svg.addEventListener('pointerup', e => { if (ptrs.size === 1 && moved < 5 && hooks.tap) { const [x, y] = toMap(e.clientX, e.clientY); hooks.tap({ x, y }, nearest(e)); }
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; if (!ptrs.size) svg.classList.remove('dragging'); });
  svg.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); if (!ptrs.size) svg.classList.remove('dragging'); });
  svg.addEventListener('pointerleave', () => { $('tip').hidden = true; if (hooks.leave) hooks.leave(); });
  // Keyboard: the view moves under a fixed crosshair (arrow keys, or WASD as in the game), + and -
  // zoom, and Enter, Space or E acts at the crosshair exactly as a click would there.
  svg.tabIndex = 0;
  const centre = () => ({ x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 });
  svg.addEventListener('pointerdown', () => svg.classList.add('ptr'));
  svg.addEventListener('keydown', e => {
    svg.classList.remove('ptr');
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key, big = e.shiftKey ? 3 : 1;
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], ...(keysOn() ? { a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] } : {}) }[k];
    if (step) { e.preventDefault(); pan(step[0] * .08 * big, step[1] * .08 * big); kbdMoved(); }
    else if (k === '+' || k === '=') { e.preventDefault(); zoomMid(1.6); kbdMoved(); }
    else if (k === '-' || k === '_') { e.preventDefault(); zoomMid(1 / 1.6); kbdMoved(); }
    else if (k === 'Enter' || k === ' ' || (k === 'e' && keysOn())) { e.preventDefault(); if (hooks.tap) { const c = centre(); hooks.tap(c, nearestAt(c.x, c.y, 18)); kbdMoved(); } }
  });
  // after a keyboard move: coordinates and any place under the crosshair, as the pointer would show them
  function kbdMoved(quiet) {
    const c = centre(), p = nearestAt(c.x, c.y, 18), tip = $('tip'), s = svg.getBoundingClientRect(), b = wrap.getBoundingClientRect();
    if (hooks.move) hooks.move(c);
    tip.hidden = !p; if (p) { tip.textContent = p.n; tip.style.left = (s.left - b.left + s.width / 2) + 'px'; tip.style.top = (s.top - b.top + s.height / 2 - 10) + 'px'; }
    if (hooks.kbd && !quiet) hooks.kbd(c, p);
  }
  // arriving on the map shows where the crosshair is; it is spoken only once the reader moves it
  svg.addEventListener('focus', () => { if (svg.matches(':focus-visible')) kbdMoved(true); });
  svg.addEventListener('blur', () => { svg.classList.remove('ptr'); $('tip').hidden = true; if (hooks.leave) hooks.leave(); });
  function nearestAt(x, y, px) {
    const u = vb.w / (svg.clientWidth || 800); let best = null, bd = px * u;
    const pool = [...(on('loc') ? locs.filter(l => (!l.bos || on('bos')) && !l.hid) : on('mm') ? mmList : []), ...(on('unm') ? unm : [])];
    pool.forEach(p => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } });
    return best;
  }
  const nearest = e => { const [x, y] = toMap(e.clientX, e.clientY); return nearestAt(x, y, 14); };
  function hover(e) {
    if (e.pointerType !== 'mouse') return;
    const [x, y] = toMap(e.clientX, e.clientY);
    if (hooks.move) hooks.move({ x, y });
    const p = nearest(e), tip = $('tip');
    if (!p) { tip.hidden = true; return; }
    const b = wrap.getBoundingClientRect(), s = svg.getBoundingClientRect();
    tip.textContent = p.n; tip.hidden = false;
    tip.style.left = (s.left - b.left + (p.x - vb.x) / vb.w * s.width) + 'px'; tip.style.top = (s.top - b.top + (p.y - vb.y) / vb.h * s.height) + 'px';
  }
  $('zin').onclick = () => zoomMid(1.6);
  $('zout').onclick = () => zoomMid(1 / 1.6);
  { const c = $('L-bos'), f = () => { svg.classList.toggle('hide-bos', !c.checked); render(); }; c.onchange = f; svg.classList.toggle('hide-bos', !c.checked); }
  ['mm', 'loc', 'unm', 'gs', 'site', 'fp', 'wet', 'town'].forEach(k => {
    const c = $('L-' + k), f = () => { $('g-' + k).style.display = c.checked ? '' : 'none';
      if (k === 'gs') $('g-cc').style.display = c.checked ? '' : 'none'; if (k === 'wet') $('g-wet2').style.display = c.checked ? '' : 'none'; };
    c.onchange = () => { f(); render(); }; f();
  });
  new ResizeObserver(() => render()).observe(svg);

  const api = {
    svg, wrap, locs, unm, mmList, hooks, sel: null, gameBox, VIEWS,
    get vb() { return vb; }, get u() { return vb.w / (svg.clientWidth || 800); }, centre,
    fit, fitBox, render, zoomAt,
    setPin(p) { pin = p; render(); },
    // Nuka-World is off the sheet (its figure below shows where), so the map goes to its transit center instead
    focus(p) { if (p === nw) p = tc; fit(p.x - 7, p.y - 5, p.x + 7, p.y + 5); },
  };
  return api;
}
