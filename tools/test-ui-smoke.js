#!/usr/bin/env node
/**
 * Smoke test da sala de jogo SEM navegador.
 *
 * Monta um DOM mínimo (elementos, classList, style, timers virtuais) e executa
 * fortune-game.js de verdade: boot → giro → parada dos rolos → apuração →
 * crédito do prêmio → persistência. Serve para pegar erro de digitação, id
 * inexistente e quebra no fluxo assíncrono antes de abrir no celular.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ASSETS = path.join(__dirname, '..', 'app', 'src', 'main', 'assets');
var fails = 0;
function ok(cond, msg) {
  console.log((cond ? ' ✓ ' : ' ✗ ') + msg);
  if (!cond) fails++;
}

/* ----------------------------- DOM de mentira ----------------------------- */

function ClassList(el) { this.el = el; this.set = {}; }
ClassList.prototype.add = function () {
  for (var i = 0; i < arguments.length; i++) this.set[arguments[i]] = true;
};
ClassList.prototype.remove = function () {
  for (var i = 0; i < arguments.length; i++) delete this.set[arguments[i]];
};
ClassList.prototype.contains = function (c) { return !!this.set[c]; };
ClassList.prototype.toggle = function (c, force) {
  var on = (force === undefined) ? !this.set[c] : !!force;
  if (on) this.set[c] = true; else delete this.set[c];
  return on;
};
ClassList.prototype.names = function () { return Object.keys(this.set); };

function Style() {}
Style.prototype.setProperty = function (k, v) { this[k] = v; };
Style.prototype.getPropertyValue = function (k) { return this[k] || ''; };

var SIZE = 240;

function El(tag) {
  this.tagName = (tag || 'div').toUpperCase();
  this.children = [];
  this.style = new Style();
  this.classList = new ClassList(this);
  this.attrs = {};
  this.textContent = '';
  this.disabled = false;
  this.handlers = {};
  this.clientWidth = SIZE;
  this.clientHeight = SIZE;
  this.offsetWidth = SIZE;
}
El.prototype.appendChild = function (c) { this.children.push(c); c.parentNode = this; return c; };
El.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c);
  if (i >= 0) this.children.splice(i, 1);
  return c;
};
Object.defineProperty(El.prototype, 'firstChild', {
  get: function () { return this.children[0]; }
});
El.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
El.prototype.getAttribute = function (k) { return this.attrs[k] === undefined ? null : this.attrs[k]; };
El.prototype.addEventListener = function (t, fn) { (this.handlers[t] = this.handlers[t] || []).push(fn); };
El.prototype.fire = function (t, ev) {
  (this.handlers[t] || []).forEach(function (fn) { fn.call(this, ev || { target: this }); }, this);
};
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return this._html || ''; },
  set: function (html) {
    this._html = html;
    this.children = [];
    var self = this;
    // só o que o controlador consulta depois: <path data-line="N">
    var re = /<path[^>]*data-line="(\d+)"[^>]*>/g, m;
    while ((m = re.exec(html))) {
      var p = new El('path');
      p.setAttribute('data-line', m[1]);
      self.appendChild(p);
    }
  }
});
El.prototype.walk = function (out) {
  out = out || [];
  for (var i = 0; i < this.children.length; i++) {
    out.push(this.children[i]);
    this.children[i].walk(out);
  }
  return out;
};
El.prototype.matches = function (sel) {
  sel = sel.trim();
  var attr = /^([a-z]+)\[([a-z-]+)="([^"]+)"\]$/.exec(sel);
  if (attr) {
    return this.tagName === attr[1].toUpperCase() && this.getAttribute(attr[2]) === attr[3];
  }
  var parts = sel.split('.').filter(Boolean);
  return parts.every(function (cls) { return this.classList.contains(cls); }, this);
};
El.prototype.querySelectorAll = function (sel) {
  var sels = sel.split(',').map(function (s) { return s.trim(); });
  return this.walk().filter(function (el) {
    return sels.some(function (s) { return el.matches(s); });
  });
};
El.prototype.querySelector = function (sel) { return this.querySelectorAll(sel)[0] || null; };

/* --------------------------- Relógio e agenda --------------------------- */

var clock = 0;
var queue = [];
var seq = 0;

function setTimeoutStub(fn, ms) {
  queue.push({ at: clock + (ms || 0), seq: seq++, fn: fn });
  return seq;
}

async function flush(limitMs) {
  var guard = 0;
  while (queue.length && guard++ < 20000) {
    queue.sort(function (a, b) { return (a.at - b.at) || (a.seq - b.seq); });
    var job = queue.shift();
    if (limitMs !== undefined && job.at > limitMs) { queue.push(job); break; }
    clock = Math.max(clock, job.at);
    try { job.fn(); } catch (e) {
      fails++;
      console.log(' ✗ erro durante o fluxo: ' + e.message + '\n' + (e.stack || '').split('\n')[1]);
    }
    await null;              // deixa as promises resolverem entre os timers
  }
}

/* ------------------------------- Ambiente ------------------------------- */

var registry = {};
var body = new El('body');

var document = {
  body: body,
  hidden: false,
  createElement: function (t) { return new El(t); },
  addEventListener: function () {},
  querySelector: function (sel) {
    if (sel.charAt(0) === '#') {
      var id = sel.slice(1);
      if (!registry[id]) {
        registry[id] = new El('div');
        registry[id].setAttribute('id', id);
        body.appendChild(registry[id]);
      }
      return registry[id];
    }
    return body.querySelector(sel);
  },
  querySelectorAll: function (sel) { return body.querySelectorAll(sel); }
};

