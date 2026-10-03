/*!
 * FortuneGo Lobby — demonstração interativa
 * Depende de fortune-enhance.js (window.FortuneGo).
 */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var FG = window.FortuneGo || {};

  /* ------------------------------------------------------------------ *
   * Catálogo. Os três últimos apontam de propósito para arquivos que NÃO
   * existem: servem para demonstrar o gerador de ícone do fortune-enhance.
   * ------------------------------------------------------------------ */
  var GAMES = [
    { id: 'tigre',  name: 'Tigre da Sorte',   img: 'img/tigre.png',          tag: 'hot',  rtp: 96.8, vol: 'alta'  },
    { id: 'dragao', name: 'Dragão de Jade',   img: 'img/dragao.png',         tag: '',     rtp: 97.2, vol: 'média' },
    { id: 'coelho', name: 'Coelho da Fortuna',img: 'img/coelho.png',         tag: 'new',  rtp: 96.1, vol: 'baixa' },
    { id: 'touro',  name: 'Boi Dourado',      img: 'img/touro.png',          tag: 'hot',  rtp: 95.9, vol: 'alta'  },
    { id: 'panda',  name: 'Panda Real',       img: 'img/panda.png',          tag: '',     rtp: 96.4, vol: 'média' },
    { id: 'roleta', name: 'Roleta Imperial',  img: 'img/roleta.png',         tag: 'live', rtp: 97.3, vol: 'baixa' },
    { id: 'mina',   name: 'Mina de Ouro',     img: 'img/mina-de-ouro.png',   tag: 'new',  rtp: 96.0, vol: 'alta'  },
    { id: 'aviator',name: 'Aviador Fortune',  img: 'img/aviator.png',        tag: 'hot',  rtp: 97.0, vol: 'alta'  },
    { id: 'bingo',  name: 'Bingo Imperial',   img: 'img/bingo-imperial.png', tag: 'live', rtp: 95.5, vol: 'média' }
  ];

  /* ------------------------------ Estado ------------------------------ */

  var state = load();

  function load() {
    var def = { balance: 1000, bet: 5, favs: [], spins: 0, wins: 0, best: 0, history: [] };
    try {
      var raw = JSON.parse(localStorage.getItem('fortunego_state') || '{}');
      return Object.assign(def, raw);
    } catch (e) { return def; }
  }

  function save() {
    try { localStorage.setItem('fortunego_state', JSON.stringify(state)); } catch (e) {}
  }

  var money = function (v) {
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /* -------------------- Contador animado de números -------------------- */

  function animateNumber(el, from, to, format, duration) {
    var start = performance.now();
    var span = to - from;
    var dur = duration || 700;
    function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(from + span * eased);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var shownBalance = state.balance;
  function renderBalance() {
    animateNumber($('#balance'), shownBalance, state.balance, money);
    var wallet = $('#walletBalance');
    if (wallet) animateNumber(wallet, shownBalance, state.balance, money);
    shownBalance = state.balance;
    $('#statSpins').textContent = state.spins;
    $('#statWins').textContent = state.wins;
    $('#statBest').textContent = money(state.best);
    var h = $('#history');
    if (h) {
      h.innerHTML = state.history.length
        ? state.history.slice(0, 6).map(function (x) { return '• ' + x; }).join('<br>')
        : 'Nenhuma jogada ainda. Escolha um jogo e boa sorte! 🍀';
    }
  }

  /* ----------------------------- Jackpot ----------------------------- */

  var jackpot = 184320 + Math.random() * 40000;
  function tickJackpot() {
    jackpot += Math.random() * 90;
    $('#jackpot').textContent = 'R$ ' + Math.floor(jackpot).toLocaleString('pt-BR');
  }
  tickJackpot();
  setInterval(tickJackpot, 1400);

  /* --------------------------- Grade de jogos --------------------------- */

  var filter = 'todos';
  var query = '';

  function visibleGames() {
    return GAMES.filter(function (g) {
      if (query && g.name.toLowerCase().indexOf(query) === -1) return false;
      if (filter === 'todos') return true;
      if (filter === 'fav') return state.favs.indexOf(g.id) !== -1;
      return g.tag === filter;
    });
  }

  function renderGrid() {
    var list = visibleGames();
    var grid = $('#gameGrid');
    var labels = { hot: 'Hot', new: 'Novo', live: 'Ao vivo' };

    grid.innerHTML = list.map(function (g) {
      var fav = state.favs.indexOf(g.id) !== -1;
      return '' +
        '<article class="game" data-game="' + g.id + '">' +
          '<div class="thumb">' +
            (g.tag ? '<span class="tag ' + g.tag + '">' + labels[g.tag] + '</span>' : '') +
            '<button class="fav' + (fav ? ' on' : '') + '" data-fav="' + g.id + '" aria-label="Favoritar">' +
              (fav ? '❤️' : '🤍') +
            '</button>' +
            '<img src="' + g.img + '" alt="' + g.name + '" loading="lazy">' +
          '</div>' +
          '<div class="meta">' +
            '<b>' + g.name + '</b>' +
            '<small>' + (g.tag === 'live' ? '<span class="live-dot"></span>ao vivo · ' : '') + 'RTP ' + g.rtp + '%</small>' +
          '</div>' +
        '</article>';
    }).join('');

    $('#gameCount').textContent = list.length + ' jogos';
    if (!list.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:28px 0">' +
        'Nenhum jogo encontrado 🔍</p>';
    }
    // Deixa o enhancer reaplicar tilt/ripple/resgate de imagem nos novos cards.
    if (FG.refresh) FG.refresh();
  }

  /* --------------------------- Carrossel hero --------------------------- */

  (function heroCarousel() {
    var track = $('#heroTrack');
    var slides = track.children.length;
    var dots = $('#heroDots');
    var index = 0;
    var timer;

    for (var i = 0; i < slides; i++) dots.appendChild(document.createElement('span'));

    function go(next) {
      index = (next + slides) % slides;
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      $$('#heroDots span').forEach(function (d, i) { d.classList.toggle('on', i === index); });
    }
    function auto() {
      clearInterval(timer);
      timer = setInterval(function () { go(index + 1); }, 4800);
    }
    go(0); auto();

    // swipe
    var x0 = null;
    track.addEventListener('pointerdown', function (e) { x0 = e.clientX; clearInterval(timer); });
    track.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0;
      if (Math.abs(dx) > 42) { go(index + (dx < 0 ? 1 : -1)); if (FG.haptic) FG.haptic(8); }
      x0 = null; auto();
    });
  })();

  /* ------------------------- Caça-níquel do modal ------------------------- */

  var SYMBOLS = ['🐯', '💎', '🔔', '🍒', '⭐', '7️⃣', '🪙', '🍋'];
  var PAY = { '🐯': 50, '💎': 25, '7️⃣': 20, '🔔': 12, '⭐': 10, '🪙': 8, '🍒': 6, '🍋': 5 };

  var modal = $('#gameModal');
  var spinning = false;
  var currentGame = GAMES[0];

  function buildStrips() {
    $$('#reels .strip').forEach(function (strip) {
      strip.innerHTML = '';
      for (var i = 0; i < 24; i++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        strip.appendChild(cell);
      }
      strip.style.transform = 'translateY(0px)';
    });
  }

  function openGame(game) {
    currentGame = game;
    $('#mGameName').textContent = game.name;
    $('#mGameInfo').textContent = 'RTP ' + game.rtp + '% · Volatilidade ' + game.vol;
    var icon = $('#mGameIcon');
    icon.alt = game.name;
    icon.removeAttribute('data-fg');
    icon.src = game.img;           // se o arquivo não existir, o enhancer gera o ícone
    $('#result').textContent = 'Faça sua aposta e gire!';
    $('#result').className = 'result';
    buildStrips();
    modal.classList.add('open');
    if (FG.pushModal) FG.pushModal(closeGame);
    if (FG.haptic) FG.haptic(12);
    if (FG.refresh) FG.refresh();
  }

  function closeGame() {
    modal.classList.remove('open');
  }

  function spin() {
    if (spinning) return;
    if (state.balance < state.bet) {
      if (FG.toast) FG.toast('Saldo insuficiente — faça um depósito 💳');
      return;
    }

    spinning = true;
    $('#spinBtn').disabled = true;
    state.balance -= state.bet;
    state.spins++;
    renderBalance();
    if (FG.haptic) FG.haptic(18);
    if (FG.sound) FG.sound(420, 0.12, 'sawtooth');

    var strips = $$('#reels .strip');
    var reels = $$('#reels .reel');
    reels.forEach(function (r) { r.classList.remove('win'); });
    $('#result').textContent = 'Girando...';
    $('#result').className = 'result';

    var final = [];
    strips.forEach(function (strip, i) {
      var symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      final.push(symbol);

      // posiciona o símbolo sorteado na célula de parada
      var stopIndex = 18 + i;
      strip.children[stopIndex].textContent = symbol;

      var distance = stopIndex * 92;
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0px)';
      void strip.offsetWidth; // reflow
      strip.style.transition = 'transform ' + (1.15 + i * 0.42) + 's cubic-bezier(.17,.67,.24,1.01)';
      strip.style.transform = 'translateY(' + (-distance) + 'px)';

      setTimeout(function () {
        if (FG.sound) FG.sound(640 + i * 90, 0.07, 'square');
        if (FG.haptic) FG.haptic(9);
      }, (1.15 + i * 0.42) * 1000);
    });

    setTimeout(function () { settle(final); }, (1.15 + 2 * 0.42) * 1000 + 180);
  }

  function settle(final) {
    var reels = $$('#reels .reel');
    var result = $('#result');
    var counts = {};
    final.forEach(function (s) { counts[s] = (counts[s] || 0) + 1; });

    var triple = Object.keys(counts).filter(function (k) { return counts[k] === 3; })[0];
    var pair = Object.keys(counts).filter(function (k) { return counts[k] === 2; })[0];
    var prize = 0;

    if (triple) prize = state.bet * (PAY[triple] || 10);
    else if (pair) prize = state.bet * 2;

    if (prize > 0) {
      state.balance += prize;
      state.wins++;
      state.best = Math.max(state.best, prize);
      state.history.unshift(currentGame.name + ' · ' + final.join(' ') + ' · +' + money(prize));
      result.textContent = (triple ? '🎉 TRINCA! ' : '✨ Par! ') + 'Você ganhou ' + money(prize);
      result.className = 'result win';
      reels.forEach(function (r) { r.classList.add('win'); });
      if (FG.confetti) FG.confetti();
      if (FG.sound) {
        [660, 880, 1100, 1320].forEach(function (f, i) {
          setTimeout(function () { FG.sound(f, 0.16, 'sine'); }, i * 110);
        });
      }
    } else {
      state.history.unshift(currentGame.name + ' · ' + final.join(' ') + ' · −' + money(state.bet));
      result.textContent = 'Quase! Tente de novo 🍀';
      result.className = 'result lose';
    }

    state.history = state.history.slice(0, 12);
    renderBalance();
    save();
    spinning = false;
    $('#spinBtn').disabled = false;
  }

  /* ------------------------------ Eventos ------------------------------ */

  // abrir jogo / favoritar (delegação para funcionar com a grade redesenhada)
  $('#gameGrid').addEventListener('click', function (e) {
    var favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      e.stopPropagation();
      var id = favBtn.getAttribute('data-fav');
      var pos = state.favs.indexOf(id);
      if (pos === -1) { state.favs.push(id); favBtn.textContent = '❤️'; favBtn.classList.add('on'); }
      else { state.favs.splice(pos, 1); favBtn.textContent = '🤍'; favBtn.classList.remove('on'); }
      save();
      if (FG.haptic) FG.haptic(14);
      if (filter === 'fav') renderGrid();
      return;
    }
    var card = e.target.closest('[data-game]');
    if (card) {
      var game = GAMES.filter(function (g) { return g.id === card.getAttribute('data-game'); })[0];
      if (game) openGame(game);
    }
  });

  $('#spinBtn').addEventListener('click', spin);
  $('#closeModal').addEventListener('click', function () { closeGame(); if (FG.popModal) FG.popModal(); });
  modal.addEventListener('click', function (e) {
    if (e.target === modal) { closeGame(); if (FG.popModal) FG.popModal(); }
  });

  $('#betMinus').addEventListener('click', function () {
    state.bet = Math.max(1, state.bet - (state.bet > 20 ? 10 : 1));
    $('#betValue').textContent = 'R$ ' + state.bet;
    save(); if (FG.haptic) FG.haptic(8);
  });
  $('#betPlus').addEventListener('click', function () {
    state.bet = Math.min(500, state.bet + (state.bet >= 20 ? 10 : 1));
    $('#betValue').textContent = 'R$ ' + state.bet;
    save(); if (FG.haptic) FG.haptic(8);
  });

  $('#chips').addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    $$('.chip').forEach(function (c) { c.classList.remove('on'); });
    chip.classList.add('on');
    filter = chip.getAttribute('data-filter');
    renderGrid();
    if (FG.haptic) FG.haptic(8);
  });

  var searchTimer;
  $('#searchInput').addEventListener('input', function (e) {
    clearTimeout(searchTimer);
    var value = e.target.value.toLowerCase().trim();
    searchTimer = setTimeout(function () { query = value; renderGrid(); }, 180);
  });

  $('#nav').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-view]');
    if (!btn) return;
    $$('#nav button').forEach(function (b) { b.classList.remove('on'); });
    btn.classList.add('on');
    var view = btn.getAttribute('data-view');
    $$('.view').forEach(function (v) { v.classList.toggle('on', v.id === 'view-' + view); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (FG.haptic) FG.haptic(10);
    if (FG.sound) FG.sound(540, 0.06, 'triangle');
  });

  $('#soundBtn').addEventListener('click', function () {
    var on = FG.toggleSound ? FG.toggleSound() : true;
    this.textContent = on ? '🔊' : '🔇';
    if (FG.toast) FG.toast(on ? 'Som ligado' : 'Som desligado');
  });

  function deposit() {
    state.balance += 500;
    save();
    renderBalance();
    if (FG.confetti) FG.confetti();
    if (FG.toast) FG.toast('+ R$ 500,00 creditados 🎉');
  }

  $('#depositBtn').addEventListener('click', deposit);

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    if (action === 'deposit' || action === 'recarga') return deposit();
    if (action === 'indicar') return FG.share ? FG.share('Entre no FortuneGo com meu código FORTUNE2026 e ganhe bônus!') : null;
    if (action === 'reset') {
      localStorage.removeItem('fortunego_state');
      state = load(); shownBalance = 0; renderBalance(); renderGrid();
      if (FG.toast) FG.toast('Progresso zerado');
      return;
    }
    if (action === 'giros') {
      var free = 10 + Math.floor(Math.random() * 90);
      if (FG.confetti) FG.confetti();
      if (FG.toast) FG.toast('Você ganhou ' + free + ' giros grátis! 🎁');
      return;
    }
    if (FG.toast) FG.toast('Promoção aplicada à sua conta ✨');
    if (FG.haptic) FG.haptic(12);
  });

  /* ------------------------------- Boot ------------------------------- */

  shownBalance = 0;
  $('#betValue').textContent = 'R$ ' + state.bet;
  $('#soundBtn').textContent = (FG.soundEnabled && !FG.soundEnabled()) ? '🔇' : '🔊';
  renderGrid();
  renderBalance();
  buildStrips();

  window.addEventListener('fortune:native-ready', function () {
    if (window.FortuneNative && window.FortuneNative.platform) {
      $('#playerName').textContent = 'Jogador';
    }
  });
})();
