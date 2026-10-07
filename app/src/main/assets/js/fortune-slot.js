/*!
 * FortuneGo — motor de caça-níquel estilo "Fortune" (3-4-3, 10 linhas)
 *
 * Duas camadas independentes:
 *   SlotMath  → matemática pura, sem DOM. Roda igual no navegador e no Node,
 *               então tools/test-slot.js testa o MESMO código que o app usa.
 *   ReelView  → rolos animados quadro a quadro (requestAnimationFrame), com
 *               aceleração, giro contínuo reciclando células e frenagem que
 *               encaixa exatamente no resultado sorteado.
 *
 * Regras:
 *   • colunas de 3, 4 e 3 símbolos (a do meio é mais alta, como no original);
 *   • 10 linhas de pagamento, prêmio por 3 iguais, pago em múltiplos da
 *     aposta por linha;
 *   • o BICHO do jogo é o curinga — substitui qualquer símbolo, menos o
 *     scatter;
 *   • 3+ scatters em qualquer posição → giros grátis com multiplicador;
 *   • giros grátis não re-disparam, o que mantém o RTP calculável exato.
 *
 * Calibração: o catálogo declara só o RTP alvo e a escada relativa de
 * prêmios. prepare() resolve o fator de escala, arredonda para valores de
 * vitrine e refina em passos de 0,1× até o RTP teórico bater no alvo.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FortuneSlot = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Presets de volatilidade — 5 símbolos pagantes + curinga + scatter.
   * weights = peso de cada símbolo no sorteio
   * ratios  = escada RELATIVA de prêmios (a calibração escala tudo)
   * ------------------------------------------------------------------ */
  var PRESETS = {
    baixa: {
      weights: [6, 9, 12, 15, 18],
      ratios: [60, 30, 18, 10, 7],
      wild: { weight: 4, ratio: 90 },
      scatter: { weight: 5, free: 8, mult: 2 }
    },
    media: {
      weights: [5, 8, 11, 14, 18],
      ratios: [110, 45, 24, 13, 8],
      wild: { weight: 3, ratio: 170 },
      scatter: { weight: 4, free: 8, mult: 2 }
    },
    alta: {
      weights: [4, 7, 10, 14, 18],
      ratios: [220, 85, 38, 18, 10],
      wild: { weight: 2, ratio: 320 },
      scatter: { weight: 3, free: 10, mult: 3 }
    }
  };

  var ROWS_PER_COL = [3, 4, 3];     // a coluna do meio é mais alta

  /* As 10 linhas. Cada item diz a LINHA usada em cada coluna. */
  var LINES = [
    [0, 0, 0],
    [1, 1, 1],
    [2, 2, 2],
    [0, 1, 2],
    [2, 1, 0],
    [1, 0, 1],
    [1, 2, 1],
    [0, 2, 0],
    [2, 3, 2],
    [1, 3, 1]
  ];

  var NSYM = 5;                      // símbolos pagantes por jogo

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

  function scatterChance(p, cells, need) {
    var acc = 0;
    for (var i = 0; i < need; i++) {
      acc += combinations(cells, i) * Math.pow(p, i) * Math.pow(1 - p, cells - i);
    }
    return Math.max(0, 1 - acc);
  }

  var payOf = function (s) { return s.pay; };

  /* ------------------------------ Preparação ------------------------------ */

  /**
   * @param {object} game  entrada do catálogo
   * @param {object} [opts] {bonus:true} → aposta bônus: o scatter fica 2,5×
   *        mais comum. O RTP alvo é o MESMO, então a calibração baixa os
   *        prêmios de linha na mesma medida — você troca prêmio por giro
   *        grátis, não compra vantagem.
   */
  function prepare(game, opts) {
    opts = opts || {};
    var preset = PRESETS[game.vol] || PRESETS.media;
    var rowsPer = ROWS_PER_COL;
    var cols = rowsPer.length;
    var cells = rowsPer.reduce(function (a, b) { return a + b; }, 0);

    var art = game.sym || null;
    var all = [];
    for (var i = 0; i < NSYM; i++) {
      all.push({
        id: 's' + i,
        char: art ? art[i].char : (game.chars ? game.chars[i] : '●'),
        img: art ? art[i].img : null,
        weight: preset.weights[i],
        ratio: preset.ratios[i],
        pay: 0
      });
    }
    var wildIndex = all.length;
    all.push({
      id: 'wild',
      char: game.wildSym ? game.wildSym.char : '🌟',
      img: game.wildSym ? game.wildSym.img : null,
      weight: preset.wild.weight, ratio: preset.wild.ratio, pay: 0, isWild: true
    });
    var scatterIndex = all.length;
    all.push({
      id: 'scatter',
      char: game.scatterSym ? game.scatterSym.char : '🧧',
      img: game.scatterSym ? game.scatterSym.img : null,
      weight: preset.scatter.weight * (opts.bonus ? 2.5 : 1),
      ratio: 0, pay: 0, isScatter: true
    });

    var totalWeight = 0;
    all.forEach(function (s) { totalWeight += s.weight; });

    var c = {
      game: game,
      cols: cols,
      rowsPer: rowsPer,
      rows: Math.max.apply(null, rowsPer),
      cells: cells,
      all: all,
      wildIndex: wildIndex,
      scatterIndex: scatterIndex,
      lines: LINES,
      totalWeight: totalWeight,
      freeSpins: preset.scatter.free,
      freeMult: preset.scatter.mult,
      scatterNeed: 3,
      rtpTarget: game.rtp,
      bonusBet: !!opts.bonus
    };

    c.prob = all.map(function (s) { return s.weight / totalWeight; });
    c.scatterProb = scatterChance(c.prob[scatterIndex], c.cells, c.scatterNeed);
    c.freeFactor = 1 + c.scatterProb * c.freeSpins * c.freeMult;

    var rawLine = lineExpectation(c, function (s) { return s.ratio; });
    var k = (game.rtp / 100) / (rawLine * c.freeFactor);
    all.forEach(function (s) { s.pay = s.isScatter ? 0 : niceRound(s.ratio * k); });
    refine(c);

    c.baseRTP = lineExpectation(c, payOf);
    c.rtpExact = c.baseRTP * c.freeFactor;
    c.calibration = k;
    return c;
  }

  function ladderOk(c, i, np) {
    if (i === c.wildIndex) return np >= c.all[0].pay;
    if (i > 0 && np > c.all[i - 1].pay) return false;
    if (i < NSYM - 1 && np < c.all[i + 1].pay) return false;
    if (i === 0 && np > c.all[c.wildIndex].pay) return false;
    return true;
  }

  /** Recupera em passos de 0,1× o RTP perdido no arredondamento dos prêmios. */
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
   * Valor esperado de UMA linha, em múltiplos da aposta por linha. Como as
   * posições são sorteadas de forma independente, o RTP base do jogo é
   * exatamente este número (as N linhas dividem a aposta total em N).
   */
  function lineExpectation(c, pay) {
    var pw = c.prob[c.wildIndex];
    var wild3 = pw * pw * pw;
    var total = 0;
    for (var i = 0; i < c.all.length; i++) {
      var s = c.all[i];
      if (s.isWild || s.isScatter) continue;
      var p = c.prob[i] + pw;
      total += (p * p * p - wild3) * pay(s);
    }
    total += wild3 * pay(c.all[c.wildIndex]);
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
      for (var row = 0; row < c.rowsPer[col]; row++) grid[col][row] = drawSymbol(c, rng);
    }
    return grid;
  }

  function linePay(c, ids) {
    if (ids.indexOf(c.scatterIndex) !== -1) return null;
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
    var wins = [], payTotal = 0, scatters = 0, scatterCells = [];

    for (var col = 0; col < c.cols; col++) {
      for (var row = 0; row < c.rowsPer[col]; row++) {
        if (grid[col][row] === c.scatterIndex) { scatters++; scatterCells.push([col, row]); }
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
        wins.push({ line: l, symbol: hit.symbol, pay: hit.pay, cells: cells });
        payTotal += hit.pay;
      }
    }

    return {
      grid: grid,
      wins: wins,
      payTotal: payTotal,
      winUnits: payTotal / c.lines.length,
      scatters: scatters,
      scatterCells: scatterCells,
      free: scatters >= c.scatterNeed ? c.freeSpins : 0
    };
  }

  function spin(c, rng) {
    return evaluate(c, drawGrid(c, rng || Math.random));
  }

  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

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
    ROWS_PER_COL: ROWS_PER_COL,
    LINES: LINES,
    prepare: prepare,
    drawGrid: drawGrid,
    evaluate: evaluate,
    spin: spin,
    simulate: simulate,
    seeded: seeded,
    lineExpectation: lineExpectation
  };

  /* ====================================================================== *
   *                   ROLOS ANIMADOS (quadro a quadro)
   * ====================================================================== */

  var BUFFER = 2;      // células extras fora da janela (1 acima, 1 abaixo)
  var SPEED = 0.026;   // alturas de célula por milissegundo (~26 células/s)
  var SPEED_TURBO = 0.042;

  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  function ReelView(root, c) {
    this.root = root;
    this.c = c;
    this.reels = [];
    this.cellH = 0;
    this.raf = 0;
    this.build();
  }

  ReelView.prototype.build = function () {
    var self = this;
    this.root.innerHTML = '';
    this.reels = [];
    for (var col = 0; col < this.c.cols; col++) {
      var reel = document.createElement('div');
      reel.className = 'gm-reel';
      reel.setAttribute('data-rows', this.c.rowsPer[col]);
      var strip = document.createElement('div');
      strip.className = 'gm-strip';
      reel.appendChild(strip);
      this.root.appendChild(reel);
      this.reels.push({
        el: reel, strip: strip, rows: this.c.rowsPer[col],
        pos: 0, speed: 0, phase: 'idle', queue: null, target: 0, travelled: 0, t0: 0, dur: 0
      });
    }
    this.measure();
    this.showGrid(drawGrid(this.c, Math.random));

    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(function () { self.measure(); });
      this._ro.observe(this.root);
    } else if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', function () { self.measure(); });
    }
  };

  ReelView.prototype.measure = function () {
    var h = this.reels[0] ? this.reels[0].el.clientHeight : 0;
    if (!h) return;
    this.cellH = h / this.reels[0].rows;
    this.root.style.setProperty('--cell', this.cellH + 'px');
    for (var i = 0; i < this.reels.length; i++) this.place(this.reels[i]);
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

  ReelView.prototype.place = function (r) {
    r.strip.style.transform = 'translateY(' + (r.pos - this.cellH) + 'px)';
  };

  /** Pinta uma grade parada (1 célula de folga em cima e embaixo). */
  ReelView.prototype.showGrid = function (grid) {
    for (var col = 0; col < this.c.cols; col++) {
      var r = this.reels[col];
      r.strip.innerHTML = '';
      r.strip.appendChild(this.cell(drawSymbol(this.c, Math.random)));
      for (var row = 0; row < r.rows; row++) r.strip.appendChild(this.cell(grid[col][row]));
      r.strip.appendChild(this.cell(drawSymbol(this.c, Math.random)));
      r.pos = 0;
      this.place(r);
    }
  };

  /** Célula visível em (col,row): o índice 0 é a folga de cima. */
  ReelView.prototype.cellAt = function (col, row) {
    return this.reels[col].strip.children[row + 1] || null;
  };

  ReelView.prototype.clearWins = function () {
    var marked = this.root.querySelectorAll('.gm-cell.win, .gm-cell.dim, .gm-cell.scatter-hit');
    for (var i = 0; i < marked.length; i++) {
      marked[i].classList.remove('win', 'dim', 'scatter-hit');
    }
    this.root.classList.remove('has-win');
  };

  /** Recicla: entra uma célula no topo, sai a de baixo. */
  ReelView.prototype.recycle = function (r, symIndex) {
    r.strip.insertBefore(this.cell(symIndex), r.strip.firstChild);
    while (r.strip.children.length > r.rows + BUFFER) {
      r.strip.removeChild(r.strip.lastChild);
    }
  };

  /**
   * Gira até a grade informada.
   * @param {Array}  grid  resultado já sorteado pela matemática
   * @param {object} opts  {turbo, anticipate, onStop(col)}
   * @returns {Promise}
   */
  ReelView.prototype.spinTo = function (grid, opts) {
    opts = opts || {};
    var self = this;
    var turbo = !!opts.turbo;

    this.clearWins();
    this.measure();
    if (!this.cellH) this.cellH = 80;      // layout ainda não mediu: valor de reserva

    var runMs = turbo ? 240 : 560;          // giro livre antes do 1º rolo frear
    var stagger = turbo ? 120 : 280;        // atraso entre rolos
    var fillers = turbo ? 1 : 3;            // células de folga durante a frenagem
    var vmax = turbo ? SPEED_TURBO : SPEED;

    return new Promise(function (resolve) {
      var pending = self.c.cols;

      self.reels.forEach(function (r, col) {
        r.phase = 'accel';
        r.speed = 0;
        r.accelT = 0;
        r.queue = null;
        r.el.classList.add('spinning');

        var extra = (col === self.c.cols - 1 && opts.anticipate) ? (turbo ? 600 : 1400) : 0;
        if (extra) r.el.classList.add('anticipate');

        r.vmax = vmax;
        r.stopAt = now() + runMs + col * stagger + extra;
        r.onDone = function () {
          r.el.classList.remove('spinning', 'anticipate');
          r.el.classList.add('landed');
          setTimeout(function () { r.el.classList.remove('landed'); }, 240);
          if (opts.onStop) opts.onStop(col);
          if (--pending === 0) resolve();
        };
        // fila de entrada: folgas para a frenagem + o resultado, de baixo para cima
        var q = [];
        for (var k = 0; k < fillers; k++) q.push(drawSymbol(self.c, Math.random));
        for (var row = r.rows - 1; row >= 0; row--) q.push(grid[col][row]);
        q.push(drawSymbol(self.c, Math.random));
        r.pendingQueue = q;
      });

      self.start();
    });
  };

  ReelView.prototype.start = function () {
    if (this.raf) return;
    var self = this;
    var last = now();

    var frame = function () {
      var t = now();
      var dt = Math.min(48, t - last);      // trava o passo se a aba congelar
      last = t;
      var active = 0;

      for (var i = 0; i < self.reels.length; i++) {
        var r = self.reels[i];
        if (r.phase === 'idle') continue;
        active++;

        if (r.phase === 'accel') {
          r.accelT += dt;
          var a = Math.min(1, r.accelT / 200);
          r.speed = r.vmax * (a * a * (3 - 2 * a));   // arranque suave
          if (a >= 1) r.phase = 'run';
        }

        if ((r.phase === 'accel' || r.phase === 'run') && t >= r.stopAt) {
          // entra na frenagem: distância exata até encaixar o resultado
          r.queue = r.pendingQueue.slice();
          r.target = r.queue.length * self.cellH - r.pos;
          r.travelled = 0;
          r.t0 = t;
          // duração tal que a velocidade inicial da frenagem seja EXATAMENTE a
          // velocidade atual (derivada do easeOutCubic em t=0 é 3*d/T)
          var vpx = Math.max(1e-4, r.speed * self.cellH);
          r.decel = Math.min(1600, Math.max(240, 3 * r.target / vpx));
          r.phase = 'stop';
        }

        if (r.phase === 'stop') {
          var p = Math.min(1, (t - r.t0) / r.decel);
          var eased = 1 - Math.pow(1 - p, 3);            // desacelera suave
          var want = r.target * eased;
          var delta = want - r.travelled;
          r.travelled = want;
          r.pos += delta;
          while (self.cellH > 0 && r.pos >= self.cellH && r.queue.length) {
            r.pos -= self.cellH;
            self.recycle(r, r.queue.shift());
          }
          if (p >= 1) {
            r.pos = 0;
            while (r.queue.length) self.recycle(r, r.queue.shift());
            r.phase = 'idle';
            r.speed = 0;
            self.place(r);
            r.onDone();
            continue;
          }
        } else {
          r.pos += r.speed * dt * self.cellH;
          while (self.cellH > 0 && r.pos >= self.cellH) {
            r.pos -= self.cellH;
            self.recycle(r, drawSymbol(self.c, Math.random));
          }
        }

        if (r.phase === 'stop') r.speed = (r.target * 3 * Math.pow(1 - Math.min(1, (t - r.t0) / r.decel), 2) / r.decel) / self.cellH;
        r.el.classList.toggle('fast', r.speed > r.vmax * 0.5);
        self.place(r);
      }

      if (active) self.raf = requestAnimationFrame(frame);
      else self.raf = 0;
    };

    this.raf = requestAnimationFrame(frame);
  };

  return {
    math: SlotMath,
    ReelView: (typeof document !== 'undefined') ? ReelView : null,
    PRESETS: PRESETS,
    LINES: LINES
  };
}));
