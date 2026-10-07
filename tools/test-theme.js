#!/usr/bin/env node
/**
 * Teste da ARQUITETURA MODULAR.
 *
 * Requisito: "trocar apenas o tema, os sprites, a animação do mascote e os
 * sons sem precisar reescrever a lógica do slot".
 *
 * Declarar modularidade é fácil; aqui ela é verificada:
 *
 *   1. todo jogo do catálogo produz um tema COMPLETO e válido;
 *   2. os temas são distinguíveis entre si (arte, paleta, modo, som);
 *   3. nenhum arquivo de ENGINE menciona um id de jogo — se alguém
 *      escrever `if (game.id === 'tigre')` dentro da lógica, o build cai;
 *   4. um jogo inventado na hora, que não existe no catálogo, roda de ponta
 *      a ponta (tema + matemática + giro) sem tocar em nenhuma engine.
 *
 * O item 4 é a prova de verdade: se um jogo novo funciona sem edição de
 * código, acrescentar os próximos é só preencher dados.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ASSETS = path.join(__dirname, '..', 'app', 'src', 'main', 'assets');
var JS = path.join(ASSETS, 'js');
var Games = require(path.join(JS, 'fortune-games.js'));
var Theme = require(path.join(JS, 'fortune-theme.js'));
var Slot = require(path.join(JS, 'fortune-slot.js'));
var M = Slot.math;

var fails = 0;
var pad = function (s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); };
function ok(cond, msg) {
  console.log((cond ? ' ✓ ' : ' ✗ ') + msg);
  if (!cond) fails++;
}

/* ===================== 1. todo jogo vira um tema válido ===================== */

console.log('\n=== Temas do catálogo ===\n');
console.log(pad('jogo', 10) + pad('modo bônus', 26) + pad('paleta base', 18) +
            pad('paleta bônus', 18) + pad('nota', 8) + 'timbre');
console.log('-'.repeat(88));

var temas = [];
Games.list.forEach(function (game) {
  var t = Theme.build(game);
  temas.push(t);
  var problemas = Theme.validate(t);
  console.log(
    pad(t.id, 10) + pad(t.bonus.name, 26) +
    pad(t.palette.base.join(' '), 18) + pad(t.palette.bonus.join(' '), 18) +
    pad(Math.round(t.audio.root), 8) + t.audio.timbre +
    (problemas.length ? '   ✗ ' + problemas.join(', ') : '')
  );
  if (problemas.length) fails++;
});
ok(temas.length === Games.list.length,
  'os ' + Games.list.length + ' jogos do catálogo produziram tema completo');

/* ==================== 2. os temas são distinguíveis ==================== */

console.log('\n=== Identidade de cada máquina ===\n');

function unicos(lista, chave) {
  var vistos = {}, repetidos = [];
  lista.forEach(function (x) {
    var k = chave(x);
    if (vistos[k]) repetidos.push(x.id + '=' + k);
    vistos[k] = true;
  });
  return repetidos;
}

// as duas entradas de demonstração podem repetir de propósito
var reais = temas.filter(function (t) { return t.id.indexOf('demo') !== 0; });

var dupPremium = unicos(reais, function (t) { return t.art.premium; });
ok(dupPremium.length === 0, 'símbolo premium exclusivo por jogo' +
  (dupPremium.length ? ' — repetido: ' + dupPremium.join(', ') : ''));

var dupMascote = unicos(reais, function (t) { return t.art.mascot; });
ok(dupMascote.length === 0, 'mascote exclusivo por jogo' +
  (dupMascote.length ? ' — repetido: ' + dupMascote.join(', ') : ''));

var dupBonus = unicos(reais, function (t) { return t.bonus.name; });
ok(dupBonus.length === 0, 'nome de modo bônus exclusivo' +
  (dupBonus.length ? ' — repetido: ' + dupBonus.join(', ') : ''));

var dupPaleta = unicos(reais, function (t) { return t.palette.base.join(); });
ok(dupPaleta.length === 0, 'paleta base exclusiva' +
  (dupPaleta.length ? ' — repetida: ' + dupPaleta.join(', ') : ''));

var sons = {};
reais.forEach(function (t) { sons[t.audio.root + '|' + t.audio.timbre] = 1; });
ok(Object.keys(sons).length >= 6,
  'pelo menos 6 assinaturas sonoras diferentes (' + Object.keys(sons).length + ')');

var contraste = reais.every(function (t) {
  return t.palette.base.join() !== t.palette.bonus.join();
});
ok(contraste, 'o modo bônus muda a cor da tela em todos os jogos');

/* ============ 3. nenhuma engine conhece jogo nenhum pelo nome ============ */

console.log('\n=== Fronteira engine × conteúdo ===\n');