var store = {};
var sandbox = {
  console: console,
  document: document,
  location: { search: '?id=tigre', href: 'game.html?id=tigre' },
  navigator: { userAgent: 'node' },
  localStorage: {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  performance: { now: function () { return clock; } },
  setTimeout: setTimeoutStub,
  clearTimeout: function () {},
  setInterval: function () { return 0; },
  requestAnimationFrame: function (fn) { return setTimeoutStub(function () { fn(clock); }, 16); },
  Promise: Promise,
  Math: Math,
  Date: Date,
  JSON: JSON,
  Object: Object,
  Array: Array,
  Number: Number,
  String: String,
  parseInt: parseInt,
  parseFloat: parseFloat,
  decodeURIComponent: decodeURIComponent,
  encodeURIComponent: encodeURIComponent,
  isNaN: isNaN,
  addEventListener: function () {},
  innerWidth: 390,
  innerHeight: 844
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);

function run(file) {
  var code = fs.readFileSync(path.join(ASSETS, file), 'utf8');
  vm.runInContext(code, sandbox, { filename: file });
}

/* -------------------------------- Teste -------------------------------- */

(async function () {
  console.log('\n=== Smoke test da sala de jogo (DOM simulado) ===\n');

  try {
    run('js/fortune-games.js');
    run('js/fortune-slot.js');
    ok(!!sandbox.FortuneGames && !!sandbox.FortuneSlot, 'catálogo e motor carregam no escopo global');
    ok(typeof sandbox.FortuneSlot.ReelView === 'function', 'ReelView existe quando há DOM');

    run('js/fortune-game.js');
  } catch (e) {
    console.log(' ✗ falhou ao carregar: ' + e.message + '\n' + (e.stack || ''));
    process.exit(1);
  }

  await flush();

  var reels = registry.reels;
  ok(!!reels && reels.children.length === 3, 'boot montou 3 rolos');
  ok(reels.children[0].children[0].children.length === 3, 'cada rolo começa com 3 células visíveis');
  ok(registry.gName.textContent === 'Tigre da Sorte', 'título veio do id da URL (?id=tigre)');
  ok(/RTP 96,/.test(registry.rtpLabel.textContent), 'RTP calibrado aparece no topo: ' + registry.rtpLabel.textContent);
  ok(registry.lines.children.length === 5, '5 linhas de pagamento desenhadas no SVG');
  ok(registry.gBalance.textContent.indexOf('1.000,00') !== -1,
    'saldo inicial R$ 1.000,00 (mostrado: ' + registry.gBalance.textContent + ')');

  /* ---- um giro completo ---- */
  var before = JSON.parse(store.fortunego_state || '{"balance":1000}').balance || 1000;
  registry.spinBtn.fire('click');

  ok(registry.spinBtn.disabled === true, 'botão trava durante o giro');
  ok(registry.winbar.textContent.indexOf('Girando') !== -1, 'barra mostra "Girando…"');

  await flush();

  var saved = JSON.parse(store.fortunego_state || '{}');
  ok(typeof saved.balance === 'number', 'estado foi gravado no localStorage');
  ok(saved.spins === 1, 'contador de giros subiu para 1 (obtido ' + saved.spins + ')');
  ok(registry.spinBtn.disabled === false, 'botão liberou depois da parada');
  ok(reels.children[0].children[0].children.length === 3,
    'rolo voltou a 3 células depois da animação (sem lixo acumulado)');

  var delta = saved.balance - before;
  var aposta = saved.bet;
  ok(delta === -aposta || delta > -aposta,
    'saldo variou de forma coerente com a aposta (Δ = ' + delta.toFixed(2) + ', aposta ' + aposta + ')');
  ok(/GANHOU|dessa vez|scatter/i.test(registry.winbar.textContent),
    'resultado anunciado: "' + registry.winbar.textContent + '"');

  /* ---- 60 giros seguidos: procura exceção e estado inconsistente ---- */
  var crashes = fails;
  for (var i = 0; i < 60; i++) {
    registry.spinBtn.fire('click');
    await flush();
  }
  var fim = JSON.parse(store.fortunego_state);
  ok(fails === crashes, '60 giros encadeados sem exceção');
  ok(fim.spins >= 61, 'todos os giros contabilizados (' + fim.spins + ')');
  ok(fim.balance >= 0, 'saldo nunca ficou negativo (R$ ' + fim.balance.toFixed(2) + ')');
  ok(fim.history.length > 0 && fim.history.length <= 12, 'histórico limitado a 12 linhas (' + fim.history.length + ')');
  ok(reels.children.every(function (r) { return r.children[0].children.length === 3; }),
    'os 3 rolos continuam com 3 células após 61 giros');

  /* ---- aposta ---- */
  registry.betUp.fire('click');
  await flush();
  var up = JSON.parse(store.fortunego_state).bet;
  ok(up > aposta, 'botão + aumenta a aposta (' + aposta + ' → ' + up + ')');
  registry.betDown.fire('click');
  await flush();
  ok(JSON.parse(store.fortunego_state).bet === aposta, 'botão − volta a aposta anterior');

  /* ---- tabela de prêmios ---- */
  registry.payBtn.fire('click');
  ok(registry.paysheet.classList.contains('open'), 'tabela de prêmios abre');
  ok(/3 iguais/.test(registry.ptGrid.innerHTML), 'tabela lista os prêmios');
  registry.ptClose.fire('click');
  ok(!registry.paysheet.classList.contains('open'), 'tabela fecha');

  console.log('\n' + (fails === 0
    ? '✅ sala de jogo OK — boot, 61 giros, aposta e tabela sem erro'
    : '❌ ' + fails + ' verificação(ões) falharam') + '\n');
  process.exit(fails === 0 ? 0 : 1);
}());
