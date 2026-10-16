// Sheet coordinates are kilometres in Massachusetts State Plane (EPSG:26986, NAD83 Lambert
// conformal conic), measured east and south from the sheet's top-left corner. Distances on the
// sheet are true ground distances to within a few parts in ten thousand.
export const KM_PER_MI = 1.609344;
export const FT_PER_KM = 3280.84;

const SHEET_E = 166.83474, SHEET_N = 948.14333;  // the sheet's top-left corner, in State Plane km
const RAD = Math.PI / 180, A = 6378137, FL = 1 / 298.257222101, EC = Math.sqrt(2 * FL - FL * FL);
const LAT1 = 42.68333333333333 * RAD, LAT2 = 41.71666666666667 * RAD, LAT0 = 41 * RAD, LON0 = -71.5 * RAD, FE = 200000, FN = 750000;
const mF = p => Math.cos(p) / Math.sqrt(1 - (EC * Math.sin(p)) ** 2);
const tF = p => Math.tan(Math.PI / 4 - p / 2) / ((1 - EC * Math.sin(p)) / (1 + EC * Math.sin(p))) ** (EC / 2);
const N = (Math.log(mF(LAT1)) - Math.log(mF(LAT2))) / (Math.log(tF(LAT1)) - Math.log(tF(LAT2)));
const AF = A * mF(LAT1) / (N * tF(LAT1) ** N), R0 = AF * tF(LAT0) ** N;

// latitude/longitude (degrees) to sheet km
export function project(lat, lon) {
  const r = AF * tF(lat * RAD) ** N, th = N * (lon * RAD - LON0);
  return { x: (FE + r * Math.sin(th)) / 1000 - SHEET_E, y: SHEET_N - (FN + R0 - r * Math.cos(th)) / 1000 };
}

// sheet km to [lat, lon] in degrees
export function unproject(x, y) {
  const e = (x + SHEET_E) * 1000 - FE, n = R0 - ((SHEET_N - y) * 1000 - FN);
  const t = (Math.hypot(e, n) / AF) ** (1 / N), lon = Math.atan2(e, n) / N + LON0;
  let lat = Math.PI / 2 - 2 * Math.atan(t);
  for (let i = 0; i < 8; i++) lat = Math.PI / 2 - 2 * Math.atan(t * ((1 - EC * Math.sin(lat)) / (1 + EC * Math.sin(lat))) ** (EC / 2));
  return [lat / RAD, lon / RAD];
}

export const km = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const PTS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
export const compass = (a, b) => PTS[Math.round(((Math.atan2(b.x - a.x, a.y - b.y) / RAD + 360) % 360) / 22.5) % 16];

// the reader's chosen unit; every distance on the page goes through these
export const units = { unit: 'mi' };
export const perUnit = () => units.unit === 'mi' ? KM_PER_MI : 1;
export const toUnit = k => k / perUnit();
export const fmtDist = (k, digits = 1) => `${toUnit(k).toFixed(digits)} ${units.unit}`;
export const fmtArea = sqkm => units.unit === 'mi' ? `${trim(sqkm / KM_PER_MI ** 2)} sq mi` : `${trim(sqkm)} km²`;
export const trim = v => v >= 100 ? Math.round(v).toLocaleString() : v >= 10 ? v.toFixed(0) : +v.toFixed(2) + '';
// walking time at 3 mph, a steady pace on foot
export const fmtWalk = k => { const h = k / KM_PER_MI / 3; return h < 1 ? `${Math.round(h * 60)} min` : h < 16 ? `${h.toFixed(1)} h` : `${Math.round(h)} h, ${(h / 8).toFixed(1)} days`; };
export const fmtLatLon = (lat, lon) => `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