var ENGINES = ['fortune-slot.js', 'fortune-theme.js', 'fortune-game.js', 'fortune-lobby.js'];
var ids = Games.list.map(function (g) { return g.id; });

ENGINES.forEach(function (arquivo) {
  var src = fs.readFileSync(path.join(JS, arquivo), 'utf8');
  var achados = ids.filter(function (id) {
    return new RegExp("['\"]" + id + "['\"]").test(src);
  });
  ok(achados.length === 0, arquivo + ' não cita nenhum jogo pelo id' +
    (achados.length ? ' — encontrados: ' + achados.join(', ') : ''));
});

var catalogo = fs.readFileSync(path.join(JS, 'fortune-games.js'), 'utf8');
ok(!/function\s+(spin|evaluate|drawGrid|lineExpectation)/.test(catalogo),
  'fortune-games.js guarda só dados, nenhuma lógica de slot');

/* ====== 4. um jogo que não existe no catálogo roda de ponta a ponta ====== */

console.log('\n=== Jogo novo, sem tocar em engine ===\n');

var SYM = 'img/sym/';
var inventado = {
  id: 'fenix', name: 'Fênix de Fogo', short: 'Fênix', img: 'img/fenix.png',
  tag: 'new', rtp: 96.9, vol: 'alta',
  item: 'pearl', itemChar: '🔥',
  chars: ['🔥', '🪶', '🪙', '🏮', '🧧', '🎴'],
  wild: '🌟', scatter: '💰',
  theme: ['#7c2d12', '#fb923c'],
  palette: { bonus: ['#431407', '#fed7aa'], reel: '#4a1505' },
  audio: { root: 622.25, scale: [0, 3, 5, 7, 10], timbre: 'sawtooth' },
  bonusMode: { name: 'Modo Fênix da Fortuna' }
};
// o mesmo baralho que o catálogo monta para qualquer jogo
inventado.sym = [
  { char: inventado.itemChar, img: SYM + inventado.item + '.png' },
  { char: '💰', img: SYM + 'bag.png' },
  { char: '🪙', img: SYM + 'ingot.png' },
  { char: '🧧', img: SYM + 'coins.png' },
  { char: '🏮', img: SYM + 'lantern.png' }
];
inventado.wildSym = { char: inventado.chars[0], img: inventado.img, label: 'WILD' };
inventado.scatterSym = { char: '💰', img: SYM + 'scatter.png' };
inventado.moneySym = { char: '💰', img: SYM + 'money.png' };

var tNovo = Theme.build(inventado);
ok(Theme.validate(tNovo).length === 0, 'o tema do jogo novo é válido de primeira');
ok(tNovo.bonus.name === 'Modo Fênix da Fortuna', 'o modo bônus dele saiu certo');

var cNovo = M.prepare(inventado);
ok(Math.abs(cNovo.rtpExact * 100 - inventado.rtp) < 0.15,
  'a matemática calibrou sozinha: RTP ' + (cNovo.rtpExact * 100).toFixed(2) +
  '% (alvo ' + inventado.rtp + '%)');

var sim = M.simulate(cNovo, 1000000, M.seeded(7));
ok(Math.abs(sim.rtp - cNovo.rtpExact) < 4 * sim.se,
  'e 1 milhão de giros confirmam: ' + (sim.rtp * 100).toFixed(2) +
  '% (±' + (4 * sim.se * 100).toFixed(2) + ')');
ok(cNovo.lines.length === 10 && cNovo.cells === 10,
  'herdou a grade 3-4-3 e as 10 linhas sem configurar nada');
ok(cNovo.moneyRTP > 0, 'herdou o recurso de dinheiro (' +
  (cNovo.moneyRTP * 100).toFixed(1) + '% do RTP)');

/* o tocador do tema produz frequências próprias */
var notas = [];
var player = Theme.audio(tNovo, function (f) { notas.push(Math.round(f)); });
player.tocar(0); player.tocar(2); player.tocar(5);
var playerPadrao = [];
Theme.audio(Theme.build(Games.byId(Games.list[2].id)), function (f) { playerPadrao.push(Math.round(f)); }).tocar(0);
ok(notas.length === 3 && notas[0] !== playerPadrao[0],
  'o jogo novo soa diferente dos outros (' + notas.join(' / ') + ' Hz)');

/* ---------------------------------------------------------------------- */

console.log('\n' + (fails === 0
  ? '✅ arquitetura modular OK — ' + temas.length +
    ' temas válidos, engines sem conhecer jogo nenhum, jogo novo plugado sem editar lógica'
  : '❌ ' + fails + ' verificação(ões) falharam') + '\n');

process.exit(fails === 0 ? 0 : 1);
