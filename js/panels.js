import { km, compass, fmtDist, fmtArea, fmtWalk, toUnit, units, KM_PER_MI } from './geo.js';
import { $, esc, announce } from './util.js';
import { SEARCH } from './measure.js';

// shoelace area of every ring in an M/L/Z path, in square sheet units
const pathArea = d => d.match(/M[^M]+/g).reduce((sum, s) => { const n = s.match(/-?\d+\.?\d*/g).map(Number); let a = 0;
  for (let i = 0, k = n.length / 2; i < k; i++) { const j = (i + 1) % k; a += n[2 * i] * n[2 * j + 1] - n[2 * j] * n[2 * i + 1]; } return sum + Math.abs(a) / 2; }, 0);

export function createPanels({ map, card, measure, byId, D, showMap }) {
  const at = n => byId.get(n), sanct = at('Sanctuary Hills'), dc = at('Diamond City'), castle = at('The Castle');
  // "show on map" from another tab: switch to the map, then select, so the map has its size to fit to
  const go = p => { showMap(); card.select(p, true); announce(`Selected ${p.n}${p.town ? ', ' + p.town : ''}.`); };
  const route = SEARCH.map(([n, q]) => ({ p: at(n), q })).filter(s => s.p);
  const showRoute = () => {
    showMap();
    const xs = route.map(s => s.p.x), ys = route.map(s => s.p.y);
    map.fit(Math.min(...xs) - 3, Math.min(...ys) - 3, Math.max(...xs) + 3, Math.max(...ys) + 3);
    measure.route(route.map(s => s.p), "The Sole Survivor's search");
  };
  // the two marked places farthest apart: the longest straight trip the game map allows
  let far = [null, null, 0];
  map.locs.forEach((a, i) => map.locs.slice(i + 1).forEach(b => { const d = km(a, b); if (d > far[2]) far = [a, b, d]; }));
  const footprintKm2 = pathArea(D.base.footprint), [gx0, gy0, gx1, gy1] = map.gameBox;

  function render() {
    // the Sole Survivor's search
    let sum = 0;
    $('routet').tBodies[0].innerHTML = route.map((s, i) => { const leg = i ? km(route[i - 1].p, s.p) : 0; sum += leg;
      return `<tr data-go="${esc(s.p.id)}"><td><button class="rowbtn" data-go="${esc(s.p.id)}">${i + 1}. ${esc(s.p.label)}</button></td><td class="q">${esc(s.q)}</td><td class="n">${i ? fmtDist(leg) : '—'}</td><td class="n">${i ? fmtDist(sum) : '—'}</td></tr>`; }).join('');
    $('rt-total').textContent = fmtDist(sum); $('rt-walk').textContent = fmtWalk(sum); $('rt-legs').textContent = route.length - 1;
    $('rt-tp').textContent = fmtDist(km(at('Greenetech Genetics'), at('The Institute')), 2);

    // workshop settlements
    $('mmt').tBodies[0].innerHTML = [...map.mmList].sort((a, b) => km(sanct, a) - km(sanct, b)).map(p => `<tr data-go="${esc(p.id)}"><td><button class="rowbtn" data-go="${esc(p.id)}"><svg class="mmi" viewBox="0 0 556 359" aria-hidden="true"><use href="#mm-flag"/></svg>${esc(p.label)}</button></td><td>${esc(p.town)}</td><td class="n">${p === sanct ? '—' : fmtDist(km(sanct, p))}</td><td>${p === sanct ? '' : compass(sanct, p)}</td><td>${esc(p.mm)}</td></tr>`).join('');

    // site-plan facts
    const F = D.plans, hang = at("Hangman's Alley");
    $('fen-size').textContent = `${F.fen.size_ft[0]}×${F.fen.size_ft[1]} ft`;
    $('castle-size').textContent = `${F.castle.fort_ft} ft`;
    $('hang-len').textContent = `${F.hang.len_ft} ft`; $('hang-dc').textContent = fmtDist(km(hang, dc), 2); $('hang-cit').textContent = fmtDist(km(hang, at('C.I.T. ruins')), 2);
    $('strong-dist').textContent = fmtDist(km(at('Fort Strong'), castle));
    const nw = at('Nuka-World'), road = D.nw.features.find(f => f.geometry.type === 'LineString').properties;
    $('nw-line').textContent = fmtDist(km(at('Nuka-World transit center'), nw), 0); $('nw-road').textContent = fmtDist(road.distance_mi * KM_PER_MI, 0);
    $('nw-drive').textContent = `${Math.floor(road.drive_min / 60)} h ${road.drive_min % 60} min`;

    // scale notes
    const hagen = at('Fort Hagen'), atom = at('Crater of Atom'), v111 = at('Vault 111'), aber = at('Abernathy farm');
    $('scalefact').textContent = `The playable game map covers ${fmtArea(footprintKm2)} of real ground, about ${toUnit(gx1 - gx0).toFixed(0)} × ${toUnit(gy1 - gy0).toFixed(0)} ${units.unit} at its widest.`;
    $('scale-notes').textContent = `On the real ground the game map spans about ${toUnit(gx1 - gx0).toFixed(0)} ${units.unit} east to west and ${toUnit(gy1 - gy0).toFixed(0)} ${units.unit} north to south, ${fmtArea(footprintKm2)} in all. `
      + `Sanctuary Hills to Diamond City is ${fmtDist(km(sanct, dc))} as the crow flies, ${fmtWalk(km(sanct, dc))} on foot at a steady 3 mph. `
      + `The Castle is ${fmtDist(km(sanct, castle))} from Sanctuary and the Crater of Atom ${fmtDist(km(sanct, atom))}. `
      + `The two marked places farthest apart, ${far[0].label} and ${far[1].label}, are ${fmtDist(far[2])} apart.`;
    $('real-notes').textContent = `Sanctuary Hills lands on the Concord River in ${sanct.town}, with Vault 111 ${fmtDist(km(sanct, v111), 2)} to its ${compass(sanct, v111)} and Abernathy Farm ${fmtDist(km(sanct, aber))} to its ${compass(sanct, aber)}. `
      + `Fort Hagen lands in ${hagen.town}, ${fmtDist(km(sanct, hagen))} ${compass(sanct, hagen)} of Sanctuary. The game map's western edge runs between Concord's old powder mills and Maynard, and its southwest corner cuts straight through the Glowing Sea. `
      + `Boston's landmarks keep their real spacing: Diamond City is Fenway Park, and Goodneighbor is Scollay Square, ${fmtDist(km(dc, at('Goodneighbor')))} away.`;
  }

  // ---- Glowing Sea panel (the study's own figures, in miles) ----
  { const G = D.gs.zone, A = D.gs.craters.atom, C = D.gs.craters.cam;
    $('cc-d').textContent = `${C.d_ft} ft`; $('atom-d').textContent = `${A.d_ft.toLocaleString()} ft`;
    $('cc-kt').textContent = `${C.kt} kt (${C.lo_kt}–${C.hi_kt})`; $('atom-kt').textContent = `${(A.kt / 1000).toFixed(0)} Mt (${(A.lo_kt / 1000).toFixed(1)}–${(A.hi_kt / 1000).toFixed(0)})`;
    $('kt-ratio').textContent = Math.round(A.kt / C.kt);
    $('gs-r').textContent = `≈${G.reach} mi`; $('gs-r2').textContent = `${G.reach} miles`; $('gs-hr').textContent = `${G.hi_reach} miles`; $('gs-brg').textContent = `${G.toward}°`;
    $('gs-ft').textContent = G.far_town; $('gs-ht').textContent = G.hi_town;
    $('gs-ec').textContent = `${G.elev_crater} ft`; $('gs-ee').textContent = `${G.elev_edge} ft`; $('gs-ew').textContent = `${G.elev_west} ft`;
    $('gs-i0').textContent = `${G.iou_circle}%`; $('gs-i1').textContent = `${G.iou}%`; $('gs-i2').textContent = `${G.iou_flat}%`;
    $('gs-range').textContent = `${G.r_lo} to ${G.r_hi} miles`;
    $('gs-a').textContent = `${G.zone_sqmi} sq mi`; $('gs-tr').textContent = `${G.lo_sqmi}, ${G.theory_sqmi} or ${G.hi_sqmi} sq mi`; $('gs-t').textContent = `≈${G.theory_sqmi} sq mi`;
    const townLi = ts => ts.map(t => `<li>${esc(t.n)}<span>${t.share}%</span></li>`).join('');
    $('gs-tz').innerHTML = townLi(G.towns_zone); $('gs-tb').innerHTML = townLi(G.towns_beyond);
    $('gs-go').onclick = () => { showMap(); if (!$('L-gs').checked) $('L-gs').click(); map.VIEWS.gs(); card.select(at('Crater of Atom')); announce('Showing the Glowing Sea. Selected the Crater of Atom.'); };
  }

  for (const id of ['routet', 'mmt']) $(id).addEventListener('click', e => { const tr = e.target.closest('tr[data-go]'); if (tr) go(byId.get(tr.dataset.go)); });
  $('route-go').onclick = $('m-search').onclick = showRoute;
  $('nw-go').onclick = () => go(at('Nuka-World'));
  render();
  return { render };
}
