#!/usr/bin/env node
/**
 * Teste da matemática do caça-níquel (roda no CI, sem navegador).
 *
 * Verifica, para CADA jogo do catálogo:
 *   1. a calibração entrega o RTP alvo (erro < 1 ponto percentual);
 *   2. o RTP exato (fórmula fechada) bate com o RTP medido por simulação
 *      de 300.000 rodadas — ou seja, a fórmula e o código do giro concordam;
 *   3. o jogo é jogável: todo símbolo tem prêmio > 0 e a escada é decrescente;
 *   4. a grade é 3-4-3 com 10 linhas e todo símbolo premium é exclusivo.
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

var premiums = [];

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

  /* scatter e dinheiro são recursos, não combinação de linha: pay 0 é o certo */
  var pays = c.all.filter(function (s) { return !s.isScatter && !s.isMoney; })
    .map(function (s) { return s.pay; });
  check(pays.every(function (p) { return p > 0; }), game.id + ': há símbolo sem prêmio');

  /* -------- símbolo de dinheiro -------- */
  var dinheiro = c.all[c.moneyIndex];
  check(dinheiro && dinheiro.isMoney && dinheiro.pay === 0,
    game.id + ': o símbolo de dinheiro não deveria pagar em linha');
  check(c.moneyValues.length >= 6 && c.moneyValues.every(function (v) { return v[0] > 0 && v[1] > 0; }),
    game.id + ': tabela de valores do dinheiro inválida');
  check(c.moneyRTP > 0.01 && c.moneyRTP < c.rtpExact,
    game.id + ': o dinheiro responde por ' + pct(c.moneyRTP) + ' do RTP (fora da faixa)');
  check(Math.abs((c.baseRTP + c.moneyRTP) * c.freeFactor - c.rtpExact) < 1e-9,
    game.id + ': linha + dinheiro não fecham o RTP exato');
  check(Math.abs(s.moneyRTP - c.moneyRTP) < 0.012,
    game.id + ': dinheiro simulado ' + pct(s.moneyRTP) + ' ≠ teórico ' + pct(c.moneyRTP));
  /* uma linha cheia de dinheiro NÃO pode virar prêmio de linha */
  var cheia = [];
  for (var _c = 0; _c < c.cols; _c++) cheia.push(new Array(c.rowsPer[_c]).fill(c.moneyIndex));
  var vazio = M.evaluate(c, cheia);
  check(vazio.wins.length === 0,
    game.id + ': grade toda de dinheiro pagou linha (não pode)');
  check(vazio.moneyCount === c.cells && vazio.moneyHit,
    game.id + ': grade toda de dinheiro não contou as 10 células');
  for (var i = 1; i < c.wildIndex; i++) {
    check(c.all[i - 1].pay >= c.all[i].pay, game.id + ': escada de prêmios fora de ordem em s' + i);
  }
  check(c.all[c.wildIndex].pay >= c.all[0].pay, game.id + ': curinga paga menos que o símbolo premium');

  /* forma da grade e das linhas */
  check(String(c.rowsPer) === '3,4,3', game.id + ': grade não é 3-4-3 (' + c.rowsPer + ')');
  check(c.cells === 10, game.id + ': grade com ' + c.cells + ' posições, esperado 10');
  check(c.lines.length === 10, game.id + ': ' + c.lines.length + ' linhas, esperado 10');
  c.lines.forEach(function (l, i) {
    check(l.length === c.cols && l.every(function (row, col) { return row < c.rowsPer[col]; }),
      game.id + ': linha ' + (i + 1) + ' sai da grade (' + l + ')');
  });

  /* o curinga é o bicho do jogo, com a mesma arte do card do lobby */
  check(c.all[c.wildIndex].img === game.img,
    game.id + ': o curinga deveria usar a arte do jogo (' + c.all[c.wildIndex].img + ')');
  premiums.push({ id: game.id, img: c.all[0].img });
});

/* cada jogo precisa de um símbolo premium próprio — é o que diferencia as
   máquinas. Só as duas entradas de demonstração podem repetir. */
var reais = premiums.filter(function (p) { return p.id.indexOf('demo') !== 0; });
var vistos = {};
reais.forEach(function (p) {
  check(!vistos[p.img], p.id + ': símbolo premium repetido (' + p.img + ')');
  vistos[p.img] = true;
});

