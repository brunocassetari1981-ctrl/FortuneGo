/*!
 * FortuneGo — controlador da sala de jogo (game.html?id=<jogo>)
 *
 * Junta as três peças: catálogo (fortune-games.js), matemática + rolos
 * (fortune-slot.js) e os efeitos do app (fortune-enhance.js → window.FortuneGo).
 * O saldo é o MESMO do lobby: ambos leem/gravam localStorage 'fortunego_state'.
 */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var FG = window.FortuneGo || {};
  var Games = window.FortuneGames;
  var Slot = window.FortuneSlot;
  var M = Slot.math;

  /* ------------------------------ Qual jogo ------------------------------ */

  function queryId() {
    var m = /[?&]id=([^&]+)/.exec(location.search || '');
    return m ? decodeURIComponent(m[1]) : null;
  }

  var game = Games.byId(queryId()) || Games.list[0];
  var c = M.prepare(game);

  /* -------------------------- Estado persistente -------------------------- */

  var BETS = [1, 2, 5, 10, 20, 50, 100, 200, 500];

  function load() {
    var def = { balance: 1000, bet: 5, favs: [], spins: 0, wins: 0, best: 0, history: [] };
    try {
      var raw = JSON.parse(localStorage.getItem('fortunego_state') || '{}');
      for (var k in raw) if (Object.prototype.hasOwnProperty.call(raw, k)) def[k] = raw[k];
    } catch (e) {}
    return def;
  }
  function save() {
    try { localStorage.setItem('fortunego_state', JSON.stringify(state)); } catch (e) {}
  }

  var state = load();
  var betIndex = (function () {
    var best = 0;
    for (var i = 0; i < BETS.length; i++) if (BETS[i] <= state.bet) best = i;
    return best;
  }());
  state.bet = BETS[betIndex];

  var money = function (v) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /* ------------------------------- Variáveis ------------------------------- */

  var view = null;
  var busy = false;
  var turbo = false;
  var auto = 0;              // 0 parado · n giros restantes · -1 infinito
  var freeLeft = 0;
  var freeWon = 0;
  var shownBalance = state.balance;

  var LINE_COLORS = ['#facc15', '#22d3ee', '#f472b6', '#4ade80', '#fb923c'];

  /* -------------------------------- Helpers -------------------------------- */

  function animateTo(el, from, to, dur) {
    var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    function frame() {
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      var p = Math.min(1, (now - t0) / (dur || 600));
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = money(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderBalance() {
    animateTo($('#gBalance'), shownBalance, state.balance, turbo ? 320 : 620);
    shownBalance = state.balance;
  }

  function setWinbar(text, cls) {
    var el = $('#winbar');
    el.textContent = text;
    el.className = 'gm-winbar' + (cls ? ' ' + cls : '');
  }

  function sound(f, d, t) { if (FG.sound) FG.sound(f, d, t); }
  function haptic(ms) { if (FG.haptic) FG.haptic(ms); }

  /* ------------------------------ Linhas (SVG) ------------------------------ */

  function buildLines() {
    var svg = $('#lines');
    var X = [50, 150, 250], Y = [50, 150, 250];
    var out = '';
    for (var i = 0; i < c.lines.length; i++) {
      var l = c.lines[i];
      var d = 'M 0,' + Y[l[0]] +
              ' L ' + X[0] + ',' + Y[l[0]] +
              ' L ' + X[1] + ',' + Y[l[1]] +
              ' L ' + X[2] + ',' + Y[l[2]] +
              ' L 300,' + Y[l[2]];
      out += '<path data-line="' + i + '" d="' + d + '" stroke="' + LINE_COLORS[i % LINE_COLORS.length] +
             '" style="color:' + LINE_COLORS[i % LINE_COLORS.length] + '"></path>';
    }
    svg.innerHTML = out;
  }

  function clearLines() {
    var paths = $('#lines').querySelectorAll('path');
    for (var i = 0; i < paths.length; i++) paths[i].classList.remove('on');
  }

  function showLines(wins) {
    wins.forEach(function (w, i) {
      setTimeout(function () {
        var p = $('#lines').querySelector('path[data-line="' + w.line + '"]');
        if (p) p.classList.add('on');
        sound(680 + i * 120, 0.05, 'triangle');
      }, i * (turbo ? 70 : 150));
    });
  }

  /* ----------------------------- Destaque de ganho ----------------------------- */

  function highlight(wins) {
    var winning = {};
    wins.forEach(function (w) {
      w.cells.forEach(function (cell) { winning[cell[0] + ':' + cell[1]] = true; });
    });
    for (var col = 0; col < c.cols; col++) {
      for (var row = 0; row < c.rows; row++) {
        var el = view.cellAt(col, row);
        if (!el) continue;
        if (winning[col + ':' + row]) el.classList.add('win');
        else el.classList.add('dim');
      }
    }
    view.root.classList.add('has-win');
  }

  /* ------------------------------ Grande vitória ------------------------------ */

  function bigWin(amount, ratio) {
    var box = $('#bigwin');
    var kind = ratio >= 100 ? 'JACKPOT!' : (ratio >= 40 ? 'MEGA VITÓRIA' : 'GRANDE VITÓRIA');
    $('#bwKind').textContent = kind;
    $('#bwMult').textContent = ratio.toFixed(1).replace('.', ',') + '× a sua aposta';
    $('#bwAmount').textContent = money(0);
    box.classList.add('on');
    animateTo($('#bwAmount'), 0, amount, 1100);
    if (FG.confetti) FG.confetti();
    [660, 880, 1100, 1320, 1560].forEach(function (f, i) {
      setTimeout(function () { sound(f, 0.17, 'sine'); }, i * 120);
    });
    var close = function () { box.classList.remove('on'); };
    box.onclick = close;
    setTimeout(close, 2800);
  }

  /* --------------------------------- O giro --------------------------------- */

  function setSpinUI(spinning) {
    var btn = $('#spinBtn');
    btn.disabled = spinning || (freeLeft > 0);
    btn.classList.toggle('busy', spinning);
    $('#spinLabel').textContent = freeLeft > 0 ? 'GRÁTIS' : (auto !== 0 ? 'AUTO' : 'GIRAR');
    $('#betDown').disabled = $('#betUp').disabled = spinning || freeLeft > 0;
  }

  function doSpin(isFree) {
    if (busy) return;
    if (!isFree && state.balance < state.bet) {
      if (FG.toast) FG.toast('Saldo insuficiente — volte ao lobby e deposite 💳');
      stopAuto();
      return;
    }

    busy = true;
    setSpinUI(true);
    clearLines();
    setWinbar(isFree ? 'Giro grátis…' : 'Girando…', '');

    if (!isFree) {
      state.balance -= state.bet;
      state.spins++;
      renderBalance();
    }

    haptic(16);
    sound(380, 0.1, 'sawtooth');

    var res = M.spin(c);

    // suspense no último rolo quando os dois primeiros já trouxeram scatter
    var early = 0;
    for (var col = 0; col < 2; col++) {
      for (var row = 0; row < c.rows; row++) {
        if (res.grid[col][row] === c.scatterIndex) early++;
      }
    }

    view.spinTo(res.grid, {
      turbo: turbo,
      anticipate: early >= 2,
      onStop: function (col) {
        sound(520 + col * 95, 0.05, 'square');
        haptic(7);
      }
    }).then(function () { settle(res, isFree); });
  }

  function settle(res, isFree) {
    var mult = isFree ? c.freeMult : 1;
    var amount = res.winUnits * state.bet * mult;
    var ratio = res.winUnits * mult;

    if (res.wins.length) {
      highlight(res.wins);
      showLines(res.wins);
      state.balance += amount;
      state.wins++;
      if (amount > state.best) state.best = amount;
      if (isFree) freeWon += amount;

      var top = res.wins.slice().sort(function (a, b) { return b.pay - a.pay; })[0];
      var face = c.all[top.symbol];
      var label = (face.img ? game.chars[0] : face.char);
      state.history.unshift(game.name + ' · ' + label + label + label +
        ' · +' + money(amount) + (isFree ? ' (grátis ' + mult + '×)' : ''));
      state.history = state.history.slice(0, 12);

      setWinbar((isFree ? '🎁 ' : '🎉 ') + 'Ganhou ' + money(amount) +
                (res.wins.length > 1 ? ' · ' + res.wins.length + ' linhas' : ''), 'win');
      renderBalance();
      if (FG.hapticWin) FG.hapticWin(); else haptic(40);
      if (ratio >= 15) bigWin(amount, ratio);
      else if (FG.coins) FG.coins(window.innerWidth / 2, window.innerHeight * 0.45, 8);
    } else {
      setWinbar(res.scatters === 2 ? 'Quase! Faltou 1 scatter 😮' : 'Não foi dessa vez 🍀', 'lose');
      if (!isFree) {
        state.history.unshift(game.name + ' · −' + money(state.bet));
        state.history = state.history.slice(0, 12);
      }
    }

    save();

    var pause = res.wins.length ? (turbo ? 650 : 1150) : (turbo ? 220 : 480);
    setTimeout(function () { next(res, isFree); }, pause);
  }

  function next(res, isFree) {
    busy = false;

    if (!isFree && res.free) return beginFree(res.free);

    if (isFree) {
      freeLeft--;
      $('#fsLeft').textContent = freeLeft;
      if (freeLeft > 0) { setSpinUI(true); return doSpin(true); }
      return endFree();
    }

    setSpinUI(false);

    if (auto !== 0) {
      if (auto > 0) auto--;
      if (auto === 0) { stopAuto(); return; }
      if (state.balance < state.bet) { stopAuto(); return; }
      updateAutoLabel();
      setTimeout(function () { doSpin(false); }, turbo ? 120 : 340);
    }
  }

  /* ------------------------------ Giros grátis ------------------------------ */

  function beginFree(n) {
    freeLeft = n;
    freeWon = 0;
    $('#marquee').classList.add('free');
    $('#fsLeft').textContent = n;
    $('#fsMult').textContent = c.freeMult + '×';
    setWinbar('🎁 ' + n + ' GIROS GRÁTIS com ' + c.freeMult + '× de multiplicador!', 'win');
    if (FG.confetti) FG.confetti();
    if (FG.toast) FG.toast(n + ' giros grátis! Multiplicador ' + c.freeMult + '× 🎁');
    setSpinUI(true);
    setTimeout(function () { doSpin(true); }, turbo ? 700 : 1500);
  }

  function endFree() {
    $('#marquee').classList.remove('free');
    setWinbar(freeWon > 0
      ? '🎁 Giros grátis renderam ' + money(freeWon)
      : 'Giros grátis encerrados', freeWon > 0 ? 'win' : '');
    if (freeWon > 0 && FG.confetti) FG.confetti();
    freeLeft = 0;
    setSpinUI(false);
    if (auto !== 0) setTimeout(function () { doSpin(false); }, turbo ? 300 : 800);
  }

  /* -------------------------------- Autoplay -------------------------------- */

  function updateAutoLabel() {
    var btn = $('#autoBtn');
    btn.classList.toggle('on', auto !== 0);
    btn.textContent = auto === 0 ? 'AUTO' : (auto < 0 ? 'PARAR ∞' : 'PARAR (' + auto + ')');
    $('#spinLabel').textContent = freeLeft > 0 ? 'GRÁTIS' : (auto !== 0 ? 'AUTO' : 'GIRAR');
  }

  function stopAuto() {
    auto = 0;
    updateAutoLabel();
    setSpinUI(false);
  }

  /* ----------------------------- Tabela de prêmios ----------------------------- */

  function buildPaytable() {
    $('#ptTitle').textContent = game.name;
    $('#ptSub').textContent = 'RTP ' + (c.rtpExact * 100).toFixed(2).replace('.', ',') + '% · volatilidade ' +
      (Games.volLabel[game.vol] || game.vol) + ' · 5 linhas · prêmios por 3 iguais';

    var html = '';
    c.all.forEach(function (s) {
      if (s.isScatter) return;
      var face = s.img
        ? '<span class="sym"><img src="' + s.img + '" alt="" class="fg-no-enhance"></span>'
        : '<span class="sym">' + s.char + '</span>';
      html += '<div>' + face + '<span>' + (s.isWild ? 'Curinga' : '3 iguais') + '</span><b>' + s.pay + '×</b></div>';
    });
    $('#ptGrid').innerHTML = html;

    $('#ptRules').innerHTML =
      '<b>' + c.all[c.wildIndex].char + ' Curinga</b> — substitui qualquer símbolo, menos o scatter.<br>' +
      '<b>' + c.all[c.scatterIndex].char + ' Scatter</b> — 3 em qualquer posição dão <b>' + c.freeSpins +
      ' giros grátis</b> com multiplicador <b>' + c.freeMult + '×</b>.<br>' +
      'Prêmios multiplicam a <b>aposta por linha</b> (aposta total ÷ 5).<br>' +
      'Maior prêmio possível: <b>' + (c.all[c.wildIndex].pay * 5 / 5).toFixed(0) + '× a aposta total</b> ' +
      'por rodada cheia de curingas.';
  }

  function openSheet(open) {
    $('#paysheet').classList.toggle('open', open);
    if (open && FG.pushModal) FG.pushModal(function () { openSheet(false); });
    else if (!open && FG.popModal) FG.popModal();
  }

  /* --------------------------------- Layout --------------------------------- */

  function layout() {
    var reels = $('#reels');
    if (!reels) return;
    var w = reels.clientWidth;
    if (w) reels.style.height = w + 'px';
    if (view) view.measure();
  }

  /* ---------------------------------- Boot ---------------------------------- */

  function wire() {
    $('#backBtn').addEventListener('click', function () {
      save();
      location.href = 'index.html';
    });

    $('#spinBtn').addEventListener('click', function () { doSpin(false); });

    $('#betDown').addEventListener('click', function () {
      if (busy || freeLeft) return;
      betIndex = Math.max(0, betIndex - 1);
      state.bet = BETS[betIndex];
      $('#betVal').textContent = 'R$ ' + state.bet;
      save(); haptic(8); sound(420, 0.04, 'triangle');
    });
    $('#betUp').addEventListener('click', function () {
      if (busy || freeLeft) return;
      betIndex = Math.min(BETS.length - 1, betIndex + 1);
      state.bet = BETS[betIndex];
      $('#betVal').textContent = 'R$ ' + state.bet;
      save(); haptic(8); sound(560, 0.04, 'triangle');
    });

    $('#turboBtn').addEventListener('click', function () {
      turbo = !turbo;
      this.classList.toggle('on', turbo);
      if (FG.toast) FG.toast(turbo ? 'Turbo ligado ⚡' : 'Turbo desligado');
      haptic(10);
    });

    $('#payBtn').addEventListener('click', function () { openSheet(true); haptic(8); });
    $('#ptClose').addEventListener('click', function () { openSheet(false); });
    $('#paysheet').addEventListener('click', function (e) {
      if (e.target === this) openSheet(false);
    });

    $('#autoBtn').addEventListener('click', function () {
      if (auto !== 0) { stopAuto(); return; }
      $('#autoBox').classList.toggle('open');
    });
    $('#autoBox').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-auto]');
      if (!b) return;
      auto = parseInt(b.getAttribute('data-auto'), 10);
      this.classList.remove('open');
      updateAutoLabel();
      haptic(12);
      if (!busy && !freeLeft) doSpin(false);
    });

    document.addEventListener('click', function (e) {
      var box = $('#autoBox');
      if (box.classList.contains('open') && !e.target.closest('#autoBox') && !e.target.closest('#autoBtn')) {
        box.classList.remove('open');
      }
    });

    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', function () { setTimeout(layout, 220); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });
  }

  function start(iconUrl) {
    document.body.style.setProperty('--t1', game.theme[0]);
    document.body.style.setProperty('--t2', game.theme[1]);

    $('#gName').textContent = game.name;
    $('#gMeta').textContent = 'volatilidade ' + (Games.volLabel[game.vol] || game.vol) + ' · 5 linhas';
    $('#rtpLabel').textContent = 'RTP ' + (c.rtpExact * 100).toFixed(2).replace('.', ',') + '%';
    $('#gIcon').src = iconUrl || (FG.placeholder ? FG.placeholder(game.name) : '');
    $('#betVal').textContent = 'R$ ' + state.bet;
    $('#gBalance').textContent = money(state.balance);

    c.all[0].img = iconUrl || null;          // símbolo premium usa o ícone resolvido

    view = new Slot.ReelView($('#reels'), c);
    layout();
    view.showGrid(M.drawGrid(c, Math.random));

    buildLines();
    buildPaytable();
    wire();
    updateAutoLabel();
    setSpinUI(false);
  }

  // Resolve o ícone UMA vez (o motor de resgate cuida de caminhos quebrados)
  // e só então monta os rolos — assim nenhuma célula precisa ser corrigida depois.
  if (FG.resolve) {
    var done = false;
    var go = function (url) { if (done) return; done = true; start(url); };
    FG.resolve(game.img, go);
    setTimeout(function () { go(null); }, 2500);   // rede travada? segue com emoji
  } else {
    start(game.img);
  }
}());
