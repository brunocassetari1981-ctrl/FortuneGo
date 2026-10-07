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

  /* O TEMA é tudo que distingue esta máquina das outras: arte, paleta,
     nome do modo bônus e assinatura sonora. A lógica abaixo nunca pergunta
     "que jogo é esse?" — só lê o tema. Trocar de jogo = trocar o tema. */
  var Theme = window.FortuneTheme;
  var theme = Theme.build(game);

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

  var cBase = c;                // configuração normal
  var cBonus = null;            // configuração da aposta bônus (sob demanda)
  var bonusOn = false;
  var BONUS_COST = 1.5;         // a aposta bônus custa 50% a mais

  var view = null;
  var busy = false;
  var turbo = false;
  var auto = 0;                 // 0 parado · n giros · -1 infinito
  var freeLeft = 0;
  var freeWon = 0;
  var freeTotal = 0;            // acumulado da rodada bônus, mostrado na faixa
  var modoBonus = false;        // a tela inteira está no tema do bônus?
  var shownBalance = state.balance;
  var sessionWins = 0;          // para a barra de tarefa
  var hideWinTimer = null;

  var LINE_COLORS = ['#facc15', '#22d3ee', '#f472b6', '#4ade80', '#fb923c',
                     '#a78bfa', '#f87171', '#34d399', '#60a5fa', '#fde047'];

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

  /* A faixa azul embaixo dos rolos: normalmente rola o letreiro, na vitória
     vira "WIN 0,25" com a moeda, igual ao original. */
  var marqueeTimer = null;
  function setMarqueeWin(amount) {
    var bar = $('#marquee');
    clearTimeout(marqueeTimer);
    if (amount == null) {
      bar.classList.remove('win');
      $('#marqueeWin').textContent = '';
      return;
    }
    bar.classList.add('win');
    var el = $('#marqueeWin');
    el.textContent = num(0);
    animateTo(el, 0, amount, turbo ? 350 : 800);
    marqueeTimer = setTimeout(function () { bar.classList.remove('win'); }, turbo ? 1400 : 3200);
  }

  /* ------------------------- O PERSONAGEM -------------------------
     Ele reage ao que acontece: inclina ao girar, pula ao ganhar, festeja
     na vitória grande e responde ao toque. As classes vivem no CSS; aqui
     só decidimos QUANDO trocar. */
  var mascotTimer = null;

  function mascot(estado) {
    var el = $('#gMascot');
    if (!el || !el.classList) return;
    clearTimeout(mascotTimer);
    el.classList.remove('spinning', 'cheer', 'party', 'poke');
    if (!estado) return;
    // reinicia a animação mesmo se a classe for a mesma de antes
    if (el.offsetWidth !== undefined) { var _ = el.offsetWidth; }
    el.classList.add(estado);
    if (estado === 'cheer' || estado === 'poke') {
      mascotTimer = setTimeout(function () { el.classList.remove(estado); }, 1000);
    }
  }

  function sound(f, d, t) { if (FG.sound) FG.sound(f, d, t); }
  function haptic(ms) { if (FG.haptic) FG.haptic(ms); }

  /* Tocador do tema: fala em GRAUS da escala do jogo, não em hertz. É o que
     faz o Coelho soar diferente do Tigre sem nenhum arquivo de áudio. */
  var tune = Theme.audio(theme, function (f, d, t) { sound(f, d, t); });

  /** Clique seco de interface — todo botão da sala passa por aqui. */
  function click(forte) {
    sound(forte ? 300 : 210, 0.035, 'square');
    haptic(forte ? 14 : 8);
  }

  /* --------------------- O SÍMBOLO DE DINHEIRO ---------------------
     Cai com um valor impresso na própria moeda. Ele não entra em linha
     nenhuma: o prêmio sai quando `moneyNeed` ou mais aparecem no mesmo
     giro, e aí vale a SOMA do que estiver na tela. A barrinha mostra o
     progresso ao vivo, que é o que prende o jogador. */

  function renderMoneyBar(count, soma, acertou) {
    var bar = $('#moneyBar');
    if (!bar) return;
    var falta = Math.max(0, c.moneyNeed - count);
    $('#moneyCount').textContent = count;
    $('#moneyNeed').textContent = acertou
      ? '/' + c.moneyNeed + ' COMPLETOU!'
      : '/' + c.moneyNeed + (falta === 1 ? ' — falta 1!' : ' para ganhar');
    $('#moneyTotal').textContent = soma > 0 ? money(soma * betNow()) : '';
    bar.classList.toggle('on', count > 0);
    bar.classList.toggle('close', !acertou && falta > 0 && falta <= 2);
    bar.classList.toggle('hit', !!acertou);
  }

  /** Acende as moedas uma a uma, com o som subindo a escala. */
  function revealMoney(res) {
    var parcial = 0;
    res.moneyCells.forEach(function (m, i) {
      var el = view.cellAt(m.cell[0], m.cell[1]);
      setTimeout(function () {
        if (el && el.classList) el.classList.add('money-hit');
        parcial += m.value;
        renderMoneyBar(i + 1, parcial, i + 1 >= c.moneyNeed);
        tune.tocar(i, 0.09);
      }, i * (turbo ? 55 : 130));
    });
  }

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
    var left = [[], [], []], right = [[], [], []];   // 3 faixas visíveis de cada lado
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

  /**
   * Desenha as 10 linhas em coordenadas de 300×300, onde 100 = 1 célula das
   * colunas laterais. A coluna do meio tem 4 posições e fica centrada, então
   * ela começa meia célula ACIMA: o centro da posição r vale r*100 (0, 100,
   * 200, 300) em vez de 50, 150, 250.
   */
  function buildLines() {
    var X = [50, 150, 250];
    var side = [50, 150, 250];          // centros das colunas de 3
    var mid = [0, 100, 200, 300];       // centros da coluna de 4
    var out = '';
    for (var i = 0; i < c.lines.length; i++) {
      var l = c.lines[i];
      var y0 = side[l[0]], y1 = mid[l[1]], y2 = side[l[2]];
      var col = LINE_COLORS[i % LINE_COLORS.length];
      var d = 'M 0,' + y0 +
              ' L ' + X[0] + ',' + y0 +
              ' L ' + X[1] + ',' + y1 +
              ' L ' + X[2] + ',' + y2 +
              ' L 300,' + y2;
      out += '<path data-line="' + i + '" d="' + d + '" stroke="' + col +
             '" style="color:' + col + '"></path>';
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

  /** Moedinhas subindo de cada célula premiada. Posicionadas em relação à
      moldura, e não ao rolo, porque o rolo corta o que passa da borda. */
  function popCoins(cells) {
    var frame = $('#frame');
    if (!frame || !frame.getBoundingClientRect || !frame.appendChild) return;
    var base = frame.getBoundingClientRect();
    if (!base.width) return;

    var total = 0;
    cells.forEach(function (el, i) {
      if (total > 14 || !el.getBoundingClientRect) return;
      var r = el.getBoundingClientRect();
      var n = turbo ? 1 : 2;
      for (var k = 0; k < n; k++) {
        total++;
        var moeda = document.createElement('div');
        moeda.className = 'gm-pop';
        moeda.style.left = (r.left - base.left + r.width * (0.3 + Math.random() * 0.4)) + 'px';
        moeda.style.top = (r.top - base.top + r.height * 0.55) + 'px';
        moeda.style.animationDelay = (i * 55 + k * 110 + Math.random() * 80) + 'ms';
        frame.appendChild(moeda);
        (function (m) {
          setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 1500);
        }(moeda));
      }
    });
  }

  function highlight(wins) {
    var winning = {};
    wins.forEach(function (w) {
      w.cells.forEach(function (cell) { winning[cell[0] + ':' + cell[1]] = true; });
    });
    var premiadas = [];
    for (var col = 0; col < c.cols; col++) {
      for (var row = 0; row < c.rowsPer[col]; row++) {
        var el = view.cellAt(col, row);
        if (!el) continue;
        if (winning[col + ':' + row]) { el.classList.add('win'); premiadas.push(el); }
        else if (!el.classList.contains('money-hit')) el.classList.add('dim');
      }
    }
    view.root.classList.add('has-win');
    popCoins(premiadas);
  }

  /* ------------------------------ Grande vitória ------------------------------ */

  /** Barras de equalizador: alturas e ritmos diferentes, como no original. */
  function buildEq() {
    var eq = $('#bwEq');
    if (!eq || eq.children.length) return;
    for (var i = 0; i < 17; i++) {
      var b = document.createElement('i');
      b.style.animationDelay = (Math.random() * 500) + 'ms';
      b.style.animationDuration = (380 + Math.random() * 320) + 'ms';
      eq.appendChild(b);
    }
  }

  /** Chuva de moedas caindo pela tela inteira. */
  function coinRain(n) {
    var box = $('#bigwin');
    if (!box || !box.appendChild) return;
    for (var i = 0; i < n; i++) {
      var m = document.createElement('div');
      m.className = 'gm-rain';
      m.style.left = (Math.random() * 96) + '%';
      m.style.animationDuration = (1500 + Math.random() * 1400) + 'ms';
      m.style.animationDelay = (Math.random() * 900) + 'ms';
      var tam = 11 + Math.random() * 13;
      m.style.width = m.style.height = tam + 'px';
      box.appendChild(m);
      (function (el) {
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3400);
      }(m));
    }
  }

  function bigWin(amount, ratio) {
    var box = $('#bigwin');
    var face = $('#bwFace');
    if (face) face.src = c.all[c.wildIndex].img || '';
    box.classList.toggle('mega', ratio >= 40);

    var titulo = ratio >= 100 ? 'JACKPOT!' : (ratio >= 40 ? 'MEGA WIN' : 'BIG WIN');
    var kind = $('#bwKind');
    if (kind.setAttribute) {
      kind.setAttribute('data-text', titulo);     // contorno grosso
      kind.setAttribute('aria-label', titulo);    // leitor de tela lê a palavra
    }
    /* As letras entram UMA A UMA, caindo e quicando, como no original.
       Cada uma leva junto o seu grau da escala do jogo. */
    kind.innerHTML = '';
    titulo.split('').forEach(function (ch, i) {
      var sp = document.createElement('span');
      sp.className = 'ltr';
      sp.textContent = ch;
      sp.setAttribute('data-ch', ch);
      sp.style.animationDelay = (i * 72) + 'ms';
      kind.appendChild(sp);
      setTimeout(function () { tune.tocar(i, 0.07); }, i * 72);
    });

    $('#bwMult').textContent = ratio.toFixed(1).replace('.', ',') + '× a sua aposta';
    $('#bwAmount').textContent = money(0);
    box.classList.add('on');
    buildEq();
    animateTo($('#bwAmount'), 0, amount, 1400, money);
    coinRain(ratio >= 40 ? 38 : 22);
    if (FG.confetti) FG.confetti();

    /* acorde ascendente, não bipes soltos */
    [523, 659, 784, 1047, 1319].forEach(function (f, i) {
      setTimeout(function () { sound(f, 0.22, 'sine'); }, i * 110);
    });
    setTimeout(function () { sound(1568, 0.5, 'sine'); }, 620);

    document.body.classList.add('shake');
    setTimeout(function () { document.body.classList.remove('shake'); }, 620);

    var close = function () { box.classList.remove('on'); mascot(null); };
    box.onclick = close;
    setTimeout(close, ratio >= 40 ? 4200 : 3400);
  }

  /* --------------------------------- O giro --------------------------------- */

  function setSpinUI(spinning) {
    var btn = $('#spinBtn');
    btn.disabled = spinning || (freeLeft > 0);
    btn.classList.toggle('busy', spinning);
    $('#spinLabel').textContent = freeLeft > 0 ? 'GRÁTIS' : (auto !== 0 ? 'AUTO' : 'GIRAR');
    $('#betDown').disabled = $('#betUp').disabled = spinning || freeLeft > 0;
  }

  function betNow() { return state.bet * (bonusOn ? BONUS_COST : 1); }

  function toggleBonus() {
    if (busy || freeLeft) return;
    bonusOn = !bonusOn;
    if (bonusOn && !cBonus) cBonus = M.prepare(game, { bonus: true });
    c = bonusOn ? cBonus : cBase;
    $('#bonusBtn').classList.toggle('on', bonusOn);
    $('#bonusBtn').querySelector('b').textContent = bonusOn ? 'ON' : 'OFF';
    buildPaytable();
    renderBet();
    haptic(10);
    sound(bonusOn ? 760 : 420, 0.07, 'triangle');
    if (FG.toast) {
      FG.toast(bonusOn
        ? 'Aposta bônus ligada: custa ' + BONUS_COST + '× e o scatter aparece 2,5× mais'
        : 'Aposta bônus desligada');
    }
  }

  function doSpin(isFree) {
    if (busy) return;
    if (!isFree && state.balance < betNow()) {
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
      state.balance -= betNow();
      state.spins++;
      renderBalance();
    }

    haptic(16);
    sound(380, 0.1, 'sawtooth');
    mascot('spinning');
    renderMoneyBar(0, 0, false);

    var res = M.spin(c);

    var early = 0;
    for (var col = 0; col < 2; col++) {
      for (var row = 0; row < c.rowsPer[col]; row++) {
        if (res.grid[col][row] === c.scatterIndex) early++;
      }
    }

    view.spinTo(res.grid, {
      turbo: turbo,
      money: res.money,                 // cada moeda cai com o seu valor
      anticipate: early >= 2,
      onStop: function (col) {
        sound(520 + col * 95, 0.05, 'square');
        haptic(7);
      }
    }).then(function () {
      settle(res, isFree);
    })['catch'](function (err) {
      /* Nenhum erro pode deixar a sala travada: solta o giro, avisa e
         segue. Sem isto, uma exceção aqui dentro some de vez (promessa
         sem catch) e o botão fica morto até recarregar. */
      busy = false;
      freeLeft = 0;
      setSpinUI(false);
      setWinbar('Ops, falhou o giro — tente de novo', '');
      if (window.console && console.error) console.error('[FortuneGo] giro:', err);
      if (FG.toast) FG.toast('Algo falhou no giro. Pode girar de novo.');
    });
  }

  function settle(res, isFree) {
    var mult = isFree ? c.freeMult : 1;
    var amount = res.winUnits * betNow() * mult;
    var ratio = res.winUnits * mult;

    /* O dinheiro resolve primeiro: acende as moedas e mostra o progresso.
       Mesmo sem completar, a barra guarda o que caiu — é a quase-vitória
       que faz o jogador querer o giro seguinte. */
    if (res.moneyCount) {
      if (res.moneyHit) revealMoney(res);
      else renderMoneyBar(res.moneyCount, res.moneySum, false);
    } else {
      renderMoneyBar(0, 0, false);
    }

    if (res.wins.length) {
      highlight(res.wins);
      showLines(res.wins);
    }

    if (res.wins.length || res.moneyHit) {
      if (res.moneyHit) {
        var vDin = res.moneyWin * betNow() * mult;
        setTimeout(function () {
          if (FG.toast) FG.toast('💰 ' + res.moneyCount + ' de dinheiro — ' + money(vDin));
        }, turbo ? 320 : 700);
      }
      state.balance += amount;
      state.wins++;
      sessionWins++;
      renderTask();
      if (amount > state.best) state.best = amount;
      if (isFree) freeWon += amount;

      animateTo($('#winValue'), 0, amount, turbo ? 350 : 700);

      var top = res.wins.slice().sort(function (a, b) { return b.pay - a.pay; })[0];
      var face = top ? new Array(4).join(c.all[top.symbol].char) : ('💰×' + res.moneyCount);
      state.history.unshift(game.name + ' · ' + face +
        ' · +' + money(amount) + (isFree ? ' (grátis ' + mult + '×)' : ''));
      state.history = state.history.slice(0, 12);

      setWinbar((isFree ? '🎁 ' : '') + (res.moneyHit && !res.wins.length ? '💰 ' : '') +
        'GANHOU ' + money(amount), 'win');
      if (isFree) { freeTotal += amount; $('#fsWon').textContent = money(freeTotal); }
      setMarqueeWin(amount);
      mascot(ratio >= 15 ? 'party' : 'cheer');
      renderBalance();
      if (FG.hapticWin) FG.hapticWin(); else haptic(40);
      if (ratio >= 15) bigWin(amount, ratio);
      else if (FG.coins) FG.coins(window.innerWidth / 2, window.innerHeight * 0.45, 8);
    } else {
      mascot(null);
      setWinbar(res.scatters === 2 ? 'Quase! Faltou 1 scatter 😮' : 'Não foi dessa vez 🍀', '');
      if (!isFree) {
        state.history.unshift(game.name + ' · −' + money(betNow()));
        state.history = state.history.slice(0, 12);
      }
    }

    save();

    var ganhou = res.wins.length || res.moneyHit;
    var pause = ganhou ? (turbo ? 650 : 1150) : (turbo ? 220 : 480);
    if (res.moneyHit) pause += res.moneyCount * (turbo ? 55 : 130);
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
      if (state.balance < betNow()) { stopAuto(); return; }
      updateAutoLabel();
      setTimeout(function () { doSpin(false); }, turbo ? 120 : 340);
    }
  }

  /* ----------------------------- MODO BÔNUS -----------------------------
     Nos originais a rodada de graça não é só "mais giros": a TELA INTEIRA
     muda de tema — fundo, cor dos cilindros, moldura, letreiro — e o que
     você ganha vai se acumulando num contador à vista até a rodada acabar.
     É isso que está aqui. O nome e as cores saem do tema do jogo, então
     cada máquina tem o seu modo sem uma linha de código a mais. */

  function entrarModoBonus() {
    if (modoBonus) return;
    modoBonus = true;
    Theme.apply(theme, 'bonus');          // paleta do bônus em toda a tela
    document.body.classList.add('modo-bonus');
    tune.arpejo([0, 2, 4, 7, 9, 12], 95, 0.16);
  }

  function sairModoBonus() {
    if (!modoBonus) return;
    modoBonus = false;
    Theme.apply(theme, 'base');
    document.body.classList.remove('modo-bonus');
    tune.arpejo([12, 9, 7, 4, 0], 70, 0.12);
  }

  function beginFree(n) {
    freeLeft = n;
    freeWon = 0;
    freeTotal = 0;
    entrarModoBonus();
    $('#freeBanner').classList.add('on');
    $('#fsName').textContent = theme.bonus.name.toUpperCase();
    $('#fsLeft').textContent = n;
    $('#fsMult').textContent = c.freeMult + '×';
    $('#fsWon').textContent = money(0);
    setWinbar('🎁 ' + theme.bonus.name + ' · ' + n + ' giros · ' + c.freeMult + '×', 'win');
    if (FG.confetti) FG.confetti();
    if (FG.toast) FG.toast(theme.bonus.name + ': ' + n + ' giros com ' + c.freeMult + '× 🎁');
    setSpinUI(true);
    setTimeout(function () { doSpin(true); }, turbo ? 700 : 1500);
  }

  function endFree() {
    var ganho = freeTotal;
    $('#freeBanner').classList.remove('on');
    sairModoBonus();
    if (ganho > 0) {
      setWinbar('🎁 ' + theme.bonus.name + ' rendeu ' + money(ganho), 'win');
      if (FG.confetti) FG.confetti();
      /* a rodada inteira também merece celebração se valeu a pena */
      var razao = ganho / Math.max(1, state.bet);
      if (razao >= 15) setTimeout(function () { bigWin(ganho, razao); }, 420);
    } else {
      setWinbar(theme.bonus.name + ' encerrado', '');
    }
    freeLeft = 0;
    freeTotal = 0;
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
      '<b>' + game.name + '</b> é o <b>curinga</b> — substitui qualquer símbolo, ' +
      'menos o scatter, e é o que mais paga.<br>' +
      '<b>Scatter</b> — ' + c.scatterNeed + ' em qualquer posição dão <b>' + c.freeSpins +
      ' giros grátis</b> com multiplicador <b>' + c.freeMult + '×</b>.<br>' +
      'Grade de <b>3-4-3</b> com <b>' + c.lines.length + ' linhas</b>; o prêmio multiplica a ' +
      '<b>aposta por linha</b> (aposta total ÷ ' + c.lines.length + ').<br>' +
      (c.bonusBet ? '<b>Aposta bônus ligada</b> — custa ' + BONUS_COST +
        '× e o scatter sai 2,5× mais; os prêmios de linha caem na mesma medida, ' +
        'o RTP continua ' + (c.rtpExact * 100).toFixed(2).replace('.', ',') + '%.<br>' : '') +
      'Aposta atual: <b>' + money(betNow()) + '</b> · por linha <b>' +
      money(betNow() / c.lines.length) + '</b>.' + (sc.img ? '' : '');
  }

  function openSheet(open) {
    if (open) buildPaytable();
    $('#paysheet').classList.toggle('open', open);
    if (open && FG.pushModal) FG.pushModal(function () { openSheet(false); });
    else if (!open && FG.popModal) FG.popModal();
  }

  /* --------------------------------- Aposta --------------------------------- */

  function renderBet() {
    $('#betVal').textContent = num(betNow());
    $('#multVal').textContent = (betIndex + 1) + 'x';
    $('#betPerLine').textContent = num(betNow() / c.lines.length) + ' / linha';
  }

  /* --------------------------------- Layout --------------------------------- */

  /**
   * Geometria medida nos prints do jogo original: a célula é mais LARGA do
   * que alta — 178x133 no Fortune Rabbit 2 e 185x147 no Fortune Snake, ou
   * seja, altura ≈ 0,78 da largura. Com célula quadrada os rolos ficavam
   * compridos demais.
   *
   * As colunas laterais têm 3 posições e a do meio 4; a central é centrada e
   * transborda meia célula para cima e para baixo — o degrau do original.
   */
  var CELL_RATIO = 0.78;

  /* ------------------------- ENQUADRAMENTO -------------------------
     A máquina tem de caber INTEIRA em qualquer telemóvel: nada cortado,
     nada de margem desproporcional.

     Quem manda na altura é o rolo central — tem 4 posições e sai meia
     célula para fora em cada ponta:

         altura da máquina = célula*4 + 2*moldura + 2*folga

     Então calculamos o tamanho de célula que cabe pela LARGURA e o que
     cabe pela ALTURA, e ficamos com o menor dos dois.

     O detalhe que faltava: quando é a ALTURA que manda, a célula fica
     menor do que a largura disponível permitiria e as colunas, que são
     1fr, continuavam largas — sobrava fundo dos dois lados de cada
     figura e a grelha parecia vazia. Por isso a largura da máquina é
     reduzida para casar exatamente com a célula escolhida. */

  var MEDIDAS = {};
  function cssPx(nome, padrao) {
    if (MEDIDAS[nome] !== undefined) return MEDIDAS[nome];
    var n = NaN;
    if (typeof getComputedStyle === 'function' && document.body) {
      n = parseFloat(getComputedStyle(document.body).getPropertyValue(nome));
    }
    MEDIDAS[nome] = isFinite(n) ? n : padrao;
    return MEDIDAS[nome];
  }

  function layout() {
    var reels = $('#reels');
    if (!reels) return;
    var stage = $('.fr-stage');
    var machine = $('.fr-machine');

    var linhasVisiveis = c.rowsPer[0];                       // 3
    var linhasMax = Math.max.apply(null, c.rowsPer);         // 4 (rolo central)

    var padX = cssPx('--stage-pad-x', 10) * 2;
    var padY = cssPx('--stage-pad-y', 6);
    var sideCol = cssPx('--side-col', 20);
    var gridGap = cssPx('--grid-gap', 4);
    var framePad = cssPx('--frame-pad', 9);
    var reelGap = cssPx('--reel-gap', 5);
    var folga = cssPx('--machine-extra', 4);
    var maxW = cssPx('--machine-max', 460);

    /* tudo que ocupa largura sem ser célula */
    var fixoX = 2 * sideCol + 2 * gridGap + 2 * framePad + (c.cols - 1) * reelGap;
    /* tudo que ocupa altura sem ser célula */
    var fixoY = 2 * framePad + 2 * folga;

    var telaW = (stage && stage.clientWidth) || reels.clientWidth || 360;
    var dispW = Math.min(telaW - padX, maxW);
    var porLargura = ((dispW - fixoX) / c.cols) * CELL_RATIO;

    var porAltura = Infinity;
    var telaH = stage && stage.clientHeight;
    if (telaH) porAltura = (telaH - padY - fixoY) / linhasMax;

    var cell = Math.max(30, Math.floor(Math.min(porLargura, porAltura)));

    /* a máquina encolhe até casar com a célula — grelha sempre cheia */
    if (machine && machine.style) {
      var larguraCasada = Math.ceil((cell / CELL_RATIO) * c.cols + fixoX);
      machine.style.width = Math.min(dispW, larguraCasada) + 'px';
    }

    reels.style.height = (cell * linhasVisiveis) + 'px';
    $('#frame').style.setProperty('--cell', cell + 'px');
    document.body.style.setProperty('--cell', cell + 'px');

    /* uma única fonte de verdade para o tamanho: a sala manda, o motor
       obedece. Antes o motor media o DOM por conta própria e, quando as
       duas contas divergiam (resize, troca de orientação), abria uma
       fresta entre os símbolos. */
    if (view) {
      if (view.setCell) view.setCell(cell);
      else view.measure();
    }
  }

  /* ---------------------------------- Boot ---------------------------------- */

  function wire() {
    /* CLIQUE EM TUDO — um toque sem retorno sonoro parece travado. Um só
       ouvinte na captura cobre qualquer botão da sala, inclusive os que
       forem criados depois (tabela de prêmios, aposta, menu). O mascote
       fica de fora porque tem o som próprio dele. */
    document.addEventListener('pointerdown', function (ev) {
      var alvo = ev.target && ev.target.closest
        ? ev.target.closest('button, .fr-icon, .gm-chip, [data-click]')
        : null;
      if (!alvo || alvo.disabled) return;
      if (alvo.id === 'gMascot') return;
      click(alvo.id === 'spinBtn');
    }, true);

    $('#backBtn').addEventListener('click', function () {
      save();
      location.href = 'index.html';
    });

    $('#spinBtn').addEventListener('click', function () { doSpin(false); });
    $('#bonusBtn').addEventListener('click', toggleBonus);

    // cutucar o personagem: ele reage
    $('#gMascot').addEventListener('click', function () {
      if (busy) return;
      mascot('poke');
      haptic(12);
      sound(620 + Math.random() * 260, 0.07, 'triangle');
      if (FG.coins) FG.coins(window.innerWidth * 0.72, window.innerHeight * 0.2, 4);
    });

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
    Theme.apply(theme, 'base');          // paleta normal da máquina

    var icon = c.all[c.wildIndex].img || (FG.placeholder ? FG.placeholder(game.name) : '');
    $('#gName').textContent = game.name;
    $('#gMeta').textContent = Games.volLabel[game.vol] || game.vol;
    $('#rtpLabel').textContent = 'RTP ' + (c.rtpExact * 100).toFixed(2).replace('.', ',') + '%';
    $('#gMascot').src = icon;
    $('#spinIcon').src = icon;
    $('#marqueeText').textContent =
      game.name + ' é o curinga e paga ' + c.all[c.wildIndex].pay + '× por linha · ' +
      c.scatterNeed + ' scatters dão ' + c.freeSpins + ' giros grátis com multiplicador ' +
      c.freeMult + '× · ' + c.lines.length + ' linhas · boa sorte!';
    $('#gBalance').textContent = num(state.balance);

    view = new Slot.ReelView($('#reels'), c);
    /* a moeda mostra o valor em dinheiro de verdade, não o multiplicador */
    view.moneyFormat = function (v) { return num(v * betNow()); };
    layout();
    var inicial = M.spin(c);
    view.showGrid(inicial.grid, inicial.money);
    renderMoneyBar(0, 0, false);

    $('#linesBtn').textContent = '⚙ ' + c.lines.length + ' Linhas';
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
    fecharBoot();
  }

  /* ----------------------------- CARREGANDO -----------------------------
     A sala só aparece depois que a arte foi resolvida; até lá fica a tela
     de abertura com o mascote e a barra enchendo. Evita o pisca-pisca de
     imagem faltando que havia antes. */

  function fecharBoot() {
    var boot = $('#boot');
    if (!boot) return;
    var fill = $('#bootFill');
    if (fill) fill.style.width = '100%';
    $('#bootTip').textContent = 'boa sorte!';
    setTimeout(function () {
      boot.classList.add('off');
      setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 650);
    }, 260);
  }

  function abrirBoot() {
    var nome = $('#bootName');
    if (nome) nome.textContent = game.name;
    var dica = $('#bootTip');
    if (dica) dica.textContent = theme.bonus.name + ' · RTP ' +
      (c.rtpExact * 100).toFixed(2).replace('.', ',') + '%';
    var face = $('#bootFace');
    if (face) face.src = game.img || '';
    var fill = $('#bootFill');
    if (fill) setTimeout(function () { fill.style.width = '72%'; }, 60);
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

  abrirBoot();
  resolveArt(start);
}());
