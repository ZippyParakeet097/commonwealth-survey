import { $, esc, prefs } from './util.js';

// The Pip-Boy shell: the five tabs and their sub-tabs, the key-hint bar, the Pip-Boy 3000's title
// bar, rad gauge and tuning knob, the settings and keys windows (where the look, Pip-Boy or field
// survey kit, is chosen), and the keyboard layer. Tabs follow the WAI-ARIA tabs pattern (arrow keys
// move along a row; moving selects). Single-key shortcuts follow the game where it has one (M for
// the map, J for data, E to select, WASD to move) and can be switched off, as WCAG 2.1.4 asks; they
// never fire while you type in a field.
const TINTS = ['green', 'amber', 'blue', 'white'], THEMES = ['auto', 'pip', 'field'];
const TYPING = 'input:not([type="checkbox"]):not([type="radio"]), select, textarea, [contenteditable]';
const root = document.documentElement;
export const keysOn = () => root.dataset.keys !== 'off';
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = n => String(n).padStart(2, '0');
// the Pip-Boy's clock, as Fallout 3 prints it (08.17.77, 11:44), today's date in 2287
const clock = d => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}.87, ${pad(d.getHours())}:${pad(d.getMinutes())}`;

// one row of tabs; `onChange(tab, changed)` runs after each selection
function tabRow(list, onChange) {
  const tabs = [...list.querySelectorAll(':scope > [role="tab"]')];
  const panelOf = t => $(t.getAttribute('aria-controls'));
  let cur = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
  function select(t, focus, quiet) {
    const changed = t !== cur; cur = t;
    tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; panelOf(x).hidden = !on; });
    if (focus) t.focus();
    if (onChange && !quiet) onChange(t, changed);
  }
  list.addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t && tabs.includes(t)) select(t, false); });
  list.addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement); if (i < 0) return;
    const j = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (j === undefined) return;
    e.preventDefault(); select(tabs[(j + tabs.length) % tabs.length], true);
  });
  select(cur, false, true);
  return { tabs, panelOf, get cur() { return cur; }, select, step: d => select(tabs[(tabs.indexOf(cur) + d + tabs.length) % tabs.length], true) };
}

export function createPipBoy() {
  const listeners = [], themeListeners = [];
  const subRows = new Map();  // main panel id → its sub-tab row
  const screen = document.querySelector('.screen');
  const main = tabRow($('tabs'), (t, changed) => {
    if (changed) { window.scrollTo(0, 0); flick(); }
    hints(); titleBar(); listeners.forEach(f => f(t.id.replace('tab-', '')));
  });
  document.querySelectorAll('[role="tabpanel"] > .subtabs').forEach(list => subRows.set(list.parentElement.id, tabRow(list, () => hints())));
  const panel = () => main.panelOf(main.cur);
  const show = (id, focus) => main.select($('tab-' + id), focus);

  // ---- lists: the focused row gets the solid selection bar (CSS), W/S or the arrow keys move it ----
  const rowsIn = list => [...list.querySelectorAll('.rowbtn')];
  function moveIn(list, from, d) {
    const rows = rowsIn(list), i = rows.indexOf(from?.closest('.rowbtn'));
    const next = rows[i < 0 ? (d > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, i + d))];
    if (next) { next.focus({ preventScroll: true }); next.scrollIntoView({ block: 'nearest' }); }
  }
  const visibleList = () => [...panel().querySelectorAll('[data-list]')].find(l => l.offsetParent !== null);

  // ---- the hint bar, like the button prompts along the bottom of the Pip-Boy ----
  function hints() {
    const id = main.cur.id.replace('tab-', ''), sub = subRows.has(panel().id), list = !!visibleList(), on = keysOn();
    const H = on ? [
      [['1', '5'], 'Tabs', '–'], ...(sub ? [[['A', 'D'], 'Sub-tabs']] : []), ...(list ? [[['W', 'S'], 'List']] : []),
      ...(id === 'map' ? [[['W', 'A', 'S', 'D'], 'Move crosshair', '', true], [['+', '−'], 'Zoom', '', true]] : []),
      [['E'], 'Select'], [['?'], 'Keys', '', false, 'help'],
    ] : [
      [['Tab'], 'Next control'], [['←', '→'], 'Tabs'], ...(list ? [[['↑', '↓'], 'List']] : []),
      ...(id === 'map' ? [[['←', '↑', '↓', '→'], 'Move crosshair', '', true]] : []), [['Enter'], 'Select'],
    ];
    $('hints').innerHTML = H.map(([keys, label, join, opt, cls]) => `<li${opt || cls ? ` class="${[opt && 'opt', cls].filter(Boolean).join(' ')}"` : ''}>${keys.map(k => `<kbd>${k}</kbd>`).join(join || ' ')}<span>${label}</span></li>`).join('');
  }

  // ---- the Pip-Boy 3000's title bar: the tab's name, then readout boxes and the clock ----
  let readouts = () => [];
  function titleBar() {
    const t = main.cur;
    $('pb-title').textContent = t.firstChild.textContent.trim();
    root.style.setProperty('--knob', main.tabs.indexOf(t));  // the tuning knob turns with the tab
    $('pb-read').innerHTML = [...readouts(t.id.replace('tab-', '')), ['', clock(new Date())]]
      .map(([k, v]) => `<span>${k ? `<b>${esc(k)}</b>` : ''}${esc(v)}</span>`).join('');
  }
  setInterval(titleBar, 15000);
  // a changing screen flickers, as the old Pip-Boys did
  function flick() {
    if (root.dataset.theme !== 'pip' || root.dataset.fx === 'off' || still()) return;
    screen.classList.remove('flick'); void screen.offsetWidth; screen.classList.add('flick');
  }
  // the head script started the power-on (the Pip-Boy rises into view, its screen flickers on); end it
  setTimeout(() => root.classList.remove('pb-boot'), 1400);

  // ---- settings and keys windows ----
  function opener(dlg) {
    let from = null;
    dlg.addEventListener('close', () => { if (from && from.isConnected) from.focus(); });
    return () => { from = document.activeElement; dlg.showModal(); };
  }
  const openKeys = opener($('dlg-keys')), openSettings = opener($('dlg-settings'));
  $('open-keys').onclick = $('open-keys2').onclick = openKeys;
  $('open-settings').onclick = () => {
    document.querySelectorAll('input[name="tint"]').forEach(r => { r.checked = r.value === root.dataset.tint; });
    document.querySelectorAll('input[name="theme"]').forEach(r => { r.checked = r.value === theme(); });
    $('set-fx').checked = root.dataset.fx !== 'off'; $('set-keys').checked = keysOn();
    openSettings();
  };
  const themeColor = () => { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = getComputedStyle(document.body).backgroundColor; };
  document.querySelectorAll('input[name="tint"]').forEach(r => r.addEventListener('change', () => {
    if (!TINTS.includes(r.value)) return; root.dataset.tint = r.value; prefs.set('tint', r.value); themeColor(); }));
  // the look: Pip-Boy, field survey kit, or whichever suits the system's light or dark mode
  const light = matchMedia('(prefers-color-scheme: light)');
  let chosen = prefs.get('theme', 'auto'); if (!THEMES.includes(chosen)) chosen = 'auto';
  const theme = () => chosen;
  function applyTheme() {
    const t = theme(), next = t === 'auto' ? (light.matches ? 'field' : 'pip') : t;
    if (root.dataset.theme === next) return;
    root.dataset.theme = next; themeColor(); themeListeners.forEach(f => f(next));
  }
  document.querySelectorAll('input[name="theme"]').forEach(r => r.addEventListener('change', () => {
    if (THEMES.includes(r.value)) { chosen = r.value; prefs.set('theme', chosen); applyTheme(); } }));
  light.addEventListener('change', applyTheme);
  $('set-fx').onchange = e => { root.dataset.fx = e.target.checked ? 'on' : 'off'; prefs.set('fx', e.target.checked); };
  $('set-keys').onchange = e => { root.dataset.keys = e.target.checked ? 'on' : 'off'; prefs.set('keys', e.target.checked); hints(); };
  themeColor();

  // ---- the keyboard layer ----
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    const t = e.target instanceof Element ? e.target : document.body, list = t.closest('[data-list]');
    if (list && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); moveIn(list, t, e.key === 'ArrowDown' ? 1 : -1); return; }
    if (!keysOn() || e.key.length !== 1 || t.closest(TYPING)) return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '5') { e.preventDefault(); main.select(main.tabs[+k - 1], true); }
    else if (k === 'm') { e.preventDefault(); show('map', true); }
    else if (k === 'j') { e.preventDefault(); show('data', true); }
    else if (k === 'a' || k === 'd') { const row = subRows.get(panel().id); if (row) { e.preventDefault(); row.step(k === 'a' ? -1 : 1); } }
    else if (k === 'w' || k === 's') { const l = list || visibleList(); if (l) { e.preventDefault(); moveIn(l, list ? t : null, k === 's' ? 1 : -1); } }
    else if (k === 'e') { const b = t.closest('button, a[href], [role="tab"], input[type="checkbox"], input[type="radio"]'); if (b) { e.preventDefault(); b.click(); } }
    else if (e.key === '?') { e.preventDefault(); openKeys(); }
  });

  hints(); titleBar();
  return {
    show, get tab() { return main.cur.id.replace('tab-', ''); }, onTab: f => listeners.push(f), onTheme: f => themeListeners.push(f), hints,
    // readouts(tab) gives the title bar's boxes as [label, value] pairs; call titleBar() when they change
    setReadouts(f) { readouts = f; titleBar(); }, titleBar,
    // the rad gauge, 0 to 10 (× 100 rads)
    rads(v) { root.style.setProperty('--rad', Math.max(0, Math.min(10, v)).toFixed(2)); },
  };
}
