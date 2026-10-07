/*!
 * FortuneGo — camada de TEMA
 *
 * Esta é a fronteira entre "o que muda de um jogo para outro" e "o que nunca
 * muda". A engine (fortune-slot.js) e o controlador da sala (fortune-game.js)
 * não conhecem nenhum jogo pelo nome: eles recebem um TEMA.
 *
 * Para acrescentar um jogo novo basta adicionar uma entrada no catálogo
 * (fortune-games.js) com arte, paleta, nome do modo bônus e escala musical.
 * Nenhum arquivo de lógica precisa ser tocado — e existe um teste
 * (tools/test-theme.js) que FALHA o build se algum id de jogo aparecer
 * escrito dentro de um arquivo de engine.
 *
 * Um tema é:
 *   id, name, tag
 *   art     { mascot, premium, premiumChar, money, scatter, backdrop }
 *   palette { base:[fundo,destaque], bonus:[fundo,destaque], reel }
 *   math    { rtp, vol }
 *   bonus   { name, spins, mult }
 *   audio   { root, scale, timbre }
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FortuneTheme = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SYM = 'img/sym/';

  /* Valores de reserva: um jogo incompleto no catálogo continua jogável,
     só sai com a cara padrão em vez de quebrar a sala. */
  var PADRAO = {
    palette: { base: ['#2b0b3f', '#facc15'], bonus: ['#4a1d05', '#fb923c'], reel: '#35135a' },
    audio: { root: 523.25, scale: [0, 2, 4, 7, 9], timbre: 'triangle' },
    bonus: { name: 'Modo Fortuna', spins: 8, mult: 2 }
  };

  /** Escala pentatônica: qualquer nota combina com qualquer outra. */
  function nota(audio, grau) {
    var esc = audio.scale;
    var oitava = Math.floor(grau / esc.length);
    var semitons = esc[((grau % esc.length) + esc.length) % esc.length] + 12 * oitava;
    return audio.root * Math.pow(2, semitons / 12);
  }

  /** Normaliza uma entrada do catálogo num tema completo. */
  function build(game) {
    if (!game) return null;
    var p = game.palette || {};
    var a = game.audio || {};
    var b = game.bonusMode || {};

    return {
      id: game.id,
      name: game.name,
      short: game.short || game.name,
      tag: game.tag || '',

      art: {
        mascot: game.img || null,
        premium: game.item ? SYM + game.item + '.png' : null,
        premiumChar: game.itemChar || '●',
        money: SYM + 'money.png',
        scatter: SYM + 'scatter.png',
        backdrop: game.backdrop || SYM + 'backdrop.jpg'
      },

      palette: {
        base: game.theme || PADRAO.palette.base,
        bonus: p.bonus || PADRAO.palette.bonus,
        reel: p.reel || PADRAO.palette.reel
      },

      math: { rtp: game.rtp, vol: game.vol },

      bonus: {
        name: b.name || ('Modo ' + (game.short || game.name)),
        spins: b.spins || PADRAO.bonus.spins,
        mult: b.mult || PADRAO.bonus.mult
      },

      audio: {
        root: a.root || PADRAO.audio.root,
        scale: a.scale || PADRAO.audio.scale,
        timbre: a.timbre || PADRAO.audio.timbre
      }
    };
  }

  /**
   * Escreve o tema nas variáveis CSS. Trocar para o modo bônus é só chamar
   * de novo com mode='bonus' — nenhuma regra de CSS precisa saber que jogo é.
   */
  function apply(theme, mode, alvo) {
    if (!theme) return;
    var el = alvo || (typeof document !== 'undefined' ? document.body : null);
    if (!el || !el.style || !el.style.setProperty) return;

    var cor = (mode === 'bonus') ? theme.palette.bonus : theme.palette.base;
    el.style.setProperty('--t1', cor[0]);
    el.style.setProperty('--t2', cor[1]);
    el.style.setProperty('--reel', theme.palette.reel);
    if (el.classList) el.classList.toggle('bonus-mode', mode === 'bonus');
  }

  /**
   * Tocador ligado à escala do tema — cada jogo soa diferente sem que o
   * controlador saiba disso. `grau` é o degrau da escala, não a frequência.
   */
  function audio(theme, sink) {
    var t = (theme && theme.audio) || PADRAO.audio;
    return {
      nota: function (grau) { return nota(t, grau); },
      tocar: function (grau, dur, timbre) {
        if (sink) sink(nota(t, grau), dur || 0.07, timbre || t.timbre);
      },
      arpejo: function (graus, passo, dur) {
        if (!sink) return;
        graus.forEach(function (g, i) {
          setTimeout(function () { sink(nota(t, g), dur || 0.18, t.timbre); }, i * (passo || 110));
        });
      }
    };
  }

  /** Lista o que falta num tema. Vazio = completo. */
  function validate(theme) {
    var problemas = [];
    if (!theme) return ['tema nulo'];
    if (!theme.id) problemas.push('sem id');
    if (!theme.name) problemas.push('sem nome');
    if (!theme.art.mascot) problemas.push('sem arte de mascote');
    if (!theme.art.premium) problemas.push('sem símbolo premium');
    if (!theme.math.rtp) problemas.push('sem RTP');
    if (!theme.math.vol) problemas.push('sem volatilidade');
    if (!theme.bonus.name) problemas.push('sem nome de modo bônus');
    [['base', theme.palette.base], ['bonus', theme.palette.bonus]].forEach(function (par) {
      var v = par[1];
      if (!v || v.length !== 2 || !/^#[0-9a-f]{3,8}$/i.test(v[0]) || !/^#[0-9a-f]{3,8}$/i.test(v[1])) {
        problemas.push('paleta ' + par[0] + ' inválida');
      }
    });
    if (!theme.audio.scale || !theme.audio.scale.length) problemas.push('sem escala musical');
    return problemas;
  }

  return { build: build, apply: apply, audio: audio, validate: validate, PADRAO: PADRAO };
}));
