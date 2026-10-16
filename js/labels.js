// Label collision. Labels are placed in priority order (selected place, stacked shared sites,
// workshop settlements, key places, minor places, unmarked places). Each tries the right, left,
// two right diagonals, above and below its point; markers already on the map count as obstacles.
// A label with no free spot is hidden until you zoom in.
export function placeLabels({ vb, u, off, fw, fh, locs, unm, sel, show, blocks = [] }) {
  const v0 = vb.x - vb.w * .1, v1 = vb.x + vb.w * 1.1, h0 = vb.y - vb.h * .1, h1 = vb.y + vb.h * 1.1;
  const inView = p => p.x > v0 && p.x < v1 && p.y > h0 && p.y < h1;
  const cell = u * 60, grid = new Map();
  const keys = b => { const out = []; for (let i = Math.floor(b[0] / cell); i <= Math.floor(b[2] / cell); i++) for (let j = Math.floor(b[1] / cell); j <= Math.floor(b[3] / cell); j++) out.push(i + ',' + j); return out; };
  const add = (b, who) => { b.who = who; keys(b).forEach(k => { if (!grid.has(k)) grid.set(k, []); grid.get(k).push(b); }); };
  const hits = (b, who) => keys(b).some(k => (grid.get(k) || []).some(q => q.who !== who && q[0] < b[2] && q[2] > b[0] && q[1] < b[3] && q[3] > b[1]));
  const visible = l => !l.hid && inView(l) && (show.loc || (l.mm && show.mm)) && (!l.bos || show.bos);
  const dotBox = l => { const rr = l.rad || 0; return [l.x - rr, l.y - rr, l.x + rr, l.y + rr]; };
  // obstacles: the markers themselves, and any other marks on the map (the Pip-Boy's Boston marker)
  blocks.forEach(b => add(b, 'block'));
  const inBlock = b => blocks.some(q => q[0] < b[2] && q[2] > b[0] && q[1] < b[3] && q[3] > b[1]);
  locs.forEach(l => { if (!visible(l) || l.dot.style.display === 'none') return;
    add(l.mm && show.mm ? [l.x - fw / 2, l.y - fh / 2, l.x + fw / 2, l.y + fh / 2] : dotBox(l), l); });
  if (show.unm) unm.forEach(l => { if (inView(l)) add(dotBox(l), l); });
  const items = [];
  locs.forEach(l => { if (!visible(l) || l.lab.style.display === 'none') return;
    items.push({ p: l, el: l.lab, fs: l.key ? 11.5 : 10, o: l.mm && show.mm ? u * 13 : l.bos ? u * 13 : off, fixed: l.stacked || !!l.icon,
      pri: l === sel ? 0 : l.stacked || l.icon ? 1 : l.mm ? 2 : l.key || l.bos ? 3 : 5 }); });
  if (show.unm) unm.forEach(l => { if (!inView(l) || l.lab.style.display === 'none') return;
    items.push({ p: l, el: l.lab, fs: 9.5, o: off * .8, fixed: false, pri: l === sel ? 0 : 6 }); });
  items.sort((a, b) => a.pri - b.pri);
  for (const it of items) {
    const el = it.el, fs = it.fs * u;
    if (el._w === undefined || el._wu !== it.fs) { el.setAttribute('text-anchor', 'start'); el._w = el.getComputedTextLength() / u; el._wu = it.fs; }
    const w = el._w * u, x = it.p.x, y = it.p.y, o = it.o;
    const boxOf = (ax, bx, by) => { const l = ax === 'end' ? bx - w : ax === 'middle' ? bx - w / 2 : bx; return [l, by - fs * .8, l + w, by + fs * .25]; };
    if (it.fixed) {
      let ax = 'start', bx = +el.getAttribute('x'); const by = +el.getAttribute('y'); let b = boxOf(ax, bx, by);
      // an icon's label flips to the icon's left when a marker sits on its right
      if (it.p.icon && !it.p.stacked && hits(b, it.p)) { const lb = boxOf('end', 2 * x - bx, by); if (!hits(lb, it.p)) { ax = 'end'; bx = 2 * x - bx; b = lb; el.setAttribute('x', bx); } }
      // a fixed label never covers a block (the Boston marker); it waits for the zoom instead
      if (inBlock(b) && it.pri > 0) { el.style.display = 'none'; it.p.box = null; continue; }
      add(b, it.p); it.p.box = b; el.setAttribute('text-anchor', ax); el.style.display = ''; continue;
    }
    const R = ['start', x + o, y + fs * .35], L = ['end', x - o, y + fs * .35], T = ['middle', x, y - o - fs * .15], B = ['middle', x, y + o + fs * .85],
          TR = ['start', x + o * .75, y - o * .55], BR = ['start', x + o * .75, y + o * .55 + fs * .75];
    const cands = [R, L, TR, BR, T, B];
    // the selected place always shows: it takes the first free spot, or the first spot if none is free
    if (it.pri === 0) cands.push(cands[0]);
    let done = false;
    for (const [i, [ax, bx, by]] of cands.entries()) {
      const b = boxOf(ax, bx, by);
      if (!hits(b, it.p) || (it.pri === 0 && i === cands.length - 1)) { add(b, it.p); it.p.box = b; el.setAttribute('text-anchor', ax); el.setAttribute('x', bx); el.setAttribute('y', by); el.style.display = ''; done = true; break; }
    }
    if (!done) { el.style.display = 'none'; it.p.box = null; }
  }
  return hits;
}
