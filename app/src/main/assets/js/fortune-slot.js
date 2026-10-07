/*!
 * FortuneGo — motor de caça-níquel 3×3 (estilo "Fortune")
 *
 * Duas camadas independentes:
 *   SlotMath  → matemática pura, sem DOM. Roda igual no navegador e no Node,
 *               então tools/test-slot.js testa o MESMO código que o app executa.
 *   ReelView  → desenho/animação dos rolos (só existe quando há DOM).
 *
 * Regras implementadas:
 *   • grade 3×3, 5 linhas de pagamento (centro, topo, base e as 2 diagonais);
 *   • prêmio por 3 iguais na linha, pago em múltiplos da APOSTA POR LINHA;
 *   • curinga (wild) substitui qualquer símbolo, menos o scatter;
 *   • 3+ scatters em qualquer posição → giros grátis com multiplicador;
 *   • giros grátis NÃO re-disparam (mantém o RTP calculável de forma exata).
 *
 * Calibração de RTP: o catálogo declara só o RTP alvo e a escada relativa de
 * prêmios. `prepare()` resolve o fator k que faz o RTP teórico bater no alvo,
 * arredonda os prêmios para valores "de vitrine" e recalcula o RTP exato
 * resultante (c.rtpExact) — é esse número que a interface mostra ao jogador.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FortuneSlot = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Presets de volatilidade
   * weights = peso de cada um dos 6 símbolos do tema (quanto maior, mais sai)
   * ratios  = escada RELATIVA de prêmios (o k da calibração escala tudo)
   * ------------------------------------------------------------------ */
  var PRESETS = {
    baixa: {
      weights: [5, 7, 9, 12, 15, 16],
      ratios: [60, 30, 20, 12, 8, 6],
      wild: { weight: 4, ratio: 90 },
      scatter: { weight: 5, free: 8, mult: 2 }
    },
    media: {
      weights: [4, 6, 8, 11, 14, 16],
      ratios: [110, 45, 26, 16, 10, 8],
      wild: { weight: 3, ratio: 170 },
      scatter: { weight: 4, free: 8, mult: 2 }
    },
    alta: {
      weights: [3, 5, 7, 10, 13, 16],
      ratios: [220, 85, 42, 22, 12, 8],
      wild: { weight: 2, ratio: 320 },
      scatter: { weight: 3, free: 10, mult: 3 }
    }
  };

  var LINES_3x3 = [
    [1, 1, 1],   // linha central
    [0, 0, 0],   // linha de cima
    [2, 2, 2],   // linha de baixo
    [0, 1, 2],   // diagonal descendo
    [2, 1, 0]    // diagonal subindo
  ];

  var LINE_NAMES = ['Central', 'Superior', 'Inferior', 'Diagonal ↘', 'Diagonal ↗'];

  /* ------------------------------ Utilidades ------------------------------ */

  function niceRound(v) {
    if (v >= 20) return Math.round(v);
    if (v >= 2) return Math.round(v * 2) / 2;
    return Math.max(0.1, Math.round(v * 10) / 10);
  }

  function combinations(n, k) {
    var r = 1;
    for (var i = 0; i < k; i++) r = r * (n - i) / (i + 1);
    return r;
  }

  /** P(sair 3 ou mais scatters) em `cells` sorteios independentes. */
  function scatterChance(p, cells, need) {
    var acc = 0;
    for (var i = 0; i < need; i++) {
      acc += combinations(cells, i) * Math.pow(p, i) * Math.pow(1 - p, cells - i);
    }
    return Math.max(0, 1 - acc);
  }

  /* ------------------------------ Preparação ------------------------------ */

  /**
   * Transforma a ficha do catálogo numa configuração pronta para jogar.
   * @param {object} game item de FortuneGames.list
   * @returns {object} configuração compilada
   */
  function prepare(game) {
    var preset = PRESETS[game.vol] || PRESETS.media;
    var cols = 3, rows = 3;

    var art = game.sym || null;          // baralho com arte (fortune-games.js)
    var all = [];
    for (var i = 0; i < 6; i++) {
      all.push({
        id: 's' + i,
        char: art ? art[i].char : game.chars[i],
        img: art ? art[i].img : (i === 0 ? game.img : null),
        weight: preset.weights[i],
        ratio: preset.ratios[i],
        pay: 0
      });
    }
    var wildIndex = all.length;
    all.push({
      id: 'wild',
      char: game.wildSym ? game.wildSym.char : game.wild,
      img: game.wildSym ? game.wildSym.img : null,
      weight: preset.wild.weight, ratio: preset.wild.ratio, pay: 0, isWild: true
    });
    var scatterIndex = all.length;
    all.push({
      id: 'scatter',
      char: game.scatterSym ? game.scatterSym.char : game.scatter,
      img: game.scatterSym ? game.scatterSym.img : null,
      weight: preset.scatter.weight, ratio: 0, pay: 0, isScatter: true
    });

    var totalWeight = 0;
    all.forEach(function (s) { totalWeight += s.weight; });

    var c = {
      game: game,
      cols: cols, rows: rows,
      cells: cols * rows,
      all: all,
      wildIndex: wildIndex,
      scatterIndex: scatterIndex,
      lines: LINES_3x3,
      lineNames: LINE_NAMES,
      totalWeight: totalWeight,
      freeSpins: preset.scatter.free,
      freeMult: preset.scatter.mult,
      scatterNeed: 3,
      rtpTarget: game.rtp
    };

    c.prob = all.map(function (s) { return s.weight / totalWeight; });
    c.scatterProb = scatterChance(c.prob[scatterIndex], c.cells, c.scatterNeed);
    c.freeFactor = 1 + c.scatterProb * c.freeSpins * c.freeMult;

    // 1) RTP com a escada relativa  2) fator k  3) prêmios finais  4) RTP exato
    var rawLine = lineExpectation(c, function (s) { return s.ratio; });
    var k = (game.rtp / 100) / (rawLine * c.freeFactor);
    all.forEach(function (s) { s.pay = s.isScatter ? 0 : niceRound(s.ratio * k); });
    refine(c);

    c.baseRTP = lineExpectation(c, function (s) { return s.pay; });
    c.rtpExact = c.baseRTP * c.freeFactor;
    c.calibration = k;
    return c;
  }

  var payOf = function (s) { return s.pay; };

  /** A escada precisa continuar decrescente (s0 ≥ s1 ≥ … ≥ s5) e o curinga no topo. */
  function ladderOk(c, i, np) {
    if (i === c.wildIndex) return np >= c.all[0].pay;
    if (i > 0 && np > c.all[i - 1].pay) return false;
    if (i < 5 && np < c.all[i + 1].pay) return false;
    if (i === 0 && np > c.all[c.wildIndex].pay) return false;
    return true;
  }

  /**
   * Arredondar os prêmios desvia o RTP em até ~1 ponto percentual. Aqui a
   * diferença é recuperada em passos de 0,1× nos prêmios pequenos (os símbolos
   * frequentes), que são os que movem o RTP sem estragar a vitrine do pagamento.
   */
  function refine(c) {
    var targetBase = (c.rtpTarget / 100) / c.freeFactor;
    var movable = [];
    for (var i = 0; i < c.all.length; i++) {
      if (!c.all[i].isScatter && c.all[i].pay < 20) movable.push(i);
    }
    if (!movable.length) return;

    var best = Math.abs(lineExpectation(c, payOf) - targetBase);
    var improved = true, guard = 0;

    while (improved && guard++ < 400) {
      improved = false;
      for (var m = 0; m < movable.length; m++) {
        var idx = movable[m], sym = c.all[idx];
        var deltas = [0.1, -0.1];
        for (var d = 0; d < deltas.length; d++) {
          var np = Math.round((sym.pay + deltas[d]) * 10) / 10;
          if (np <= 0 || !ladderOk(c, idx, np)) continue;
          var old = sym.pay;
          sym.pay = np;
          var err = Math.abs(lineExpectation(c, payOf) - targetBase);
          if (err < best - 1e-12) { best = err; improved = true; }
          else sym.pay = old;
        }
      }
    }
  }

  /**
   * Valor esperado de UMA linha, em múltiplos da aposta por linha.
   * Como as 9 posições são sorteadas de forma independente, o RTP base do jogo
   * é exatamente este número (as 5 linhas dividem a aposta total em 5).
   */
  function lineExpectation(c, payOf) {
    var pw = c.prob[c.wildIndex];
    var wild3 = pw * pw * pw;
    var total = 0;
    for (var i = 0; i < c.all.length; i++) {
      var s = c.all[i];
      if (s.isWild || s.isScatter) continue;
      var p = c.prob[i] + pw;             // símbolo OU curinga
      total += (p * p * p - wild3) * payOf(s);
    }
    total += wild3 * payOf(c.all[c.wildIndex]);
    return total;
  }

  /* -------------------------------- Sorteio -------------------------------- */

  function drawSymbol(c, rng) {
    var r = rng() * c.totalWeight;
    for (var i = 0; i < c.all.length; i++) {
      r -= c.all[i].weight;
      if (r < 0) return i;
    }
    return c.all.length - 1;
  }

  function drawGrid(c, rng) {
    var grid = [];
    for (var col = 0; col < c.cols; col++) {
      grid[col] = [];
      for (var row = 0; row < c.rows; row++) grid[col][row] = drawSymbol(c, rng);
    }
    return grid;
  }

  function linePay(c, ids) {
    if (ids.indexOf(c.scatterIndex) !== -1) return null;   // scatter não paga em linha
    var base = -1;
    for (var i = 0; i < ids.length; i++) {
      if (ids[i] !== c.wildIndex) { base = ids[i]; break; }
    }
    if (base === -1) return { symbol: c.wildIndex, pay: c.all[c.wildIndex].pay };
    for (var j = 0; j < ids.length; j++) {
      if (ids[j] !== c.wildIndex && ids[j] !== base) return null;
    }
    return { symbol: base, pay: c.all[base].pay };
  }

  function evaluate(c, grid) {
    var wins = [], payTotal = 0, scatters = 0;

    for (var col = 0; col < c.cols; col++) {
      for (var row = 0; row < c.rows; row++) {
        if (grid[col][row] === c.scatterIndex) scatters++;
      }
    }

    for (var l = 0; l < c.lines.length; l++) {
      var line = c.lines[l], ids = [], cells = [];
      for (var cc = 0; cc < c.cols; cc++) {
        ids.push(grid[cc][line[cc]]);
        cells.push([cc, line[cc]]);
      }
      var hit = linePay(c, ids);
      if (hit && hit.pay > 0) {
        wins.push({ line: l, name: c.lineNames[l], symbol: hit.symbol, pay: hit.pay, cells: cells });
        payTotal += hit.pay;
      }
    }

    return {
      grid: grid,
      wins: wins,
      payTotal: payTotal,                       // soma em apostas-por-linha
      winUnits: payTotal / c.lines.length,      // em múltiplos da aposta total
      scatters: scatters,
      free: scatters >= c.scatterNeed ? c.freeSpins : 0
    };
  }

  function spin(c, rng) {
    return evaluate(c, drawGrid(c, rng || Math.random));
  }

  /** Gerador determinístico (mulberry32) — usado nos testes. */
  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Simula o ciclo completo (giro pago + giros grátis que ele disparar).
   * @returns {{rtp:number, sd:number, se:number, hitRate:number, freeRate:number}}
   */
  function simulate(c, rounds, rng) {
    rng = rng || Math.random;
    var sum = 0, sumsq = 0, hits = 0, frees = 0;
    for (var i = 0; i < rounds; i++) {
      var r = spin(c, rng);
      var won = r.winUnits;
      if (r.wins.length) hits++;
      if (r.free) {
        frees++;
        for (var f = 0; f < r.free; f++) won += spin(c, rng).winUnits * c.freeMult;
      }
      sum += won;
      sumsq += won * won;
    }
    var mean = sum / rounds;
    var variance = Math.max(0, sumsq / rounds - mean * mean);
    return {
      rtp: mean,
      sd: Math.sqrt(variance),
      se: Math.sqrt(variance / rounds),
      hitRate: hits / rounds,
      freeRate: frees / rounds
    };
  }

  var SlotMath = {
    PRESETS: PRESETS,
    prepare: prepare,
    drawGrid: drawGrid,
    evaluate: evaluate,
    spin: spin,
    simulate: simulate,
    seeded: seeded,
    lineExpectation: lineExpectation
  };

  /* ====================================================================== *
   *                          CAMADA VISUAL (DOM)                            
   * ====================================================================== */

  var PAD = 14;   // células falsas acima da parada, para dar curso à animação

  function ReelView(root, c) {
    this.root = root;
    this.c = c;
    this.reels = [];
    this.cellH = 0;
    this.build();
  }

  ReelView.prototype.build = function () {
    var self = this;
    this.root.innerHTML = '';
    this.reels = [];
    for (var col = 0; col < this.c.cols; col++) {
      var reel = document.createElement('div');
      reel.className = 'gm-reel';
      var strip = document.createElement('div');
      strip.className = 'gm-strip';
      reel.appendChild(strip);
      this.root.appendChild(reel);
      this.reels.push({ el: reel, strip: strip });
    }
    this.measure();
    this.showGrid(drawGrid(this.c, Math.random));
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(function () { self.measure(); });
      this._ro.observe(this.root);
    } else {
      window.addEventListener('resize', function () { self.measure(); });
    }
  };

  ReelView.prototype.measure = function () {
    var h = this.reels[0] ? this.reels[0].el.clientHeight : 0;
    if (!h) return;
    this.cellH = h / this.c.rows;
    this.root.style.setProperty('--cell', this.cellH + 'px');
  };

  ReelView.prototype.cell = function (symIndex) {
    var s = this.c.all[symIndex];
    var el = document.createElement('div');
    el.className = 'gm-cell';
    el.setAttribute('data-sym', s.id);
    if (s.isWild) el.classList.add('is-wild');
    if (s.isScatter) el.classList.add('is-scatter');
    if (s.img) {
      var img = document.createElement('img');
      img.src = s.img;
      img.alt = '';
      el.appendChild(img);
    } else {
      var span = document.createElement('span');
      span.textContent = s.char;
      el.appendChild(span);
    }
    return el;
  };

  /** Pinta uma grade parada, sem animação. */
  ReelView.prototype.showGrid = function (grid) {
    for (var col = 0; col < this.c.cols; col++) {
      var strip = this.reels[col].strip;
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0px)';
      strip.innerHTML = '';
      for (var row = 0; row < this.c.rows; row++) strip.appendChild(this.cell(grid[col][row]));
    }
  };

  /** Devolve o elemento da célula visível em (col,row) depois de uma parada. */
  ReelView.prototype.cellAt = function (col, row) {
    var strip = this.reels[col].strip;
    var offset = strip.children.length - this.c.rows;   // 0 parado, PAD girando
    return strip.children[offset + row];
  };

  ReelView.prototype.clearWins = function () {
    var marked = this.root.querySelectorAll('.gm-cell.win, .gm-cell.dim');
    for (var i = 0; i < marked.length; i++) marked[i].classList.remove('win', 'dim');
    this.root.classList.remove('has-win');
  };

  /**
   * Gira até a grade informada.
   * @param {Array} grid resultado já sorteado pela matemática
   * @param {object} opts {turbo:boolean, anticipate:boolean, onStop:fn(col)}
   * @returns {Promise}
   */
  ReelView.prototype.spinTo = function (grid, opts) {
    opts = opts || {};
    var self = this;
    var base = opts.turbo ? 420 : 900;
    var step = opts.turbo ? 110 : 260;

    this.clearWins();
    this.measure();

    return new Promise(function (resolve) {
      var pending = self.c.cols;

      for (var col = 0; col < self.c.cols; col++) {
        (function (col) {
          var reel = self.reels[col];
          var strip = reel.strip;

          strip.innerHTML = '';
          for (var k = 0; k < PAD; k++) strip.appendChild(self.cell(drawSymbol(self.c, Math.random)));
          for (var row = 0; row < self.c.rows; row++) strip.appendChild(self.cell(grid[col][row]));

          var distance = PAD * self.cellH;
          var dur = base + col * step;

          // suspense: se os dois primeiros rolos trouxeram scatter, o último demora
          if (opts.anticipate && col === self.c.cols - 1) {
            dur += opts.turbo ? 500 : 1100;
            reel.el.classList.add('anticipate');
          }

          strip.style.transition = 'none';
          strip.style.transform = 'translateY(0px)';
          void strip.offsetWidth;                         // força reflow
          reel.el.classList.add('spinning');
          strip.style.transition = 'transform ' + dur + 'ms cubic-bezier(.19,.72,.25,1.06)';
          strip.style.transform = 'translateY(' + (-distance) + 'px)';

          setTimeout(function () {
            reel.el.classList.remove('spinning', 'anticipate');
            reel.el.classList.add('landed');
            setTimeout(function () { reel.el.classList.remove('landed'); }, 220);
            // descarta as células de enrolação e volta o strip para a origem
            while (strip.children.length > self.c.rows) strip.removeChild(strip.firstChild);
            strip.style.transition = 'none';
            strip.style.transform = 'translateY(0px)';
            if (opts.onStop) opts.onStop(col);
            if (--pending === 0) resolve();
          }, dur);
        }(col));
      }
    });
  };

  return {
    math: SlotMath,
    ReelView: (typeof document !== 'undefined') ? ReelView : null,
    PRESETS: PRESETS,
    LINES: LINES_3x3
  };
}));
