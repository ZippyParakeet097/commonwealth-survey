export const NS = 'http://www.w3.org/2000/svg';
export const NSS = 'vector-effect="non-scaling-stroke"';
export const $ = id => document.getElementById(id);
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
// a filled SVG path as markup, or nothing when the layer is empty
export const P = (d, fill, extra = '') => d ? `<path d="${d}" fill="${fill}" fill-rule="evenodd" ${extra}/>` : '';
export const on = k => { const c = $('L-' + k); return !!(c && c.checked); };

// per-viewer preferences; storage may be missing or blocked, and the page works without it
export const prefs = {
  get(k, d) { try { const v = localStorage.getItem('survey.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('survey.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
