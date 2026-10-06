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
   * Catálogo e matemática vêm de fortune-games.js / fortune-slot.js, os
   * mesmos arquivos que a sala de jogo (game.html) usa. Assim o RTP mostrado
   * no card é exatamente o RTP calibrado que a máquina vai pagar.
   * ------------------------------------------------------------------ */
  var GAMES = (window.FortuneGames && window.FortuneGames.list) || [];

  var RTP = {};
  GAMES.forEach(function (g) {
    try {
      RTP[g.id] = window.FortuneSlot.math.prepare(g).rtpExact * 100;
    } catch (e) {
      RTP[g.id] = g.rtp;
    }
  });

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
      var id = card.getAttribute('data-game');
      if (FG.haptic) FG.haptic(14);
      if (FG.sound) FG.sound(680, 0.07, 'triangle');
      card.classList.add('opening');
      save();
      setTimeout(function () { location.href = 'game.html?id=' + encodeURIComponent(id); }, 140);
    }
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

  /* --------- Atalho de diagnóstico: segure 1,2s no mascote do topo --------- */
  (function diagnosticsShortcut() {
    var avatar = document.querySelector('.topbar .avatar');
    if (!avatar) return;
    var timer = null;
    var start = function () {
      timer = setTimeout(function () {
        if (FG.haptic) FG.haptic(40);
        if (FG.diagnose) FG.diagnose();
      }, 1200);
    };
    var stop = function () { clearTimeout(timer); };
    avatar.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (e) {
      avatar.addEventListener(e, stop);
    });
  })();

  /* ------------------------------- Boot ------------------------------- */

  shownBalance = 0;
  $('#soundBtn').textContent = (FG.soundEnabled && !FG.soundEnabled()) ? '🔇' : '🔊';
  renderGrid();
  renderBalance();

  window.addEventListener('fortune:native-ready', function () {
    if (window.FortuneNative && window.FortuneNative.platform) {
      $('#playerName').textContent = 'Jogador';
    }
  });
})();
