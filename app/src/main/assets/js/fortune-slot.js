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
  /* Tabelas de valor dos símbolos de dinheiro: [valor em apostas, peso].
     Quanto mais volátil o jogo, mais longa a cauda de valores altos. */
  var VALUES_BAIXA = [[0.2, 30], [0.4, 24], [0.6, 18], [1, 12], [1.5, 8], [2, 5], [3, 2], [5, 1]];
  var VALUES_MEDIA = [[0.2, 28], [0.4, 22], [0.8, 16], [1.2, 12], [2, 8], [3, 5], [5, 3], [10, 1]];
  var VALUES_ALTA  = [[0.2, 26], [0.5, 21], [1, 16], [2, 12], [3, 8], [5, 5], [10, 3], [25, 1]];

  var PRESETS = {
    baixa: {
      weights: [6, 9, 12, 15, 18],
      ratios: [60, 30, 18, 10, 7],
      wild: { weight: 4, ratio: 90 },
      scatter: { weight: 5, free: 8, mult: 2 },
      money: { weight: 13, need: 5, values: VALUES_BAIXA }
    },
    media: {
      weights: [5, 8, 11, 14, 18],
      ratios: [110, 45, 24, 13, 8],
      wild: { weight: 3, ratio: 170 },
      scatter: { weight: 4, free: 8, mult: 2 },
      money: { weight: 13, need: 5, values: VALUES_MEDIA }
    },
    alta: {
      weights: [4, 7, 10, 14, 18],
      ratios: [220, 85, 38, 18, 10],
      wild: { weight: 2, ratio: 320 },
      scatter: { weight: 3, free: 10, mult: 3 },
      money: { weight: 13, need: 5, values: VALUES_ALTA }
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
    /* Símbolo de dinheiro: cai com um VALOR impresso. Não paga em linha;
       junte `need` deles numa rodada e leva a soma de todos. Na aposta
       bônus ele também fica mais frequente. */
    var moneyIndex = all.length;
    all.push({
      id: 'money',
      char: game.moneySym ? game.moneySym.char : '💰',
      img: game.moneySym ? game.moneySym.img : null,
      weight: preset.money.weight * (opts.bonus ? 1.35 : 1),
      ratio: 0, pay: 0, isMoney: true
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
      moneyIndex: moneyIndex,
      moneyNeed: preset.money.need,
      moneyValues: preset.money.values,
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

    /* O recurso de dinheiro tem valor esperado FIXO (não é calibrado). É a
       escada de linha que se ajusta para o TOTAL bater no RTP alvo. */
    c.moneyEV = weightedMean(preset.money.values);
    c.moneyHitProb = atLeast(c.prob[moneyIndex], c.cells, preset.money.need);
    c.moneyRTP = moneyExpectation(c);

    c.lineTarget = (game.rtp / 100) / c.freeFactor - c.moneyRTP;
    if (c.lineTarget <= 0.01) c.lineTarget = 0.01;   // rede de segurança

    var rawLine = lineExpectation(c, function (s) { return s.ratio; });
    var k = c.lineTarget / rawLine;
    all.forEach(function (s) {
      s.pay = (s.isScatter || s.isMoney) ? 0 : niceRound(s.ratio * k);
    });
    refine(c);

    c.baseRTP = lineExpectation(c, payOf);
    c.rtpExact = (c.baseRTP + c.moneyRTP) * c.freeFactor;
    c.calibration = k;
    return c;
  }

  /* ------------------------ Recurso de dinheiro ------------------------ */

  function weightedMean(pairs) {
    var sv = 0, sw = 0;
    for (var i = 0; i < pairs.length; i++) { sv += pairs[i][0] * pairs[i][1]; sw += pairs[i][1]; }
    return sv / sw;
  }

  /** P(sair pelo menos `need` em `cells` posições independentes). */
  function atLeast(p, cells, need) {
    var acc = 0;
    for (var i = 0; i < need; i++) {
      acc += combinations(cells, i) * Math.pow(p, i) * Math.pow(1 - p, cells - i);
    }
    return Math.max(0, 1 - acc);
  }

  /**
   * Valor esperado do recurso, em múltiplos da APOSTA TOTAL. Paga a soma dos
   * valores quando saem `need` ou mais símbolos, logo:
   *   E = E[valor] · Σ_{k≥need} k · P(k símbolos)
   */
  function moneyExpectation(c) {
    var p = c.prob[c.moneyIndex], n = c.cells, need = c.moneyNeed;
    var soma = 0;
    for (var k = need; k <= n; k++) {
      soma += k * combinations(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }
    return c.moneyEV * soma;
  }

  /** Sorteia o valor impresso num símbolo de dinheiro. */
  function drawValue(c, rng) {
    var tab = c.moneyValues, total = 0, i;
    for (i = 0; i < tab.length; i++) total += tab[i][1];
    var r = (rng || Math.random)() * total;
    for (i = 0; i < tab.length; i++) {
      r -= tab[i][1];
      if (r < 0) return tab[i][0];
    }
    return tab[tab.length - 1][0];
  }

  /** Carimba um valor em cada célula de dinheiro da grade. */
  function drawMoney(c, grid, rng) {
    var vals = {};
    for (var col = 0; col < c.cols; col++) {
      for (var row = 0; row < c.rowsPer[col]; row++) {
        if (grid[col][row] === c.moneyIndex) vals[col + ':' + row] = drawValue(c, rng);
      }
    }
    return vals;
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
    var targetBase = c.lineTarget;
    var movable = [];
    for (var i = 0; i < c.all.length; i++) {
      if (!c.all[i].isScatter && !c.all[i].isMoney && c.all[i].pay < 20) movable.push(i);
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
      if (s.isWild || s.isScatter || s.isMoney) continue;
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
    if (ids.indexOf(c.moneyIndex) !== -1) return null;
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

  /**
   * @param {object} c     configuração vinda de prepare()
   * @param {Array}  grid  índices de símbolo por coluna/linha
   * @param {object} [money] valores carimbados nas células de dinheiro,
   *        no formato {"col:row": valor}. Sem ele, o recurso não paga.
   */
  function evaluate(c, grid, money) {
    money = money || {};
    var wins = [], payTotal = 0, scatters = 0, scatterCells = [];
    var moneyCells = [], moneySum = 0;

    for (var col = 0; col < c.cols; col++) {
      for (var row = 0; row < c.rowsPer[col]; row++) {
        if (grid[col][row] === c.scatterIndex) { scatters++; scatterCells.push([col, row]); }
        if (grid[col][row] === c.moneyIndex) {
          var v = money[col + ':' + row] || 0;
          moneyCells.push({ cell: [col, row], value: v });
          moneySum += v;
        }
      }
    }
    var moneyHit = moneyCells.length >= c.moneyNeed;
    var moneyWin = moneyHit ? moneySum : 0;

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
      money: money,
      wins: wins,
      payTotal: payTotal,
      /* ganho total em múltiplos da APOSTA: as linhas pagam por linha
         (aposta ÷ nº de linhas) e o dinheiro paga sobre a aposta cheia */
      winUnits: payTotal / c.lines.length + moneyWin,
      lineUnits: payTotal / c.lines.length,
      scatters: scatters,
      scatterCells: scatterCells,
      moneyCells: moneyCells,
      moneyCount: moneyCells.length,
      moneySum: moneySum,
      moneyHit: moneyHit,
      moneyWin: moneyWin,
      free: scatters >= c.scatterNeed ? c.freeSpins : 0
    };
  }

  function spin(c, rng) {
    rng = rng || Math.random;
    var grid = drawGrid(c, rng);
    return evaluate(c, grid, drawMoney(c, grid, rng));
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
    var sum = 0, sumsq = 0, hits = 0, frees = 0, monies = 0, moneySum = 0;
    for (var i = 0; i < rounds; i++) {
      var r = spin(c, rng);
      var won = r.winUnits;
      if (r.moneyHit) { monies++; moneySum += r.moneyWin; }
      if (r.wins.length || r.moneyHit) hits++;
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
      freeRate: frees / rounds,
      moneyRate: monies / rounds,
      moneyRTP: moneySum / rounds
    };
  }

  var SlotMath = {
    PRESETS: PRESETS,
    ROWS_PER_COL: ROWS_PER_COL,
    LINES: LINES,
    prepare: prepare,
    drawGrid: drawGrid,
    drawMoney: drawMoney,
    drawValue: drawValue,
    moneyExpectation: moneyExpectation,
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
  /* Velocidade em alturas de célula por milissegundo.
       26/s (o valor original) → borrão, 1,5 quadro por símbolo
        9/s                    → dava para ver, mas ainda corrido
        6,2/s                  → 9,7 quadros, ainda pedido mais devagar
        5,0/s                  → 12 quadros por símbolo: a figura chega a
                                 ficar parada aos olhos antes de sair
     A frenagem também fica mais longa de brinde, porque a duração dela é
     calculada a partir da velocidade (T = 3·d/v): quanto mais devagar o
     rolo corre, mais suave ele encosta. */
  var SPEED = 0.0050;
  var SPEED_TURBO = 0.0088;
  var BRAKE = 3;       // a frenagem cobre os 3 últimos símbolos, igual em todo rolo

  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  function ReelView(root, c) {
    this.root = root;
    this.c = c;
    this.reels = [];
    this.cellH = 0;
    this.cellTravada = false;   // a sala já ditou o tamanho?
    this.cellPend = 0;          // tamanho à espera do fim do giro
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

  /**
   * Define o tamanho da célula a partir de fora (a sala calcula o
   * enquadramento e manda). É a FONTE ÚNICA: o mesmo número vai para o
   * `--cell` do CSS e para o `cellH` usado no `translateY`.
   *
   * Enquanto eram duas contas separadas — o CSS com o seu `--cell` e o JS
   * medindo o DOM —, bastava uma discordar da outra (resize, troca de
   * orientação, medida tirada antes do layout) para a tira deslizar meio
   * pixel e abrir uma fresta de fundo entre os símbolos.
   */
  ReelView.prototype.setCell = function (px, daSala) {
    if (!(px > 0)) return;

    /* SEMPRE inteiro. Um `--cell` quebrado (63,3333px) faz cada célula
       arredondar para um pixel de ecrã diferente e abre uma fresta de fundo
       entre um símbolo e o seguinte. Com inteiro, ficam colados. */
    px = Math.round(px);

    /* A partir do momento em que a sala manda um tamanho, ele é lei:
       nenhuma medição do DOM volta a mexer nisto. */
    if (daSala) this.cellTravada = true;
    if (px === this.cellH) { this.recount(); return; }

    /* NUNCA trocar a altura da célula no meio de um giro.
       O `r.pos` vai sendo acumulado contra o cellH antigo; se o número muda
       a meio, o `translateY(pos - cellH)` salta de golpe e atira a tira para
       fora da janela — é isto que deixava o rolo completamente vazio por
       instantes. A mudança fica em espera e entra quando os rolos param. */
    if (this.girando()) { this.cellPend = px; return; }
    this.applyCell(px);
  };

  /** Grava o tamanho de facto (CSS + cellH) e recoloca as tiras. */
  ReelView.prototype.applyCell = function (px) {
    this.cellPend = 0;
    this.cellH = px;
    this.root.style.setProperty('--cell', px + 'px');
    this.recount();
    for (var i = 0; i < this.reels.length; i++) {
      this.fill(this.reels[i]);
      this.place(this.reels[i]);
    }
  };

  /** Rolos todos parados? Então entra o tamanho que ficou à espera. */
  ReelView.prototype.flushCell = function () {
    if (!this.cellPend) return;
    for (var i = 0; i < this.reels.length; i++) {
      if (this.reels[i].phase && this.reels[i].phase !== 'idle') return;
    }
    this.applyCell(this.cellPend);
  };

  /** Há algum rolo em movimento? */
  ReelView.prototype.girando = function () {
    if (this.raf) return true;
    for (var i = 0; i < this.reels.length; i++) {
      if (this.reels[i].phase && this.reels[i].phase !== 'idle') return true;
    }
    return false;
  };

  /**
   * Quantas células cada tira precisa de ter para a janela nunca ficar vazia.
   *
   * A conta é GEOMÉTRICA, de propósito — não se lê o DOM aqui. A janela do
   * rolo é, por construção, `rows × cellH`: é o que o CSS declara e é o
   * mesmo número que a sala calculou. Foi justamente confiar numa medida
   * tirada do DOM que fez o `cellH` descolar do `--cell` e abrir buracos.
   *
   * Com a tira em `rows + 2` células e `pos` sempre dentro de [0, cellH):
   *   topo  = pos − cellH          (no mínimo −cellH)
   *   fundo = pos + (rows+1)·cellH (no mínimo (rows+1)·cellH)
   * ou seja, o fundo fica SEMPRE abaixo da janela (rows·cellH). Nunca sobra
   * vão: há sempre um símbolo colado ao seguinte, de ponta a ponta.
   */
  ReelView.prototype.recount = function () {
    for (var i = 0; i < this.reels.length; i++) {
      this.reels[i].need = this.reels[i].rows + BUFFER;
    }
  };

  /** Completa a tira por baixo até cobrir a janela inteira. */
  ReelView.prototype.fill = function (r) {
    var alvo = r.need || (r.rows + BUFFER);
    /* por baixo, nunca por cima: o índice da folga de topo tem de continuar
       a ser 1, senão o `cellAt` passa a apontar para a célula errada */
    while (r.strip.children.length < alvo) {
      r.strip.appendChild(this.cell(drawSymbol(this.c, Math.random)));
    }
  };

  /** Mede o DOM — só enquanto ninguém tiver dito o tamanho. */
  ReelView.prototype.measure = function () {
    if (this.cellTravada) {
      /* a sala já mandou: nada de remedir, só reposicionar */
      this.recount();
      for (var i = 0; i < this.reels.length; i++) this.place(this.reels[i]);
      return;
    }
    var h = this.reels[0] ? this.reels[0].el.clientHeight : 0;
    if (h) return this.setCell(h / this.reels[0].rows);

    /* Sem altura ainda: em vez de desistir (e deixar o cellH em zero, que
       é o que fazia a tira ficar fora de lugar no primeiro desenho),
       aproveita o valor que o CSS já tem. */
    if (this.cellH) return;
    var lido = 0;
    if (typeof getComputedStyle === 'function') {
      lido = parseFloat(getComputedStyle(this.root).getPropertyValue('--cell'));
    }
    this.setCell(isFinite(lido) && lido > 0 ? lido : 80);
  };

  /**
   * Monta uma célula.
   *
   * @param {number|{s:number,v:number}} item  índice do símbolo, ou o par
   *        símbolo + valor quando é o símbolo de dinheiro. Dinheiro sem valor
   *        definido (os que passam voando durante o giro) sorteia o seu.
   *
   * O valor sai impresso POR CIMA da arte, como nos jogos originais — por
   * isso a moeda foi desenhada com o miolo liso. Quem formata é a sala
   * (`view.moneyFormat`), para a engine não precisar saber de moeda nem de
   * tamanho de aposta.
   */
  ReelView.prototype.cell = function (item) {
    var obj = item && typeof item === 'object';
    var symIndex = obj ? item.s : item;
    var value = obj ? item.v : null;

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

    if (s.isMoney) {
      el.classList.add('is-money');
      if (value == null) value = drawValue(this.c, Math.random);
      el.setAttribute('data-value', value);
      var tag = document.createElement('b');
      tag.className = 'gm-val';
      tag.textContent = this.moneyFormat(value);
      el.appendChild(tag);
    }
    return el;
  };

  /** Trocável pela sala: recebe o multiplicador, devolve o texto da célula. */
  ReelView.prototype.moneyFormat = function (v) {
    return v.toFixed(2).replace('.', ',');
  };

  ReelView.prototype.place = function (r) {
    r.strip.style.transform = 'translateY(' + (r.pos - this.cellH) + 'px)';
  };

  /** Pinta uma grade parada (1 célula de folga em cima e embaixo). */
  ReelView.prototype.showGrid = function (grid, money) {
    money = money || {};
    for (var col = 0; col < this.c.cols; col++) {
      var r = this.reels[col];
      r.strip.innerHTML = '';
      r.strip.appendChild(this.cell(drawSymbol(this.c, Math.random)));
      for (var row = 0; row < r.rows; row++) {
        r.strip.appendChild(this.cell({ s: grid[col][row], v: money[col + ':' + row] }));
      }
      r.strip.appendChild(this.cell(drawSymbol(this.c, Math.random)));
      this.fill(r);
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
    while (r.strip.children.length > (r.need || (r.rows + BUFFER))) {
      r.strip.removeChild(r.strip.lastChild);
    }
  };

  /**
   * Gira até a grade informada.
   *
   * O ciclo de cada rolo:
   *   acelera (200 ms) → gira solto → engata a fila do resultado →
   *   freia pelos 3 últimos símbolos → encaixa exato.
   *
   * Duas decisões importantes para o giro sair liso:
   *
   * 1. A frenagem cobre SEMPRE a mesma distância (BRAKE células) em todos os
   *    rolos, e só começa quando a tira acabou de cruzar uma borda de célula.
   *    Assim a duração da frenagem é idêntica nos três e a ordem de parada
   *    (esquerda → direita) nunca inverte — mesmo com o rolo do meio tendo
   *    uma posição a mais.
   *
   * 2. A duração é calculada para que a velocidade NO INÍCIO da frenagem seja
   *    exatamente a velocidade do giro solto (a derivada do easeOutCubic em
   *    t=0 vale 3·d/T, daí T = 3·d/v). Sem isso há um salto visível no momento
   *    em que o rolo começa a parar.
   *
   * @param {Array}  grid  resultado já sorteado pela matemática
   * @param {object} opts  {turbo, anticipate, money, onStop(col)}
   * @returns {Promise}
   */
  ReelView.prototype.spinTo = function (grid, opts) {
    opts = opts || {};
    var self = this;
    var turbo = !!opts.turbo;

    this.clearWins();
    /* Só mede se ninguém nunca disse o tamanho. Remedir aqui a cada giro era
       o que fazia o cellH afastar-se aos poucos do `--cell` do CSS. */
    if (!this.cellH) this.measure();
    if (!this.cellH) this.setCell(80);     // layout ainda não mediu: valor de reserva
    this.recount();

    var runMs = turbo ? 230 : 320;         // giro solto antes de engatar a fila
    var vmax = turbo ? SPEED_TURBO : SPEED;

    /* Atraso entre rolos DERIVADO da velocidade, não um número solto.
       A travagem só arranca depois de cruzar uma borda de célula, por isso
       se o atraso for menor do que o tempo de uma célula dois rolos caem na
       mesma borda e param juntos — foi o que aconteceu ao baixar a
       velocidade com o atraso fixo em 170 ms contra 200 ms por célula.
       1,35 célula de intervalo mantém a parada escalonada e visível em
       qualquer velocidade que se venha a escolher. */
    var stagger = Math.round((1 / vmax) * 1.35);
    var maxRows = Math.max.apply(null, this.c.rowsPer);

    return new Promise(function (resolve) {
      var pending = self.c.cols;
      var t0 = now();

      self.reels.forEach(function (r, col) {
        r.phase = 'accel';
        r.speed = 0;
        r.accelT = 0;
        r.queue = null;
        r.wantStop = false;
        r.vmax = vmax;
        r.el.classList.add('spinning');

        var extra = (col === self.c.cols - 1 && opts.anticipate) ? (turbo ? 600 : 1400) : 0;
        if (extra) r.el.classList.add('anticipate');
        r.stopAt = t0 + runMs + col * stagger + extra;

        /* Fila de entrada, de baixo para cima. Os rolos mais baixos ganham
           células de folga a mais, para que TODOS tenham a mesma fila — é o
           que mantém a frenagem sincronizada. */
        var money = opts.money || {};
        var q = [];
        for (var k = 0; k < maxRows - r.rows; k++) q.push(drawSymbol(self.c, Math.random));
        for (var row = r.rows - 1; row >= 0; row--) {
          q.push({ s: grid[col][row], v: money[col + ':' + row] });
        }
        q.push(drawSymbol(self.c, Math.random));
        r.pendingQueue = q;

        r.onDone = function () {
          r.el.classList.remove('spinning', 'anticipate', 'fast');
          r.el.classList.add('landed');
          setTimeout(function () { r.el.classList.remove('landed'); }, 260);
          if (opts.onStop) opts.onStop(col);
          if (--pending === 0) { self.flushCell(); resolve(); }
        };
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

        /* ---------------- aceleração ---------------- */
        if (r.phase === 'accel') {
          r.accelT += dt;
          var a = Math.min(1, r.accelT / 200);
          r.speed = r.vmax * (a * a * (3 - 2 * a));   // arranque suave
          if (a >= 1) r.phase = 'run';
        }

        /* ---------------- giro solto ---------------- */
        if (r.phase === 'accel' || r.phase === 'run') {
          if (!r.wantStop && t >= r.stopAt) {
            r.wantStop = true;
            r.queue = r.pendingQueue.slice();   // a partir daqui entra o resultado
          }

          r.pos += r.speed * dt * self.cellH;

          var cruzou = false;
          while (self.cellH > 0 && r.pos >= self.cellH) {
            r.pos -= self.cellH;
            cruzou = true;
            self.recycle(r, (r.queue && r.queue.length)
              ? r.queue.shift()
              : drawSymbol(self.c, Math.random));
          }

          /* Entra na frenagem só logo depois de cruzar uma borda, e só quando
             restarem exatamente BRAKE células do resultado: assim a distância
             é a mesma em todos os rolos e o encaixe cai certo. */
          if (cruzou && r.queue && r.queue.length <= BRAKE) {
            r.target = r.queue.length * self.cellH - r.pos;
            r.travelled = 0;
            r.t0 = t;
            var vpx = Math.max(1e-4, r.speed * self.cellH);
            /* T = 3·d/v mantém a velocidade no início da travagem igual à do giro
               solto (derivada do easeOutCubic em t=0). Com o rolo mais lento esse
               T cresce; o tecto antigo de 1800 ms passaria a cortar a curva e
               devolveria o solavanco que já tínhamos eliminado. */
            r.decel = Math.min(2600, Math.max(220, 3 * r.target / vpx));
            r.phase = 'stop';
          }
        }

        /* ---------------- frenagem ---------------- */
        if (r.phase === 'stop') {
          var p = Math.min(1, (t - r.t0) / r.decel);
          var eased = 1 - Math.pow(1 - p, 3);
          var want = r.target * eased;
          r.pos += want - r.travelled;
          r.travelled = want;

          while (self.cellH > 0 && r.pos >= self.cellH && r.queue.length) {
            r.pos -= self.cellH;
            self.recycle(r, r.queue.shift());
          }

          r.speed = (3 * r.target * Math.pow(1 - p, 2) / r.decel) / self.cellH;

          if (p >= 1) {
            while (r.queue.length) self.recycle(r, r.queue.shift());
            r.pos = 0;
            r.phase = 'idle';
            r.speed = 0;
            self.place(r);
            r.onDone();
            continue;
          }
        }

        r.el.classList.toggle('fast', r.speed > r.vmax * 0.75);
        self.place(r);
      }

      if (active) { self.raf = requestAnimationFrame(frame); return; }

      self.raf = 0;
      self.flushCell();   // rolos parados: entra o tamanho que ficou à espera
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
