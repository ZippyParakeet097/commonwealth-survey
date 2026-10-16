import { KM_PER_MI, FT_PER_KM, units } from './geo.js';
import { $, NSS, P, esc, mk, on } from './util.js';
import { placeLabels } from './labels.js';
import { planDetail } from './plans.js';

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
  const hooks = { render: [], tap: null, move: null, leave: null };

  // ---- layers, bottom to top ----
  let html = `<rect x="0" y="0" width="${B.w}" height="${B.h}" fill="var(--sea)"/>`;
  html += P(B.land, 'var(--land)');
  html += `<g id="g-wet">${P(B.wet, 'var(--wet)')}</g>`;
  html += P(B.water, 'var(--water)');
  html += `<g id="g-coast"><rect x="${B.coast.box[0]}" y="${B.coast.box[1]}" width="${B.coast.box[2] - B.coast.box[0]}" height="${B.coast.box[3] - B.coast.box[1]}" fill="var(--sea)"/>`
       + P(B.coast.land, 'var(--land)') + `<g id="g-wet2">${P(B.coast.wet, 'var(--wet)')}</g></g>`;  // detailed harbor coast, shown when zoomed in
  html += `<path d="${B.streams}" fill="none" stroke="var(--stream)" stroke-width="1.1" ${NSS} stroke-linecap="round"/>`;
  html += `<path d="${B.bounds}" fill="none" stroke="var(--rule)" stroke-width=".8" stroke-dasharray="4 3" ${NSS}/>`;
  // a nuclear crater at its theorized true size: the bowl, a dashed lip at twice its radius, and a small ring so it reads when zoomed out
  const craterMarks = (c, k) => `<circle cx="${c[0]}" cy="${c[1]}" r="${k.r}" fill="var(--gs-fill)" stroke="var(--gs)" stroke-width="1.5" ${NSS}/>`
    + `<circle cx="${c[0]}" cy="${c[1]}" r="${k.lip}" fill="none" stroke="var(--gs)" stroke-width="1" stroke-dasharray="3 3" ${NSS}/>`
    + `<circle class="crater-dot" cx="${c[0]}" cy="${c[1]}" r="0" fill="none" stroke="var(--gs)" stroke-width="1.5" ${NSS}/>`;
  html += `<defs><pattern id="gs-hatch" patternUnits="userSpaceOnUse" width=".55" height=".55" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2=".55" stroke="var(--gs-hatch)" stroke-width=".14"/></pattern></defs>`;
  html += `<g id="g-gs">` + P(G.zone, 'var(--gs-fill)') + P(G.beyond, 'url(#gs-hatch)')
       + `<path d="${G.edge}" fill="none" stroke="var(--gs)" stroke-width="1.8" ${NSS}/>`
       + `<path d="${G.arc}" fill="none" stroke="var(--gs)" stroke-width="1.6" stroke-dasharray="6 4" ${NSS}/>`
       + `<path d="${G.hiarc}" fill="none" stroke="var(--gs)" stroke-width="1.2" stroke-dasharray="1 4" stroke-linecap="round" opacity=".8" ${NSS}/>`
       + `<line x1="${G.crater[0]}" y1="${G.crater[1]}" x2="${G.tick[0]}" y2="${G.tick[1]}" stroke="var(--gs)" stroke-width="1" stroke-dasharray="2 3" ${NSS}/>`
       + `<path id="gs-arrow" fill="var(--gs)"/>`
       + craterMarks(G.crater, CR.atom)
       + `<g id="gs-labels"></g></g>`;
  html += `<g id="g-cc">${craterMarks(CR.cam.c, CR.cam)}</g>`;
  html += `<g id="g-site"><g id="site-shapes">` + D.sites.map(s => s.n === 'Logan Airport' ? P(s.d, 'var(--bos-fill)', `stroke="var(--bos)" stroke-width="1.2" stroke-opacity=".85" ${NSS}`) : P(s.d, 'var(--site)', `stroke="var(--loc)" stroke-width="1" stroke-opacity=".7" ${NSS}`)).join('') + `</g>`
       + `<g id="plan-detail">${planDetail(D.plans)}</g><g id="site-labels"></g></g>`;
  html += `<g id="g-fp"><path d="${B.footprint}" fill="var(--fp)" stroke="var(--fpline)" stroke-width="1.4" stroke-dasharray="7 4" ${NSS}/></g>`;
  html += `<g id="g-grid"></g>`;
  html += `<g id="g-river">` + B.rivers.map(r => `<text class="t-river" x="${r.lx}" y="${r.ly}" text-anchor="middle">${esc(r.n)}</text>`).join('') + `</g>`;
  html += `<g id="g-town">` + B.towns.map((t, i) => `<text class="t-town${t.p >= 40000 ? ' big' : ''}" data-i="${i}" x="${t.x}" y="${t.y}" text-anchor="middle">${esc(t.n)}</text>`).join('') + `</g>`;
  html += `<g id="g-unm"><g id="unm-dots"></g><g id="unm-labels"></g></g>`;
  html += `<g id="g-loc"><g id="loc-dots"></g><g id="loc-labels"></g></g><g id="g-mm"></g><g id="g-meas"></g><g id="g-gridlab"></g><g id="g-sel"></g>`;
  svg.innerHTML = html;

  locs.forEach(l => {
    const col = l.bos ? 'var(--bos)' : 'var(--loc)';
    l.dot = mk('circle', { cx: l.x, cy: l.y, fill: l.k ? col : 'var(--land)', stroke: col, 'stroke-width': 1.3, 'vector-effect': 'non-scaling-stroke', class: l.bos ? 'bos' : '' }, $('loc-dots'));
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
  const sel = mk('circle', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', r: 0 }, $('g-sel'));
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
      const fo = l.mm && mmOn ? u * 13 : off;
      l.lab.setAttribute('x', l.x + fo); l.lab.setAttribute('y', l.y + u * 4);
      if (l.icon) {  // grows from 16 px (whole sheet) to 42 px (harbor close-up)
        const px = Math.max(16, Math.min(42, 16 + 9 * Math.log2(z))), w = u * px, h = w * 285 / 480, top = l.y - h - u * px * .38; l.dot.setAttribute('r', 0);
        l.icon.setAttribute('x', l.x - w / 2); l.icon.setAttribute('y', top); l.icon.setAttribute('width', w); l.icon.setAttribute('height', h);
        l.tether.setAttribute('x1', l.x); l.tether.setAttribute('y1', top + h * .9); l.tether.setAttribute('x2', l.x); l.tether.setAttribute('y2', l.y);
        l.lab.setAttribute('x', l.x + w / 2 + u * 3); l.lab.setAttribute('y', top + h / 2 + u * 4);
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
    if (api.sel && api.sel.kind !== 'off') { sel.setAttribute('cx', api.sel.x); sel.setAttribute('cy', api.sel.y); sel.setAttribute('r', u * 10); } else sel.setAttribute('r', 0);
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
  svg.tabIndex = 0;
  svg.addEventListener('keydown', e => {
    const k = { ArrowLeft: [-.15, 0], ArrowRight: [.15, 0], ArrowUp: [0, -.15], ArrowDown: [0, .15] }[e.key];
    if (k) { e.preventDefault(); pan(...k); } else if (e.key === '+' || e.key === '=') zoomMid(1.6); else if (e.key === '-') zoomMid(1 / 1.6);
  });
  function nearest(e) {
    const [x, y] = toMap(e.clientX, e.clientY), u = vb.w / svg.clientWidth; let best = null, bd = 14 * u;
    const pool = [...(on('loc') ? locs.filter(l => (!l.bos || on('bos')) && !l.hid) : on('mm') ? mmList : []), ...(on('unm') ? unm : [])];
    pool.forEach(p => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } });
    return best;
  }
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
    get vb() { return vb; }, get u() { return vb.w / (svg.clientWidth || 800); },
    fit, fitBox, render, zoomAt,
    setPin(p) { pin = p; render(); },
    // Nuka-World is off the sheet (its figure below shows where), so the map goes to its transit center instead
    focus(p) { if (p === nw) p = tc; fit(p.x - 7, p.y - 5, p.x + 7, p.y + 5); },
  };
  return api;
}
