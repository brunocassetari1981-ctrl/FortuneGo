/*!
 * FortuneGo Enhance v3.0 — motor de resgate de imagens + camada de interatividade
 * ---------------------------------------------------------------------------
 * Injetado pelo MainActivity (onPageFinished) e/ou incluído via
 * <script src="js/fortune-enhance.js" defer></script>. A dupla inclusão é segura.
 *
 * RESOLUÇÃO DE IMAGEM EM 4 CAMADAS (para quando o <img src> não bate com o arquivo real):
 *   1. inventário real  — lê assets/img/manifest.json (gerado no build) e acha o arquivo exato
 *   2. casamento fuzzy  — compara nome do arquivo E texto do alt com o inventário,
 *                         usando dicionário PT/EN (tiger↔tigre, mines↔mina, plane↔aviator…)
 *                         + distância de edição. Acerta mesmo com nome bem diferente.
 *   3. força bruta      — testa pastas e extensões comuns (img/, images/, assets/img/ … .png/.webp)
 *   4. ícone procedural — gera um SVG com gradiente, emoji e iniciais. Nunca fica quebrado.
 *
 * Diagnóstico: chame FortuneGo.diagnose() para ver o laudo de cada imagem na tela.
 */
(function () {
  'use strict';

  if (window.__FORTUNE_ENHANCE__) return;
  window.__FORTUNE_ENHANCE__ = '3.0.0';

  var doc = document;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_NATIVE = typeof window.FortuneNative !== 'undefined';

  /* ===================================================================== *
   * 0. BASES DE CAMINHO
   * ===================================================================== */

  var BASE = (function () {
    var href = location.href.replace(/[?#].*$/, '');
    return /\/$/.test(href) ? href : href.replace(/[^/]*$/, '');
  })();

  var ASSET_ROOT = BASE; // ajustado quando o manifest é encontrado
  var EXTRA_ROOTS = [BASE];
  if (location.protocol === 'file:') EXTRA_ROOTS.push('file:///android_asset/');
  if (location.hostname === 'appassets.androidplatform.net') EXTRA_ROOTS.push(location.origin + '/assets/');

  var FOLDERS = [
    '', 'img/', 'imgs/', 'image/', 'images/', 'imagens/',
    'icon/', 'icons/', 'icone/', 'icones/',
    'assets/', 'assets/img/', 'assets/images/', 'assets/icons/',
    'static/img/', 'static/images/', 'public/img/', 'public/images/',
    'games/', 'jogos/', 'media/', 'thumbs/', 'thumbnails/'
  ];
  var EXTS = ['', '.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg'];
  var MAX_CANDIDATES = 90;

  function stripQuery(s) { return String(s || '').replace(/[?#].*$/, ''); }

  function cleanPath(src) {
    return stripQuery(src)
      .replace(/^\.\//, '')
      .replace(/^\/+/, '')
      .replace(/^(?:file:\/\/)?\/?android_asset\//, '');
  }

  function baseName(src) {
    var p = cleanPath(src).split('/');
    return p[p.length - 1] || '';
  }

  /* ===================================================================== *
   * 1. INVENTÁRIO REAL DE IMAGENS (manifest.json)
   * ===================================================================== */

  var MANIFEST = null;   // [{ path, slug, tokens }]
  var manifestWaiters = [];

  function slugify(value) {
    var s = String(value || '');
    return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
  }

  function normalize(value) {
    var s = slugify(value).toLowerCase()
      .replace(/\.[a-z0-9]{2,5}$/, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\b(icon|icone|ico|img|image|imagem|game|jogo|slot|thumb|logo|capa|cover|png|jpg|webp|small|big|hd|x\d+|\d{2,4}px)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return s;
  }

  // Sinônimos PT/EN — cada grupo vira uma "chave semântica".
  var ALIAS_GROUPS = [
    ['tigre', 'tiger', 'tigrinho'],
    ['dragao', 'dragon', 'draco', 'drago'],
    ['coelho', 'rabbit', 'bunny', 'coelhinho'],
    ['touro', 'boi', 'ox', 'bull', 'vaca'],
    ['panda', 'urso', 'bear'],
    ['rato', 'mouse', 'mice', 'ratinho'],
    ['macaco', 'monkey', 'ape'],
    ['galo', 'rooster', 'chicken', 'frango'],
    ['porco', 'pig', 'piggy', 'porquinho'],
    ['roleta', 'roulette', 'double', 'wheel', 'roda'],
    ['mina', 'mines', 'mining', 'ouro', 'gold', 'mineracao', 'diamante', 'diamond'],
    ['aviator', 'aviao', 'aviador', 'plane', 'fly', 'crash', 'voo'],
    ['bingo', 'keno', 'loteria', 'lottery'],
    ['espaco', 'space', 'spaceman', 'astronauta', 'foguete', 'rocket', 'galaxy'],
    ['futebol', 'soccer', 'football', 'penalty', 'penalti', 'gol', 'goal', 'bola', 'ball'],
    ['mascote', 'mascot', 'avatar', 'logo', 'perfil', 'profile', 'user', 'usuario'],
    ['carta', 'card', 'poker', 'baralho', 'blackjack', 'truco'],
    ['dado', 'dice', 'craps', 'dados'],
    ['fruta', 'fruit', 'frutas', 'cereja', 'cherry', 'melancia', 'watermelon'],
    ['sorte', 'fortune', 'luck', 'lucky']
  ];

  var ALIAS_KEY = (function () {
    var map = Object.create(null);
    ALIAS_GROUPS.forEach(function (group, index) {
      group.forEach(function (term) { map[term] = 'g' + index; });
    });
    return map;
  })();

  function semanticKeys(tokens) {
    var keys = [];
    tokens.forEach(function (t) {
      var k = ALIAS_KEY[t];
      if (k && keys.indexOf(k) === -1) keys.push(k);
    });
    return keys;
  }

  function tokensOf(value) {
    var n = normalize(value);
    return n ? n.split(' ') : [];
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    var max = Math.max(a.length, b.length);
    return 1 - levenshtein(a, b) / max;
  }

  function scoreEntry(query, entry) {
    if (!query.norm || !entry.slug) return 0;
    var score = 0;

    if (query.norm === entry.slug) return 1000;
    if (entry.slug.indexOf(query.norm) !== -1 || query.norm.indexOf(entry.slug) !== -1) score += 420;

    // sinônimos PT/EN valem muito
    var shared = 0;
    query.keys.forEach(function (k) { if (entry.keys.indexOf(k) !== -1) shared++; });
    score += shared * 320;

    // tokens idênticos
    var common = 0;
    query.tokens.forEach(function (t) { if (t.length > 2 && entry.tokens.indexOf(t) !== -1) common++; });
    score += common * 180;

    // semelhança textual (pega erro de digitação / plural / sufixo)
    score += similarity(query.norm, entry.slug) * 260;

    return score;
  }

  function buildEntry(path) {
    var name = baseName(path);
    var tokens = tokensOf(name);
    return {
      path: path,
      slug: normalize(name),
      tokens: tokens,
      keys: semanticKeys(tokens)
    };
  }

  function loadManifest() {
    var urls = [
      BASE + 'img/manifest.json',
      BASE + 'manifest.json',
      BASE + 'assets/img/manifest.json'
    ];
    if (location.hostname === 'appassets.androidplatform.net') {
      urls.unshift(location.origin + '/assets/img/manifest.json');
    }

    var index = 0;
    function attempt() {
      if (index >= urls.length || typeof fetch !== 'function') { finish([]); return; }
      var url = urls[index++];
      fetch(url, { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(0); })
        .then(function (list) {
          if (!Array.isArray(list)) throw 0;
          // a raiz é a pasta que contém o manifest (os caminhos do índice são relativos a ela)
          ASSET_ROOT = url.replace(/img\/manifest\.json$/, '').replace(/manifest\.json$/, '');
          if (EXTRA_ROOTS.indexOf(ASSET_ROOT) === -1) EXTRA_ROOTS.unshift(ASSET_ROOT);
          finish(list);
        })
        .catch(attempt);
    }

    function finish(list) {
      MANIFEST = list.map(buildEntry);
      manifestWaiters.forEach(function (fn) { try { fn(); } catch (e) {} });
      manifestWaiters = [];
      if (MANIFEST.length) {
        enhanceAll(doc); // reprocessa agora que conhecemos o inventário
      }
    }

    attempt();
  }

  function matchInManifest(img) {
    if (!MANIFEST || !MANIFEST.length) return null;

    var rawSrc = img.getAttribute('src') || img.getAttribute('data-src') || '';
    var queries = [];

    var fromFile = normalize(baseName(rawSrc));
    if (fromFile) queries.push({ norm: fromFile, tokens: tokensOf(baseName(rawSrc)), keys: semanticKeys(tokensOf(baseName(rawSrc))), weight: 1 });

    var altText = img.getAttribute('alt') || img.getAttribute('title') || img.getAttribute('data-name') || '';
    var fromAlt = normalize(altText);
    if (fromAlt) queries.push({ norm: fromAlt, tokens: tokensOf(altText), keys: semanticKeys(tokensOf(altText)), weight: 0.95 });

    // o nome do jogo também costuma estar no texto do card
    var card = img.closest && img.closest('[data-game],[data-jogo],.game,.game-card,.card,article,a,li');
    if (card) {
      var label = (card.getAttribute('data-game') || card.textContent || '').slice(0, 60);
      var fromCard = normalize(label);
      if (fromCard) queries.push({ norm: fromCard, tokens: tokensOf(label), keys: semanticKeys(tokensOf(label)), weight: 0.8 });
    }

    var best = null, bestScore = 0;
    queries.forEach(function (q) {
      MANIFEST.forEach(function (entry) {
        var s = scoreEntry(q, entry) * q.weight;
        if (s > bestScore) { bestScore = s; best = entry; }
      });
    });

    // 300 ≈ pelo menos um sinônimo forte ou um token idêntico
    return bestScore >= 300 ? ASSET_ROOT + best.path : null;
  }

  /* ===================================================================== *
   * 2. FORÇA BRUTA DE CAMINHOS
   * ===================================================================== */

  function buildCandidates(rawSrc) {
    var path = cleanPath(rawSrc);
    if (!path) return [];

    var file = baseName(path);
    var dot = file.lastIndexOf('.');
    var stem = dot > 0 ? file.slice(0, dot) : file;
    var ext = dot > 0 ? file.slice(dot) : '';

    var names = [];
    function pushName(n) { if (n && names.indexOf(n) === -1) names.push(n); }

    pushName(path);
    pushName(file);
    pushName(file.toLowerCase());
    var slug = slugify(stem).toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9.-]/g, '');
    pushName(slug + ext.toLowerCase());
    pushName(slug);

    var out = [];
    function push(url) {
      if (url && out.indexOf(url) === -1 && out.length < MAX_CANDIDATES) out.push(url);
    }

    for (var r = 0; r < EXTRA_ROOTS.length; r++) {
      for (var f = 0; f < FOLDERS.length; f++) {
        for (var n = 0; n < names.length; n++) {
          var name = names[n];
          var hasExt = /\.[a-z0-9]{2,5}$/i.test(name);
          var bare = hasExt ? name.replace(/\.[a-z0-9]{2,5}$/i, '') : name;
          if (hasExt) push(EXTRA_ROOTS[r] + FOLDERS[f] + name);
          for (var e = 1; e < EXTS.length; e++) push(EXTRA_ROOTS[r] + FOLDERS[f] + bare + EXTS[e]);
        }
      }
    }
    return out;
  }

  var urlCache = Object.create(null);

  function probe(url, cb) {
    if (url in urlCache) { cb(urlCache[url]); return; }
    var img = new Image();
    var settled = false;
    function finish(ok) {
      if (settled) return;
      settled = true;
      urlCache[url] = ok;
      cb(ok);
    }
    img.onload = function () { finish(img.naturalWidth > 0); };
    img.onerror = function () { finish(false); };
    img.src = url;
    setTimeout(function () { finish(false); }, 5000);
  }

  function probeSequential(list, i, onFound, onEnd) {
    if (i >= list.length) { onEnd(); return; }
    probe(list[i], function (ok) {
      if (ok) onFound(list[i]);
      else probeSequential(list, i + 1, onFound, onEnd);
    });
  }

  /* ===================================================================== *
   * 3. ÍCONE PROCEDURAL
   * ===================================================================== */

  var EMOJI_MAP = [
    [/tig|tiger/, '🐯'], [/drag/, '🐉'], [/coelh|rabbit|bunny/, '🐰'],
    [/boi|touro|ox|bull/, '🐂'], [/panda|urso|bear/, '🐼'], [/rato|mouse/, '🐭'],
    [/macac|monkey/, '🐵'], [/galo|rooster|chicken/, '🐔'], [/porco|pig/, '🐷'],
    [/cobra|snake/, '🐍'], [/roleta|roulette|wheel/, '🎡'],
    [/slot|caca|niquel|frut|fruit/, '🎰'], [/poker|carta|card|baralho/, '🃏'],
    [/bingo|keno|loto/, '🎱'], [/crash|aviator|aviao|aviador|plane|fly/, '✈️'],
    [/mina|mine|bomb/, '💣'], [/dado|dice|craps/, '🎲'], [/black ?jack|21/, '♠️'],
    [/esporte|sport|futebol|soccer|penalty|gol/, '⚽'], [/live|ao ?vivo|dealer/, '🎥'],
    [/premio|jackpot|prize|win/, '🏆'], [/moeda|coin|gold|ouro/, '🪙'],
    [/diamante|diamond|gem|joia/, '💎'], [/fogo|fire|hot|quente/, '🔥'],
    [/espaco|space|foguete|rocket|astronaut/, '🚀'],
    [/estrela|star|lucky|sorte|fortune/, '⭐'], [/presente|gift|bonus/, '🎁'],
    [/user|perfil|avatar|conta|profile/, '👤'], [/pix|deposito|wallet|carteira/, '💳']
  ];

  function pickEmoji(label) {
    var l = normalize(label);
    for (var i = 0; i < EMOJI_MAP.length; i++) if (EMOJI_MAP[i][0].test(l)) return EMOJI_MAP[i][1];
    return '🎰';
  }

  function hashCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function labelOf(img) {
    var raw = img.getAttribute('alt') || img.getAttribute('title') || img.getAttribute('data-name') ||
      baseName(img.getAttribute('src') || img.getAttribute('data-src') || '');
    raw = raw.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_]+/g, ' ').trim();
    return raw || 'FortuneGo';
  }

  function placeholderFor(img) {
    var label = labelOf(img);
    var hue = hashCode(label) % 360;
    var emoji = pickEmoji(label);
    var initials = label.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">' +
        '<defs>' +
          '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="hsl(' + hue + ',72%,42%)"/>' +
            '<stop offset="55%" stop-color="hsl(' + ((hue + 28) % 360) + ',68%,26%)"/>' +
            '<stop offset="100%" stop-color="hsl(' + ((hue + 55) % 360) + ',74%,16%)"/>' +
          '</linearGradient>' +
          '<radialGradient id="s" cx="50%" cy="28%" r="70%">' +
            '<stop offset="0%" stop-color="#ffffff" stop-opacity=".30"/>' +
            '<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>' +
          '</radialGradient>' +
        '</defs>' +
        '<rect width="300" height="300" rx="46" fill="url(#g)"/>' +
        '<rect width="300" height="300" rx="46" fill="url(#s)"/>' +
        '<rect x="7" y="7" width="286" height="286" rx="40" fill="none" stroke="#FACC15" stroke-opacity=".85" stroke-width="4"/>' +
        '<text x="150" y="152" font-size="110" text-anchor="middle" dominant-baseline="middle">' + emoji + '</text>' +
        '<text x="150" y="240" font-size="40" font-weight="700" fill="#FACC15" font-family="system-ui,sans-serif" ' +
          'text-anchor="middle" dominant-baseline="middle" opacity=".92">' + initials + '</text>' +
      '</svg>';

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ===================================================================== *
   * 4. PIPELINE DE RESGATE
   * ===================================================================== */

  var report = []; // alimenta FortuneGo.diagnose()

  function note(img, status, from, to) {
    report.push({ status: status, de: from, para: to, alt: img.getAttribute('alt') || '' });
  }

  function markOk(img) {
    img.setAttribute('data-fg', 'ok');
    img.classList.add('fg-img-ready');
  }

  function applyPlaceholder(img, original) {
    img.src = placeholderFor(img);
    img.setAttribute('data-fg', 'placeholder');
    img.classList.add('fg-img-ready', 'fg-img-generated');
    note(img, 'gerado', original, '(SVG procedural)');
  }

  function rescue(img) {
    if (img.getAttribute('data-fg') === 'fixing') return;
    img.setAttribute('data-fg', 'fixing');

    var original = img.getAttribute('src') || img.getAttribute('data-src') ||
      img.getAttribute('data-original') || img.getAttribute('data-lazy') || '';

    function bruteForce() {
      var candidates = buildCandidates(original);
      if (!candidates.length) { applyPlaceholder(img, original); return; }
      probeSequential(candidates, 0,
        function (url) { img.src = url; markOk(img); note(img, 'resolvido', original, url); },
        function () { applyPlaceholder(img, original); }
      );
    }

    function tryManifest() {
      var hit = matchInManifest(img);
      if (!hit) { bruteForce(); return; }
      probe(hit, function (ok) {
        if (ok) { img.src = hit; markOk(img); note(img, 'inventário', original, hit); }
        else bruteForce();
      });
    }

    if (MANIFEST === null) manifestWaiters.push(tryManifest);
    else tryManifest();
  }

  function inspect(img) {
    var state = img.getAttribute('data-fg');
    if (state === 'ok' || state === 'placeholder' || state === 'fixing') return;

    var src = img.getAttribute('src');
    var lazy = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy');
    if (!src && lazy) img.src = lazy;

    if (img.complete) {
      if (img.naturalWidth > 0) markOk(img);
      else rescue(img);
      return;
    }
    img.addEventListener('load', function onLoad() {
      img.removeEventListener('load', onLoad);
      if (img.naturalWidth > 0) markOk(img);
    });
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      rescue(img);
    });
  }

  function fixBackgrounds(root) {
    var nodes = (root || doc).querySelectorAll('[style*="background"], [class*="bg-"], [class*="thumb"], [class*="banner"]');
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.getAttribute('data-fg-bg')) return;
      var bg = window.getComputedStyle(el).backgroundImage;
      var m = bg && bg.match(/url\((['"]?)([^'")]+)\1\)/);
      if (!m) return;
      var url = m[2];
      if (/^(data:|blob:)/i.test(url)) return;
      el.setAttribute('data-fg-bg', '1');
      probe(url, function (ok) {
        if (ok) return;
        probeSequential(buildCandidates(url), 0, function (good) {
          el.style.backgroundImage = 'url("' + good + '")';
        }, function () {});
      });
    });
  }

  function scanImages(root) {
    Array.prototype.forEach.call((root || doc).querySelectorAll('img'), inspect);
  }

  doc.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG') rescue(t);
  }, true);

  /* ===================================================================== *
   * 5. CAMADA DE INTERATIVIDADE
   * ===================================================================== */

  var CSS = [
    '@keyframes fgFloat{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-4px) rotate(-1.6deg)}50%{transform:translateY(0) rotate(0)}75%{transform:translateY(-4px) rotate(1.6deg)}}',
    '@keyframes fgGlow{0%,100%{filter:drop-shadow(0 4px 10px rgba(250,204,21,.28))}50%{filter:drop-shadow(0 6px 22px rgba(250,204,21,.72))}}',
    '@keyframes fgShimmer{0%{transform:translateX(-120%) skewX(-18deg)}100%{transform:translateX(260%) skewX(-18deg)}}',
    '@keyframes fgRipple{to{transform:scale(2.6);opacity:0}}',
    '@keyframes fgCoin{0%{transform:translate(0,0) scale(.6);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1.15) rotate(var(--rot));opacity:0}}',
    '.fg-card{position:relative;cursor:pointer;-webkit-tap-highlight-color:transparent;transform-style:preserve-3d;',
      'transition:transform .28s cubic-bezier(.22,1,.36,1),box-shadow .28s ease,filter .28s ease;will-change:transform}',
    '.fg-card.fg-press{transform:scale(.945) !important;filter:brightness(1.12)}',
    '.fg-card:focus-visible{outline:2px solid #FACC15;outline-offset:3px;border-radius:14px}',
    '.fg-card .fg-shine{position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:inherit;z-index:3}',
    '.fg-card .fg-shine::before{content:"";position:absolute;top:-30%;left:0;width:38%;height:160%;',
      'background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent);animation:fgShimmer 3.6s ease-in-out infinite;animation-delay:var(--fg-delay,0s)}',
    '.fg-icon{animation:fgFloat 3.4s ease-in-out infinite,fgGlow 2.6s ease-in-out infinite;transform-origin:center bottom;backface-visibility:hidden}',
    '.fg-card.fg-press .fg-icon{animation-play-state:paused}',
    '.fg-ripple{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(250,204,21,.55),rgba(250,204,21,0) 70%);',
      'transform:scale(0);animation:fgRipple .62s ease-out forwards;pointer-events:none;z-index:4}',
    '.fg-coin{position:fixed;font-size:20px;pointer-events:none;z-index:99999;animation:fgCoin .85s cubic-bezier(.22,.7,.3,1) forwards;will-change:transform,opacity}',
    '.fg-reveal{opacity:0;transform:translateY(16px) scale(.96)}',
    '.fg-reveal.fg-in{opacity:1;transform:none;transition:opacity .55s ease var(--fg-delay,0s),transform .55s cubic-bezier(.22,1,.36,1) var(--fg-delay,0s)}',
    '.fg-img-generated{object-fit:cover}',
    '.fg-toast{position:fixed;left:50%;bottom:calc(26px + env(safe-area-inset-bottom,0px));transform:translateX(-50%) translateY(12px);',
      'background:rgba(20,10,28,.96);color:#FDE68A;border:1px solid rgba(250,204,21,.35);padding:12px 20px;border-radius:999px;',
      'font:600 14px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;z-index:99999;opacity:0;pointer-events:none;',
      'box-shadow:0 14px 34px rgba(0,0,0,.5);transition:opacity .25s,transform .25s;max-width:86vw;text-align:center}',
    '.fg-toast.fg-show{opacity:1;transform:translateX(-50%) translateY(0)}',
    '.fg-diag{position:fixed;inset:0;z-index:99998;background:rgba(5,3,10,.96);color:#e2e8f0;overflow:auto;padding:18px;',
      'font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}',
    '.fg-diag h2{color:#FACC15;font-size:15px;margin:0 0 12px}',
    '.fg-diag table{width:100%;border-collapse:collapse}',
    '.fg-diag td{padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.08);word-break:break-all;vertical-align:top}',
    '.fg-diag .b{display:inline-block;padding:1px 7px;border-radius:5px;font-weight:700;font-size:10px;white-space:nowrap}',
    '.fg-diag .ok{background:#064e3b;color:#6ee7b7}.fg-diag .fix{background:#1e3a8a;color:#93c5fd}',
    '.fg-diag .gen{background:#7c2d12;color:#fdba74}',
    '.fg-diag button{position:sticky;top:0;float:right;background:#FACC15;color:#1b0b22;border:0;border-radius:8px;padding:7px 14px;font-weight:800;cursor:pointer}',
    '@media (prefers-reduced-motion: reduce){.fg-icon,.fg-card .fg-shine::before{animation:none !important}.fg-reveal{opacity:1;transform:none}}'
  ].join('');

  function injectCSS() {
    if (doc.getElementById('fg-enhance-style')) return;
    var style = doc.createElement('style');
    style.id = 'fg-enhance-style';
    style.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(style);
  }

  var audioCtx = null;
  function soundOn() { try { return localStorage.getItem('fg_sound') !== 'off'; } catch (e) { return true; } }

  function blip(freq, duration, type) {
    if (!soundOn()) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, audioCtx.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function haptic(ms) {
    if (HAS_NATIVE && window.FortuneNative.haptic) { try { window.FortuneNative.haptic(ms || 10); return; } catch (e) {} }
    if (navigator.vibrate) navigator.vibrate(ms || 10);
  }

  function hapticWin() {
    if (HAS_NATIVE && window.FortuneNative.win) { try { window.FortuneNative.win(); return; } catch (e) {} }
    if (navigator.vibrate) navigator.vibrate([0, 28, 60, 28, 60, 90]);
  }

  function ripple(el, x, y) {
    if (REDUCED) return;
    var rect = el.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 0.9;
    var span = doc.createElement('span');
    span.className = 'fg-ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = (x - rect.left - size / 2) + 'px';
    span.style.top = (y - rect.top - size / 2) + 'px';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(span);
    setTimeout(function () { span.remove(); }, 640);
  }

  function coinBurst(x, y, amount) {
    if (REDUCED) return;
    var coins = ['🪙', '💰', '✨', '💎'];
    var total = amount || 8;
    for (var i = 0; i < total; i++) {
      var coin = doc.createElement('div');
      coin.className = 'fg-coin';
      coin.textContent = coins[i % coins.length];
      var angle = (Math.PI * 2 * i) / total + Math.random() * 0.5;
      var dist = 60 + Math.random() * 80;
      coin.style.left = x + 'px';
      coin.style.top = y + 'px';
      coin.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      coin.style.setProperty('--dy', (Math.sin(angle) * dist - 40) + 'px');
      coin.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
      doc.body.appendChild(coin);
      (function (node) { setTimeout(function () { node.remove(); }, 900); })(coin);
    }
  }

  var toastTimer = null;
  function toast(message) {
    var el = doc.querySelector('.fg-toast');
    if (!el) { el = doc.createElement('div'); el.className = 'fg-toast'; doc.body.appendChild(el); }
    el.textContent = message;
    requestAnimationFrame(function () { el.classList.add('fg-show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('fg-show'); }, 2200);
  }

  function isIconLike(img) {
    var r = img.getBoundingClientRect();
    if (!r.width || !r.height) return true;
    var ratio = r.width / r.height;
    return r.width >= 40 && ratio > 0.45 && ratio < 2.4 && r.width <= window.innerWidth * 0.75;
  }

  function tooBig(el) {
    var r = el.getBoundingClientRect();
    return r.width > window.innerWidth * 0.94 && r.height > window.innerHeight * 0.55;
  }

  function cardFor(img) {
    var direct = img.closest && img.closest(
      '[data-game],[data-jogo],.game-card,.gamecard,.game,.jogo,.slot-card,.card,article,a,button,[onclick]'
    );
    if (direct && direct !== doc.body && !tooBig(direct)) return direct;

    var node = img;
    for (var depth = 0; depth < 3 && node && node !== doc.body; depth++) {
      var parent = node.parentElement;
      if (!parent || parent === doc.body) break;
      var cls = (parent.className && parent.className.baseVal !== undefined
        ? parent.className.baseVal : parent.className || '') + '';
      if (/card|game|jogo|slot|tile|item/i.test(cls) && !tooBig(parent)) return parent;
      node = parent;
    }
    return img.parentElement || img;
  }

  function enhanceCard(el, index) {
    if (!el || el.getAttribute('data-fg-card')) return;
    el.setAttribute('data-fg-card', '1');
    el.classList.add('fg-card');
    if (!el.hasAttribute('tabindex') && el.tagName !== 'A' && el.tagName !== 'BUTTON') el.setAttribute('tabindex', '0');
    el.style.setProperty('--fg-delay', ((index % 12) * 0.12).toFixed(2) + 's');

    if (!REDUCED && !el.querySelector('.fg-shine')) {
      var shine = doc.createElement('span');
      shine.className = 'fg-shine';
      el.appendChild(shine);
    }

    var frame = null;
    function tilt(e) {
      if (REDUCED) return;
      var rect = el.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        el.style.transform = 'perspective(680px) rotateX(' + (-py * 11).toFixed(2) +
          'deg) rotateY(' + (px * 13).toFixed(2) + 'deg) scale(1.035)';
      });
    }
    function reset() { if (frame) cancelAnimationFrame(frame); el.style.transform = ''; }

    /* ------------------------------------------------------------------
       O inclinar 3D é EXCLUSIVO do rato.

       Antes a condição era `e.pointerType === 'mouse' || e.buttons`, e
       `e.buttons` vale 1 em QUALQUER toque com o dedo pousado. Resultado:
       ao arrastar o dedo para rolar a página por cima dos cartões — que
       ocupam justamente o meio do ecrã — cada pointermove disparava um
       getBoundingClientRect (layout síncrono forçado) mais uma escrita de
       transform. A thread principal entupia, a rolagem engasgava e saía
       aos solavancos, e o cartão ainda inclinava debaixo do dedo, o que
       dava a sensação de a página não rolar. Rolar só "funcionava" a
       partir da barra inferior porque ali não há cartão nenhum.

       Toque agora não inclina nada e não bloqueia gesto nenhum.
       ------------------------------------------------------------------ */
    var soRato = function (e) { return e.pointerType === 'mouse'; };
    el.addEventListener('pointerenter', function (e) { if (soRato(e)) tilt(e); });
    el.addEventListener('pointermove', function (e) {
      if (soRato(e)) { tilt(e); return; }
      /* dedo: se saiu do lugar, isto é uma ROLAGEM e não um toque —
         desfaz o estado de pressionado para o cartão não ficar "preso" */
      if (arrastou(e)) el.classList.remove('fg-press');
    });
    el.addEventListener('pointerleave', reset);

    var p0 = null;
    function arrastou(e) {
      if (!p0) return false;
      return Math.abs(e.clientX - p0.x) > 10 || Math.abs(e.clientY - p0.y) > 10;
    }

    el.addEventListener('pointerdown', function (e) {
      p0 = { x: e.clientX, y: e.clientY };
      el.classList.add('fg-press');
      ripple(el, e.clientX, e.clientY);
      haptic(9);
      blip(760, 0.07, 'triangle');
    });
    ['pointerup', 'pointercancel'].forEach(function (evt) {
      el.addEventListener(evt, function (e) {
        var rolou = arrastou(e);
        p0 = null;
        el.classList.remove('fg-press');
        reset();
        /* sem festa de moedas quando o gesto foi rolar, não tocar */
        if (evt === 'pointerup' && !rolou) {
          coinBurst(e.clientX, e.clientY, 6);
          blip(1180, 0.1, 'sine');
        }
      });
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var r = el.getBoundingClientRect();
        ripple(el, r.left + r.width / 2, r.top + r.height / 2);
        haptic(9);
      }
    });
  }

  var revealObserver = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('fg-in'); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;

  function reveal(el) {
    if (REDUCED || !revealObserver || el.getAttribute('data-fg-reveal')) return;
    el.setAttribute('data-fg-reveal', '1');
    setTimeout(function () { el.classList.add('fg-in'); }, 2600); // rede de segurança
    el.classList.add('fg-reveal');
    revealObserver.observe(el);
  }

  var cardIndex = 0;

  function enhanceAll(root) {
    injectCSS();
    scanImages(root);
    fixBackgrounds(root);

    var imgs = (root || doc).querySelectorAll('img:not([data-fg-done])');
    Array.prototype.forEach.call(imgs, function (img) {
      img.setAttribute('data-fg-done', '1');
      if (!isIconLike(img)) return;
      if (img.closest && img.closest('.fg-no-enhance, .fg-avatar')) return;
      var card = cardFor(img);
      if (card && card !== doc.body) {
        img.classList.add('fg-icon');
        enhanceCard(card, cardIndex++);
        reveal(card);
      }
    });
  }

  var pending = false;
  function scheduleScan() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; enhanceAll(doc); });
  }

  if ('MutationObserver' in window) {
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if ((mutations[i].addedNodes && mutations[i].addedNodes.length) || mutations[i].type === 'attributes') {
          scheduleScan();
          return;
        }
      }
    }).observe(doc.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'data-src', 'style', 'class']
    });
  }

  function layoutFixes() {
    var meta = doc.querySelector('meta[name="viewport"]');
    if (!meta) { meta = doc.createElement('meta'); meta.name = 'viewport'; (doc.head || doc.documentElement).appendChild(meta); }
    meta.content = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';

    if (!doc.getElementById('fg-layout-style')) {
      var style = doc.createElement('style');
      style.id = 'fg-layout-style';
      style.textContent =
        /* Nada de mexer no padding do body aqui. Esta folha é injetada
           DEPOIS das folhas da página, por isso um `body{padding-bottom:…}`
           ganhava do `padding-bottom: calc(var(--nav-h) + …)` do lobby e a
           última fila de cartões ficava escondida debaixo da barra fixa. */
        'html,body{margin:0;padding:0;overflow-x:hidden;-webkit-text-size-adjust:100%;overscroll-behavior-y:contain}' +
        'img{max-width:100%}*{-webkit-touch-callout:none}';
      (doc.head || doc.documentElement).appendChild(style);
    }
  }

  /* ===================================================================== *
   * 6. API PÚBLICA
   * ===================================================================== */

  var modalStack = [];

  function diagnose() {
    var old = doc.querySelector('.fg-diag');
    if (old) { old.remove(); return report; }

    var rows = report.map(function (r) {
      var cls = r.status === 'gerado' ? 'gen' : (r.status === 'ok' ? 'ok' : 'fix');
      return '<tr><td><span class="b ' + cls + '">' + r.status + '</span></td>' +
        '<td>' + (r.de || '(vazio)') + '<br><span style="color:#64748b">→ ' + r.para + '</span></td></tr>';
    }).join('');

    var box = doc.createElement('div');
    box.className = 'fg-diag';
    box.innerHTML = '<button onclick="this.parentNode.remove()">Fechar</button>' +
      '<h2>Diagnóstico de imagens — FortuneGo ' + window.__FORTUNE_ENHANCE__ + '</h2>' +
      '<p style="color:#94a3b8">Inventário: ' + (MANIFEST ? MANIFEST.length : 0) + ' arquivos · ' +
      'raiz: ' + ASSET_ROOT + '<br>Imagens processadas: ' + report.length + '</p>' +
      '<table>' + (rows || '<tr><td>Nenhuma imagem precisou de correção ✅</td></tr>') + '</table>';
    doc.body.appendChild(box);
    return report;
  }

  window.FortuneGo = {
    version: window.__FORTUNE_ENHANCE__,
    isNative: HAS_NATIVE,
    refresh: function () { enhanceAll(doc); },
    fixImages: function () { scanImages(doc); fixBackgrounds(doc); },
    manifest: function () { return MANIFEST ? MANIFEST.map(function (e) { return e.path; }) : []; },
    /** Hook de depuração: simula o casamento de um caminho quebrado. */
    _match: function (src, alt) {
      var fake = doc.createElement('img');
      fake.setAttribute('src', src);
      if (alt) fake.setAttribute('alt', alt);
      return matchInManifest(fake);
    },
    diagnose: diagnose,
    report: function () { return report.slice(); },
    resolve: function (src, cb) {
      probeSequential(buildCandidates(src), 0, function (u) { cb(u); }, function () { cb(null); });
    },
    placeholder: function (label) {
      var fake = doc.createElement('img');
      fake.setAttribute('alt', label || 'FortuneGo');
      return placeholderFor(fake);
    },
    haptic: haptic,
    hapticWin: hapticWin,
    sound: function (f, d, t) { blip(f || 880, d || 0.08, t); },
    toggleSound: function () {
      var next = soundOn() ? 'off' : 'on';
      try { localStorage.setItem('fg_sound', next); } catch (e) {}
      if (next === 'on') blip(980, 0.1, 'sine');
      return next === 'on';
    },
    soundEnabled: soundOn,
    coins: coinBurst,
    toast: function (m) {
      if (HAS_NATIVE && window.FortuneNative.toast) { try { window.FortuneNative.toast(m); return; } catch (e) {} }
      toast(m);
    },
    confetti: function () {
      var w = window.innerWidth;
      for (var i = 0; i < 5; i++) {
        (function (k) {
          setTimeout(function () {
            coinBurst(w * (0.15 + Math.random() * 0.7), window.innerHeight * (0.2 + Math.random() * 0.3), 10);
          }, k * 120);
        })(i);
      }
      hapticWin();
    },
    pushModal: function (fn) { modalStack.push(fn); },
    popModal: function () { modalStack.pop(); },
    handleBack: function () {
      var diag = doc.querySelector('.fg-diag');
      if (diag) { diag.remove(); return true; }
      if (modalStack.length) {
        var close = modalStack.pop();
        try { close(); } catch (e) {}
        return true;
      }
      return false;
    },
    share: function (text) {
      if (HAS_NATIVE && window.FortuneNative.share) { try { window.FortuneNative.share(text); return; } catch (e) {} }
      if (navigator.share) navigator.share({ text: text }).catch(function () {});
      else toast(text);
    }
  };

  /* ------------------------------- Boot ------------------------------- */

  function boot() {
    layoutFixes();
    injectCSS();
    loadManifest();
    enhanceAll(doc);
    setTimeout(function () { enhanceAll(doc); }, 400);
    setTimeout(function () { enhanceAll(doc); }, 1600);
    window.dispatchEvent(new CustomEvent('fortune:enhanced'));
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.addEventListener('load', function () { enhanceAll(doc); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { enhanceAll(doc); }, 320); });
})();
