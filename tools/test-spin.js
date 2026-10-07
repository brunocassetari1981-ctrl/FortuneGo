#!/usr/bin/env node
/**
 * Teste da ANIMAÇÃO dos rolos (sem navegador).
 *
 * Reclamação que originou este arquivo: "o jogo está girando muito rápido ao
 * ponto de não aparecer as figuras". Aqui o rAF é substituído por um relógio
 * virtual de 60 quadros por segundo e a tira é inspecionada quadro a quadro,
 * medindo o que o olho veria:
 *
 *   1. ordem de parada — sempre da esquerda para a direita;
 *   2. encaixe exato — a grade parada é igual à que a matemática sorteou;
 *   3. legibilidade — cada símbolo fica tempo suficiente na tela;
 *   4. suavidade — a velocidade não dá salto ao começar a frear;
 *   5. sem lixo — a tira volta ao tamanho certo, giro após giro.
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

/* ------------------------- DOM mínimo para a tira ------------------------- */

var CELL = 90;            // altura de célula usada no teste
var ROWS = [3, 4, 3];

function El(tag) {
  this.tagName = (tag || 'div').toUpperCase();
  this.children = [];
  this.attrs = {};
  this.textContent = '';
  this.style = { setProperty: function () {}, getPropertyValue: function () { return ''; } };
  this.classList = (function (self) {
    var set = {};
    return {
      add: function () { for (var i = 0; i < arguments.length; i++) set[arguments[i]] = 1; },
      remove: function () { for (var i = 0; i < arguments.length; i++) delete set[arguments[i]]; },
      contains: function (c) { return !!set[c]; },
      toggle: function (c, f) {
        var on = f === undefined ? !set[c] : !!f;
        if (on) set[c] = 1; else delete set[c];
        return on;
      }
    };
  }(this));
}
El.prototype.appendChild = function (c) { this.children.push(c); return c; };
El.prototype.insertBefore = function (c, ref) {
  var i = ref ? this.children.indexOf(ref) : -1;
  if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
  return c;
};
El.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c);
  if (i >= 0) this.children.splice(i, 1);
  return c;
};
El.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
El.prototype.getAttribute = function (k) { return this.attrs[k] === undefined ? null : this.attrs[k]; };
El.prototype.querySelectorAll = function () { return []; };
Object.defineProperty(El.prototype, 'firstChild', { get: function () { return this.children[0]; } });
Object.defineProperty(El.prototype, 'lastChild', {
  get: function () { return this.children[this.children.length - 1]; }
});
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return ''; },
  set: function () { this.children = []; }
});

/* ----------------------------- Relógio virtual ----------------------------- */

var clock = 0;
var rafQueue = [];
var timers = [];

var sandbox = {
  console: console,
  document: { createElement: function (t) { return new El(t); } },
  performance: { now: function () { return clock; } },
  requestAnimationFrame: function (fn) { rafQueue.push(fn); return rafQueue.length; },
  setTimeout: function (fn, ms) { timers.push({ at: clock + (ms || 0), fn: fn }); return timers.length; },
  clearTimeout: function () {},
  Promise: Promise, Math: Math, Date: Date, Object: Object, Array: Array,
  Number: Number, String: String, JSON: JSON
};
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

function run(file) {
  vm.runInContext(fs.readFileSync(path.join(ASSETS, file), 'utf8'), sandbox, { filename: file });
}
run('js/fortune-games.js');
run('js/fortune-slot.js');

var Games = sandbox.FortuneGames;
var Slot = sandbox.FortuneSlot;
var M = Slot.math;

/* ------------------------------- A bancada ------------------------------- */

function novaVista(c) {
  var root = new El('div');
  root.clientHeight = CELL * 3;
  var view = new Slot.ReelView(root, c);
  // o measure() real depende de layout; aqui fixamos a altura de célula
  view.measure = function () { this.cellH = CELL; };
  view.cellH = CELL;
  view.reels.forEach(function (r) { r.el.clientHeight = CELL * r.rows; });
  return view;
}

/**
 * Roda a animação inteira e devolve o que aconteceu, quadro a quadro.
 * Os tempos são RELATIVOS ao início deste giro (o relógio virtual é global
 * e acumula entre as chamadas).
 */
async function girar(view, grid, turbo) {
  var ordem = [];
  var amostras = [[], [], []];       // velocidade por rolo, em símbolos/s
  var done = false;
  var inicio = clock;

  var p = view.spinTo(grid, {
    turbo: !!turbo,
    onStop: function (col) { ordem.push({ col: col, t: clock - inicio }); }
  }).then(function () { done = true; });

  var guarda = 0;
  while (guarda++ < 4000) {
    var lote = rafQueue;
    rafQueue = [];
    if (!lote.length) break;
    clock += 1000 / 60;                       // 60 quadros por segundo
    lote.forEach(function (fn) { fn(clock); });
    view.reels.forEach(function (r, i) {
      if (r.phase !== 'idle') amostras[i].push(r.speed * 1000);
    });
    timers = timers.filter(function (job) {
      if (job.at <= clock) { job.fn(); return false; }
      return true;
    });
    if (view.reels.every(function (r) { return r.phase === 'idle'; })) break;
  }

  await p;                                     // a promessa do spinTo resolveu?
  return { ordem: ordem, amostras: amostras, concluiu: done, guarda: guarda };
}

/** Lê a grade que ficou visível depois que tudo parou. */
function lerGrade(view) {
  var g = [];
  for (var col = 0; col < view.c.cols; col++) {
    g[col] = [];
    for (var row = 0; row < view.c.rowsPer[col]; row++) {
      var cel = view.cellAt(col, row);
      g[col][row] = cel ? cel.getAttribute('data-sym') : null;
    }
  }
  return g;
}

