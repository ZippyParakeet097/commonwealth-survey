// Builds dist/commonwealth-survey.html: the whole survey in one file that opens from disk, offline.
// No dependencies. Each module in js/ becomes a function scope, its imports become destructured
// reads of the modules it depends on, and the data files are inlined as window.__SURVEY_DATA__.
//
// The modules follow a few rules so this stays simple: imports are single-line named imports of
// relative paths (`import { a, b } from './x.js';`), and exports are `export function` or
// `export const` declarations at the top level.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const IMPORT = /^import \{([^}]+)\} from '\.\/([\w-]+)\.js';\s*$/gm;

// load modules depth-first from main.js so each one comes after what it imports
const order = [], src = {};
async function visit(name, stack = []) {
  if (src[name] !== undefined) return;
  if (stack.includes(name)) throw new Error(`import cycle: ${[...stack, name].join(' → ')}`);
  src[name] = await read(`js/${name}.js`);
  for (const [, , dep] of src[name].matchAll(IMPORT)) await visit(dep, [...stack, name]);
  order.push(name);
}
await visit('main');

const ident = n => `__${n.replace(/-/g, '_')}`;
const exported = {}, imported = [];
const bundled = order.map(name => {
  let code = src[name];
  const exports = exported[name] = [];
  code = code.replace(IMPORT, (_, names, dep) => {
    const list = names.split(',').map(s => s.trim()).filter(Boolean);
    list.forEach(s => imported.push([name, dep, s.split(/\s+as\s+/)[0]]));
    return `const { ${list.map(s => s.replace(/\s+as\s+/, ': ')).join(', ')} } = ${ident(dep)};`;
  });
  code = code.replace(/^export (async function|function|const|let|class) ([\w$]+)/gm, (_, kind, id) => { exports.push(id); return `${kind} ${id}`; });
  if (/^export\b/m.test(code)) throw new Error(`${name}.js: unsupported export form: ${code.match(/^export.*$/m)[0]}`);
  return `const ${ident(name)} = (() => {\n${code}\nreturn { ${exports.join(', ')} };\n})();`;
}).join('\n\n');
// every imported name must be something its module exports (one name per `export const`)
for (const [from, dep, id] of imported) if (!exported[dep].includes(id)) throw new Error(`${from}.js imports ${id} from ${dep}.js, which does not export it as a single declaration`);

const data = {
  base: JSON.parse(await read('data/basemap.json')), sites: JSON.parse(await read('data/sites.json')),
  plans: JSON.parse(await read('data/plans.json')), gs: JSON.parse(await read('data/glowing-sea.json')),
  nw: JSON.parse(await read('data/nuka-world.geojson')), region: JSON.parse(await read('data/region.json')), csv: await read('data/locations.csv'),
};
const css = await read('css/survey.css');
let html = await read('index.html');
const icon = await read('assets/icon.svg');
const safe = s => s.replace(/<\/script/gi, '<\\/script');

html = html
  .replace('<link rel="stylesheet" href="css/survey.css">', () => `<style>\n${css}</style>`)
  .replace('<link rel="icon" href="assets/icon.svg" type="image/svg+xml">', () => `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon)}">`)
  .replace(/<!--app-->[\s\S]*<!--\/app-->/, () => `<script>window.__SURVEY_DATA__ = ${safe(JSON.stringify(data))};</script>\n<script>\n"use strict";\n${safe(bundled)}\n</script>`)
  // links into the repo's data folder point at GitHub instead, since the file travels alone
  .replace(/href="data\/([\w.-]+)"/g, 'href="https://github.com/ZippyParakeet097/commonwealth-survey/blob/main/data/$1"');

await mkdir(new URL('dist/', root), { recursive: true });
const out = new URL('dist/commonwealth-survey.html', root);
await writeFile(out, html);
// fail the build on syntax errors, duplicate declarations included
const js = html.match(/<script>\n"use strict";\n([\s\S]*?)\n<\/script>/)[1];
const tmp = new URL('dist/.check.js', root);
await writeFile(tmp, js);
try { execFileSync(process.execPath, ['--check', fileURLToPath(tmp)], { stdio: 'inherit' }); } finally { await rm(tmp, { force: true }); }
console.log(`dist/commonwealth-survey.html  ${(html.length / 1024).toFixed(0)} KB  (${order.join(' → ')})`);
