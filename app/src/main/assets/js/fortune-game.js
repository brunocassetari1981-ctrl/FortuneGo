/*!
 * FortuneGo — controlador da sala de jogo (game.html?id=<jogo>)
 *
 * Visual no modelo "Fortune" (PG Soft): faixa de jackpot, barra de tarefa,
 * mascote sobre a máquina, rolo central elevado, números das linhas nas
 * laterais, letreiro e a barra de controles com multiplicador / Rápido / Auto.
 *
 * A JOGABILIDADE é a mesma de antes — doSpin → settle → next — só mudou a
 * apresentação. Saldo compartilhado com o lobby via localStorage.
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
    var b = 0;
    for (var i = 0; i < BETS.length; i++) if (BETS[i] <= state.bet) b = i;
    return b;
  }());
  state.bet = BETS[betIndex];

  var num = function (v) {
    return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  var money = function (v) { return 'R$ ' + num(v); };

  /* ------------------------------- Variáveis ------------------------------- */

  var view = null;
  var busy = false;
  var turbo = false;
  var auto = 0;                 // 0 parado · n giros · -1 infinito
  var freeLeft = 0;
  var freeWon = 0;
  var shownBalance = state.balance;
  var sessionWins = 0;          // para a barra de tarefa
  var hideWinTimer = null;

  var LINE_COLORS = ['#facc15', '#22d3ee', '#f472b6', '#4ade80', '#fb923c'];
  var STEP_RATIO = 0.18;        // quanto o rolo central sobe (fração da célula)

  /* -------------------------------- Helpers -------------------------------- */

  function animateTo(el, from, to, dur, fmt) {
    var f = fmt || num;
    var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    function frame() {
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      var p = Math.min(1, (now - t0) / (dur || 600));
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = f(from + (to - from) * e);
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
    clearTimeout(hideWinTimer);
    if (cls === 'win') {
      el.classList.add('on');
      hideWinTimer = setTimeout(function () { el.classList.remove('on'); }, turbo ? 1200 : 2600);
    } else {
      el.classList.remove('on');
    }
  }

  function sound(f, d, t) { if (FG.sound) FG.sound(f, d, t); }
  function haptic(ms) { if (FG.haptic) FG.haptic(ms); }

  /* ------------------------------ Faixa de jackpot ------------------------------ */

  var jp = { grand: 13523038.67, major: 975030.79, minor: 2, mini: 1 };

  function tickJackpot() {
    jp.grand += Math.random() * 180;
    jp.major += Math.random() * 14;
    jp.minor += Math.random() * 0.03;
    jp.mini += Math.random() * 0.01;
    $('#jpGrand').textContent = num(jp.grand);
    $('#jpMajor').textContent = num(jp.major);
    $('#jpMinor').textContent = num(jp.minor);
    $('#jpMini').textContent = num(jp.mini);
  }

  /* ------------------------------ Barra de tarefa ------------------------------ */

  function renderTask() {
    var done = Math.min(10, sessionWins);
    $('#taskFill').style.width = (done * 10) + '%';
    $('#taskText').textContent = 'Valor total ganho (' + done + '/10)';
  }

  /* --------------------------- Números das linhas --------------------------- */

  function buildLineNumbers() {
    var left = [[], [], []], right = [[], [], []];
    c.lines.forEach(function (l, i) {
      left[l[0]].push(i + 1);
      right[l[c.cols - 1]].push(i + 1);
    });
    var render = function (groups) {
      return groups.map(function (nums) {
        return '<div class="ln">' + nums.map(function (n) {
          return '<b data-line="' + (n - 1) + '">' + n + '</b>';
        }).join('') + '</div>';
      }).join('');
    };
    $('#linesLeft').innerHTML = render(left);
    $('#linesRight').innerHTML = render(right);
  }

  function markLineNumbers(wins) {
    var all = document.querySelectorAll('.fr-side b');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('hit');
    wins.forEach(function (w) {
      var hit = document.querySelectorAll('.fr-side b[data-line="' + w.line + '"]');
      for (var j = 0; j < hit.length; j++) hit[j].classList.add('hit');
    });
  }

  /* ------------------------------ Linhas (SVG) ------------------------------ */

  function buildLines() {
    var X = [50, 150, 250], Y = [50, 150, 250];
    var off = STEP_RATIO * 100;          // o rolo do meio sobe: a linha acompanha
    var out = '';
    for (var i = 0; i < c.lines.length; i++) {
      var l = c.lines[i];
      var d = 'M 0,' + Y[l[0]] +
              ' L ' + X[0] + ',' + Y[l[0]] +
              ' L ' + X[1] + ',' + (Y[l[1]] - off) +
              ' L ' + X[2] + ',' + Y[l[2]] +
              ' L 300,' + Y[l[2]];
      out += '<path data-line="' + i + '" d="' + d + '" stroke="' + LINE_COLORS[i % LINE_COLORS.length] +
             '" style="color:' + LINE_COLORS[i % LINE_COLORS.length] + '"></path>';
    }
    $('#lines').innerHTML = out;
  }

  function clearLines() {
    var paths = $('#lines').querySelectorAll('path');
    for (var i = 0; i < paths.length; i++) paths[i].classList.remove('on');
    markLineNumbers([]);
  }

  function showLines(wins) {
    markLineNumbers(wins);
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
    $('#bwKind').textContent = ratio >= 100 ? 'JACKPOT!' : (ratio >= 40 ? 'MEGA VITÓRIA' : 'GRANDE VITÓRIA');
    $('#bwMult').textContent = ratio.toFixed(1).replace('.', ',') + '× a sua aposta';
    $('#bwAmount').textContent = money(0);
    box.classList.add('on');
    animateTo($('#bwAmount'), 0, amount, 1100, money);
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
      if (FG.toast) FG.toast('Saldo insuficiente — toque no + para depositar 💳');
      stopAuto();
      return;
    }

    busy = true;
    setSpinUI(true);
    clearLines();
    setWinbar(isFree ? 'Giro grátis…' : 'Girando…', '');
    $('#winValue').textContent = num(0);

    if (!isFree) {
      state.balance -= state.bet;
      state.spins++;
      renderBalance();
    }

    haptic(16);
    sound(380, 0.1, 'sawtooth');

    var res = M.spin(c);

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
      sessionWins++;
      renderTask();
      if (amount > state.best) state.best = amount;
      if (isFree) freeWon += amount;

      animateTo($('#winValue'), 0, amount, turbo ? 350 : 700);

      var top = res.wins.slice().sort(function (a, b) { return b.pay - a.pay; })[0];
      var face = c.all[top.symbol].char;
      state.history.unshift(game.name + ' · ' + face + face + face +
        ' · +' + money(amount) + (isFree ? ' (grátis ' + mult + '×)' : ''));
      state.history = state.history.slice(0, 12);

      setWinbar((isFree ? '🎁 ' : '') + 'GANHOU ' + money(amount), 'win');
      renderBalance();
      if (FG.hapticWin) FG.hapticWin(); else haptic(40);
      if (ratio >= 15) bigWin(amount, ratio);
      else if (FG.coins) FG.coins(window.innerWidth / 2, window.innerHeight * 0.45, 8);
    } else {
      setWinbar(res.scatters === 2 ? 'Quase! Faltou 1 scatter 😮' : 'Não foi dessa vez 🍀', '');
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
    $('#freeBanner').classList.add('on');
    $('#fsLeft').textContent = n;
    $('#fsMult').textContent = c.freeMult + '×';
    setWinbar('🎁 ' + n + ' GIROS GRÁTIS · ' + c.freeMult + '×', 'win');
    if (FG.confetti) FG.confetti();
    if (FG.toast) FG.toast(n + ' giros grátis! Multiplicador ' + c.freeMult + '× 🎁');
    setSpinUI(true);
    setTimeout(function () { doSpin(true); }, turbo ? 700 : 1500);
  }

  function endFree() {
    $('#freeBanner').classList.remove('on');
    if (freeWon > 0) {
      setWinbar('🎁 Giros grátis renderam ' + money(freeWon), 'win');
      if (FG.confetti) FG.confetti();
    } else {
      setWinbar('Giros grátis encerrados', '');
    }
    freeLeft = 0;
    setSpinUI(false);
    if (auto !== 0) setTimeout(function () { doSpin(false); }, turbo ? 300 : 800);
  }

  /* -------------------------------- Autoplay -------------------------------- */

  function updateAutoLabel() {
    var btn = $('#autoBtn');
    btn.classList.toggle('on', auto !== 0);
    btn.textContent = auto === 0 ? '▶ Auto' : (auto < 0 ? '■ Parar' : '■ Parar (' + auto + ')');
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

    var sc = c.all[c.scatterIndex];
    $('#ptRules').innerHTML =
      '<b>Curinga</b> — substitui qualquer símbolo, menos o scatter.<br>' +
      '<b>Scatter</b> — 3 em qualquer posição dão <b>' + c.freeSpins +
      ' giros grátis</b> com multiplicador <b>' + c.freeMult + '×</b>.<br>' +
      'Os prêmios multiplicam a <b>aposta por linha</b> (aposta total ÷ 5).<br>' +
      'Aposta atual: <b>' + money(state.bet) + '</b> · por linha <b>' + money(state.bet / 5) + '</b>.' +
      (sc.img ? '' : '');
  }

  function openSheet(open) {
    if (open) buildPaytable();
    $('#paysheet').classList.toggle('open', open);
    if (open && FG.pushModal) FG.pushModal(function () { openSheet(false); });
    else if (!open && FG.popModal) FG.popModal();
  }

  /* --------------------------------- Aposta --------------------------------- */

  function renderBet() {
    $('#betVal').textContent = num(state.bet);
    $('#multVal').textContent = (betIndex + 1) + 'x';
    $('#betPerLine').textContent = num(state.bet / c.lines.length) + ' / linha';
  }

  /* --------------------------------- Layout --------------------------------- */

  function layout() {
    var reels = $('#reels');
    if (!reels) return;
    var w = reels.clientWidth;
    if (w) reels.style.height = w + 'px';
    if (view) view.measure();
    var cell = (reels.clientHeight || w) / c.rows;
    if (cell) $('#frame').style.setProperty('--step', Math.round(cell * STEP_RATIO) + 'px');
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
      renderBet(); save(); haptic(8); sound(420, 0.04, 'triangle');
    });
    $('#betUp').addEventListener('click', function () {
      if (busy || freeLeft) return;
      betIndex = Math.min(BETS.length - 1, betIndex + 1);
      state.bet = BETS[betIndex];
      renderBet(); save(); haptic(8); sound(560, 0.04, 'triangle');
    });

    $('#turboBtn').addEventListener('click', function () {
      turbo = !turbo;
      this.classList.toggle('on', turbo);
      if (FG.toast) FG.toast(turbo ? 'Modo rápido ligado ⚡' : 'Modo rápido desligado');
      haptic(10);
    });

    $('#payBtn').addEventListener('click', function () { openSheet(true); haptic(8); });
    $('#linesBtn').addEventListener('click', function () { openSheet(true); haptic(8); });
    $('#ptClose').addEventListener('click', function () { openSheet(false); });
    $('#paysheet').addEventListener('click', function (e) {
      if (e.target === this) openSheet(false);
    });

    $('#depositBtn').addEventListener('click', function () {
      state.balance += 500;
      save();
      renderBalance();
      if (FG.confetti) FG.confetti();
      if (FG.toast) FG.toast('+ R$ 500,00 creditados 🎉');
    });

    $('#autoBtn').addEventListener('click', function () {
      if (auto !== 0) { stopAuto(); return; }
      $('#moreBox').classList.remove('open');
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

    $('#moreBtn').addEventListener('click', function () {
      $('#autoBox').classList.remove('open');
      $('#moreBox').classList.toggle('open');
    });
    $('#moreBox').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-more]');
      if (!b) return;
      this.classList.remove('open');
      var what = b.getAttribute('data-more');
      if (what === 'lobby') { save(); location.href = 'index.html'; }
      else if (what === 'sound') {
        var on = FG.toggleSound ? FG.toggleSound() : true;
        if (FG.toast) FG.toast(on ? 'Som ligado 🔊' : 'Som desligado 🔇');
      } else if (what === 'pay') openSheet(true);
      else if (what === 'diag' && FG.diagnose) FG.diagnose();
    });

    document.addEventListener('click', function (e) {
      ['#autoBox', '#moreBox'].forEach(function (sel) {
        var box = $(sel);
        if (!box.classList.contains('open')) return;
        if (!e.target.closest(sel) && !e.target.closest(sel === '#autoBox' ? '#autoBtn' : '#moreBtn')) {
          box.classList.remove('open');
        }
      });
    });

    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', function () { setTimeout(layout, 220); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });
  }

  function start() {
    document.body.style.setProperty('--t1', game.theme[0]);
    document.body.style.setProperty('--t2', game.theme[1]);

    var icon = c.all[0].img || (FG.placeholder ? FG.placeholder(game.name) : '');
    $('#gName').textContent = game.name;
    $('#gMeta').textContent = Games.volLabel[game.vol] || game.vol;
    $('#rtpLabel').textContent = 'RTP ' + (c.rtpExact * 100).toFixed(2).replace('.', ',') + '%';
    $('#gMascot').src = icon;
    $('#spinIcon').src = icon;
    $('#marqueeText').textContent =
      game.name + ' paga até ' + c.all[c.wildIndex].pay + '× por linha · 3 scatters dão ' +
      c.freeSpins + ' giros grátis com multiplicador ' + c.freeMult + '× · boa sorte!';
    $('#gBalance').textContent = num(state.balance);

    view = new Slot.ReelView($('#reels'), c);
    layout();
    view.showGrid(M.drawGrid(c, Math.random));

    buildLines();
    buildLineNumbers();
    buildPaytable();
    renderBet();
    renderTask();
    tickJackpot();
    setInterval(tickJackpot, 1300);
    wire();
    updateAutoLabel();
    setSpinUI(false);
  }

  /* Sonda os PNGs dos símbolos UMA vez. O que não existir (arte ainda não
     desenhada) cai no emoji — assim a sala nunca mostra imagem quebrada. */
  function resolveArt(done) {
    var list = c.all.filter(function (s) { return s.img; });
    if (!FG.resolve || !list.length) return done();

    var pending = list.length, finished = false;
    var finish = function () {
      if (finished) return;
      if (--pending <= 0) { finished = true; done(); }
    };
    list.forEach(function (s) {
      FG.resolve(s.img, function (url) { s.img = url || null; finish(); });
    });
    setTimeout(function () {
      if (!finished) { finished = true; done(); }
    }, 2500);
  }

  resolveArt(start);
}());
