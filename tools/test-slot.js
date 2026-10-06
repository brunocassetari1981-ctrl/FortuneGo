#!/usr/bin/env node
/**
 * Teste da matemática do caça-níquel (roda no CI, sem navegador).
 *
 * Verifica, para CADA jogo do catálogo:
 *   1. a calibração entrega o RTP alvo (erro < 1 ponto percentual);
 *   2. o RTP exato (fórmula fechada) bate com o RTP medido por simulação
 *      de 300.000 rodadas — ou seja, a fórmula e o código do giro concordam;
 *   3. o jogo é jogável: todo símbolo tem prêmio > 0 e a escada é decrescente.
 * Mais um bloco de casos de borda das regras de linha (curinga/scatter).
 */
'use strict';

var path = require('path');
var ASSETS = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'js');
var Games = require(path.join(ASSETS, 'fortune-games.js'));
var Slot = require(path.join(ASSETS, 'fortune-slot.js'));
var M = Slot.math;

var ROUNDS = 300000;
var fails = 0;
var pad = function (s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); };
var pct = function (v) { return (v * 100).toFixed(2) + '%'; };

function check(cond, msg) {
  if (!cond) { fails++; console.log('   ✗ ' + msg); }
  return cond;
}

console.log('\n=== RTP por jogo (' + ROUNDS.toLocaleString('pt-BR') + ' rodadas simuladas cada) ===\n');
console.log(pad('jogo', 20) + pad('vol', 7) + pad('alvo', 8) + pad('exato', 8) + pad('simulado', 18) +
            pad('acerto', 9) + pad('free', 8) + 'maior prêmio');
console.log('-'.repeat(92));

Games.list.forEach(function (game) {
  var c = M.prepare(game);
  var s = M.simulate(c, ROUNDS, M.seeded(0xF0E1 + game.id.length));
  var top = Math.max.apply(null, c.all.map(function (x) { return x.pay; }));

  console.log(
    pad(game.name, 20) +
    pad(game.vol, 7) +
    pad(game.rtp.toFixed(1) + '%', 8) +
    pad(pct(c.rtpExact), 8) +
    pad(pct(s.rtp) + ' ±' + (s.se * 100).toFixed(2), 18) +
    pad((s.hitRate * 100).toFixed(1) + '%', 9) +
    pad('1/' + Math.round(1 / s.freeRate), 8) +
    top + '×'
  );

  check(Math.abs(c.rtpExact * 100 - game.rtp) < 0.15,
    game.id + ': RTP exato ' + pct(c.rtpExact) + ' longe do alvo ' + game.rtp + '%');
  // tolerância estatística: 4 erros-padrão da própria amostra
  check(Math.abs(s.rtp - c.rtpExact) < 4 * s.se,
    game.id + ': simulação ' + pct(s.rtp) + ' diverge da fórmula ' + pct(c.rtpExact) +
    ' (' + (Math.abs(s.rtp - c.rtpExact) / s.se).toFixed(1) + ' erros-padrão)');

  var pays = c.all.filter(function (s) { return !s.isScatter; }).map(function (s) { return s.pay; });
  check(pays.every(function (p) { return p > 0; }), game.id + ': há símbolo sem prêmio');
  for (var i = 1; i < 6; i++) {
    check(c.all[i - 1].pay >= c.all[i].pay, game.id + ': escada de prêmios fora de ordem em s' + i);
  }
  check(c.all[c.wildIndex].pay >= c.all[0].pay, game.id + ': curinga paga menos que o símbolo premium');
});

/* ------------------------- Regras de linha ------------------------- */

console.log('\n=== Regras de linha ===\n');
var c = M.prepare(Games.byId('tigre'));
var W = c.wildIndex, S = c.scatterIndex;

function gridOf(rowCenter, filler) {
  var g = [];
  for (var col = 0; col < 3; col++) g[col] = [filler, rowCenter[col], filler];
  return g;
}
// usa um símbolo que não forma linha nas bordas para isolar a linha central
var filler = 5;
var cases = [
  { name: '3 iguais na central pagam', grid: gridOf([0, 0, 0], 4), expect: c.all[0].pay },
  { name: 'curinga substitui', grid: gridOf([0, W, 0], 4), expect: c.all[0].pay },
  { name: '3 curingas pagam o prêmio do curinga', grid: gridOf([W, W, W], 4), expect: c.all[W].pay },
  { name: 'scatter não paga em linha', grid: gridOf([0, S, 0], 4), expect: 0 },
  { name: 'símbolos diferentes não pagam', grid: gridOf([0, 1, 2], 4), expect: 0 }
];

cases.forEach(function (t) {
  var r = M.evaluate(c, t.grid);
  var central = r.wins.filter(function (w) { return w.line === 0; })[0];
  var got = central ? central.pay : 0;
  var ok = Math.abs(got - t.expect) < 1e-9;
  if (!ok) fails++;
  console.log((ok ? ' ✓ ' : ' ✗ ') + pad(t.name, 44) + 'esperado ' + t.expect + ', obtido ' + got);
});

/* 3 scatters em qualquer posição disparam giros grátis */
var sg = [[S, 4, 4], [4, S, 4], [4, 4, S]];
var sr = M.evaluate(c, sg);
var okFree = sr.free === c.freeSpins && sr.scatters === 3;
if (!okFree) fails++;
console.log((okFree ? ' ✓ ' : ' ✗ ') + pad('3 scatters espalhados dão ' + c.freeSpins + ' giros grátis', 44) +
  'obtido ' + sr.free + ' giros / ' + sr.scatters + ' scatters');

/* 5 linhas: grade toda do mesmo símbolo deve premiar as 5 */
var fullGrid = [[3, 3, 3], [3, 3, 3], [3, 3, 3]];
var fr = M.evaluate(c, fullGrid);
var okAll = fr.wins.length === 5 && Math.abs(fr.winUnits - c.all[3].pay) < 1e-9;
if (!okAll) fails++;
console.log((okAll ? ' ✓ ' : ' ✗ ') + pad('grade cheia premia as 5 linhas', 44) +
  'linhas ' + fr.wins.length + ' / ganho ' + fr.winUnits.toFixed(2) + '× aposta');

console.log('\n' + (fails === 0
  ? '✅ matemática do caça-níquel OK — ' + Games.list.length + ' jogos calibrados'
  : '❌ ' + fails + ' verificação(ões) falharam') + '\n');

process.exit(fails === 0 ? 0 : 1);
