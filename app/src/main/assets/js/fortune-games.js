/*!
 * FortuneGo — catálogo de jogos
 * Fonte única usada pelo lobby (index.html) e pela sala de jogo (game.html).
 * Funciona no navegador (window.FortuneGames) e no Node (module.exports),
 * para que tools/test-slot.js teste exatamente os mesmos dados que o app usa.
 *
 * Campos por jogo:
 *   id       identificador curto (vai na URL: game.html?id=tigre)
 *   name     nome exibido
 *   img      ícone do card e símbolo premium do rolo
 *   tag      '' | 'hot' | 'new' | 'live'  (filtros do lobby)
 *   rtp      RTP ALVO em %. O motor calibra os prêmios para bater nesse número.
 *   vol      'baixa' | 'media' | 'alta'   (define pesos e escada de prêmios)
 *   chars    emojis de reserva; o primeiro é o BICHO (usado como curinga)
 *   item     objeto exclusivo do tema — é o símbolo premium dos rolos
 *   scatter  símbolo de giros grátis (paga em qualquer posição, 3+)
 *   theme    [cor1, cor2] do gradiente da máquina
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FortuneGames = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var GAMES = [
    {
      id: 'tigre', item: 'firecracker', itemChar: '🧨', name: 'Tigre da Sorte', img: 'img/tigre.png',
      tag: 'hot', rtp: 96.8, vol: 'alta',
      chars: ['🐯', '🧧', '🪙', '🏮', '🥠', '🎴'],
      wild: '🌟', scatter: '💰', theme: ['#7f1d1d', '#f59e0b']
    },
    {
      id: 'dragao', item: 'pearl', itemChar: '🔮', name: 'Dragão de Jade', img: 'img/dragao.png',
      tag: '', rtp: 97.2, vol: 'media',
      chars: ['🐲', '🔮', '💎', '🏮', '🀄', '🎋'],
      wild: '🌟', scatter: '💰', theme: ['#064e3b', '#22d3ee']
    },
    {
      id: 'coelho', item: 'carrot', itemChar: '🥕', name: 'Coelho da Fortuna', img: 'img/coelho.png',
      tag: 'new', rtp: 96.1, vol: 'baixa',
      chars: ['🐰', '🥕', '🌕', '🧧', '🪙', '🎋'],
      wild: '🌟', scatter: '💰', theme: ['#831843', '#f9a8d4']
    },
    {
      id: 'touro', item: 'bell', itemChar: '🔔', name: 'Boi Dourado', img: 'img/touro.png',
      tag: 'hot', rtp: 95.9, vol: 'alta',
      chars: ['🐂', '🌾', '🪙', '🧧', '🔔', '🎍'],
      wild: '🌟', scatter: '💰', theme: ['#78350f', '#fbbf24']
    },
    {
      id: 'panda', item: 'bamboo', itemChar: '🎋', name: 'Panda Real', img: 'img/panda.png',
      tag: '', rtp: 96.4, vol: 'media',
      chars: ['🐼', '🎋', '🥟', '🪙', '🧧', '🏮'],
      wild: '🌟', scatter: '💰', theme: ['#1e293b', '#94a3b8']
    },
    {
      id: 'roleta', item: 'chip', itemChar: '🎰', name: 'Roleta Imperial', img: 'img/roleta.png',
      tag: 'live', rtp: 97.3, vol: 'baixa',
      chars: ['🎡', '♠️', '♥️', '♦️', '♣️', '🪙'],
      wild: '🌟', scatter: '💰', theme: ['#450a0a', '#ef4444']
    },
    {
      id: 'mina', item: 'diamond', itemChar: '💎', name: 'Mina de Ouro', img: 'img/mina-de-ouro.png',
      tag: 'new', rtp: 96.0, vol: 'alta',
      chars: ['⛏️', '💎', '🧨', '🔦', '🪙', '🪨'],
      wild: '🌟', scatter: '💰', theme: ['#422006', '#eab308']
    },
    {
      id: 'aviator', item: 'compass', itemChar: '🧭', name: 'Aviador Fortune', img: 'img/aviator.png',
      tag: 'hot', rtp: 97.0, vol: 'alta',
      chars: ['✈️', '🪂', '🧭', '🎖️', '☁️', '⛽'],
      wild: '🌟', scatter: '💰', theme: ['#0c4a6e', '#38bdf8']
    },
    {
      id: 'bingo', item: 'bingoball', itemChar: '🎱', name: 'Bingo Imperial', img: 'img/bingo-imperial.png',
      tag: 'live', rtp: 95.5, vol: 'media',
      chars: ['🎱', '🃏', '🎟️', '🔔', '🪙', '🧧'],
      wild: '🌟', scatter: '💰', theme: ['#3b0764', '#a855f7']
    },
    {
      id: 'rato', item: 'cheese', itemChar: '🧀', name: 'Rato Milionário', img: 'img/rato.png',
      tag: '', rtp: 96.3, vol: 'media',
      chars: ['🐭', '🧀', '🪙', '🧧', '🎐', '🏮'],
      wild: '🌟', scatter: '💰', theme: ['#334155', '#facc15']
    },
    {
      id: 'espaco', item: 'planet', itemChar: '🪐', name: 'Astro Multiplier', img: 'img/espaco.png',
      tag: 'new', rtp: 97.1, vol: 'alta',
      chars: ['🚀', '🪐', '☄️', '🛸', '⭐', '🌙'],
      wild: '🌟', scatter: '💰', theme: ['#1e1b4b', '#818cf8']
    },
    {
      id: 'futebol', item: 'trophy', itemChar: '🏆', name: 'Pênalti de Ouro', img: 'img/futebol.png',
      tag: 'live', rtp: 96.6, vol: 'media',
      chars: ['⚽', '🥅', '🧤', '🏆', '🎽', '🚩'],
      wild: '🌟', scatter: '💰', theme: ['#14532d', '#4ade80']
    },
    /* Os dois últimos apontam de propósito para caminhos quebrados:
       provam o motor de resgate de imagens (fortune-enhance.js). */
    {
      id: 'demo1', item: 'firecracker', itemChar: '🧨', name: 'Fortune Tiger', img: 'images/fortune_tiger_icon.png',
      tag: '', rtp: 96.8, vol: 'alta',
      chars: ['🐯', '🧧', '🪙', '🏮', '🥠', '🎴'],
      wild: '🌟', scatter: '💰', theme: ['#7f1d1d', '#f59e0b']
    },
    {
      id: 'demo2', item: 'chip', itemChar: '🎰', name: 'Jogo Sem Arte', img: 'img/jogo-inexistente.png',
      tag: '', rtp: 95.0, vol: 'baixa',
      chars: ['🎰', '💎', '🔔', '🍒', '⭐', '🍋'],
      wild: '🌟', scatter: '💰', theme: ['#1b0b22', '#8b5cf6']
    }
  ];

  var VOL_LABEL = { baixa: 'baixa', media: 'média', alta: 'alta' };

  /* ------------------------------------------------------------------ *
   * EXTRAS DE TEMA — o que dá identidade própria a cada máquina sem
   * tocar em uma linha de lógica:
   *   short   nome curto, usado no letreiro e no nome do modo bônus
   *   bonus   paleta do MODO BÔNUS (a tela inteira troca de cor)
   *   reel    cor de fundo do cilindro
   *   audio   [frequência base, escala em semitons, timbre] — é o que faz
   *           o Coelho soar diferente do Tigre sem nenhum arquivo de som
   * Jogo que não estiver nesta tabela cai nos valores padrão do
   * fortune-theme.js e continua jogável.
   * ------------------------------------------------------------------ */
  var MENOR = [0, 3, 5, 7, 10];      // pentatônica menor: tensa
  var MAIOR = [0, 2, 4, 7, 9];       // pentatônica maior: alegre

  var EXTRAS = {
    tigre:   { short: 'Tigre',   bonus: ['#450a0a', '#fbbf24'], reel: '#3b0a0a', audio: [587.33, MENOR, 'sawtooth'] },
    dragao:  { short: 'Dragão',  bonus: ['#042f2e', '#5eead4'], reel: '#0b3b38', audio: [440.00, MAIOR, 'triangle'] },
    coelho:  { short: 'Coelho',  bonus: ['#4a044e', '#f0abfc'], reel: '#4a1d4f', audio: [698.46, MAIOR, 'sine'] },
    touro:   { short: 'Boi',     bonus: ['#451a03', '#fcd34d'], reel: '#44260a', audio: [523.25, MENOR, 'square'] },
    panda:   { short: 'Panda',   bonus: ['#0f172a', '#e2e8f0'], reel: '#1e293b', audio: [783.99, MAIOR, 'sine'] },
    roleta:  { short: 'Roleta',  bonus: ['#1e1b4b', '#fca5a5'], reel: '#3f1020', audio: [659.25, MAIOR, 'triangle'] },
    mina:    { short: 'Mina',    bonus: ['#1c1917', '#fde047'], reel: '#3a2a0a', audio: [523.25, MENOR, 'sawtooth'] },
    aviator: { short: 'Aviador', bonus: ['#082f49', '#7dd3fc'], reel: '#0c2b45', audio: [493.88, MAIOR, 'triangle'] },
    bingo:   { short: 'Bingo',   bonus: ['#2e1065', '#d8b4fe'], reel: '#331065', audio: [440.00, MAIOR, 'square'] },
    rato:    { short: 'Rato',    bonus: ['#1e293b', '#fde68a'], reel: '#2b3348', audio: [783.99, MAIOR, 'triangle'] },
    espaco:  { short: 'Astro',   bonus: ['#2e1065', '#a5b4fc'], reel: '#201a4d', audio: [587.33, [0, 2, 5, 7, 10], 'sine'] },
    futebol: { short: 'Pênalti', bonus: ['#052e16', '#86efac'], reel: '#0d3b22', audio: [523.25, MAIOR, 'square'] },
    demo1:   { short: 'Tigre',   bonus: ['#450a0a', '#fbbf24'], reel: '#3b0a0a', audio: [587.33, MENOR, 'sawtooth'] },
    demo2:   { short: 'Demo',    bonus: ['#1b0b22', '#c4b5fd'], reel: '#2a1540', audio: [523.25, MAIOR, 'triangle'] }
  };

  /* ------------------------------------------------------------------ *
   * Baralho de símbolos (5 pagantes + curinga + scatter, como nos jogos
   * Fortune originais). O PRIMEIRO é o item exclusivo do tema — cenoura no
   * Coelho, pérola no Dragão, queijo no Rato — e vale mais que todos os
   * outros; os quatro seguintes (saco, lingote, moedas, lanterna) são
   * comuns a todas as máquinas. O BICHO não é símbolo comum: ele é o
   * curinga. Se um PNG não existir, a sala sonda o caminho e cai no emoji.
   * ------------------------------------------------------------------ */
  var SYM = 'img/sym/';

  GAMES.forEach(function (g) {
    g.sym = [
      { char: g.itemChar, img: SYM + g.item + '.png' },   /* premium: só deste jogo */
      { char: '💰',       img: SYM + 'bag.png' },
      { char: '🪙',       img: SYM + 'ingot.png' },
      { char: '🧧',       img: SYM + 'coins.png' },
      { char: '🏮',       img: SYM + 'lantern.png' }
    ];
    /* O BICHO é o curinga — mesma arte do card do lobby, com a faixa
       dourada "WILD" desenhada por CSS em cima da célula. */
    g.wildSym = { char: g.chars[0], img: g.img, label: 'WILD' };
    g.scatterSym = { char: g.scatter, img: SYM + 'scatter.png' };
    /* símbolo de dinheiro: a arte é comum, o VALOR é impresso por CSS */
    g.moneySym = { char: '💰', img: SYM + 'money.png' };

    /* mescla os extras de tema; o que faltar vira padrão no fortune-theme.js */
    var e = EXTRAS[g.id];
    if (e) {
      g.short = e.short;
      g.palette = { bonus: e.bonus, reel: e.reel };
      g.audio = { root: e.audio[0], scale: e.audio[1], timbre: e.audio[2] };
    }
    g.bonusMode = {
      name: 'Modo ' + ((e && e.short) || g.name) + ' da Fortuna',
      spins: null, mult: null       // quem manda é o preset de volatilidade
    };
  });

  function byId(id) {
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
    return null;
  }

  return { list: GAMES, byId: byId, volLabel: VOL_LABEL };
}));