/* ------------------------- Regras de linha ------------------------- */

console.log('\n=== Regras de linha ===\n');
var c = M.prepare(Games.byId('tigre'));
var W = c.wildIndex, S = c.scatterIndex;

/* Monta uma grade 3-4-3 em que só a LINHA 2 (meio das três laterais,
   posição 1 da coluna central) recebe os símbolos do teste. */
function gridOf(mid, filler) {
  return [
    [filler, mid[0], filler],
    [filler, mid[1], filler, filler],
    [filler, mid[2], filler]
  ];
}
var filler = 4;              // lanterna: não forma linha nas bordas do teste
var cases = [
  { name: '3 iguais na central pagam', grid: gridOf([0, 0, 0], 4), expect: c.all[0].pay },
  { name: 'curinga substitui', grid: gridOf([0, W, 0], 4), expect: c.all[0].pay },
  { name: '3 curingas pagam o prêmio do curinga', grid: gridOf([W, W, W], 4), expect: c.all[W].pay },
  { name: 'scatter não paga em linha', grid: gridOf([0, S, 0], 4), expect: 0 },
  { name: 'símbolos diferentes não pagam', grid: gridOf([0, 1, 2], 4), expect: 0 }
];

cases.forEach(function (t) {
  var r = M.evaluate(c, t.grid);
  var central = r.wins.filter(function (w) { return w.line === 1; })[0];
  var got = central ? central.pay : 0;
  var ok = Math.abs(got - t.expect) < 1e-9;
  if (!ok) fails++;
  console.log((ok ? ' ✓ ' : ' ✗ ') + pad(t.name, 44) + 'esperado ' + t.expect + ', obtido ' + got);
});

/* 3 scatters em qualquer posição disparam giros grátis */
var sg = [[S, 3, 3], [3, S, 3, 3], [3, 3, S]];
var sr = M.evaluate(c, sg);
var okFree = sr.free === c.freeSpins && sr.scatters === 3;
if (!okFree) fails++;
console.log((okFree ? ' ✓ ' : ' ✗ ') + pad('3 scatters espalhados dão ' + c.freeSpins + ' giros grátis', 44) +
  'obtido ' + sr.free + ' giros / ' + sr.scatters + ' scatters');

/* grade cheia do mesmo símbolo: as 10 linhas pagam, e o ganho em múltiplos
   da APOSTA TOTAL é igual ao prêmio do símbolo (10 linhas ÷ 10 de aposta) */
var fullGrid = [[2, 2, 2], [2, 2, 2, 2], [2, 2, 2]];
var fr = M.evaluate(c, fullGrid);
var okAll = fr.wins.length === 10 && Math.abs(fr.winUnits - c.all[2].pay) < 1e-9;
if (!okAll) fails++;
console.log((okAll ? ' ✓ ' : ' ✗ ') + pad('grade cheia premia as 10 linhas', 44) +
  'linhas ' + fr.wins.length + ' / ganho ' + fr.winUnits.toFixed(2) + '× aposta');

/* as 10 linhas são todas diferentes */
var assinaturas = {}, okUnic = true;
c.lines.forEach(function (l) {
  if (assinaturas[l.join('-')]) okUnic = false;
  assinaturas[l.join('-')] = true;
});
if (!okUnic) fails++;
console.log((okUnic ? ' ✓ ' : ' ✗ ') + pad('as 10 linhas são distintas entre si', 44) +
  Object.keys(assinaturas).length + ' traçados únicos');

/* a posição 3 da coluna central (a quarta) é usada por alguma linha */
var usaQuarta = c.lines.some(function (l) { return l[1] === 3; });
if (!usaQuarta) fails++;
console.log((usaQuarta ? ' ✓ ' : ' ✗ ') + pad('a 4ª posição do rolo central entra em linha', 44) +
  c.lines.filter(function (l) { return l[1] === 3; }).length + ' linha(s)');

console.log('\n' + (fails === 0
  ? '✅ matemática do caça-níquel OK — ' + Games.list.length + ' jogos calibrados'
  : '❌ ' + fails + ' verificação(ões) falharam') + '\n');

process.exit(fails === 0 ? 0 : 1);
