/**
 * Teste do motor de resgate de imagens do fortune-enhance.js.
 *
 * Carrega o script real dentro de um DOM mínimo simulado e verifica se cada
 * caminho quebrado é casado com o arquivo certo do inventário.
 *
 *     node tools/test-matcher.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ASSETS = path.join(__dirname, '..', 'app', 'src', 'main', 'assets');
const SCRIPT = fs.readFileSync(path.join(ASSETS, 'js', 'fortune-enhance.js'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ASSETS, 'img', 'manifest.json'), 'utf8'));

/* ---------------------------- DOM mínimo ---------------------------- */

function makeElement(tag) {
  const attrs = {};
  return {
    tagName: (tag || 'div').toUpperCase(),
    style: { setProperty() {}, removeProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    dataset: {},
    children: [],
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    hasAttribute: (k) => k in attrs,
    removeAttribute: (k) => { delete attrs[k]; },
    addEventListener() {}, removeEventListener() {}, remove() {},
    appendChild(c) { this.children.push(c); return c; },
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    getBoundingClientRect: () => ({ width: 100, height: 100, top: 0, left: 0 }),
    get textContent() { return ''; },
    set textContent(_v) {}
  };
}

const document = {
  readyState: 'complete',
  documentElement: makeElement('html'),
  head: makeElement('head'),
  body: makeElement('body'),
  createElement: makeElement,
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {}
};

const sandbox = {
  console,
  document,
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: clearTimeout,
  location: {
    href: 'https://appassets.androidplatform.net/assets/index.html',
    origin: 'https://appassets.androidplatform.net',
    hostname: 'appassets.androidplatform.net',
    protocol: 'https:'
  },
  navigator: { vibrate: () => {} },
  localStorage: { getItem: () => null, setItem: () => {} },
  getComputedStyle: () => ({ position: 'relative', backgroundImage: 'none' }),
  CustomEvent: class { constructor(t) { this.type = t; } },
  Image: class { set src(_v) { setTimeout(() => this.onerror && this.onerror(), 0); } },
  MutationObserver: class { observe() {} },
  IntersectionObserver: class { observe() {} unobserve() {} },
  fetch: (url) => Promise.resolve(
    /img\/manifest\.json$/.test(url)
      ? { ok: true, json: () => Promise.resolve(MANIFEST) }
      : { ok: false, json: () => Promise.reject(new Error('404')) }
  )
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.matchMedia = () => ({ matches: false });
sandbox.window.addEventListener = () => {};
sandbox.window.removeEventListener = () => {};
sandbox.window.dispatchEvent = () => true;
sandbox.window.innerWidth = 400;
sandbox.window.innerHeight = 800;
document.defaultView = sandbox;

vm.createContext(sandbox);
vm.runInContext(SCRIPT, sandbox);

/* ------------------------------ Casos ------------------------------ */

const CASES = [
  // [ src quebrado no HTML, alt/título, arquivo esperado ]
  ['images/fortune_tiger_icon.png', 'Fortune Tiger', 'img/tigre.png'],
  ['icons/tiger.webp', '', 'img/tigre.png'],
  ['assets/game/DRAGON.PNG', 'Dragon Gold', 'img/dragao.png'],
  ['foo/bar/rabbit-icon.jpg', 'Fortune Rabbit', 'img/coelho.png'],
  ['img/fortune-ox.png', 'Fortune Ox', 'img/touro.png'],
  ['icone_mouse.png', 'Fortune Mouse', 'img/rato.png'],
  ['games/roulette.png', 'Roleta ao vivo', 'img/roleta.png'],
  ['img/mines.png', 'Mines', 'img/mina-de-ouro.png'],
  ['thumbs/plane.png', 'Aviator', 'img/aviator.png'],
  ['x/spaceman.png', 'Spaceman', 'img/espaco.png'],
  ['y/penalty.png', 'Penalty Shoot', 'img/futebol.png'],
  ['z/bingo77.png', 'Bingo', 'img/bingo-imperial.png'],
  ['tigrinho.png', '', 'img/tigre.png'],
  ['img/panda_icon_120x120.png', '', 'img/panda.png']
];

setTimeout(() => {
  const FG = sandbox.window.FortuneGo;
  const inventory = FG.manifest();
  console.log(`Inventário carregado: ${inventory.length} arquivos\n`);

  let ok = 0;
  for (const [src, alt, expected] of CASES) {
    const hit = FG._match(src, alt);
    const got = hit ? hit.replace(/^.*\/assets\//, '') : null;
    const pass = got === expected;
    if (pass) ok++;
    console.log(`${pass ? '✅' : '❌'} ${src.padEnd(34)} alt="${alt}"`.padEnd(70) +
      `→ ${got || '(sem match → ícone gerado)'}`);
    if (!pass) console.log(`   esperado: ${expected}`);
  }

  console.log(`\n${ok}/${CASES.length} casos corretos`);
  process.exit(ok === CASES.length ? 0 : 1);
}, 150);