function esperado(view, grid) {
  return grid.map(function (coluna) {
    return coluna.map(function (idx) { return view.c.all[idx].id; });
  });
}

/* --------------------------------- Testes --------------------------------- */

console.log('\n=== Animação dos rolos (relógio virtual de 60 fps) ===\n');

(async function () {

var c = M.prepare(Games.byId('coelho'));
var rng = M.seeded(2026);

/* 1. uma rodada normal, inspecionada em detalhe */
var view = novaVista(c);
var grid = M.drawGrid(c, rng);
var r1 = await girar(view, grid, false);

ok(r1.concluiu, 'a promessa do giro resolve sozinha (' + r1.guarda + ' quadros)');

var ordemCols = r1.ordem.map(function (p) { return p.col; }).join(',');
ok(ordemCols === '0,1,2', 'os rolos param da esquerda para a direita (ordem ' + ordemCols + ')');

var gaps = [];
for (var i = 1; i < r1.ordem.length; i++) gaps.push(Math.round(r1.ordem[i].t - r1.ordem[i - 1].t));
ok(gaps.every(function (g) { return g > 60; }),
  'há intervalo visível entre as paradas (' + gaps.join(' ms, ') + ' ms)');

var total = r1.ordem.length ? Math.round(r1.ordem[r1.ordem.length - 1].t) : 0;
ok(total > 900 && total < 3200, 'a rodada dura ' + total + ' ms (faixa aceita 900 a 3200)');

ok(JSON.stringify(lerGrade(view)) === JSON.stringify(esperado(view, grid)),
  'a grade parada é exatamente a que a matemática sorteou');

/* 2. legibilidade: a que velocidade o símbolo passa */
var pico = 0;
r1.amostras.forEach(function (serie) {
  serie.forEach(function (v) { if (v > pico) pico = v; });
});
var msPorSimbolo = 1000 / pico;
var quadrosPorSimbolo = msPorSimbolo / (1000 / 60);
ok(pico <= 13,
  'velocidade de pico ' + pico.toFixed(1) + ' símbolos/s (limite 13 para dar para ver)');
ok(quadrosPorSimbolo >= 4,
  'cada símbolo fica ' + quadrosPorSimbolo.toFixed(1) + ' quadros na tela (mínimo 4)');

/* 3. suavidade: nenhum salto brusco de velocidade entre quadros */
var maiorSalto = 0;
r1.amostras.forEach(function (serie) {
  for (var k = 1; k < serie.length; k++) {
    var d = Math.abs(serie[k] - serie[k - 1]);
    if (d > maiorSalto) maiorSalto = d;
  }
});
ok(maiorSalto < pico * 0.18,
  'sem solavanco: maior variação entre quadros = ' + maiorSalto.toFixed(2) +
  ' símbolos/s (limite ' + (pico * 0.18).toFixed(2) + ')');

/* 4. a velocidade sobe e desce uma vez só — acelera, mantém, freia */
var serie0 = r1.amostras[0];
var subidas = 0;
for (var k = 2; k < serie0.length; k++) {
  if (serie0[k] > serie0[k - 1] + 0.05 && serie0[k - 1] <= serie0[k - 2] + 0.05) subidas++;
}
ok(subidas <= 1, 'a velocidade acelera uma vez só e depois só cai (' + subidas + ' subidas)');

/* 5. turbo: mais rápido, porém ainda legível e na ordem certa */
var viewT = novaVista(c);
var gridT = M.drawGrid(c, rng);
var rT = await girar(viewT, gridT, true);
var picoT = 0;
rT.amostras.forEach(function (s) { s.forEach(function (v) { if (v > picoT) picoT = v; }); });
var totalT = rT.ordem.length ? Math.round(rT.ordem[rT.ordem.length - 1].t) : 0;

ok(rT.ordem.map(function (p) { return p.col; }).join(',') === '0,1,2',
  'no turbo os rolos também param da esquerda para a direita');
ok(totalT < total, 'o turbo é mais rápido (' + totalT + ' ms contra ' + total + ' ms)');
ok(picoT <= 20, 'mesmo no turbo o pico fica em ' + picoT.toFixed(1) + ' símbolos/s (limite 20)');
ok(JSON.stringify(lerGrade(viewT)) === JSON.stringify(esperado(viewT, gridT)),
  'o turbo também encaixa a grade sorteada');

/* 6. 25 giros seguidos: a tira não acumula nem perde células */
var viewL = novaVista(c);
var tamanhoOk = true, encaixeOk = true;
for (var n = 0; n < 25; n++) {
  var g = M.drawGrid(c, rng);
  await girar(viewL, g, n % 2 === 0);
  viewL.reels.forEach(function (r) {
    if (r.strip.children.length !== r.rows + 2) tamanhoOk = false;
  });
  if (JSON.stringify(lerGrade(viewL)) !== JSON.stringify(esperado(viewL, g))) encaixeOk = false;
}
ok(tamanhoOk, 'depois de 25 giros a tira continua com rows+2 células em cada rolo');
ok(encaixeOk, 'os 25 giros encaixaram a grade certa, um por um');

/* 7. a coluna do meio tem mesmo 4 posições girando */
ok(viewL.reels[1].rows === 4 && viewL.reels[1].strip.children.length === 6,
  'o rolo central roda com 4 posições visíveis (+2 de folga)');

console.log('\n' + (fails === 0
  ? '✅ animação dos rolos OK — ordem, encaixe, legibilidade e suavidade'
  : '❌ ' + fails + ' verificação(ões) falharam') + '\n');

process.exit(fails === 0 ? 0 : 1);

}());
